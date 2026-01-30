#!/usr/bin/env python3
"""
Schema 代码生成器

根据字段定义生成 Pydantic Schema 代码

用法:
    python scripts/generate_schema.py <schema_name> --fields "name:str" "value:float" "count:int?"

示例:
    python scripts/generate_schema.py RaceStats --fields "location:str" "total_athletes:int" "avg_time:float" "best_time:float?"
"""
import argparse
from typing import Optional


def parse_field(field_def: str) -> tuple[str, str, bool]:
    """
    解析字段定义
    
    格式: name:type 或 name:type? (可选字段)
    返回: (字段名, 类型, 是否可选)
    """
    name, type_def = field_def.split(":", 1)
    optional = type_def.endswith("?")
    if optional:
        type_def = type_def[:-1]
    
    # 类型映射
    type_map = {
        "str": "str",
        "string": "str",
        "int": "int",
        "integer": "int",
        "float": "float",
        "number": "float",
        "bool": "bool",
        "boolean": "bool",
        "list": "list",
        "dict": "dict",
        "datetime": "datetime",
    }
    
    py_type = type_map.get(type_def.lower(), type_def)
    return name, py_type, optional


def generate_schema(name: str, fields: list[str], with_response: bool = True) -> str:
    """生成 Schema 代码"""
    
    # 解析字段
    parsed_fields = [parse_field(f) for f in fields]
    
    # 生成字段定义
    field_lines = []
    for fname, ftype, optional in parsed_fields:
        if optional:
            field_lines.append(
                f'    {fname}: Optional[{ftype}] = Field(None, description="{fname}")'
            )
        else:
            field_lines.append(
                f'    {fname}: {ftype} = Field(..., description="{fname}")'
            )
    
    fields_code = "\n".join(field_lines)
    
    # 生成 Item 模型
    item_name = f"{name}Item"
    item_code = f'''class {item_name}(BaseModel):
    """{name} 单条数据"""
{fields_code}
'''
    
    # 生成 Data 模型
    data_name = f"{name}Data"
    data_code = f'''
class {data_name}(BaseModel):
    """{name} 数据容器"""
    items: list[{item_name}] = Field(default_factory=list, description="数据列表")
    total: int = Field(default=0, description="总数")
'''
    
    # 生成 Response 模型
    response_code = ""
    if with_response:
        response_name = f"{name}Response"
        response_code = f'''
class {response_name}(ResponseBase[{data_name}]):
    """{name} 响应"""
    pass
'''
    
    # 组合完整代码
    imports = '''from typing import Optional
from pydantic import BaseModel, Field
# 注意: ResponseBase 已在 schemas.py 中定义
'''
    
    return f"{imports}\n{item_code}{data_code}{response_code}"


def main():
    parser = argparse.ArgumentParser(description="Schema 代码生成器")
    parser.add_argument("name", help="Schema 名称 (如 RaceStats)")
    parser.add_argument("--fields", nargs="+", required=True, 
                       help="字段定义 (格式: name:type 或 name:type?)")
    parser.add_argument("--no-response", action="store_true",
                       help="不生成 Response 模型")
    
    args = parser.parse_args()
    
    code = generate_schema(args.name, args.fields, with_response=not args.no_response)
    
    print("=" * 60)
    print("生成的 Schema 代码:")
    print("=" * 60)
    print(code)
    print("=" * 60)
    print("\n将以上代码添加到 backend/app/models/schemas.py")


if __name__ == "__main__":
    main()
