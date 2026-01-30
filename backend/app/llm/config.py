"""
LLM 配置管理模块
支持 LLM 配置的持久化存储和动态更新
"""
import json
from pathlib import Path
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class AgentConfig(BaseModel):
    """单个 Agent 的配置"""
    model: Optional[str] = None  # None 表示使用默认配置
    enable_thinking: Optional[bool] = None
    max_tokens: Optional[int] = None
    temperature: Optional[float] = None
    top_p: Optional[float] = None


class DefaultLLMConfig(BaseModel):
    """默认 LLM 配置"""
    model: str = "qwen-max-latest"
    enable_thinking: bool = False
    max_tokens: int = 8192
    temperature: float = 0.7
    top_p: float = 0.9


class LLMSettings(BaseModel):
    """LLM 完整配置"""
    api_key: str = ""
    base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    default: DefaultLLMConfig = Field(default_factory=DefaultLLMConfig)
    agents: Dict[str, AgentConfig] = Field(default_factory=lambda: {
        "center": AgentConfig(temperature=0.7, max_tokens=8192),
        "research": AgentConfig(temperature=0.5, max_tokens=8192),
        "summary": AgentConfig(temperature=0.7, max_tokens=8192),
    })


class LLMConfigManager:
    """LLM 配置管理器"""
    
    _instance: Optional["LLMConfigManager"] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self.llm_settings: Optional[LLMSettings] = None
        self._config_path = self._get_config_path()
        self._ensure_data_dir()
        self._load_config()
    
    def _get_config_path(self) -> Path:
        """获取配置文件路径"""
        # 配置文件放在 backend/data/llm_config.json
        return Path(__file__).parent.parent.parent / "data" / "llm_config.json"
    
    def _ensure_data_dir(self):
        """确保数据目录存在"""
        self._config_path.parent.mkdir(parents=True, exist_ok=True)
    
    def _load_config(self):
        """从文件加载配置"""
        if self._config_path.exists():
            try:
                with open(self._config_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                self.llm_settings = LLMSettings(**data)
                print(f"[LLM Config] 已加载配置: {self._config_path}")
            except Exception as e:
                print(f"[LLM Config] 加载配置失败: {e}, 使用默认配置")
                self.llm_settings = LLMSettings()
        else:
            print(f"[LLM Config] 配置文件不存在，使用默认配置")
            self.llm_settings = LLMSettings()
            # 保存默认配置
            self.save_config()
    
    def save_config(self):
        """保存配置到文件"""
        with open(self._config_path, "w", encoding="utf-8") as f:
            json.dump(self.llm_settings.model_dump(), f, ensure_ascii=False, indent=2)
        print(f"[LLM Config] 配置已保存: {self._config_path}")
    
    def update_api_key(self, api_key: str):
        """更新 API Key"""
        self.llm_settings.api_key = api_key
        self.save_config()
    
    def get_agent_config(self, agent_name: str) -> Dict[str, Any]:
        """获取指定 Agent 的完整配置（合并默认配置）"""
        default = self.llm_settings.default.model_dump()
        agent = self.llm_settings.agents.get(agent_name, AgentConfig()).model_dump()
        
        # 合并配置，agent 配置覆盖默认配置
        merged = default.copy()
        for key, value in agent.items():
            if value is not None:
                merged[key] = value
        
        return merged
    
    def get_llm_client_config(self) -> Dict[str, str]:
        """获取 LLM 客户端配置"""
        return {
            "api_key": self.llm_settings.api_key,
            "base_url": self.llm_settings.base_url,
        }
    
    def is_configured(self) -> bool:
        """检查是否已配置 API Key"""
        return bool(self.llm_settings.api_key)


# 全局配置管理器实例
llm_config_manager = LLMConfigManager()
