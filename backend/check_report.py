import json
from app.db.database import get_sync_db
from app.db.models import ProReport

with get_sync_db() as db:
    r = db.query(ProReport).filter(ProReport.status == 'completed').order_by(ProReport.completed_at.desc()).first()
    print('report_id:', r.report_id)
    print('athlete:', r.athlete_name)
    sections = json.loads(r.sections) if r.sections else []
    for s in sections:
        blocks = s.get('blocks', [])
        sid = s.get('section_id')
        print(f'  {sid}: {len(blocks)} blocks')
        for b in blocks[:2]:
            print(f'    - {b.get("component")}')
