"""
核心模块 - 报告生成配置化架构

包含：
- ConfigLoader: 配置加载器
- InputBuilder: 输入数据构建器
- SectionGenerator: 章节生成器（Function Call）
- FunctionExecutor: Function Call 解析器
- ReportAssembler: 报告组装器
"""

from .config_loader import ConfigLoader, get_config_loader, reset_config_loader
from .input_builder import InputBuilder, get_input_builder
from .section_generator import SectionGenerator, get_section_generator
from .function_executor import FunctionExecutor, get_function_executor
from .report_assembler import ReportAssembler, get_report_assembler

__all__ = [
    "ConfigLoader",
    "get_config_loader",
    "reset_config_loader",
    "InputBuilder",
    "get_input_builder",
    "SectionGenerator",
    "get_section_generator",
    "FunctionExecutor",
    "get_function_executor",
    "ReportAssembler",
    "get_report_assembler",
]
