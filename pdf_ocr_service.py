"""
PDF OCR Service - PaddleOCR 修复版本

这个文件提供了 PDF 文字识别功能，修复了 PIL Image 到 numpy array 的转换问题。
"""
from typing import List, Dict, Any
import numpy as np
from PIL import Image


class PaddleOCRService:
    """PaddleOCR 服务类，处理 PDF 和图像的文字识别"""
    
    def __init__(self, use_gpu: bool = False, lang: str = 'ch'):
        """
        初始化 PaddleOCR 服务
        
        Args:
            use_gpu: 是否使用 GPU
            lang: 语言，'ch' 为中文，'en' 为英文，'multilang' 为中英混合
        """
        self.use_gpu = use_gpu
        self.lang = lang
        self.ocr_engine = None
        self._initialize_engine()
    
    def _initialize_engine(self):
        """初始化 PaddleOCR 引擎"""
        try:
            from paddleocr import PaddleOCR
            self.ocr_engine = PaddleOCR(
                use_angle_cls=True,
                lang=self.lang,
                use_gpu=self.use_gpu,
                show_log=False
            )
        except ImportError:
            print("警告: PaddleOCR 未安装，OCR 功能将不可用")
            self.ocr_engine = None
    
    def _pil_to_numpy(self, image: Image.Image) -> np.ndarray:
        """
        将 PIL Image 转换为 numpy array
        
        Args:
            image: PIL Image 对象
            
        Returns:
            numpy array
        """
        # 检查图像模式并进行必要的转换
        if image.mode == 'RGBA':
            # 转换为 RGB
            image = image.convert('RGB')
        elif image.mode != 'RGB':
            # 转换为 RGB
            image = image.convert('RGB')
        
        # 将 PIL Image 转换为 numpy array
        image_array = np.array(image)
        
        # 如果需要转换为 BGR 格式（PaddleOCR 可能需要）
        # 注释掉颜色转换，因为 PaddleOCR 可以直接处理 RGB
        # image_array = cv2.cvtColor(image_array, cv2.COLOR_RGB2BGR)
        
        return image_array
    
    def process_pdf_page(self, page_image: Image.Image) -> List[Dict[str, Any]]:
        """
        处理 PDF 单页图像，提取文字
        
        Args:
            page_image: PDF 页面的 PIL Image 对象
            
        Returns:
            识别结果列表，每个元素包含文字和位置信息
        """
        if self.ocr_engine is None:
            raise RuntimeError("PaddleOCR 引擎未初始化")
        
        # 修复：将 PIL Image 转换为 numpy array
        image_array = self._pil_to_numpy(page_image)
        
        # 调用 OCR 引擎
        result = self.ocr_engine.ocr(image_array)
        
        return result
    
    def extract_text_from_pdf(self, pdf_pages: List[Image.Image]) -> List[Dict[str, Any]]:
        """
        从多个 PDF 页面提取文字
        
        Args:
            pdf_pages: PDF 页面图像列表
            
        Returns:
            所有页面的识别结果
        """
        all_results = []
        
        for i, page_image in enumerate(pdf_pages):
            try:
                page_result = self.process_pdf_page(page_image)
                all_results.append({
                    'page': i + 1,
                    'result': page_result,
                    'status': 'success'
                })
            except Exception as e:
                all_results.append({
                    'page': i + 1,
                    'result': None,
                    'status': 'error',
                    'error': str(e)
                })
        
        return all_results
    
    def extract_text_from_image(self, image: Image.Image) -> List[Dict[str, Any]]:
        """
        从单张图像提取文字
        
        Args:
            image: PIL Image 对象
            
        Returns:
            识别结果
        """
        if self.ocr_engine is None:
            raise RuntimeError("PaddleOCR 引擎未初始化")
        
        # 修复：将 PIL Image 转换为 numpy array
        image_array = self._pil_to_numpy(image)
        
        result = self.ocr_engine.ocr(image_array)
        
        return result


def create_ocr_service(lang: str = 'multilang') -> PaddleOCRService:
    """
    创建 OCR 服务的工厂函数
    
    Args:
        lang: 语言设置，可选值：'ch'（中文）、'en'（英文）、'multilang'（中英混合）
        
    Returns:
        PaddleOCRService 实例
    """
    return PaddleOCRService(lang=lang)


# 示例用法
if __name__ == '__main__':
    # 创建 OCR 服务
    ocr_service = create_ocr_service(lang='multilang')
    
    # 示例：处理图像
    # 假设我们有一个 PIL Image
    # image = Image.open('example.jpg')
    # result = ocr_service.extract_text_from_image(image)
    
    # 示例：处理 PDF 页面
    # from pdf2image import convert_from_path
    # pages = convert_from_path('document.pdf')
    # results = ocr_service.extract_text_from_pdf(pages)
    
    print("PDF OCR 服务已准备就绪")
    print("- 支持语言：中文、英文、中英混合")
    print("- 输入格式：PIL Image 或 PDF 文件")
    print("- 输出格式：包含文字和位置的识别结果")
