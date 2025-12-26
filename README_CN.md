# PDF OCR Service

基于 FastAPI 和 PaddleOCR 的 PDF 文字提取服务，支持中英文混排文本识别。

## 功能特性

- 📄 **多页 PDF 处理** - 支持处理多页 PDF 文件
- 🇨🇳🇺🇸 **中英文混排识别** - 完美支持中文和英文混合文本
- 🎨 **布局保留** - 保留原始文本格式和段落结构
- 📝 **多种输出** - 支持单文件和批量处理
- 🔍 **智能检测** - 自动识别扫描型 PDF 和文本型 PDF
- 🌐 **REST API** - 提供完整的 API 接口

## 技术栈

- **后端框架**: FastAPI
- **PDF 处理**: pdfplumber
- **OCR 引擎**: PaddleOCR
- **图像处理**: Pillow, OpenCV
- **数据验证**: Pydantic

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 启动服务

```bash
python main.py
```

服务将在 `http://localhost:8000` 启动。

### 3. 访问 API 文档

打开浏览器访问: http://localhost:8000/docs

## API 接口

### 提取文字

```http
POST /api/v1/extract
Content-Type: multipart/form-data

file: [PDF 文件]
use_ocr: true
preserve_layout: true
```

### 查询状态

```http
GET /api/v1/status/{task_id}
```

### 获取结果

```http
GET /api/v1/result/{task_id}
```

### 下载文本文件

```http
GET /api/v1/download/{task_id}
```

### 批量处理

```http
POST /api/v1/extract-batch
Content-Type: multipart/form-data

files: [PDF 文件列表，最多 5 个]
```

## 使用示例

### Python 请求示例

```python
import requests

# 上传文件并提取文字
url = "http://localhost:8000/api/v1/extract"
files = {"file": open("document.pdf", "rb")}
data = {"use_ocr": True, "preserve_layout": True}

response = requests.post(url, files=files, data=data)
task_id = response.json()["task_id"]

# 轮询状态
import time
while True:
    status = requests.get(f"http://localhost:8000/api/v1/status/{task_id}").json()
    if status["status"] == "completed":
        break
    time.sleep(1)

# 下载结果
result = requests.get(f"http://localhost:8000/api/v1/download/{task_id}")
with open("output.txt", "w", encoding="utf-8") as f:
    f.write(result.text)
```

### cURL 请求示例

```bash
# 提取文字
curl -X POST -F "file=@document.pdf" http://localhost:8000/api/v1/extract

# 查看状态
curl http://localhost:8000/api/v1/status/{task_id}

# 下载结果
curl http://localhost:8000/api/v1/download/{task_id} -o output.txt
```

## 项目结构

```
pdf-ocr-service/
├── main.py                 # FastAPI 应用入口
├── requirements.txt        # Python 依赖
├── config/
│   └── settings.py         # 配置文件
├── services/
│   ├── pdf_parser.py      # PDF 解析模块
│   ├── ocr_engine.py      # OCR 处理模块
│   └── formatter.py       # 文本格式化模块
├── routes/
│   └── extract.py         # API 路由
├── utils/
│   └── helpers.py         # 辅助函数
├── uploads/               # 上传文件目录
├── outputs/               # 输出文件目录
└── logs/                  # 日志目录
```

## 配置说明

在 `config/settings.py` 中可以配置以下参数:

| 参数 | 默认值 | 说明 |
|------|--------|------|
| APP_HOST | "0.0.0.0" | 服务监听地址 |
| APP_PORT | 8000 | 服务监听端口 |
| MAX_FILE_SIZE | 50MB | 最大文件大小 |
| OCR_LANGUAGES | ["ch", "en"] | OCR 识别语言 |
| PRESERVE_LAYOUT | True | 是否保留布局 |
| LINE_BREAK_THRESHOLD | 20.0 | 行分隔阈值 |
| PARAGRAPH_BREAK_THRESHOLD | 50.0 | 段落分隔阈值 |

## 依赖安装说明

本项目依赖 PaddleOCR，可能需要额外安装:

```bash
# 安装 PaddlePaddle (CPU 版本)
pip install paddlepaddle

# 或 GPU 版本
pip install paddlepaddle-gpu

# 安装 PaddleOCR
pip install "paddleocr>=2.7.0"
```

## 注意事项

1. **首次运行**: PaddleOCR 首次运行会自动下载模型文件
2. **内存占用**: OCR 处理需要较多内存，建议可用内存 > 2GB
3. **文件大小**: 限制为 50MB 以内
4. **编码格式**: 输出文件为 UTF-8 编码

## 许可证

MIT License
