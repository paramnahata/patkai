from PIL import Image, ExifTags
from pathlib import Path
import hashlib

def analyze_image(path: str, reported_lat=None, reported_lon=None):
    p=Path(path); result={"gps_present":False,"timestamp_present":False,"device_present":False,"image_hash":None,"perceptual_hash":None,"dimensions":None,"metadata_consistent":True,"reasons":[]}
    result["image_hash"]=hashlib.sha256(p.read_bytes()).hexdigest()
    try:
        im=Image.open(p); result["dimensions"]=[im.width,im.height]
        exif=im.getexif(); tags={ExifTags.TAGS.get(k,k):v for k,v in exif.items()}
        result["timestamp_present"]=bool(tags.get("DateTimeOriginal") or tags.get("DateTime"))
        result["device_present"]=bool(tags.get("Make") or tags.get("Model"))
        gps=tags.get("GPSInfo"); result["gps_present"]=bool(gps)
        if not result["gps_present"]: result["reasons"].append("EXIF GPS missing")
        if not result["timestamp_present"]: result["reasons"].append("Image timestamp missing")
        if not result["device_present"]: result["reasons"].append("Device information missing")
    except Exception as e: result["reasons"].append(f"Metadata unreadable: {e}")
    score=92
    score-=25 if not result["gps_present"] else 0
    score-=12 if not result["timestamp_present"] else 0
    score-=6 if not result["device_present"] else 0
    score=max(0,min(100,score)); result["trust_score"]=score
    result["verification_status"]="VERIFIED" if score>=90 else "LIKELY AUTHENTIC" if score>=70 else "NEEDS VERIFICATION" if score>=40 else "SUSPICIOUS"
    return result
