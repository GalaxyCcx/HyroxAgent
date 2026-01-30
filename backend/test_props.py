import json
import requests

resp = requests.get('http://localhost:8000/api/v1/reports/detail/9a309ab2-5332-4c01-8ce6-e688e7f031e0')
report = resp.json()
sections = report.get('sections', [])

print("Checking list component props:")
for sec in sections:
    for b in sec.get('blocks', []):
        comp = b.get('component')
        if comp in ['PhaseAnalysisList', 'WeaknessAnalysisList', 'ImprovementsList', 'GenericList', 'StrengthsList']:
            props = b.get('props', {})
            print(f"  {comp}: props keys = {list(props.keys())}")
            if 'items' in props:
                items = props['items']
                print(f"    items count: {len(items) if isinstance(items, list) else 'not a list'}")
            else:
                print(f"    NO items field!")
