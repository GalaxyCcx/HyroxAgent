"""
ConfigLoader - 配置加载器

负责加载并校验所有配置文件：
- sections.json: 章节结构定义
- model_config.json: 模型参数配置
- sections/{section_id}/tools.json: Function Call 定义
- sections/{section_id}/inputs.json: 输入数据规则
- sections/{section_id}/prompt.md: 系统提示词
"""

import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class SectionDefinition:
    """章节定义"""
    section_id: str
    title: str
    type: str  # "static" or "dynamic"
    order: int
    enabled: bool = True
    config_path: Optional[str] = None
    description: str = ""
    conditional: Optional[Dict[str, Any]] = None
    section_tag: Optional[str] = None  # V4: 如 "核心摘要", "第1章"
    subtitle: Optional[str] = None     # V4: 如 "The Lost 5 Minutes"


@dataclass
class ModelConfig:
    """模型配置"""
    model_name: str = "qwen-plus"
    max_tokens: int = 4096
    temperature: float = 0.3
    enable_thinking: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "model_name": self.model_name,
            "max_tokens": self.max_tokens,
            "temperature": self.temperature,
            "enable_thinking": self.enable_thinking,
        }


@dataclass
class SectionConfig:
    """章节完整配置"""
    section_id: str
    title: str
    type: str
    tool: Optional[Dict[str, Any]] = None  # tools.json
    tool_choice: Optional[Dict[str, Any]] = None
    blocks_mapping: Optional[Dict[str, Dict[str, str]]] = None
    prompt: str = ""  # prompt.md
    inputs: Optional[Dict[str, Any]] = None  # inputs.json
    model_config: Optional[ModelConfig] = None


class ConfigLoader:
    """配置加载器"""
    
    def __init__(self, config_dir: Optional[str] = None):
        if config_dir:
            self.config_dir = Path(config_dir)
        else:
            # 默认配置目录
            self.config_dir = Path(__file__).parent.parent / "configs"
        
        self._sections_config: Optional[Dict[str, Any]] = None
        self._model_config: Optional[Dict[str, Any]] = None
        self._section_configs: Dict[str, SectionConfig] = {}
        self._loaded = False
    
    def load_all(self, force_reload: bool = False) -> None:
        """加载所有配置
        
        Args:
            force_reload: 强制重新加载配置，忽略缓存
        """
        if self._loaded and not force_reload:
            return
        
        # 如果强制重新加载，清空缓存
        if force_reload:
            self._sections_config = None
            self._model_config = None
            self._section_configs = {}
            self._loaded = False
        
        logger.info(f"[ConfigLoader] 加载配置目录: {self.config_dir}")
        
        # 1. 加载 sections.json
        sections_path = self.config_dir / "sections.json"
        self._sections_config = self._load_json(sections_path)
        logger.info(f"[ConfigLoader] 已加载 sections.json: {len(self._sections_config.get('sections', []))} 个章节")
        
        # 2. 加载 model_config.json
        model_path = self.config_dir / "model_config.json"
        self._model_config = self._load_json(model_path)
        logger.info(f"[ConfigLoader] 已加载 model_config.json")
        
        # 3. 加载各章节配置
        for section in self._sections_config.get("sections", []):
            section_id = section["section_id"]
            if section["type"] == "dynamic" and section.get("config_path"):
                self._load_section_config(section_id, section)
            else:
                # 静态章节，创建基本配置
                self._section_configs[section_id] = SectionConfig(
                    section_id=section_id,
                    title=section["title"],
                    type=section["type"],
                )
        
        self._loaded = True
        logger.info(f"[ConfigLoader] 配置加载完成: {len(self._section_configs)} 个章节配置")
    
    def _load_json(self, path: Path) -> Dict[str, Any]:
        """加载 JSON 文件"""
        if not path.exists():
            logger.warning(f"[ConfigLoader] 配置文件不存在: {path}")
            return {}
        
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    
    def _load_text(self, path: Path) -> str:
        """加载文本文件"""
        if not path.exists():
            logger.warning(f"[ConfigLoader] 配置文件不存在: {path}")
            return ""
        
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    
    def _load_section_config(self, section_id: str, section_def: Dict[str, Any]) -> None:
        """加载单个章节的完整配置"""
        config_path = self.config_dir / section_def["config_path"]
        
        # 加载 tools.json
        tools_data = self._load_json(config_path / "tools.json")
        
        # 加载 inputs.json
        inputs_data = self._load_json(config_path / "inputs.json")
        
        # 加载 prompt.md
        prompt_text = self._load_text(config_path / "prompt.md")
        
        # 获取模型配置（支持章节级覆盖）
        model_config = self._get_model_config_for_section(section_id)
        
        self._section_configs[section_id] = SectionConfig(
            section_id=section_id,
            title=section_def["title"],
            type=section_def["type"],
            tool=tools_data.get("tool"),
            tool_choice=tools_data.get("tool_choice"),
            blocks_mapping=tools_data.get("blocks_mapping"),
            prompt=prompt_text,
            inputs=inputs_data,
            model_config=model_config,
        )
        
        logger.debug(f"[ConfigLoader] 已加载章节配置: {section_id}")
    
    def _get_model_config_for_section(self, section_id: str) -> ModelConfig:
        """获取章节的模型配置（支持覆盖）"""
        default_config = self._model_config.get("default", {})
        overrides = self._model_config.get("section_overrides", {}).get(section_id, {})
        
        # 合并配置
        merged = {**default_config, **overrides}
        
        return ModelConfig(
            model_name=merged.get("model_name", "qwen-plus"),
            max_tokens=merged.get("max_tokens", 4096),
            temperature=merged.get("temperature", 0.3),
            enable_thinking=merged.get("enable_thinking", False),
        )
    
    def get_sections_config(self) -> Dict[str, Any]:
        """获取章节结构配置"""
        self.load_all()
        return self._sections_config
    
    def get_section_definitions(self) -> List[SectionDefinition]:
        """获取所有章节定义（按顺序）"""
        self.load_all()
        
        definitions = []
        for section in self._sections_config.get("sections", []):
            definitions.append(SectionDefinition(
                section_id=section["section_id"],
                title=section["title"],
                type=section["type"],
                order=section["order"],
                enabled=section.get("enabled", True),
                config_path=section.get("config_path"),
                description=section.get("description", ""),
                conditional=section.get("conditional"),
                section_tag=section.get("section_tag"),
                subtitle=section.get("subtitle"),
            ))
        
        # 按 order 排序
        definitions.sort(key=lambda x: x.order)
        return definitions
    
    def get_dynamic_section_ids(self) -> List[str]:
        """获取所有动态章节的 ID（按顺序）"""
        definitions = self.get_section_definitions()
        all_dynamic = [d for d in definitions if d.type == "dynamic"]
        enabled_dynamic = [d for d in all_dynamic if d.enabled]
        
        # 调试日志
        logger.info(f"[ConfigLoader] get_dynamic_section_ids 调用:")
        logger.info(f"  - 所有章节数: {len(definitions)}")
        logger.info(f"  - 动态章节数: {len(all_dynamic)}")
        logger.info(f"  - 启用的动态章节: {[d.section_id for d in enabled_dynamic]}")
        for d in all_dynamic:
            logger.info(f"    - {d.section_id}: enabled={d.enabled}")
        
        return [d.section_id for d in enabled_dynamic]
    
    def get_section_config(self, section_id: str) -> Optional[SectionConfig]:
        """获取章节完整配置"""
        self.load_all()
        return self._section_configs.get(section_id)
    
    def get_model_config(self, section_id: Optional[str] = None) -> ModelConfig:
        """获取模型配置（支持章节级覆盖）"""
        self.load_all()
        
        if section_id and section_id in self._section_configs:
            section_config = self._section_configs[section_id]
            if section_config.model_config:
                return section_config.model_config
        
        # 返回默认配置
        return self._get_model_config_for_section("_default")
    
    def get_report_title_template(self) -> str:
        """获取报告标题模板"""
        self.load_all()
        return self._sections_config.get("report_title_template", "{athlete_name} - HYROX Report")


# 全局实例
_config_loader: Optional[ConfigLoader] = None


def get_config_loader() -> ConfigLoader:
    """获取全局 ConfigLoader 实例"""
    global _config_loader
    if _config_loader is None:
        _config_loader = ConfigLoader()
    return _config_loader


def reset_config_loader() -> ConfigLoader:
    """重置并返回新的 ConfigLoader 实例（用于强制重新加载配置）"""
    global _config_loader
    logger.info("[ConfigLoader] 强制重置全局实例")
    _config_loader = ConfigLoader()
    return _config_loader
