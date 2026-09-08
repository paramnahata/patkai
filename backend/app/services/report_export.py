from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,Table,TableStyle
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet

def incident_pdf(r):
    out=BytesIO(); doc=SimpleDocTemplate(out,pagesize=A4,rightMargin=36,leftMargin=36,topMargin=36,bottomMargin=36); styles=getSampleStyleSheet(); story=[Paragraph('PATKAI Incident Report',styles['Title']),Spacer(1,10)]
    data=[['Incident ID',r.id],['Type',r.incident_type],['Severity',r.severity],['Coordinates',f'{r.lat}, {r.lon}'],['Risk / trust score',str(r.trust_score)],['Verification',r.verification_status],['Status',r.status],['Description',r.description or '—'],['Created',r.created_at.isoformat()]]
    t=Table(data,colWidths=[130,390]); t.setStyle(TableStyle([('GRID',(0,0),(-1,-1),.5,colors.grey),('FONTNAME',(0,0),(0,-1),'Helvetica-Bold'),('VALIGN',(0,0),(-1,-1),'TOP'),('PADDING',(0,0),(-1,-1),7)])); story.append(t); doc.build(story); out.seek(0); return out
