"""
将指定报告的 heart_rate_from_image 导出到临时 JSON 文件。

运行（在 backend 目录）:
  python scripts/export_heart_rate_to_file.py <report_id>
"""
import json
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.db.database import get_sync_db
from app.services.report import report_generator

OUT_DIR = BACKEND_ROOT.parent / "docs"  # 临时文件放 docs


def main():
    report_id = sys.argv[1] if len(sys.argv) > 1 else None
    if not report_id:
        print("用法: python scripts/export_heart_rate_to_file.py <report_id>")
        return
    with get_sync_db() as db:
        report = report_generator.get_report(db, report_id)
        if not report:
            print(f"报告不存在: {report_id}")
            return
        source = report.get("source_data") or {}
        hr_list = source.get("heart_rate_from_image") or []
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUT_DIR / f"temp_heart_rate_{report_id[:8]}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(hr_list, f, ensure_ascii=False, indent=2)
    print(f"已导出 {len(hr_list)} 条心率数据到: {out_path}")


if __name__ == "__main__":
    main()
