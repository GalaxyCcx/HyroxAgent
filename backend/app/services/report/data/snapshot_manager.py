"""
SnapshotManager - 数据快照管理器

负责管理报告数据快照的创建和查询：
- 为每个数据项创建唯一的 data_id（UUID）
- 将数据内容持久化到 ReportDataSnapshot 表
- 支持根据 data_id 或 report_id 查询数据
"""

import json
import logging
import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, Any, List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from ....db.models import ReportDataSnapshot

logger = logging.getLogger(__name__)


@dataclass
class DataSnapshotInfo:
    """数据快照信息"""
    data_id: str
    report_id: str
    data_type: str
    content: Dict[str, Any]
    created_at: Optional[datetime] = None


class SnapshotManager:
    """数据快照管理器"""
    
    def __init__(self, db_session: Session):
        """
        初始化 SnapshotManager
        
        Args:
            db_session: 数据库会话（同步）
        """
        self.db = db_session
        self._cache: Dict[str, DataSnapshotInfo] = {}
    
    def create_snapshot(
        self, 
        report_id: str, 
        data_type: str, 
        data_content: Dict[str, Any]
    ) -> str:
        """
        创建数据快照
        
        Args:
            report_id: 关联的报告 ID
            data_type: 数据类型（如 "athlete_result", "percentile_ranking"）
            data_content: 数据内容
            
        Returns:
            生成的 data_id（UUID 格式）
        """
        # 生成唯一的 data_id
        data_id = str(uuid.uuid4())
        
        # 序列化数据内容
        content_json = json.dumps(data_content, ensure_ascii=False, default=str)
        
        # 创建数据库记录
        snapshot = ReportDataSnapshot(
            data_id=data_id,
            report_id=report_id,
            data_type=data_type,
            data_content=content_json,
        )
        
        self.db.add(snapshot)
        self.db.flush()  # 立即写入但不提交，等待整体事务
        
        # 缓存快照信息
        self._cache[data_id] = DataSnapshotInfo(
            data_id=data_id,
            report_id=report_id,
            data_type=data_type,
            content=data_content,
        )
        
        logger.debug(f"[SnapshotManager] 创建快照: data_id={data_id}, type={data_type}")
        return data_id
    
    def get_snapshot(self, data_id: str) -> Optional[DataSnapshotInfo]:
        """
        根据 data_id 获取数据快照
        
        Args:
            data_id: 数据唯一 ID
            
        Returns:
            数据快照信息，不存在则返回 None
        """
        # 优先从缓存获取
        if data_id in self._cache:
            return self._cache[data_id]
        
        # 从数据库查询
        stmt = select(ReportDataSnapshot).where(ReportDataSnapshot.data_id == data_id)
        result = self.db.execute(stmt).scalar_one_or_none()
        
        if result:
            info = DataSnapshotInfo(
                data_id=result.data_id,
                report_id=result.report_id,
                data_type=result.data_type,
                content=json.loads(result.data_content) if result.data_content else {},
                created_at=result.created_at,
            )
            self._cache[data_id] = info
            return info
        
        return None
    
    def get_report_snapshots(self, report_id: str) -> List[DataSnapshotInfo]:
        """
        获取报告的所有数据快照
        
        Args:
            report_id: 报告 ID
            
        Returns:
            数据快照列表
        """
        stmt = select(ReportDataSnapshot).where(ReportDataSnapshot.report_id == report_id)
        results = self.db.execute(stmt).scalars().all()
        
        snapshots = []
        for result in results:
            info = DataSnapshotInfo(
                data_id=result.data_id,
                report_id=result.report_id,
                data_type=result.data_type,
                content=json.loads(result.data_content) if result.data_content else {},
                created_at=result.created_at,
            )
            self._cache[result.data_id] = info
            snapshots.append(info)
        
        return snapshots
    
    def get_snapshots_as_dict(self, report_id: str) -> Dict[str, Dict[str, Any]]:
        """
        获取报告的所有数据快照（字典格式，用于前端）
        
        Args:
            report_id: 报告 ID
            
        Returns:
            {data_id: {"data_type": ..., "content": ...}}
        """
        snapshots = self.get_report_snapshots(report_id)
        return {
            s.data_id: {
                "data_type": s.data_type,
                "content": s.content,
            }
            for s in snapshots
        }
    
    def clear_cache(self) -> None:
        """清除缓存"""
        self._cache.clear()


# 工厂函数（需要传入数据库会话）
def get_snapshot_manager(db_session: Session) -> SnapshotManager:
    """获取 SnapshotManager 实例"""
    return SnapshotManager(db_session)
