"""
数据同步服务
从 HYROX 官方 API 同步数据到本地 SQLite
"""
import logging
import time
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

import pandas as pd
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.hyrox_client import get_hyrox_client, HyroxClient
from app.db.database import async_session_maker, get_db_stats
from app.db.models import Race, Result, SyncLog

logger = logging.getLogger(__name__)


@dataclass
class SyncResult:
    """同步结果"""
    success: bool
    season: Optional[int] = None
    location: Optional[str] = None
    races_count: int = 0
    records_count: int = 0
    duration_seconds: float = 0.0
    error_message: Optional[str] = None


class SyncService:
    """
    数据同步服务
    
    功能：
    - 同步单场比赛数据
    - 同步整个赛季数据
    - 同步所有赛季数据
    - 查看同步状态
    """
    
    def __init__(self, hyrox_client: Optional[HyroxClient] = None):
        self._client = hyrox_client or get_hyrox_client()
    
    async def sync_race(
        self,
        season: int,
        location: str,
        force_refresh: bool = True
    ) -> SyncResult:
        """
        同步单场比赛数据
        
        Args:
            season: 赛季编号
            location: 比赛地点
            force_refresh: 是否强制从官方 API 刷新
        
        Returns:
            SyncResult: 同步结果
        """
        start_time = time.time()
        logger.info(f"Syncing race: season={season}, location={location}")
        
        async with async_session_maker() as session:
            try:
                # 1. 从官方 API 获取数据
                race_data = self._client.get_race(
                    season=season,
                    location=location,
                    use_cache=not force_refresh
                )
                
                if race_data.empty:
                    logger.warning(f"No data found for season={season}, location={location}")
                    await self._log_sync(session, season, location, "success", 0)
                    return SyncResult(
                        success=True,
                        season=season,
                        location=location,
                        records_count=0,
                        duration_seconds=time.time() - start_time
                    )
                
                # 2. 获取比赛元信息
                races_df = self._client.list_races(season=season)
                race_meta = races_df[races_df['location'] == location]
                file_last_modified = None
                if not race_meta.empty:
                    file_last_modified = str(race_meta.iloc[0].get('file_last_modified', ''))
                
                # 3. 更新或插入比赛记录
                await self._upsert_race(session, season, location, file_last_modified)
                
                # 4. 删除旧的成绩数据
                await session.execute(
                    delete(Result).where(
                        Result.season == season,
                        Result.location == location
                    )
                )
                
                # 5. 批量插入新数据
                records = race_data.to_dict('records')
                result_objects = [
                    Result.from_dataframe_row(row, season, location)
                    for row in records
                ]
                session.add_all(result_objects)
                
                # 6. 记录同步日志
                await self._log_sync(session, season, location, "success", len(records))
                
                await session.commit()
                
                duration = time.time() - start_time
                logger.info(f"Synced {len(records)} records for {location} season {season} in {duration:.2f}s")
                
                return SyncResult(
                    success=True,
                    season=season,
                    location=location,
                    records_count=len(records),
                    duration_seconds=duration
                )
                
            except Exception as e:
                await session.rollback()
                error_msg = str(e)
                logger.error(f"Failed to sync race: {error_msg}")
                
                # 记录失败日志
                async with async_session_maker() as log_session:
                    await self._log_sync(log_session, season, location, "failed", 0, error_msg)
                    await log_session.commit()
                
                return SyncResult(
                    success=False,
                    season=season,
                    location=location,
                    error_message=error_msg,
                    duration_seconds=time.time() - start_time
                )
    
    async def sync_season(self, season: int, force_refresh: bool = True) -> SyncResult:
        """
        同步整个赛季数据
        
        Args:
            season: 赛季编号
            force_refresh: 是否强制从官方 API 刷新
        
        Returns:
            SyncResult: 同步结果
        """
        start_time = time.time()
        logger.info(f"Syncing season {season}")
        
        try:
            # 获取该赛季所有比赛列表
            races_df = self._client.list_races(season=season, force_refresh=force_refresh)
            
            if races_df.empty:
                logger.warning(f"No races found for season {season}")
                return SyncResult(
                    success=True,
                    season=season,
                    races_count=0,
                    records_count=0,
                    duration_seconds=time.time() - start_time
                )
            
            total_records = 0
            races_count = len(races_df)
            
            # 逐个同步每场比赛
            for _, race in races_df.iterrows():
                location = race['location']
                result = await self.sync_race(season, location, force_refresh)
                if result.success:
                    total_records += result.records_count
                else:
                    logger.warning(f"Failed to sync {location}: {result.error_message}")
            
            duration = time.time() - start_time
            logger.info(f"Synced season {season}: {races_count} races, {total_records} records in {duration:.2f}s")
            
            return SyncResult(
                success=True,
                season=season,
                races_count=races_count,
                records_count=total_records,
                duration_seconds=duration
            )
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Failed to sync season {season}: {error_msg}")
            return SyncResult(
                success=False,
                season=season,
                error_message=error_msg,
                duration_seconds=time.time() - start_time
            )
    
    async def sync_all(self, seasons: Optional[list[int]] = None) -> SyncResult:
        """
        同步所有赛季数据
        
        Args:
            seasons: 要同步的赛季列表，不传则同步 1-8 赛季
        
        Returns:
            SyncResult: 同步结果
        """
        start_time = time.time()
        target_seasons = seasons or list(range(1, 9))
        
        logger.info(f"Syncing all seasons: {target_seasons}")
        
        total_races = 0
        total_records = 0
        
        for season in target_seasons:
            result = await self.sync_season(season)
            if result.success:
                total_races += result.races_count
                total_records += result.records_count
        
        duration = time.time() - start_time
        logger.info(f"Synced all: {len(target_seasons)} seasons, {total_races} races, {total_records} records in {duration:.2f}s")
        
        return SyncResult(
            success=True,
            races_count=total_races,
            records_count=total_records,
            duration_seconds=duration
        )
    
    async def get_sync_status(self) -> dict:
        """
        获取同步状态
        
        Returns:
            包含数据库统计和各赛季同步状态的字典
        """
        # 基础统计
        stats = await get_db_stats()
        
        async with async_session_maker() as session:
            # 按赛季统计
            season_stats = []
            for season in range(1, 9):
                races_count = await session.scalar(
                    select(func.count(Race.id)).where(Race.season == season)
                )
                results_count = await session.scalar(
                    select(func.count(Result.id)).where(Result.season == season)
                )
                last_sync = await session.scalar(
                    select(SyncLog.synced_at)
                    .where(SyncLog.season == season, SyncLog.status == "success")
                    .order_by(SyncLog.synced_at.desc())
                    .limit(1)
                )
                
                if races_count or results_count:
                    season_stats.append({
                        "season": season,
                        "races": races_count or 0,
                        "results": results_count or 0,
                        "last_sync": last_sync.isoformat() if last_sync else None
                    })
            
            stats["seasons"] = season_stats
        
        return stats

    async def get_sync_progress(self) -> dict:
        """
        获取详细的同步进度（用于监控面板）
        
        Returns:
            包含每个赛季进度和最近同步记录的字典
        """
        # 获取每个赛季的目标比赛数
        season_targets = {}
        for season in range(1, 9):
            try:
                races_df = self._client.list_races(season=season, force_refresh=False)
                season_targets[season] = len(races_df) if not races_df.empty else 0
            except Exception:
                season_targets[season] = 0
        
        async with async_session_maker() as session:
            # 各赛季同步进度
            seasons_progress = []
            total_synced = 0
            total_target = 0
            total_results = 0
            
            for season in range(1, 9):
                # 已同步比赛数
                synced_races = await session.scalar(
                    select(func.count(func.distinct(SyncLog.location)))
                    .where(SyncLog.season == season, SyncLog.status == "success")
                )
                synced_races = synced_races or 0
                
                # 已同步成绩数
                synced_results = await session.scalar(
                    select(func.count(Result.id)).where(Result.season == season)
                )
                synced_results = synced_results or 0
                
                # 最后同步时间
                last_sync = await session.scalar(
                    select(SyncLog.synced_at)
                    .where(SyncLog.season == season, SyncLog.status == "success")
                    .order_by(SyncLog.synced_at.desc())
                    .limit(1)
                )
                
                target = season_targets.get(season, 0)
                progress = (synced_races / target * 100) if target > 0 else 0
                
                seasons_progress.append({
                    "season": season,
                    "synced_races": synced_races,
                    "total_races": target,
                    "synced_results": synced_results,
                    "progress_percent": round(progress, 1),
                    "last_sync": last_sync.isoformat() if last_sync else None
                })
                
                total_synced += synced_races
                total_target += target
                total_results += synced_results
            
            # 最近同步记录
            recent_logs_query = (
                select(SyncLog)
                .where(SyncLog.status == "success")
                .order_by(SyncLog.synced_at.desc())
                .limit(15)
            )
            recent_logs_result = await session.execute(recent_logs_query)
            recent_logs = recent_logs_result.scalars().all()
            
            recent_syncs = []
            for log in recent_logs:
                recent_syncs.append({
                    "season": log.season,
                    "location": log.location,
                    "status": log.status,
                    "records_count": log.records_count,
                    "synced_at": log.synced_at.isoformat() if log.synced_at else ""
                })
            
            overall_progress = (total_synced / total_target * 100) if total_target > 0 else 0
            
            return {
                "total_synced_races": total_synced,
                "total_target_races": total_target,
                "total_synced_results": total_results,
                "overall_progress_percent": round(overall_progress, 1),
                "seasons": seasons_progress,
                "recent_syncs": recent_syncs,
                "is_syncing": False  # TODO: 实际同步状态检测
            }
    
    async def _upsert_race(
        self,
        session: AsyncSession,
        season: int,
        location: str,
        file_last_modified: Optional[str]
    ) -> None:
        """插入或更新比赛记录"""
        existing = await session.scalar(
            select(Race).where(Race.season == season, Race.location == location)
        )
        
        if existing:
            existing.file_last_modified = file_last_modified
        else:
            session.add(Race(
                season=season,
                location=location,
                file_last_modified=file_last_modified
            ))
    
    async def _log_sync(
        self,
        session: AsyncSession,
        season: Optional[int],
        location: Optional[str],
        status: str,
        records_count: int,
        error_message: Optional[str] = None
    ) -> None:
        """记录同步日志"""
        session.add(SyncLog(
            season=season,
            location=location,
            status=status,
            records_count=records_count,
            error_message=error_message
        ))


# 全局服务实例
_sync_service: Optional[SyncService] = None


def get_sync_service() -> SyncService:
    """获取全局 SyncService 实例"""
    global _sync_service
    if _sync_service is None:
        _sync_service = SyncService()
    return _sync_service

