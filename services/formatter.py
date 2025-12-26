"""
文本格式化模块
处理 OCR 识别结果，保留原始格式和布局信息
支持中英文混排文本的格式化处理
"""

import re
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from loguru import logger


@dataclass
class FormattedText:
    """格式化后的文本结果"""
    content: str
    statistics: Dict[str, Any] = None


class TextFormatter:
    """文本格式化器类"""
    
    def __init__(self, preserve_layout: bool = True):
        """
        初始化文本格式化器
        
        Args:
            preserve_layout: 是否保留原始布局
        """
        self.preserve_layout = preserve_layout
    
    def format(self, text: str, page_num: int = None) -> FormattedText:
        """
        格式化文本
        
        Args:
            text: 原始文本
            page_num: 页码（可选）
            
        Returns:
            FormattedText: 格式化后的文本
        """
        # 基本清理
        cleaned_text = self._basic_cleanup(text)
        
        # 保留布局的处理
        if self.preserve_layout:
            cleaned_text = self._preserve_layout(cleaned_text)
        
        # 中英文混排优化
        cleaned_text = self._optimize_mixed_language(cleaned_text)
        
        # 特殊字符处理
        cleaned_text = self._handle_special_chars(cleaned_text)
        
        # 计算统计信息
        stats = self._calculate_statistics(cleaned_text)
        
        return FormattedText(
            content=cleaned_text,
            statistics=stats,
        )
    
    def _basic_cleanup(self, text: str) -> str:
        """
        基本文本清理
        
        Args:
            text: 原始文本
            
        Returns:
            str: 清理后的文本
        """
        if not text:
            return ""
        
        # 移除多余的空白字符
        lines = text.split('\n')
        cleaned_lines = []
        
        for line in lines:
            # 移除行首行尾空白
            stripped_line = line.strip()
            
            # 跳过空行（但保留段落分隔）
            if stripped_line:
                cleaned_lines.append(stripped_line)
            else:
                # 保留一个空行作为段落分隔
                if cleaned_lines and cleaned_lines[-1] != '':
                    cleaned_lines.append('')
        
        # 合并连续空行
        cleaned_lines = self._merge_empty_lines(cleaned_lines)
        
        return '\n'.join(cleaned_lines)
    
    def _merge_empty_lines(self, lines: List[str]) -> List[str]:
        """
        合并连续空行
        
        Args:
            lines: 行列表
            
        Returns:
            List[str]: 合并后的行列表
        """
        if not lines:
            return lines
        
        merged = []
        empty_count = 0
        
        for line in lines:
            if line == '':
                empty_count += 1
                if empty_count <= 2:  # 最多保留两个连续空行
                    merged.append(line)
            else:
                empty_count = 0
                merged.append(line)
        
        # 确保末尾不为空行
        while merged and merged[-1] == '':
            merged.pop()
        
        return merged
    
    def _preserve_layout(self, text: str) -> str:
        """
        保留文本布局
        
        Args:
            text: 原始文本
            
        Returns:
            str: 保留布局的文本
        """
        lines = text.split('\n')
        formatted_lines = []
        
        for line in lines:
            if not line:
                continue
            
            # 检测是否是标题行（短行、无标点结尾）
            if self._is_title_line(line):
                formatted_lines.append(f"## {line}")
            # 检测是否是列表项
            elif self._is_list_item(line):
                formatted_lines.append(f"• {line}")
            # 普通段落
            else:
                formatted_lines.append(line)
        
        return '\n'.join(formatted_lines)
    
    def _is_title_line(self, line: str) -> bool:
        """
        判断是否为标题行
        
        Args:
            line: 文本行
            
        Returns:
            bool: 是否为标题行
        """
        # 标题特征：较短，无句末标点
        if len(line) < 50 and not line.endswith(('.', '。', '!', '！', '?', '？')):
            # 检查是否包含常见标题词汇
            title_keywords = ['第', '章', '节', '概述', '简介', '总结', '结论', '摘要']
            if any(kw in line for kw in title_keywords):
                return True
            # 纯数字或大写字母开头可能是标题
            if line and (line[0].isdigit() or line[0].isupper()):
                return True
        return False
    
    def _is_list_item(self, line: str) -> bool:
        """
        判断是否为列表项
        
        Args:
            line: 文本行
            
        Returns:
            bool: 是否为列表项
        """
        # 列表项特征：以数字、字母、符号开头
        list_patterns = [
            r'^\d+[\.\、]',      # 1. 2. 或 1、2、
            r'^[a-zA-Z][\.\、]', # a. b. 或 a、b、
            r'^[\•\·\-\*]\s',    # • · - * 
        ]
        
        return any(re.match(pattern, line.strip()) for pattern in list_patterns)
    
    def _optimize_mixed_language(self, text: str) -> str:
        """
        优化中英文混排文本
        
        Args:
            text: 原始文本
            
        Returns:
            str: 优化后的文本
        """
        # 中英文之间添加空格
        text = self._add_spaces_between_languages(text)
        
        # 处理常见混排问题
        text = self._fix_common_mixing_issues(text)
        
        return text
    
    def _add_spaces_between_languages(self, text: str) -> str:
        """
        在中英文之间添加空格
        
        Args:
            text: 原始文本
            
        Returns:
            str: 添加空格后的文本
        """
        # 中文字符范围: \u4e00-\u9fff
        # 英文字母范围: a-zA-Z
        
        # 在中文和英文之间添加空格
        result = []
        i = 0
        
        while i < len(text):
            char = text[i]
            result.append(char)
            
            # 检查当前字符和下一个字符是否需要添加空格
            if i < len(text) - 1:
                current_is_chinese = bool(re.search('[\u4e00-\u9fff]', char))
                next_char = text[i + 1]
                next_is_chinese = bool(re.search('[\u4e00-\u9fff]', next_char))
                next_is_letter = bool(re.search('[a-zA-Z]', next_char))
                
                # 中文和英文/数字之间添加空格
                if current_is_chinese and next_is_letter:
                    result.append(' ')
                elif not current_is_chinese and next_is_chinese and next_char.isalpha():
                    result.append(' ')
            
            i += 1
        
        return ''.join(result)
    
    def _fix_common_mixing_issues(self, text: str) -> str:
        """
        修复常见的中英文混排问题
        
        Args:
            text: 原始文本
            
        Returns:
            str: 修复后的文本
        """
        fixes = [
            # 修复英文标点周围缺少空格
            (r'([a-zA-Z])，', r'\1 , '),
            (r'。([a-zA-Z])', r' . \1'),
            # 修复引号问题
            (r'""', '"'),  # 规范化引号
            (r'""', '"'),
            # 修复括号问题
            (r'\s*\(\s*', ' ('),
            (r'\s*\)\s*', ') '),
            # 移除多余空格（中文周围）
            (r"""\s+([，。！？；："']+)""", r'\1'),
            (r'["""\']\s+', r'\1'),
        ]
        
        for pattern, replacement in fixes:
            text = re.sub(pattern, replacement, text)
        
        return text
    
    def _handle_special_chars(self, text: str) -> str:
        """
        处理特殊字符
        
        Args:
            text: 原始文本
            
        Returns:
            str: 处理后的文本
        """
        # Unicode 规范化
        text = self._normalize_unicode(text)
        
        # 替换特殊空白字符
        text = re.sub(r'[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]', ' ', text)
        
        # 规范化换行符
        text = text.replace('\r\n', '\n').replace('\r', '\n')
        
        return text
    
    def _normalize_unicode(self, text: str) -> str:
        """
        Unicode 规范化
        
        Args:
            text: 原始文本
            
        Returns:
            str: 规范化后的文本
        """
        # 使用 unicodedata 进行规范化
        try:
            import unicodedata
            # NFC 规范化（组合字符标准化）
            text = unicodedata.normalize('NFC', text)
        except ImportError:
            pass
        
        return text
    
    def _calculate_statistics(self, text: str) -> Dict[str, Any]:
        """
        计算文本统计信息
        
        Args:
            text: 文本内容
            
        Returns:
            Dict[str, Any]: 统计信息
        """
        stats = {
            'char_count': len(text),
            'line_count': len(text.split('\n')),
            'word_count': len(text.split()),
            'chinese_count': len(re.findall(r'[\u4e00-\u9fff]', text)),
            'english_count': len(re.findall(r'[a-zA-Z]', text)),
            'digit_count': len(re.findall(r'\d', text)),
        }
        
        # 检测是否包含中英文混排
        stats['has_mixed_language'] = (
            stats['chinese_count'] > 0 and stats['english_count'] > 0
        )
        
        return stats


class LayoutPreserver:
    """布局保持器 - 高级布局保留"""
    
    def __init__(self, line_break_threshold: float = 20.0, paragraph_break_threshold: float = 50.0):
        """
        初始化布局保持器
        
        Args:
            line_break_threshold: 行分隔阈值（像素）
            paragraph_break_threshold: 段落分隔阈值（像素）
        """
        self.line_break_threshold = line_break_threshold
        self.paragraph_break_threshold = paragraph_break_threshold
    
    def reconstruct_from_blocks(self, blocks: List[Dict]) -> str:
        """
        从文本块重建格式化文本
        
        Args:
            blocks: 文本块列表，每个块包含 text, x0, top, x1, bottom
            
        Returns:
            str: 重建的文本
        """
        if not blocks:
            return ""
        
        # 按页面分组
        pages = {}
        for block in blocks:
            page_num = block.get('page_num', 1)
            if page_num not in pages:
                pages[page_num] = []
            pages[page_num].append(block)
        
        # 处理每一页
        page_texts = []
        for page_num in sorted(pages.keys()):
            page_blocks = pages[page_num]
            page_text = self._reconstruct_page(page_blocks)
            page_texts.append(f"--- 第 {page_num} 页 ---\n\n{page_text}")
        
        return '\n\n'.join(page_texts)
    
    def _reconstruct_page(self, blocks: List[Dict]) -> str:
        """
        重建单页文本
        
        Args:
            blocks: 页面文本块列表
            
        Returns:
            str: 重建的页面文本
        """
        if not blocks:
            return ""
        
        # 按 Y 坐标排序
        sorted_blocks = sorted(blocks, key=lambda x: x.get('top', 0))
        
        lines = []
        current_line = []
        current_y = None
        
        for block in sorted_blocks:
            y = block.get('top', 0)
            text = block.get('text', '')
            
            if current_y is None:
                current_y = y
                current_line = [block]
            elif y - current_y < self.line_break_threshold:
                # 同一行
                current_line.append(block)
            else:
                # 新行
                if current_line:
                    # 按 X 坐标排序并合并
                    current_line.sort(key=lambda x: x.get('x0', 0))
                    line_text = '  '.join(b.get('text', '') for b in current_line)
                    lines.append(line_text)
                
                # 检测是否为段落分隔
                if y - current_y > self.paragraph_break_threshold:
                    lines.append('')
                
                current_y = y
                current_line = [block]
        
        # 处理最后一行
        if current_line:
            current_line.sort(key=lambda x: x.get('x0', 0))
            line_text = '  '.join(b.get('text', '') for b in current_line)
            lines.append(line_text)
        
        return '\n'.join(lines)
