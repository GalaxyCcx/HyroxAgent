"""
前端渲染验证测试
检查前端是否能正确获取和解析 V3 报告数据
"""
import json
import requests

BASE_URL = "http://localhost:8000"

def test_frontend_data_flow():
    """模拟前端数据流"""
    print("=" * 60)
    print("Frontend Data Flow Test")
    print("=" * 60)
    
    # 1. 获取最新报告
    resp = requests.get(f"{BASE_URL}/api/v1/reports/list")
    reports = resp.json().get("reports", [])
    completed = [r for r in reports if r.get("status") == "completed"]
    
    if not completed:
        print("[FAIL] No completed reports")
        return False
    
    report_id = completed[0]["report_id"]
    print(f"[OK] Testing report: {report_id[:20]}...")
    
    # 2. 获取报告详情（模拟前端 reportApi.getDetail）
    resp = requests.get(f"{BASE_URL}/api/v1/reports/detail/{report_id}")
    report = resp.json()
    
    # 3. 模拟前端 LiveTab handleViewReport 后的 proReportDetail
    proReportDetail = report
    
    # 4. 模拟 renderProReport 中的逻辑
    print("\n[Test] Simulating renderProReport logic:")
    
    sections = proReportDetail.get("sections", [])
    filtered_sections = [s for s in sections if s.get("section_id") not in ["summary", "introduction"]]
    
    print(f"  - Total sections: {len(sections)}")
    print(f"  - Filtered sections (excluding summary/intro): {len(filtered_sections)}")
    
    # 5. 检查每个章节的 V3 渲染条件
    print("\n[Test] V3 rendering conditions:")
    
    all_pass = True
    for sec in filtered_sections:
        sec_id = sec.get("section_id")
        blocks = sec.get("blocks", [])
        
        # V3 条件检查
        hasBlocks = blocks and isinstance(blocks, list) and len(blocks) > 0
        
        status = "[OK]" if hasBlocks else "[FAIL]"
        print(f"  {status} {sec_id}: hasBlocks={hasBlocks}, blocks_count={len(blocks)}")
        
        if hasBlocks:
            # 检查第一个 block 的结构
            first_block = blocks[0]
            print(f"       first_block: type={first_block.get('type')}, component={first_block.get('component')}")
        else:
            all_pass = False
    
    # 6. 检查 dataSnapshots
    print("\n[Test] DataSnapshots availability:")
    dataSnapshots = proReportDetail.get("data_snapshots") or proReportDetail.get("charts")
    
    if dataSnapshots:
        print(f"  [OK] dataSnapshots available: {len(dataSnapshots)} items")
    else:
        print("  [FAIL] dataSnapshots not available!")
        all_pass = False
    
    # 7. 结果
    print("\n" + "=" * 60)
    if all_pass:
        print("[PASS] All V3 rendering conditions met!")
        print("       Frontend should now render blocks correctly.")
    else:
        print("[FAIL] Some conditions not met!")
    print("=" * 60)
    
    return all_pass


if __name__ == "__main__":
    test_frontend_data_flow()
