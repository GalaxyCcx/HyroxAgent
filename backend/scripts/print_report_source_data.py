"""
打印最新报告的 source_data（解耦图源数据：Run1-8 配速 + 图片识别心率）

运行方式（在 backend 目录）:
  python scripts/print_report_source_data.py

可选：指定 report_id
  python scripts/print_report_source_data.py <report_id>
"""

import json
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.db.database import get_sync_db
from app.services.report import report_generator


def main():
    with get_sync_db() as db:
        report_id = sys.argv[1] if len(sys.argv) > 1 else None
        if not report_id:
            reports = report_generator.list_user_reports(db=db)
            if not reports:
                print("当前没有任何报告。")
                return
            report_id = reports[0]["report_id"]
            print(f"使用最新报告: {report_id}")
            print(f"  运动员: {reports[0].get('athlete_name')} | {reports[0].get('season')} {reports[0].get('location')}")
            print()
        report = report_generator.get_report(db, report_id)
        if not report:
            print(f"报告不存在: {report_id}")
            return
        source = report.get("source_data") or {}
        print("=== source_data（解耦图源数据）===")
        print(json.dumps(source, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
