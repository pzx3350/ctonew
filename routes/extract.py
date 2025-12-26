"""
API 路由模块
提供 PDF OCR 提取的 REST API 端点
"""

import os
import io
import time
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks, Query
from pydantic import BaseModel, Field
from loguru import logger

from services.pdf_parser import PDFParser
from services.ocr_engine import OCREngine
from services.formatter import TextFormatter, LayoutPreserver
from utils.helpers import (
    generate_task_id, validate_file_size, validate_file_type,
    format_file_size, sanitize_filename, ensure_directory_exists,
    write_file_safe, TaskManager
)
from config.settings import settings


router = APIRouter()

# 全局任务管理器
task_manager = TaskManager()

# 全局 OCR 引擎（延迟初始化）
ocr_engine = None


def get_ocr_engine() -> OCREngine:
    """获取 OCR 引擎实例"""
    global ocr_engine
    if ocr_engine is None:
        ocr_engine = OCREngine(
            languages=settings.OCR_LANGUAGES,
            use_gpu=settings.OCR_USE_GPU,
        )
    return ocr_engine


# ============ 响应模型 ============

class ExtractResponse(BaseModel):
    """提取响应模型"""
    task_id: str
    status: str
    message: str
    filename: str
    file_size: str
    page_count: int = 0


class StatusResponse(BaseModel):
    """状态响应模型"""
    task_id: str
    status: str
    progress: int
    message: str
    page_count: int = 0
    processed_pages: int = 0
    estimated_time: Optional[str] = None


class ResultResponse(BaseModel):
    """结果响应模型"""
    task_id: str
    status: str
    filename: str
    text_length: int
    character_count: int
    line_count: int
    has_mixed_language: bool
    statistics: dict


class DownloadResponse(BaseModel):
    """下载响应模型"""
    task_id: str
    status: str
    download_url: str
    filename: str
    text_length: int


class ErrorResponse(BaseModel):
    """错误响应模型"""
    error: str
    detail: Optional[str] = None


# ============ 任务处理函数 ============

def process_pdf_task(
    task_id: str,
    file_path: str,
    filename: str,
    file_size: int,
    use_ocr: bool = True,
    preserve_layout: bool = True,
):
    """
    处理 PDF 提取任务
    
    Args:
        task_id: 任务 ID
        file_path: PDF 文件路径
        filename: 文件名
        file_size: 文件大小
        use_ocr: 是否使用 OCR
        preserve_layout: 是否保留布局
    """
    try:
        logger.info(f"🚀 开始处理任务: {task_id}")
        logger.info(f"📄 文件: {filename} ({format_file_size(file_size)})")
        
        # 更新任务状态
        task_manager.update_task(task_id, status='processing', progress=5, message='正在分析 PDF 文件...')
        
        # 使用 pdfplumber 解析 PDF
        with PDFParser(file_path) as parser:
            # 提取所有页面
            pages = parser.extract_all_pages()
            total_pages = len(pages)
            
            logger.info(f"📄 PDF 共 {total_pages} 页")
            task_manager.update_task(
                task_id,
                page_count=total_pages,
                processed_pages=0,
                message=f'正在处理 {total_pages} 页...'
            )
            
            # 检测是否为扫描型 PDF
            is_scanned = parser.detect_if_scanned()
            logger.info(f"🔍 扫描型 PDF: {'是' if is_scanned else '否'}")
            
            if is_scanned:
                task_manager.update_task(task_id, message='检测到扫描型 PDF，使用 OCR 识别...')
            
            # 初始化格式化器
            formatter = TextFormatter(preserve_layout=preserve_layout)
            layout_preserver = LayoutPreserver(
                line_break_threshold=settings.LINE_BREAK_THRESHOLD,
                paragraph_break_threshold=settings.PARAGRAPH_BREAK_THRESHOLD,
            )
            
            all_text_parts = []
            all_blocks = []
            
            # 处理每一页
            for idx, page in enumerate(pages, start=1):
                progress = 10 + int(80 * idx / total_pages)
                task_manager.update_task(
                    task_id,
                    progress=progress,
                    processed_pages=idx,
                    message=f'正在处理第 {idx}/{total_pages} 页...'
                )
                
                # 尝试直接提取文本
                direct_text = page.text.strip()
                
                if direct_text and len(direct_text) > 50:
                    # 有文本层，直接使用
                    logger.info(f"📄 第 {idx} 页: 使用直接文本提取 ({len(direct_text)} 字符)")
                    
                    # 格式化文本
                    formatted = formatter.format(direct_text, page_num=idx)
                    all_text_parts.append(formatted.content)
                    
                    # 添加文本块用于布局重建
                    for block in page.text_blocks:
                        all_blocks.append({
                            'text': block.text,
                            'x0': block.x0,
                            'top': block.top,
                            'x1': block.x1,
                            'bottom': block.bottom,
                            'page_num': block.page_num,
                        })
                elif use_ocr:
                    # 需要 OCR 识别
                    logger.info(f"🔍 第 {idx} 页: 使用 OCR 识别...")
                    task_manager.update_task(
                        task_id,
                        message=f'正在 OCR 识别第 {idx}/{total_pages} 页...'
                    )
                    
                    # 提取页面图像
                    page_image_bytes = parser.extract_page_image(idx, dpi=300)
                    
                    if page_image_bytes:
                        # 执行 OCR
                        engine = get_ocr_engine()
                        ocr_result = engine.process_pdf_page(page_image_bytes)
                        
                        if ocr_result and ocr_result.full_text:
                            # 使用 OCR 结果
                            formatted = formatter.format(ocr_result.full_text, page_num=idx)
                            all_text_parts.append(formatted.content)
                            
                            # 添加 OCR 结果块用于布局重建
                            for result in ocr_result.results:
                                all_blocks.append({
                                    'text': result.text,
                                    'x0': result.bounding_box[0],
                                    'top': result.bounding_box[1],
                                    'x1': result.bounding_box[2],
                                    'bottom': result.bounding_box[3],
                                    'page_num': idx,
                                })
                            
                            logger.info(f"🔍 第 {idx} 页: OCR 识别完成 ({len(ocr_result.full_text)} 字符)")
                        else:
                            logger.warning(f"⚠️ 第 {idx} 页: OCR 识别无结果")
                    else:
                        logger.warning(f"⚠️ 第 {idx} 页: 无法提取页面图像")
                else:
                    logger.info(f"📄 第 {idx} 页: 无文本内容")
            
            # 合并所有文本
            task_manager.update_task(task_id, progress=95, message='正在合并文本...')
            
            # 按页面合并文本
            full_text = '\n\n'.join(all_text_parts)
            
            # 如果需要保留布局，使用布局重建
            if preserve_layout and all_blocks:
                full_text = layout_preserver.reconstruct_from_blocks(all_blocks)
            
            # 最终格式化
            final_result = formatter.format(full_text)
            
            # 生成输出文件名
            output_filename = f"{os.path.splitext(filename)[0]}_ocr.txt"
            output_path = os.path.join(settings.OUTPUT_DIR, f"{task_id}.txt")
            
            # 保存结果文件
            success = write_file_safe(
                final_result.content,
                output_path,
                encoding='utf-8'
            )
            
            if success:
                # 更新任务状态为完成
                task_manager.update_task(
                    task_id,
                    status='completed',
                    progress=100,
                    message='处理完成',
                    result={
                        'filename': output_filename,
                        'output_path': output_path,
                        'text_length': len(final_result.content),
                        'statistics': final_result.statistics,
                    }
                )
                logger.info(f"✅ 任务 {task_id} 完成: {output_filename} ({format_file_size(len(final_result.content.encode('utf-8')))})")
            else:
                raise Exception("保存结果文件失败")
    
    except Exception as e:
        logger.error(f"❌ 任务 {task_id} 失败: {e}")
        task_manager.update_task(task_id, status='failed', message=f'处理失败: {str(e)}', error=str(e))


# ============ API 端点 ============

@router.post("/extract", response_model=ExtractResponse, responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}})
async def extract_text(
    file: UploadFile = File(..., description="PDF 文件"),
    use_ocr: bool = Form(True, description="是否使用 OCR 识别扫描型 PDF"),
    preserve_layout: bool = Form(True, description="是否保留原始布局"),
):
    """
    上传 PDF 文件并提取文字
    
    - **file**: PDF 文件（最大 50MB）
    - **use_ocr**: 是否对扫描型 PDF 使用 OCR 识别
    - **preserve_layout**: 是否保留原始布局
    """
    # 验证文件
    filename = sanitize_filename(file.filename)
    ext = os.path.splitext(filename)[1].lower()
    
    if ext != '.pdf':
        raise HTTPException(status_code=400, detail=f"不支持的文件类型: {ext}，仅支持 PDF")
    
    # 读取文件大小
    file_size = 0
    content = b''
    
    # 分块读取文件
    chunk_size = 1024 * 1024  # 1MB
    chunks = []
    
    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        chunks.append(chunk)
        file_size += len(chunk)
    
    content = b''.join(chunks)
    
    # 验证文件大小
    is_valid, error_msg = validate_file_size(file_size)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    logger.info(f"📤 收到文件: {filename} ({format_file_size(file_size)})")
    
    # 生成任务 ID
    task_id = generate_task_id()
    
    # 保存上传的文件
    upload_path = os.path.join(settings.UPLOAD_DIR, f"{task_id}.pdf")
    
    try:
        with open(upload_path, 'wb') as f:
            f.write(content)
        
        # 创建任务
        task = task_manager.create_task(
            task_id,
            filename=filename,
            file_size=file_size,
            upload_path=upload_path,
        )
        
        # 在后台任务中处理
        process_pdf_task(
            task_id=task_id,
            file_path=upload_path,
            filename=filename,
            file_size=file_size,
            use_ocr=use_ocr,
            preserve_layout=preserve_layout,
        )
        
        return ExtractResponse(
            task_id=task_id,
            status='processing',
            message='文件已接收，正在处理...',
            filename=filename,
            file_size=format_file_size(file_size),
            page_count=0,
        )
        
    except Exception as e:
        logger.error(f"❌ 处理上传文件失败: {e}")
        raise HTTPException(status_code=500, detail=f"处理文件失败: {str(e)}")


@router.get("/status/{task_id}", response_model=StatusResponse)
async def get_status(task_id: str):
    """
    获取任务处理状态
    
    - **task_id**: 任务 ID
    """
    task = task_manager.get_task(task_id)
    
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    return StatusResponse(
        task_id=task_id,
        status=task['status'],
        progress=task.get('progress', 0),
        message=task.get('message', ''),
        page_count=task.get('page_count', 0),
        processed_pages=task.get('processed_pages', 0),
    )


@router.get("/result/{task_id}", response_model=ResultResponse)
async def get_result(task_id: str):
    """
    获取任务处理结果
    
    - **task_id**: 任务 ID
    """
    task = task_manager.get_task(task_id)
    
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    if task['status'] != 'completed':
        raise HTTPException(status_code=400, detail=f"任务尚未完成，当前状态: {task['status']}")
    
    result = task.get('result', {})
    output_path = result.get('output_path', '')
    
    # 读取结果文件
    text_content = ''
    if output_path and os.path.exists(output_path):
        with open(output_path, 'r', encoding='utf-8') as f:
            text_content = f.read()
    
    stats = result.get('statistics', {})
    
    return ResultResponse(
        task_id=task_id,
        status=task['status'],
        filename=result.get('filename', ''),
        text_length=len(text_content),
        character_count=stats.get('char_count', len(text_content)),
        line_count=stats.get('line_count', text_content.count('\n') + 1),
        has_mixed_language=stats.get('has_mixed_language', False),
        statistics=stats,
    )


@router.get("/download/{task_id}")
async def download_result(task_id: str):
    """
    下载提取的文本文件
    
    - **task_id**: 任务 ID
    """
    task = task_manager.get_task(task_id)
    
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    if task['status'] != 'completed':
        raise HTTPException(status_code=400, detail=f"任务尚未完成，当前状态: {task['status']}")
    
    result = task.get('result', {})
    output_path = result.get('output_path', '')
    filename = result.get('filename', f'{task_id}.txt')
    
    if not output_path or not os.path.exists(output_path):
        raise HTTPException(status_code=404, detail="结果文件不存在")
    
    # 读取文件内容
    with open(output_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    from fastapi.responses import Response
    return Response(
        content=content,
        media_type="text/plain; charset=utf-8",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
        },
    )


@router.post("/extract-batch", response_model=dict, responses={400: {"model": ErrorResponse}})
async def extract_batch(
    files: List[UploadFile] = File(..., description="多个 PDF 文件（最多 5 个）"),
    use_ocr: bool = Form(True, description="是否使用 OCR"),
    preserve_layout: bool = Form(True, description="是否保留布局"),
):
    """
    批量处理多个 PDF 文件
    
    - **files**: PDF 文件列表（最大 5 个）
    - **use_ocr**: 是否使用 OCR 识别
    - **preserve_layout**: 是否保留原始布局
    """
    if len(files) > 5:
        raise HTTPException(status_code=400, detail="最多支持批量处理 5 个文件")
    
    task_ids = []
    results = []
    
    for file in files:
        try:
            # 验证文件
            filename = sanitize_filename(file.filename)
            ext = os.path.splitext(filename)[1].lower()
            
            if ext != '.pdf':
                results.append({
                    'filename': filename,
                    'success': False,
                    'error': f'不支持的文件类型: {ext}',
                })
                continue
            
            # 读取文件
            content = await file.read()
            file_size = len(content)
            
            # 验证大小
            is_valid, error_msg = validate_file_size(file_size)
            if not is_valid:
                results.append({
                    'filename': filename,
                    'success': False,
                    'error': error_msg,
                })
                continue
            
            # 生成任务 ID
            task_id = generate_task_id()
            
            # 保存文件
            upload_path = os.path.join(settings.UPLOAD_DIR, f"{task_id}.pdf")
            with open(upload_path, 'wb') as f:
                f.write(content)
            
            # 创建任务
            task_manager.create_task(
                task_id,
                filename=filename,
                file_size=file_size,
                upload_path=upload_path,
            )
            
            # 启动处理
            process_pdf_task(
                task_id=task_id,
                file_path=upload_path,
                filename=filename,
                file_size=file_size,
                use_ocr=use_ocr,
                preserve_layout=preserve_layout,
            )
            
            task_ids.append(task_id)
            results.append({
                'filename': filename,
                'task_id': task_id,
                'success': True,
            })
            
        except Exception as e:
            logger.error(f"❌ 处理文件失败 {file.filename}: {e}")
            results.append({
                'filename': file.filename,
                'success': False,
                'error': str(e),
            })
    
    return {
        'total_files': len(files),
        'success_count': len(task_ids),
        'fail_count': len(results) - len(task_ids),
        'task_ids': task_ids,
        'results': results,
    }


@router.get("/health")
async def health_check():
    """健康检查"""
    return {
        "status": "healthy",
        "service": "PDF OCR Service",
        "timestamp": datetime.now().isoformat(),
    }
