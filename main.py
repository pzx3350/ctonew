import io
from typing import List, Dict, Any, Optional
import tempfile
import os

import pdfplumber
from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from paddleocr import PaddleOCR
import uvicorn
import logging
from datetime import datetime
import json

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 初始化FastAPI应用
app = FastAPI(
    title="PDF多语言OCR文字提取API",
    description="支持简体中文、繁体中文和英文的PDF文字识别服务",
    version="1.0.0"
)

# CORS中间件配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 全局变量
ocr_engine: Optional[PaddleOCR] = None
process_status: Dict[str, Dict] = {}


def init_ocr_engine():
    """初始化PaddleOCR引擎"""
    global ocr_engine
    try:
        logger.info("正在初始化PaddleOCR引擎...")
        # 支持ch（中文）、en（英文）、chinese_cht（繁体中文）
        ocr_engine = PaddleOCR(
            use_angle_cls=True,
            lang='ch',  # 使用中文模型，可以识别简体和繁体
            show_log=False
        )
        logger.info("PaddleOCR引擎初始化成功")
    except Exception as e:
        logger.error(f"PaddleOCR引擎初始化失败: {str(e)}")
        raise


def extract_text_from_image(image, page_num: int) -> str:
    """从图片中提取文字"""
    global ocr_engine
    
    if ocr_engine is None:
        raise RuntimeError("OCR引擎未初始化")
    
    try:
        # 使用PaddleOCR进行文字识别
        result = ocr_engine.ocr(image, cls=True)
        
        if result is None or len(result) == 0:
            logger.warning(f"第 {page_num} 页未识别到文字")
            return ""
        
        # 提取文字内容
        text_lines = []
        for line in result[0]:
            if line and len(line) >= 2:
                text_info = line[1]  # 文字信息和置信度
                if text_info and len(text_info) >= 1:
                    text = text_info[0]
                    if text:
                        text_lines.append(text)
        
        return "\n".join(text_lines)
    
    except Exception as e:
        logger.error(f"第 {page_num} 页OCR识别失败: {str(e)}")
        return ""


def process_pdf_file(file_path: str, process_id: str) -> Dict[str, Any]:
    """处理PDF文件"""
    try:
        logger.info(f"开始处理PDF文件: {file_path}")
        
        with pdfplumber.open(file_path) as pdf:
            total_pages = len(pdf.pages)
            logger.info(f"PDF文件共有 {total_pages} 页")
            
            all_text = []
            
            for i, page in enumerate(pdf.pages):
                try:
                    # 更新处理进度
                    progress = int((i + 1) / total_pages * 100)
                    process_status[process_id] = {
                        "status": "processing",
                        "progress": progress,
                        "current_page": i + 1,
                        "total_pages": total_pages,
                        "message": f"正在处理第 {i + 1}/{total_pages} 页"
                    }
                    
                    logger.info(f"正在处理第 {i + 1}/{total_pages} 页")
                    
                    # 将页面转换为图片
                    im = page.to_image(resolution=300)
                    
                    # 获取原始图片
                    pil_image = im.original
                    
                    # 使用OCR提取文字
                    page_text = extract_text_from_image(pil_image, i + 1)
                    
                    if page_text:
                        # 添加页码标记
                        all_text.append(f"\n{'='*20} 第 {i + 1} 页 {'='*20}\n")
                        all_text.append(page_text)
                    else:
                        logger.warning(f"第 {i + 1} 页未提取到文字内容")
                
                except Exception as page_error:
                    logger.error(f"处理第 {i + 1} 页时出错: {str(page_error)}")
                    all_text.append(f"\n{'='*20} 第 {i + 1} 页 {'='*20}\n")
                    all_text.append(f"[处理此页时出现错误: {str(page_error)}]")
            
            # 完成处理
            process_status[process_id] = {
                "status": "completed",
                "progress": 100,
                "current_page": total_pages,
                "total_pages": total_pages,
                "message": "处理完成"
            }
            
            result = {
                "filename": os.path.basename(file_path),
                "total_pages": total_pages,
                "extracted_text": "\n".join(all_text),
                "process_id": process_id,
                "timestamp": datetime.now().isoformat()
            }
            
            logger.info(f"PDF文件处理完成: {file_path}")
            return result
    
    except Exception as e:
        error_msg = f"PDF处理失败: {str(e)}"
        logger.error(error_msg)
        
        process_status[process_id] = {
            "status": "error",
            "progress": 0,
            "message": error_msg
        }
        
        raise HTTPException(status_code=500, detail=error_msg)


@app.on_event("startup")
async def startup_event():
    """应用启动时初始化OCR引擎"""
    init_ocr_engine()


@app.post("/extract", tags=["文字提取"])
async def extract_text(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None
):
    """
    上传PDF文件并提取文字
    
    - **file**: PDF文件（最大50MB）
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="只支持PDF文件")
    
    # 检查文件大小（限制50MB）
    max_size = 50 * 1024 * 1024  # 50MB
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    
    if file_size > max_size:
        raise HTTPException(status_code=400, detail=f"文件大小超过限制（最大{max_size/1024/1024}MB）")
    
    # 创建临时文件
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
        tmp_file.write(await file.read())
        tmp_file_path = tmp_file.name
    
    try:
        # 生成处理ID
        process_id = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}"
        
        # 初始化处理状态
        process_status[process_id] = {
            "status": "starting",
            "progress": 0,
            "message": "正在启动处理..."
        }
        
        # 处理PDF文件
        result = process_pdf_file(tmp_file_path, process_id)
        
        return result
    
    finally:
        # 清理临时文件
        if os.path.exists(tmp_file_path):
            os.unlink(tmp_file_path)


@app.get("/download/{filename}", tags=["下载"])
async def download_extracted_text(filename: str, text: str):
    """
    下载提取的文本文件
    
    - **filename**: 原始文件名（用于生成下载文件名）
    - **text**: 要下载的文本内容
    """
    try:
        # 生成下载文件名
        download_filename = f"extracted_{filename.replace('.pdf', '.txt')}"
        
        # 将文本转换为字节流
        text_bytes = text.encode('utf-8')
        text_stream = io.BytesIO(text_bytes)
        
        return StreamingResponse(
            text_stream,
            media_type="text/plain; charset=utf-8",
            headers={
                "Content-Disposition": f"attachment; filename*=utf-8''{download_filename.encode('utf-8').decode('latin-1')}"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成下载文件失败: {str(e)}")


@app.get("/status/{process_id}", tags=["状态查询"])
async def get_process_status(process_id: str):
    """
    获取处理状态
    
    - **process_id**: 处理任务ID
    """
    if process_id not in process_status:
        raise HTTPException(status_code=404, detail="处理任务不存在")
    
    return process_status[process_id]


@app.get("/health", tags=["健康检查"])
async def health_check():
    """健康检查接口"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "ocr_engine": "initialized" if ocr_engine is not None else "not_initialized"
    }


if __name__ == "__main__":
    # 确保OCR引擎已初始化
    if ocr_engine is None:
        init_ocr_engine()
    
    # 启动服务
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )