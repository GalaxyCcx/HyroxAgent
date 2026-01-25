"""
名称建议服务单元测试
"""
import pytest

from app.services.suggest_service import match_name


class TestMatchName:
    """match_name 函数测试"""
    
    def test_normal_match(self):
        """测试正常匹配：chen yuan vs Chen, Yuanmin"""
        assert match_name("chen yuan", "Chen, Yuanmin") is True
    
    def test_order_independent(self):
        """测试顺序无关：yuan chen vs Chen, Yuanmin"""
        assert match_name("yuan chen", "Chen, Yuanmin") is True
    
    def test_partial_match(self):
        """测试部分匹配：yua vs Yuanmin"""
        assert match_name("yua", "Chen, Yuanmin") is True
    
    def test_case_insensitive(self):
        """测试大小写不敏感"""
        assert match_name("CHEN", "Chen, Yuanmin") is True
        assert match_name("Chen", "chen, yuanmin") is True
        assert match_name("chen", "CHEN, YUANMIN") is True
    
    def test_no_match(self):
        """测试不匹配情况：chen li vs Chen, Yuanmin"""
        assert match_name("chen li", "Chen, Yuanmin") is False
    
    def test_no_match_partial(self):
        """测试部分不匹配：yuanz vs Chen, Yuanmin"""
        assert match_name("yuanz", "Chen, Yuanmin") is False
    
    def test_single_keyword_match(self):
        """测试单个关键词匹配"""
        assert match_name("chen", "Chen, Yuanmin") is True
        assert match_name("yuanmin", "Chen, Yuanmin") is True
        assert match_name("mitch", "Chen, Mitch") is True
    
    def test_single_keyword_no_match(self):
        """测试单个关键词不匹配"""
        assert match_name("xyz", "Chen, Yuanmin") is False
        assert match_name("abc", "Mitchell, Scott") is False
    
    def test_with_comma(self):
        """测试名称中带逗号"""
        assert match_name("chen mitch", "Chen, Mitch") is True
        assert match_name("mitch chen", "Chen, Mitch") is True
    
    def test_multiple_words_name(self):
        """测试多词名称"""
        assert match_name("yuan chen", "Yuan Chen, Huijuan You") is True
        assert match_name("dustin", "Dustin Lu, Zheng Yuan Chen") is True
    
    def test_prefix_match(self):
        """测试前缀匹配"""
        assert match_name("ch", "Chen, Yuanmin") is True
        assert match_name("yu", "Chen, Yuanmin") is True
        assert match_name("ch yu", "Chen, Yuanmin") is True
    
    def test_empty_keyword(self):
        """测试空关键词"""
        # 空字符串分割后是空列表，所有词都匹配（没有词需要检查）
        assert match_name("", "Chen, Yuanmin") is True
    
    def test_whitespace_handling(self):
        """测试空格处理"""
        assert match_name("chen  yuan", "Chen, Yuanmin") is True  # 多余空格
        assert match_name(" chen ", "Chen, Yuanmin") is True  # 首尾空格


class TestMatchNameEdgeCases:
    """match_name 函数边界情况测试"""
    
    def test_special_characters_in_name(self):
        """测试名称中的特殊字符"""
        assert match_name("chen", "Chen-Ok, Mykyta") is True
        # 注意：当前实现把 "Chen-Ok" 作为一个整体，"ok" 不是单独词的前缀
        assert match_name("chen-ok", "Chen-Ok, Mykyta") is True
    
    def test_numbers_in_name(self):
        """测试名称中的数字（假设存在）"""
        # 这是边界情况，确保不会崩溃
        assert match_name("chen", "Chen123, Test") is True
        assert match_name("123", "Chen123, Test") is False  # 123 不是单词前缀
    
    def test_unicode_handling(self):
        """测试 Unicode 处理"""
        # 测试确保不会因为 Unicode 崩溃
        # 注意：当前实现假设名称是 ASCII，但应该不会崩溃
        assert match_name("chen", "陈, Yuan") is False  # 中文不匹配 chen

