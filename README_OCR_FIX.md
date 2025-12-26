# PDF OCR Service - 修复版本

## 问题描述

在处理 PDF 文件时，遇到了 PaddleOCR 输入类型错误：

```
Not supported input data type! Only `numpy.ndarray` and `str` are supported!
So has been ignored: <PIL.Image.Image ...>
```

## 原因分析

代码在处理 PDF 页面时，使用 `pdf2image` 库提取的是 PIL Image 对象，但 PaddleOCR 的 `ocr()` 方法只接受 `numpy.ndarray` 或文件路径字符串。

## 解决方案

在调用 `ocr_engine.ocr(image)` 之前，将 PIL Image 转换为 numpy array：

```python
def _pil_to_numpy(self, image: Image.Image) -> np.ndarray:
    """
    将 PIL Image 转换为 numpy array
    """
    # 检查图像模式并进行必要的转换
    if image.mode == 'RGBA':
        image = image.convert('RGB')
    elif image.mode != 'RGB':
        image = image.convert('RGB')
    
    # 将 PIL Image 转换为 numpy array
    image_array = np.array(image)
    
    return image_array
```

## 使用方法

```python
from pdf_ocr_service import create_ocr_service
from PIL import Image

# 创建 OCR 服务
ocr_service = create_ocr_service(lang='multilang')

# 处理图像
image = Image.open('example.jpg')
result = ocr_service.extract_text_from_image(image)

# 处理 PDF 页面
from pdf2image import convert_from_path
pages = convert_from_path('document.pdf')
results = ocr_service.extract_text_from_pdf(pages)
```

## 支持的功能

- ✅ 中文文字识别
- ✅ 英文文字识别  
- ✅ 中英混合文字识别
- ✅ PDF 文件处理
- ✅ 图像文件处理
- ✅ 批量处理 PDF 多页

## API 文档

### PaddleOCRService

#### `__init__(use_gpu: bool = False, lang: str = 'ch')`
初始化 OCR 服务

- `use_gpu`: 是否使用 GPU 加速
- `lang`: 语言设置
  - `'ch'`: 中文
  - `'en'`: 英文
  - `'multilang'`: 中英混合

#### `process_pdf_page(page_image: Image.Image) -> List[Dict[str, Any]]`
处理单个 PDF 页面

#### `extract_text_from_pdf(pdf_pages: List[Image.Image]) -> List[Dict[str, Any]]`
批量处理多个 PDF 页面

#### `extract_text_from_image(image: Image.Image) -> List[Dict[str, Any]]`
处理单张图像

## 测试

修复后，在 http://localhost:8000/docs 上传 PDF，应该能看到提取的文字内容，没有 "Not supported input data type" 错误。

## 依赖

- paddleocr
- numpy
- Pillow (PIL)
- pdf2image (可选，用于 PDF 处理)
