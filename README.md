# PDF多语言OCR文字提取服务

基于FastAPI的PDF文档多语言OCR文字提取服务，支持简体中文、繁体中文和英文的文字识别。

## 功能特点

- **多语言支持**：简体中文、繁体中文、英文文字识别
- **PDF文档处理**：支持多页PDF文件，最大50MB
- **格式保持**：保留原始文档结构和布局
- **RESTful API**：基于FastAPI的现代化API设计
- **异步处理**：支持大文件异步处理和进度查询
- **文件下载**：支持提取结果TXT文件下载
- **自动文档**：集成Swagger UI交互式API文档

## 技术栈

- **FastAPI**：高性能Web框架
- **PaddleOCR**：百度开源OCR引擎，支持多语言识别
- **pdfplumber**：PDF内容提取库
- **Python 3.7+**：编程语言

## 系统要求

- Python 3.7或更高版本
- 支持的操作系统：macOS、Linux、Windows
- 建议内存：至少4GB RAM
- 磁盘空间：至少2GB（用于OCR模型下载）

## 安装步骤

### 1. 克隆项目

```bash
git clone <repository-url>
cd pdf-ocr-multilang
```

### 2. 创建虚拟环境（推荐）

```bash
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
# 或
venv\Scripts\activate  # Windows
```

### 3. 安装依赖

```bash
pip install -r requirements.txt
```

### 4. PaddleOCR模型准备

首次运行时会自动下载所需的OCR模型文件，可能需要几分钟时间。

### 5. macOS额外依赖（如需要）

```bash
# 安装OpenCV依赖
brew install opencv

# 或安装Python OpenCV包
pip install opencv-python-headless
```

## 使用方法

### 启动服务

#### 方法1：使用Python直接启动

```bash
python main.py
```

#### 方法2：使用uvicorn启动

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

启动后，服务将运行在 http://localhost:8000

### API端点

#### 1. 健康检查

```bash
GET /health
```

#### 2. 提取文字（主要功能）

```bash
POST /extract
Content-Type: multipart/form-data
Upload file parameter: file (PDF file, max 50MB)
```

**响应示例：**
```json
{
    "filename": "example.pdf",
    "total_pages": 10,
    "extracted_text": "提取的文字内容...",
    "process_id": "20231226_123456_example.pdf",
    "timestamp": "2023-12-26T12:34:56"
}
```

#### 3. 查询处理状态

```bash
GET /status/{process_id}
```

**响应示例：**
```json
{
    "status": "completed",
    "progress": 100,
    "current_page": 10,
    "total_pages": 10,
    "message": "处理完成"
}
```

#### 4. 下载提取结果

```bash
GET /download/{filename}?text=提取的文字内容
```

### Python客户端示例

```python
import requests

# 上传PDF并提取文字
url = "http://localhost:8000/extract"

with open("document.pdf", "rb") as f:
    files = {"file": f}
    response = requests.post(url, files=files)
    
    if response.status_code == 200:
        result = response.json()
        print(f"提取的页数: {result['total_pages']}")
        print(f"文字预览: {result['extracted_text'][:200]}...")
        
        # 保存到文件
        with open("extracted_text.txt", "w", encoding="utf-8") as out:
            out.write(result["extracted_text"])
    else:
        print(f"错误: {response.text}")
```

### cURL示例

```bash
# 提取文字
curl -X POST "http://localhost:8000/extract" \
  -F "file=@document.pdf" \
  -H "Content-Type: multipart/form-data"

# 查询状态
curl "http://localhost:8000/status/20231226_123456_example.pdf"

# 健康检查
curl "http://localhost:8000/health"
```

## 项目结构

```
.
├── main.py                  # FastAPI应用主文件
├── requirements.txt         # Python依赖
├── .gitignore              # Git忽略文件
├── README.md              # 项目说明文档
└── start.py               # 启动脚本（可选）
```

## 许可证

MIT License
