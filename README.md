# PDF OCR Service

PDF text extraction service based on FastAPI and PaddleOCR, supporting Chinese-English mixed text recognition.

## Features

- 📄 **Multi-page PDF Processing** - Support for processing multi-page PDF files
- 🇨🇳🇺🇸 **Mixed Language Recognition** - Perfect support for Chinese and English mixed text
- 🎨 **Layout Preservation** - Preserve original text format and paragraph structure
- 📝 **Multiple Output Modes** - Support single file and batch processing
- 🔍 **Smart Detection** - Automatically detect scanned PDFs and text-based PDFs
- 🌐 **REST API** - Complete API interface

## Tech Stack

- **Backend Framework**: FastAPI
- **PDF Processing**: pdfplumber
- **OCR Engine**: PaddleOCR
- **Image Processing**: Pillow, OpenCV
- **Data Validation**: Pydantic

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Start Service

```bash
python main.py
```

Service will start at `http://localhost:8000`.

### 3. Access API Documentation

Open browser: http://localhost:8000/docs

## API Endpoints

### Extract Text

```http
POST /api/v1/extract
Content-Type: multipart/form-data

file: [PDF File]
use_ocr: true
preserve_layout: true
```

### Check Status

```http
GET /api/v1/status/{task_id}
```

### Get Result

```http
GET /api/v1/result/{task_id}
```

### Download Text File

```http
GET /api/v1/download/{task_id}
```

### Batch Processing

```http
POST /api/v1/extract-batch
Content-Type: multipart/form-data

files: [PDF File List, max 5]
```

## Project Structure

```
pdf-ocr-service/
├── main.py                 # FastAPI application entry
├── requirements.txt        # Python dependencies
├── config/
│   └── settings.py         # Configuration file
├── services/
│   ├── pdf_parser.py      # PDF parsing module
│   ├── ocr_engine.py      # OCR processing module
│   └── formatter.py       # Text formatting module
├── routes/
│   └── extract.py         # API routes
├── utils/
│   └── helpers.py         # Utility functions
├── uploads/               # Uploaded files directory
├── outputs/               # Output files directory
└── logs/                  # Log directory
```

## License

MIT License
