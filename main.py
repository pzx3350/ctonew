"""
PDF OCR Service - FastAPI 应用入口
支持中英文混排文本的 PDF OCR 识别和提取
"""

import os
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from loguru import logger
from config.settings import settings
from routes.extract import router as extract_router


# 配置日志
def setup_logging():
    """配置日志格式和级别"""
    logger.remove()
    logger.add(
        sys.stderr,
        format=settings.LOG_FORMAT,
        level=settings.LOG_LEVEL,
        colorize=True,
    )
    # 添加文件日志
    log_file = "logs/app.log"
    os.makedirs(os.path.dirname(log_file), exist_ok=True)
    logger.add(log_file, rotation="10 MB", retention="10 days", level="DEBUG")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时
    setup_logging()
    logger.info("🚀 PDF OCR Service 启动中...")
    
    # 创建必要目录
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.OUTPUT_DIR, exist_ok=True)
    os.makedirs("logs", exist_ok=True)
    
    logger.info(f"📁 上传目录: {settings.UPLOAD_DIR}")
    logger.info(f"📁 输出目录: {settings.OUTPUT_DIR}")
    logger.info(f"🌐 服务地址: http://{settings.APP_HOST}:{settings.APP_PORT}")
    
    yield
    
    # 关闭时
    logger.info("👋 PDF OCR Service 已关闭")


# 创建 FastAPI 应用
app = FastAPI(
    title="PDF OCR Service",
    description="基于 PaddleOCR 的 PDF 文字提取服务，支持中英文混排文本识别",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 挂载静态文件目录（可选）
app.mount("/static", StaticFiles(directory="static"), name="static")

# 注册路由
app.include_router(extract_router, prefix="/api/v1", tags=["OCR 提取"])


@app.get("/")
async def root():
    """根路径 - 服务健康检查"""
    return {
        "status": "ok",
        "service": "PDF OCR Service",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {"status": "healthy", "service": "PDF OCR Service"}


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host=settings.APP_HOST,
        port=settings.APP_PORT,
        reload=settings.DEBUG,
    )
