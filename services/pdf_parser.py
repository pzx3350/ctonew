"""
PDF 解析模块
使用 pdfplumber 提取 PDF 中的文本、布局和结构信息
"""

import os
import pdfplumber
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from loguru import logger


@dataclass
class TextBlock:
    """文本块信息"""
    text: str
    x0: float  # 左边界
    top: float  # 上边界
    x1: float  # 右边界
    bottom: float  # 下边界
    page_num: int
    font_name: Optional[str] = None
    font_size: Optional[float] = None


@dataclass
class TableData:
    """表格数据"""
    rows: List[List[str]]
    page_num: int
    x0: float
    top: float
    x1: float
    bottom: float


@dataclass
class PageContent:
    """单页内容"""
    page_num: int
    text_blocks: List[TextBlock] = field(default_factory=list)
    tables: List[TableData] = field(default_factory=list)
    images: List[Dict[str, Any]] = field(default_factory=list)
    width: float = 0.0
    height: float = 0.0
    text: str = ""  # 纯文本内容


class PDFParser:
    """PDF 解析器类"""
    
    def __init__(self, pdf_path: str):
        """
        初始化 PDF 解析器
        
        Args:
            pdf_path: PDF 文件路径
        """
        self.pdf_path = pdf_path
        self.pdf = None
        self.pages: List[PageContent] = []
        self._is_scanned = False
        
    def __enter__(self):
        """上下文管理器入口"""
        self.open()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """上下文管理器退出"""
        self.close()
        
    def open(self) -> bool:
        """
        打开 PDF 文件
        
        Returns:
            bool: 是否成功打开
        """
        try:
            if os.path.exists(self.pdf_path):
                self.pdf = pdfplumber.open(self.pdf_path)
                logger.info(f"✅ 成功打开 PDF 文件: {self.pdf_path}")
                logger.info(f"📄 PDF 页数: {len(self.pdf.pages)}")
                return True
            else:
                logger.error(f"❌ PDF 文件不存在: {self.pdf_path}")
                return False
        except Exception as e:
            logger.error(f"❌ 打开 PDF 文件失败: {e}")
            return False
    
    def close(self):
        """关闭 PDF 文件"""
        if self.pdf:
            self.pdf.close()
            self.pdf = None
            logger.info("🔒 PDF 文件已关闭")
    
    def extract_all_pages(self) -> List[PageContent]:
        """
        提取所有页面的内容
        
        Returns:
            List[PageContent]: 所有页面的内容列表
        """
        if not self.pdf:
            if not self.open():
                return []
        
        self.pages = []
        
        for page_num, page in enumerate(self.pdf.pages, start=1):
            try:
                page_content = self.extract_page(page, page_num)
                self.pages.append(page_content)
            except Exception as e:
                logger.error(f"❌ 提取第 {page_num} 页失败: {e}")
                continue
        
        logger.info(f"✅ 成功提取 {len(self.pages)} 页内容")
        return self.pages
    
    def extract_page(self, page: pdfplumber.page.Page, page_num: int) -> PageContent:
        """
        提取单页内容
        
        Args:
            page: pdfplumber 页面对象
            page_num: 页码
            
        Returns:
            PageContent: 页面内容对象
        """
        # 获取页面基本信息
        width = page.width if hasattr(page, 'width') else 0
        height = page.height if hasattr(page, 'height') else 0
        
        # 提取文本块
        text_blocks = self._extract_text_blocks(page, page_num)
        
        # 提取表格
        tables = self._extract_tables(page, page_num)
        
        # 提取纯文本
        text = page.extract_text() or ""
        
        # 检测是否为扫描型 PDF
        has_text_content = len(text.strip()) > 0 or len(text_blocks) > 0
        
        # 返回页面内容
        return PageContent(
            page_num=page_num,
            text_blocks=text_blocks,
            tables=tables,
            images=[],  # 图片提取需要额外处理
            width=width,
            height=height,
            text=text,
        )
    
    def _extract_text_blocks(self, page: pdfplumber.page.Page, page_num: int) -> List[TextBlock]:
        """
        提取页面中的文本块
        
        Args:
            page: pdfplumber 页面对象
            page_num: 页码
            
        Returns:
            List[TextBlock]: 文本块列表
        """
        text_blocks = []
        
        # 使用 extract_words 获取单词级别的位置信息
        words = page.extract_words(
            keep_blank_chars=True,
            use_text_flow=False,
            min_wordsize=3,
        )
        
        if not words:
            # 如果没有单词，尝试直接提取文本
            text = page.extract_text()
            if text:
                # 创建一个覆盖整个页面的文本块
                text_blocks.append(TextBlock(
                    text=text,
                    x0=0,
                    top=0,
                    x1=page.width if hasattr(page, 'width') else 612,
                    bottom=page.height if hasattr(page, 'height') else 792,
                    page_num=page_num,
                ))
            return text_blocks
        
        # 按行分组文本块
        current_line = []
        current_top = None
        
        for word in words:
            word_top = word['top']
            
            # 判断是否新行（基于行高阈值）
            if current_top is None:
                current_top = word_top
                current_line = [word]
            elif abs(word_top - current_top) < 5:  # 5像素容差
                current_line.append(word)
            else:
                # 保存当前行
                if current_line:
                    text_blocks.extend(self._create_text_blocks_from_line(current_line, page_num))
                # 开始新行
                current_top = word_top
                current_line = [word]
        
        # 处理最后一行
        if current_line:
            text_blocks.extend(self._create_text_blocks_from_line(current_line, page_num))
        
        # 按位置排序
        text_blocks.sort(key=lambda x: (x.top, x.x0))
        
        return text_blocks
    
    def _create_text_blocks_from_line(self, words: List[Dict], page_num: int) -> List[TextBlock]:
        """
        从一行单词创建文本块
        
        Args:
            words: 单词列表
            page_num: 页码
            
        Returns:
            List[TextBlock]: 文本块列表
        """
        if not words:
            return []
        
        # 合并同一行的单词
        text = ' '.join(word['text'] for word in words)
        
        # 计算边界框
        x0 = min(word['x0'] for word in words)
        top = min(word['top'] for word in words)
        x1 = max(word['x1'] for word in words)
        bottom = max(word['bottom'] for word in words)
        
        # 获取字体信息（如果有）
        font_name = words[0].get('fontname')
        font_size = words[0].get('size')
        
        return [TextBlock(
            text=text,
            x0=x0,
            top=top,
            x1=x1,
            bottom=bottom,
            page_num=page_num,
            font_name=font_name,
            font_size=font_size,
        )]
    
    def _extract_tables(self, page: pdfplumber.page.Page, page_num: int) -> List[TableData]:
        """
        提取页面中的表格
        
        Args:
            page: pdfplumber 页面对象
            page_num: 页码
            
        Returns:
            List[TableData]: 表格数据列表
        """
        tables = []
        
        try:
            extracted_tables = page.extract_tables()
            
            for table_idx, table in enumerate(extracted_tables):
                if table:
                    # 计算表格位置
                    cells = page.find_table().cells if hasattr(page, 'find_table') else []
                    
                    x0 = top = 0
                    x1 = bottom = 0
                    
                    tables.append(TableData(
                        rows=table,
                        page_num=page_num,
                        x0=x0,
                        top=top,
                        x1=x1,
                        bottom=bottom,
                    ))
                    
        except Exception as e:
            logger.warning(f"⚠️ 提取第 {page_num} 页表格时出错: {e}")
        
        return tables
    
    def get_text(self) -> str:
        """
        获取整个 PDF 的纯文本内容
        
        Returns:
            str: PDF 文本内容
        """
        if not self.pages:
            self.extract_all_pages()
        
        return '\n\n'.join(page.text for page in self.pages)
    
    def get_text_blocks(self) -> List[TextBlock]:
        """
        获取所有页面的文本块
        
        Returns:
            List[TextBlock]: 所有文本块列表
        """
        if not self.pages:
            self.extract_all_pages()
        
        all_blocks = []
        for page in self.pages:
            all_blocks.extend(page.text_blocks)
        
        return all_blocks
    
    def detect_if_scanned(self) -> bool:
        """
        检测是否为扫描型 PDF（无文本层）
        
        Returns:
            bool: 是否为扫描型 PDF
        """
        if not self.pdf:
            self.open()
        
        total_text = 0
        for page in self.pdf.pages:
            text = page.extract_text() or ""
            total_text += len(text.strip())
        
        self._is_scanned = total_text < 100  # 少于100字符认为可能是扫描型
        return self._is_scanned
    
    def extract_page_image(self, page_num: int, dpi: int = 300) -> Optional[bytes]:
        """
        提取页面为图像（用于 OCR）
        
        Args:
            page_num: 页码（从1开始）
            dpi: 图像分辨率
            
        Returns:
            bytes: 图像数据
        """
        if not self.pdf:
            return None
        
        if 1 <= page_num <= len(self.pdf.pages):
            page = self.pdf.pages[page_num - 1]
            return page.to_image(resolution=dpi).original.tobytes()
        
        return None
