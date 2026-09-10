from PIL import Image, ExifTags
from pathlib import Path
from datetime import datetime
import hashlib, math, os

GPS_TAGS = {1:'GPSLatitudeRef',2:'GPSLatitude',3:'GPSLongitudeRef',4:'GPSLongitude',6:'GPSAltitude'}

def _ratio_distance_km(a,b,c,d):
    if None in (a,b,c,d): return None
    lat_km=(a-c)*111.0; lon_km=(b-d)*111.0*math.cos(math.radians((a+c)/2))
    return math.sqrt(lat_km*lat_km+lon_km*lon_km)

def _dms(value):
    try:
        return float(value[0])+float(value[1])/60+float(value[2])/3600
    except Exception:
        return None

def _gps(exif):
    gps=exif.get(34853) or exif.get('GPSInfo')
    if not gps: return None,None
    def g(k):
        return gps.get(k) or gps.get({1:'GPSLatitudeRef',2:'GPSLatitude',3:'GPSLongitudeRef',4:'GPSLongitude'}.get(k,''))
    lat=_dms(g(2)); lon=_dms(g(4))
    if lat is None or lon is None:return None,None
    if str(g(1)).upper().startswith('S'):lat=-lat
    if str(g(3)).upper().startswith('W'):lon=-lon
    return lat,lon

def _average_hash(im):
    small=im.convert('L').resize((16,16))
    px=list(small.getdata()); avg=sum(px)/len(px)
    bits=''.join('1' if x>=avg else '0' for x in px)
    return hex(int(bits,2))[2:].zfill(64)

def hamming_distance(a,b):
    try:return (int(a,16)^int(b,16)).bit_count()
    except Exception:return 999

def analyze_image(path: str, reported_lat=None, reported_lon=None, upload_time=None, existing_hashes=None):
    p=Path(path); upload_time=upload_time or datetime.utcnow()
    result={
      'gps_present':False,'timestamp_present':False,'device_present':False,'image_hash':hashlib.sha256(p.read_bytes()).hexdigest(),
      'perceptual_hash':None,'dimensions':None,'metadata_consistent':True,'reasons':[],'file_modified_at':datetime.utcfromtimestamp(os.path.getmtime(p)).isoformat(),
      'exif_gps':None,'exif_timestamp':None,'duplicate_exact':False,'duplicate_similar':False
    }
    try:
        im=Image.open(p); result['dimensions']=[im.width,im.height]; result['perceptual_hash']=_average_hash(im)
        exif=im.getexif(); tags={ExifTags.TAGS.get(k,k):v for k,v in exif.items()}
        result['timestamp_present']=bool(tags.get('DateTimeOriginal') or tags.get('DateTime'))
        result['device_present']=bool(tags.get('Make') or tags.get('Model'))
        dt=tags.get('DateTimeOriginal') or tags.get('DateTime')
        if dt:
            result['exif_timestamp']=str(dt)
        glat,glon=_gps(exif)
        result['gps_present']=glat is not None and glon is not None
        if result['gps_present']:
            result['exif_gps']={'lat':glat,'lon':glon}
            if reported_lat is not None and reported_lon is not None:
                dist=_ratio_distance_km(reported_lat,reported_lon,glat,glon); result['gps_distance_km']=round(dist,2) if dist is not None else None
                if dist is not None and dist>5:
                    result['metadata_consistent']=False; result['reasons'].append(f'EXIF GPS differs from reported location by {dist:.1f} km')
        else: result['reasons'].append('EXIF GPS missing')
        if not result['timestamp_present']: result['reasons'].append('Image timestamp missing')
        if not result['device_present']: result['reasons'].append('Device information missing')
        if result['timestamp_present'] and result['exif_timestamp']:
            try:
                exdt=datetime.strptime(result['exif_timestamp'],'%Y:%m:%d %H:%M:%S')
                age=abs((upload_time-exdt).total_seconds())
                if age>60*60*24*365*5: result['metadata_consistent']=False; result['reasons'].append('EXIF timestamp is unusually far from upload time')
            except Exception: pass
    except Exception as e:
        result['metadata_consistent']=False; result['reasons'].append(f'Metadata unreadable: {e}')
    for item in existing_hashes or []:
        if item.get('image_hash')==result['image_hash']:
            result['duplicate_exact']=True; result['reasons'].append('Exact image hash matches a previous report'); break
        if result['perceptual_hash'] and item.get('perceptual_hash') and hamming_distance(result['perceptual_hash'],item['perceptual_hash'])<=8:
            result['duplicate_similar']=True
    if result['duplicate_similar']: result['reasons'].append('Image is visually similar to a previous report')
    score=100
    score-=25 if not result['gps_present'] else 0
    score-=12 if not result['timestamp_present'] else 0
    score-=6 if not result['device_present'] else 0
    score-=20 if not result['metadata_consistent'] else 0
    score-=35 if result['duplicate_exact'] else 0
    score-=15 if result['duplicate_similar'] else 0
    result['trust_score']=max(0,min(100,score))
    if result['duplicate_exact'] or result['trust_score']<40: result['verification_status']='SUSPICIOUS'
    elif result['trust_score']>=90: result['verification_status']='LIKELY AUTHENTIC'
    elif result['trust_score']>=65: result['verification_status']='NEEDS VERIFICATION'
    else: result['verification_status']='NEEDS VERIFICATION'
    return result
