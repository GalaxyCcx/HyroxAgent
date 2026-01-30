#!/usr/bin/env python3
"""
数据库查询调试脚本

用法:
    python scripts/query_db.py <table> [--where field=value] [--limit N]

示例:
    python scripts/query_db.py results --where season=1 location=NYC --limit 5
    python scripts/query_db.py races --limit 10
    python scripts/query_db.py users
"""
import argparse
import json
import os
import sys
from pathlib import Path

# 添加项目路径
project_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(project_root / "backend"))

try:
    from sqlalchemy import create_engine, text, inspect
    from sqlalchemy.orm import Session
except ImportError:
    print("请安装 sqlalchemy: pip install sqlalchemy")
    sys.exit(1)


def get_db_path() -> Path:
    """获取数据库路径"""
    # 优先使用环境变量
    if db_path := os.environ.get("DATABASE_PATH"):
        return Path(db_path)
    # 默认路径
    return project_root / "backend" / "data" / "db" / "hyrox.db"


def parse_where(where_list: list[str]) -> dict:
    """解析 where 条件"""
    conditions = {}
    for item in where_list:
        if "=" in item:
            key, value = item.split("=", 1)
            conditions[key] = value
    return conditions


def query_table(table: str, conditions: dict, limit: int) -> None:
    """查询数据表"""
    db_path = get_db_path()
    
    if not db_path.exists():
        print(f"❌ 数据库文件不存在: {db_path}")
        sys.exit(1)
    
    print(f"数据库: {db_path}")
    print(f"查询表: {table}")
    print("-" * 50)
    
    engine = create_engine(f"sqlite:///{db_path}")
    
    # 检查表是否存在
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    if table not in tables:
        print(f"❌ 表 '{table}' 不存在")
        print(f"可用的表: {', '.join(tables)}")
        sys.exit(1)
    
    # 构建查询
    sql = f"SELECT * FROM {table}"
    if conditions:
        where_clauses = [f"{k} = :{k}" for k in conditions]
        sql += " WHERE " + " AND ".join(where_clauses)
    sql += f" LIMIT {limit}"
    
    print(f"SQL: {sql}")
    print(f"参数: {conditions}")
    print("-" * 50)
    
    with Session(engine) as session:
        result = session.execute(text(sql), conditions)
        rows = result.fetchall()
        columns = result.keys()
        
        print(f"返回 {len(rows)} 条记录:\n")
        
        for i, row in enumerate(rows):
            print(f"--- 记录 {i + 1} ---")
            row_dict = dict(zip(columns, row))
            for key, value in row_dict.items():
                # 截断过长的值
                str_value = str(value)
                if len(str_value) > 100:
                    str_value = str_value[:100] + "..."
                print(f"  {key}: {str_value}")
            print()


def show_schema(table: str) -> None:
    """显示表结构"""
    db_path = get_db_path()
    engine = create_engine(f"sqlite:///{db_path}")
    inspector = inspect(engine)
    
    if table:
        # 显示指定表的结构
        tables = [table]
    else:
        # 显示所有表
        tables = inspector.get_table_names()
    
    for t in tables:
        print(f"\n=== 表: {t} ===")
        columns = inspector.get_columns(t)
        for col in columns:
            nullable = "NULL" if col.get("nullable", True) else "NOT NULL"
            default = f"DEFAULT {col.get('default')}" if col.get("default") else ""
            print(f"  {col['name']}: {col['type']} {nullable} {default}".strip())
        
        # 显示索引
        indexes = inspector.get_indexes(t)
        if indexes:
            print(f"\n  索引:")
            for idx in indexes:
                unique = "UNIQUE " if idx.get("unique") else ""
                print(f"    {unique}{idx['name']}: {idx['column_names']}")


def main():
    parser = argparse.ArgumentParser(description="数据库查询调试工具")
    parser.add_argument("table", nargs="?", help="表名 (不填则显示所有表)")
    parser.add_argument("--where", nargs="*", default=[], help="过滤条件 (field=value)")
    parser.add_argument("--limit", type=int, default=10, help="返回数量限制")
    parser.add_argument("--schema", action="store_true", help="显示表结构")
    
    args = parser.parse_args()
    
    if args.schema or not args.table:
        show_schema(args.table)
    else:
        conditions = parse_where(args.where)
        query_table(args.table, conditions, args.limit)


if __name__ == "__main__":
    main()
