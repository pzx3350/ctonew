"""
OCR 处理模块
使用 PaddleOCR 对图像和扫描型 PDF 进行文字识别
支持中英文混排文本识别
"""

import os
import io
import cv2
import numpy as np
from PIL import Image
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from loguru import logger

# 延迟导入 PaddleOCR，避免启动时加载过慢
PADDLEOCR_AVAILABLE = True
try:
    from paddleocr import PaddleOCR, draw_ocr
except ImportError:
    PADDLEOCR_AVAILABLE = False
    logger.warning("⚠️ PaddleOCR 未安装，将使用备用识别方案")


@dataclass
class OCRResult:
    """OCR 识别结果"""
    text: str
    confidence: float
    bounding_box: Tuple[float, float, float, float]  # (x0, y0, x1, y1)


@dataclass
class OCRPageResult:
    """单页 OCR 结果"""
    page_num: int
    results: List[OCRResult] = None
    full_text: str = ""
    confidence_avg: float = 0.0
    is_empty: bool = False


class OCROnlyFallback:
    """OCR 备用方案（当 PaddleOCR 不可用时）"""
    
    def __init__(self):
        self.is_available = False
    
    def __call__(self, image):
        """处理图像"""
        return []


class OCREngine:
    """OCR 引擎类"""
    
    def __init__(self, languages: List[str] = None, use_gpu: bool = False):
        """
        初始化 OCR 引擎
        
        Args:
            languages: 识别语言列表，默认 ['ch', 'en']
            use_gpu: 是否使用 GPU
        """
        self.languages = languages or ['ch', 'en']
        self.use_gpu = use_gpu
        self.ocr = None
        self._initialize_engine()
    
    def _initialize_engine(self):
        """初始化 PaddleOCR 引擎"""
        if not PADDLEOCR_AVAILABLE:
            logger.warning("⚠️ PaddleOCR 不可用")
            self.ocr = OCROnlyFallback()
            return
        
        try:
            # 构建语言参数字符串
            lang = '+'.join(self.languages)
            
            # 初始化 PaddleOCR
            self.ocr = PaddleOCR(
                use_angle_cls=True,  # 识别任意方向文本
                lang=lang,
                use_gpu=self.use_gpu,
                det_db_thresh=0.3,
                det_db_box_thresh=0.6,
                rec_batch_num=1,
                use_space_char=True,  # 识别空格字符
            )
            
            logger.info(f"✅ PaddleOCR 引擎初始化成功")
            logger.info(f"🌐 识别语言: {self.languages}")
            logger.info(f"⚡ GPU 加速: {'是' if self.use_gpu else '否'}")
            
        except Exception as e:
            logger.error(f"❌ PaddleOCR 初始化失败: {e}")
            self.ocr = OCROnlyFallback()
    
    def process_image(self, image_path: str) -> OCRPageResult:
        """
        处理图像文件
        
        Args:
            image_path: 图像文件路径
            
        Returns:
            OCRPageResult: OCR 识别结果
        """
        if not os.path.exists(image_path):
            logger.error(f"❌ 图像文件不存在: {image_path}")
            return OCRPageResult(page_num=1, is_empty=True)
        
        try:
            image = Image.open(image_path)
            return self.process_image_data(image)
        except Exception as e:
            logger.error(f"❌ 处理图像失败: {e}")
            return OCRPageResult(page_num=1, is_empty=True)
    
    def process_image_data(self, image: Image.Image) -> OCRPageResult:
        """
        处理 PIL 图像对象
        
        Args:
            image: PIL 图像对象
            
        Returns:
            OCRPageResult: OCR 识别结果
        """
        if self.ocr is None or isinstance(self.ocr, OCROnlyFallback):
            return OCRPageResult(page_num=1, is_empty=True)
        
        try:
            # 将 PIL 图像转换为 numpy 数组
            img_array = np.array(image)
            
            # BGR 转换（PaddleOCR 需要 BGR）
            if len(img_array.shape) == 3:
                img_bgr = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
            else:
                img_bgr = img_array
            
            # 执行 OCR 识别
            result = self.ocr.ocr(img_bgr, cls=True)
            
            # 解析结果
            return self._parse_ocr_result(result, page_num=1)
            
        except Exception as e:
            logger.error(f"❌ OCR 处理失败: {e}")
            return OCRPageResult(page_num=1, is_empty=True)
    
    def process_pdf_page(self, page_image: bytes) -> OCRPageResult:
        """
        处理 PDF 页面图像数据
        
        Args:
            page_image: 页面图像字节数据
            
        Returns:
            OCRPageResult: OCR 识别结果
        """
        try:
            # 从字节数据创建图像
            image = Image.open(io.BytesIO(page_image))
            return self.process_image_data(image)
        except Exception as e:
            logger.error(f"❌ 处理 PDF 页面图像失败: {e}")
            return OCRPageResult(page_num=1, is_empty=True)
    
    def _parse_ocr_result(self, ocr_result, page_num: int = 1) -> OCRPageResult:
        """
        解析 PaddleOCR 结果
        
        Args:
            ocr_result: PaddleOCR 原始结果
            page_num: 页码
            
        Returns:
            OCRPageResult: 解析后的结果
        """
        if not ocr_result or not ocr_result[0]:
            return OCRPageResult(page_num=page_num, is_empty=True)
        
        results = []
        full_text_parts = []
        confidences = []
        
        # 遍历所有识别结果
        for line in ocr_result[0]:
            if line:
                # 提取文本和置信度
                text = line[1][0] if len(line) > 1 else ""
                confidence = line[1][1] if len(line) > 1 else 0.0
                
                # 提取边界框
                bbox = line[0] if len(line) > 0 else None
                if bbox:
                    # 边界框格式: [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
                    x_coords = [p[0] for p in bbox]
                    y_coords = [p[1] for p in bbox]
                    bounding_box = (
                        min(x_coords),
                        min(y_coords),
                        max(x_coords),
                        max(y_coords),
                    )
                else:
                    bounding_box = (0, 0, 0, 0)
                
                if text.strip():
                    results.append(OCRResult(
                        text=text,
                        confidence=confidence,
                        bounding_box=bounding_box,
                    ))
                    full_text_parts.append(text)
                    confidences.append(confidence)
        
        # 计算平均置信度
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
        
        # 合并文本（按行排序）
        full_text = '\n'.join(full_text_parts)
        
        return OCRPageResult(
            page_num=page_num,
            results=results,
            full_text=full_text,
            confidence_avg=avg_confidence,
            is_empty=len(results) == 0,
        )
    
    def process_multiple_pages(self, page_images: List[bytes]) -> List[OCRPageResult]:
        """
        批量处理多个页面
        
        Args:
            page_images: 页面图像字节数据列表
            
        Returns:
            List[OCRPageResult]: OCR 结果列表
        """
        results = []
        
        for idx, page_image in enumerate(page_images, start=1):
            logger.info(f"🔍 正在处理第 {idx}/{len(page_images)} 页...")
            result = self.process_pdf_page(page_image)
            result.page_num = idx
            results.append(result)
        
        return results
    
    def merge_results(self, results: List[OCRPageResult]) -> Tuple[str, float]:
        """
        合并多页 OCR 结果
        
        Args:
            results: OCR 结果列表
            
        Returns:
            Tuple[str, float]: (合并后的文本, 平均置信度)
        """
        text_parts = []
        confidences = []
        
        for result in results:
            if result.full_text:
                text_parts.append(result.full_text)
            if result.confidence_avg > 0:
                confidences.append(result.confidence_avg)
        
        # 使用分页符连接
        full_text = '\n\n--- 第 {} 页 ---\n\n'.format(
            '{}'
        ).join(text_parts) if len(text_parts) > 1 else '\n\n'.join(text_parts)
        
        # 计算整体平均置信度
        overall_confidence = sum(confidences) / len(confidences) if confidences else 0.0
        
        return full_text, overall_confidence
    
    def get_text_with_layout(self, results: List[OCRPageResult]) -> str:
        """
        获取保留布局的文本（按位置排序）
        
        Args:
            results: OCR 结果列表
            
        Returns:
            str: 保留布局的文本
        """
        all_lines = []
        
        for page_result in results:
            if not page_result.results:
                continue
            
            # 按 Y 坐标排序（从上到下）
            sorted_results = sorted(
                page_result.results,
                key=lambda x: x.bounding_box[1]
            )
            
            # 按行分组
            current_line = []
            current_y = None
            line_height_threshold = 10
            
            for ocr_result in sorted_results:
                bbox = ocr_result.bounding_box
                y = bbox[1]  # 顶部 Y 坐标
                
                if current_y is None:
                    current_y = y
                    current_line = [ocr_result]
                elif abs(y - current_y) < line_height_threshold:
                    # 同一行
                    current_line.append(ocr_result)
                else:
                    # 新行，保存当前行
                    if current_line:
                        # 按 X 坐标排序（从左到右）
                        current_line.sort(key=lambda x: x.bounding_box[0])
                        line_text = ' '.join(r.text for r in current_line)
                        all_lines.append(line_text)
                    # 开始新行
                    current_y = y
                    current_line = [ocr_result]
            
            # 处理最后一行
            if current_line:
                current_line.sort(key=lambda x: x.bounding_box[0])
                line_text = ' '.join(r.text for r in current_line)
                all_lines.append(line_text)
            
            # 添加页面分隔符
            all_lines.append('')
        
        return '\n'.join(all_lines)
