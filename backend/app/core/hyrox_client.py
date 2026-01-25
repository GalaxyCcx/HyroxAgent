"""
HYROX 数据客户端封装
封装 pyrox-client 库，提供统一的数据获取接口
"""
import logging
from functools import lru_cache
from pathlib import Path
from typing import Optional

import pandas as pd
from pyrox import PyroxClient

logger = logging.getLogger(__name__)


class HyroxClient:
    """
    HYROX 数据客户端
    
    封装 pyrox-client，提供：
    - 比赛列表获取
    - 单场比赛数据获取
    - 数据缓存管理
    """
    
    def __init__(self, cache_dir: Optional[Path] = None):
        """
        初始化客户端
        
        Args:
            cache_dir: 缓存目录路径，不传则使用默认缓存
        """
        self._client = PyroxClient(cache_dir=cache_dir)
        logger.info("HyroxClient initialized")
    
    def list_races(
        self,
        season: Optional[int] = None,
        force_refresh: bool = False
    ) -> pd.DataFrame:
        """
        获取比赛列表
        
        Args:
            season: 赛季编号 (1-8)，不传则返回所有赛季
            force_refresh: 是否强制刷新缓存
        
        Returns:
            包含比赛列表的 DataFrame，字段:
            - season: 赛季编号
            - location: 比赛地点
            - file_last_modified: 数据更新时间
        """
        try:
            races = self._client.list_races(season=season, force_refresh=force_refresh)
            logger.info(f"Fetched {len(races)} races" + (f" for season {season}" if season else ""))
            return races
        except Exception as e:
            logger.error(f"Failed to list races: {e}")
            raise
    
    def get_race(
        self,
        season: int,
        location: str,
        gender: Optional[str] = None,
        division: Optional[str] = None,
        use_cache: bool = True
    ) -> pd.DataFrame:
        """
        获取单场比赛数据
        
        Args:
            season: 赛季编号 (1-8)
            location: 比赛地点 (小写，如 "amsterdam")
            gender: 性别筛选 ("male", "female", "mixed")
            division: 组别筛选 ("open", "pro", "doubles", "pro_doubles")
            use_cache: 是否使用缓存
        
        Returns:
            包含选手成绩的 DataFrame
        """
        try:
            data = self._client.get_race(
                season=season,
                location=location,
                gender=gender,
                division=division,
                use_cache=use_cache
            )
            logger.info(f"Fetched {len(data)} athletes for {location} season {season}")
            return data
        except FileNotFoundError as e:
            logger.warning(f"Race not found: season={season}, location={location}")
            raise
        except Exception as e:
            logger.error(f"Failed to get race data: {e}")
            raise
    
    def get_season(
        self,
        season: int,
        locations: Optional[list[str]] = None,
        gender: Optional[str] = None,
        division: Optional[str] = None,
        max_workers: int = 4,
        use_cache: bool = True
    ) -> pd.DataFrame:
        """
        获取整个赛季数据
        
        Args:
            season: 赛季编号
            locations: 指定比赛地点列表，不传则获取全部
            gender: 性别筛选
            division: 组别筛选
            max_workers: 并行下载线程数
            use_cache: 是否使用缓存
        
        Returns:
            合并后的所有比赛数据
        """
        try:
            data = self._client.get_season(
                season=season,
                locations=locations,
                gender=gender,
                division=division,
                max_workers=max_workers,
                use_cache=use_cache
            )
            logger.info(f"Fetched {len(data)} total athletes for season {season}")
            return data
        except Exception as e:
            logger.error(f"Failed to get season data: {e}")
            raise
    
    def search_athlete_in_race(
        self,
        season: int,
        location: str,
        name: str
    ) -> pd.DataFrame:
        """
        在单场比赛中搜索运动员
        
        Args:
            season: 赛季编号
            location: 比赛地点
            name: 运动员姓名（支持模糊匹配）
        
        Returns:
            匹配的运动员数据
        """
        race_data = self.get_race(season=season, location=location)
        
        # 模糊匹配姓名（不区分大小写）
        matched = race_data[
            race_data['name'].str.contains(name, case=False, na=False)
        ]
        
        return matched
    
    def clear_cache(self, pattern: Optional[str] = None):
        """
        清除缓存
        
        Args:
            pattern: 缓存模式，不传则清除全部
        """
        try:
            self._client.clear_cache(pattern=pattern)
            logger.info(f"Cache cleared" + (f" with pattern: {pattern}" if pattern else ""))
        except Exception as e:
            logger.error(f"Failed to clear cache: {e}")
            raise


# 全局客户端实例
_hyrox_client: Optional[HyroxClient] = None


def get_hyrox_client() -> HyroxClient:
    """获取全局 HyroxClient 实例（单例模式）"""
    global _hyrox_client
    if _hyrox_client is None:
        _hyrox_client = HyroxClient()
    return _hyrox_client




