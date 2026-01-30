"""
报告生成服务模块（V3 配置化架构）

- core/：ConfigLoader, InputBuilder, SectionGenerator, FunctionExecutor, ReportAssembler
- data/：SnapshotManager, DataRegistry
- data_provider：DataProvider（V3 数据预计算）
- chart_builder：ChartDataBuilder（可选，用于预构建图表）
"""
from .report_generator import report_generator
from .heart_rate_extractor import heart_rate_extractor, HeartRateExtractor, HeartRateExtractionResult
from .heart_rate_mapper import heart_rate_mapper, HeartRateMapper, HeartRateMappingResult

from .data_provider import (
    DataProvider,
    get_data_provider,
    ReportData,
    AthleteResultData,
    DivisionStatsData,
    SegmentComparisonData,
    PercentileRankingData,
    PacingAnalysisData,
    TimeLossAnalysisData,
    CohortAnalysisData,
    AthleteHistoryData,
)
from .chart_builder import (
    ChartDataBuilder,
    get_chart_builder,
    ChartConfig,
)
from .core import (
    ConfigLoader,
    get_config_loader,
    InputBuilder,
    get_input_builder,
    SectionGenerator,
    get_section_generator,
    FunctionExecutor,
    get_function_executor,
    ReportAssembler,
    get_report_assembler,
)
from .data import (
    SnapshotManager,
    get_snapshot_manager,
    DataRegistry,
    get_data_registry,
)

__all__ = [
    "report_generator",
    "heart_rate_extractor",
    "HeartRateExtractor",
    "HeartRateExtractionResult",
    "heart_rate_mapper",
    "HeartRateMapper",
    "HeartRateMappingResult",
    "DataProvider",
    "get_data_provider",
    "ReportData",
    "AthleteResultData",
    "DivisionStatsData",
    "SegmentComparisonData",
    "PercentileRankingData",
    "PacingAnalysisData",
    "TimeLossAnalysisData",
    "CohortAnalysisData",
    "AthleteHistoryData",
    "ChartDataBuilder",
    "get_chart_builder",
    "ChartConfig",
    "ConfigLoader",
    "get_config_loader",
    "InputBuilder",
    "get_input_builder",
    "SectionGenerator",
    "get_section_generator",
    "FunctionExecutor",
    "get_function_executor",
    "ReportAssembler",
    "get_report_assembler",
    "SnapshotManager",
    "get_snapshot_manager",
    "DataRegistry",
    "get_data_registry",
]
