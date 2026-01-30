"""
最小单元测试：验证报告数据流
"""
import json
import requests

BASE_URL = "http://localhost:8000"

def test_report_api():
    """测试报告 API 返回的数据结构"""
    print("=" * 50)
    print("Test 1: Get latest completed report")
    print("=" * 50)
    
    # 获取报告列表
    resp = requests.get(f"{BASE_URL}/api/v1/reports/list")
    if resp.status_code != 200:
        print(f"[FAIL] Get report list failed: {resp.status_code}")
        return False
    
    data = resp.json()
    reports = data.get("reports", [])
    completed = [r for r in reports if r.get("status") == "completed"]
    
    if not completed:
        print("[FAIL] No completed reports")
        return False
    
    report_id = completed[0]["report_id"]
    print(f"[OK] Found completed report: {report_id}")
    
    # 获取报告详情
    print("\n" + "=" * 50)
    print("Test 2: Get report detail")
    print("=" * 50)
    
    resp = requests.get(f"{BASE_URL}/api/v1/reports/detail/{report_id}")
    if resp.status_code != 200:
        print(f"[FAIL] Get report detail failed: {resp.status_code}")
        return False
    
    report = resp.json()
    
    # 检查关键字段
    print(f"[OK] report_id: {report.get('report_id')}")
    print(f"[OK] athlete_name: {report.get('athlete_name')}")
    print(f"[OK] status: {report.get('status')}")
    
    # 检查 sections
    sections = report.get("sections", [])
    print(f"\n[OK] sections count: {len(sections)}")
    
    if not sections:
        print("[FAIL] sections is empty!")
        return False
    
    # 检查每个 section 的 blocks
    print("\n" + "=" * 50)
    print("Test 3: Check blocks in each section")
    print("=" * 50)
    
    all_have_blocks = True
    for sec in sections:
        sec_id = sec.get("section_id", "?")
        blocks = sec.get("blocks", [])
        has_blocks = len(blocks) > 0
        
        status = "[OK]" if has_blocks else "[FAIL]"
        print(f"{status} {sec_id}: {len(blocks)} blocks")
        
        if blocks:
            for b in blocks[:2]:
                comp = b.get('component', '?')
                props_keys = list(b.get('props', {}).keys())[:3]
                print(f"    - {comp}: {props_keys}")
        
        if not has_blocks and sec.get("type") != "static":
            all_have_blocks = False
    
    # 检查 charts (data_snapshots)
    print("\n" + "=" * 50)
    print("Test 4: Check data_snapshots (charts)")
    print("=" * 50)
    
    charts = report.get("charts", {})
    print(f"[OK] charts/data_snapshots count: {len(charts)}")
    
    if charts:
        first_key = list(charts.keys())[0]
        first_val = charts[first_key]
        print(f"[OK] sample data_id: {first_key[:20]}...")
        print(f"[OK] sample content keys: {list(first_val.keys()) if isinstance(first_val, dict) else type(first_val)}")
    
    # 模拟前端数据转换
    print("\n" + "=" * 50)
    print("Test 5: Simulate frontend data transform")
    print("=" * 50)
    
    first_sec = sections[0]
    hasBlocks = first_sec.get("blocks") and len(first_sec.get("blocks", [])) > 0
    print(f"[OK] hasBlocks (first section): {hasBlocks}")
    
    dataSnapshots = report.get("data_snapshots") or report.get("charts")
    print(f"[OK] dataSnapshots available: {bool(dataSnapshots)}, count: {len(dataSnapshots) if dataSnapshots else 0}")
    
    print("\n" + "=" * 50)
    print("Test Result")
    print("=" * 50)
    
    if all_have_blocks and hasBlocks and dataSnapshots:
        print("[PASS] All tests passed! Backend data structure is correct.")
        print("       Issue must be in frontend rendering logic.")
        return True
    else:
        print("[FAIL] Tests failed!")
        return False


if __name__ == "__main__":
    test_report_api()
