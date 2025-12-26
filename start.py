#!/usr/bin/env python3
"""
PDF OCR Service启动脚本
提供了多种启动方式和配置选项
"""

import sys
import os
import uvicorn
import argparse
import logging
from pathlib import Path

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def check_dependencies():
    """检查必要的依赖是否安装"""
    try:
        import fastapi
        import uvicorn
        import pdfplumber
        import paddleocr
        logger.info("✓ 核心依赖检查通过")
        return True
    except ImportError as e:
        logger.error(f"✗ 缺少必要依赖: {e}")
        logger.info("请运行: pip install -r requirements.txt")
        return False


def check_ocr_model():
    """检查OCR模型是否已下载"""
    from paddleocr import PaddleOCR
    try:
        logger.info("正在检查PaddleOCR模型...")
        # 尝试初始化OCR引擎，如果模型不存在会自动下载
        ocr = PaddleOCR(use_angle_cls=True, lang='ch', show_log=False)
        logger.info("✓ PaddleOCR模型准备完成")
        return True
    except Exception as e:
        logger.error(f"✗ OCR模型检查失败: {e}")
        return False


def start_service(host="0.0.0.0", port=8000, reload=False, log_level="info"):
    """启动FastAPI服务"""
    try:
        logger.info(f"正在启动PDF OCR服务，监听地址: {host}:{port}")
        logger.info(f"- 开发模式: {'是' if reload else '否'}")
        logger.info(f"- 日志级别: {log_level}")
        
        uvicorn.run(
            "main:app",
            host=host,
            port=port,
            reload=reload,
            log_level=log_level
        )
    except KeyboardInterrupt:
        logger.info("\n服务已安全停止")
        sys.exit(0)
    except Exception as e:
        logger.error(f"服务启动失败: {e}")
        sys.exit(1)


def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='PDF OCR Service')
    parser.add_argument('--host', default='0.0.0.0', help='监听地址 (默认: 0.0.0.0)')
    parser.add_argument('--port', type=int, default=8000, help='监听端口 (默认: 8000)')
    parser.add_argument('--reload', action='store_true', help='开发模式，代码变更自动重载')
    parser.add_argument('--check', action='store_true', help='仅检查依赖和环境')
    parser.add_argument('--debug', action='store_true', help='启用调试模式')
    parser.add_argument('--log-level', default='info', 
                       choices=['debug', 'info', 'warning', 'error'],
                       help='日志级别 (默认: info)')
    
    args = parser.parse_args()
    
    # 检查依赖
    logger.info("=== 正在检查运行环境 ===")
    if not check_dependencies():
        sys.exit(1)
    
    if not check_ocr_model():
        logger.warning("OCR模型可能需要在首次运行时下载，请确保网络连接正常")
    
    if args.check:
        logger.info("✓ 环境检查完成")
        return
    
    # 设置调试模式
    if args.debug:
        os.environ['PADDLEOCR_DEBUG'] = 'True'
        os.environ['PYTHONASYNCIODEBUG'] = '1'
    
    # 启动服务
    logger.info("\n=== 启动PDF OCR服务 ===")
    logger.info(f"API文档: http://{args.host}:{args.port}/docs")
    logger.info(f"API文档(备用): http://{args.host}:{args.port}/redoc")
    logger.info(f"健康检查: http://{args.host}:{args.port}/health")
    
    start_service(
        host=args.host,
        port=args.port,
        reload=args.reload,
        log_level=args.log_level
    )


if __name__ == "__main__":
    main()