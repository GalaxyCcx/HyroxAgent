"""
数据层模块 - 数据管理和快照

包含：
- SnapshotManager: 数据快照管理器
- DataRegistry: 数据源注册表
"""

from .snapshot_manager import SnapshotManager, get_snapshot_manager
from .data_registry import DataRegistry, get_data_registry

__all__ = [
    "SnapshotManager",
    "get_snapshot_manager",
    "DataRegistry",
    "get_data_registry",
]
