"""
测试老报告数据
"""
import json
import requests

BASE_URL = "http://localhost:8000"

def test_old_report():
    # 老报告 ID（有完整 blocks）
    report_id = "9a309ab2-5332-4c01-8ce6-e688e7f031e0"
    
    print(f"Testing old report: {report_id}")
    
    resp = requests.get(f"{BASE_URL}/api/v1/reports/detail/{report_id}")
    if resp.status_code != 200:
        print(f"[FAIL] Status: {resp.status_code}")
        return
    
    report = resp.json()
    
    print(f"athlete: {report.get('athlete_name')}")
    print(f"status: {report.get('status')}")
    
    sections = report.get("sections", [])
    for sec in sections:
        blocks = sec.get("blocks", [])
        print(f"  {sec.get('section_id')}: {len(blocks)} blocks")
        if blocks:
            for b in blocks[:2]:
                print(f"    - {b.get('component')}")


if __name__ == "__main__":
    test_old_report()
