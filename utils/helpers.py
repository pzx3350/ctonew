"""
辅助函数工具模块
提供文件处理、日志和其他辅助功能
"""

import os
import hashlib
import uuid
import time
import shutil
from pathlib import Path
from typing import Optional, Dict, Any
from datetime import datetime
from loguru import logger


def generate_task_id() -> str:
    """
    生成唯一的任务 ID
    
    Returns:
        str: 任务 ID（格式: pdf_ocr_时间戳_随机字符串）
    """
    timestamp = int(time.time() * 1000)
    random_str = uuid.uuid4().hex[:8]
    return f"pdf_ocr_{timestamp}_{random_str}"


def get_file_extension(filename: str) -> str:
    """
    获取文件扩展名
    
    Args:
        filename: 文件名
        
    Returns:
        str: 扩展名（包含点）
    """
    return os.path.splitext(filename)[1].lower()


def validate_file_size(file_size: int, max_size: int = 50 * 1024 * 1024) -> tuple:
    """
    验证文件大小
    
    Args:
        file_size: 文件大小（字节）
        max_size: 最大允许大小（字节）
        
    Returns:
        tuple: (是否有效, 错误消息)
    """
    if file_size > max_size:
        max_mb = max_size / (1024 * 1024)
        return False, f"文件大小超过限制 ({max_mb:.0f}MB)"
    return True, ""


def validate_file_type(filename: str, allowed_extensions: list = None) -> tuple:
    """
    验证文件类型
    
    Args:
        filename: 文件名
        allowed_extensions: 允许的扩展名列表
        
    Returns:
        tuple: (是否有效, 错误消息)
    """
    if allowed_extensions is None:
        allowed_extensions = ['.pdf']
    
    ext = get_file_extension(filename)
    if ext not in allowed_extensions:
        return False, f"不支持的文件类型: {ext}，仅支持: {', '.join(allowed_extensions)}"
    return True, ""


def format_file_size(size_bytes: int) -> str:
    """
    格式化文件大小
    
    Args:
        size_bytes: 字节大小
        
    Returns:
        str: 格式化后的大小字符串
    """
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024:
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.2f} TB"


def get_file_hash(filepath: str) -> str:
    """
    获取文件哈希值
    
    Args:
        filepath: 文件路径
        
    Returns:
        str: MD5 哈希值
    """
    hash_md5 = hashlib.md5()
    
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    
    return hash_md5.hexdigest()


def sanitize_filename(filename: str) -> str:
    """
    清理文件名
    
    Args:
        filename: 原始文件名
        
    Returns:
        str: 清理后的文件名
    """
    # 移除危险字符
    dangerous_chars = ['/', '\\', '..', ':', '*', '?', '"', '<', '>', '|']
    for char in dangerous_chars:
        filename = filename.replace(char, '_')
    
    # 限制长度
    if len(filename) > 200:
        name, ext = os.path.splitext(filename)
        filename = name[:190] + ext
    
    return filename


def ensure_directory_exists(path: str) -> bool:
    """
    确保目录存在
    
    Args:
        path: 目录路径
        
    Returns:
        bool: 是否成功
    """
    try:
        os.makedirs(path, exist_ok=True)
        return True
    except Exception as e:
        logger.error(f"❌ 创建目录失败 {path}: {e}")
        return False


def cleanup_file(filepath: str):
    """
    清理文件
    
    Args:
        filepath: 文件路径
    """
    try:
        if filepath and os.path.exists(filepath):
            os.remove(filepath)
            logger.info(f"🗑️ 已清理文件: {filepath}")
    except Exception as e:
        logger.warning(f"⚠️ 清理文件失败 {filepath}: {e}")


def cleanup_directory(path: str, max_age_hours: int = 24):
    """
    清理目录中的旧文件
    
    Args:
        path: 目录路径
        max_age_hours: 最大保留时间（小时）
    """
    if not os.path.exists(path):
        return
    
    now = time.time()
    cutoff = now - max_age_hours * 3600
    
    for filename in os.listdir(path):
        filepath = os.path.join(path, filename)
        
        if os.path.isfile(filepath):
            mtime = os.path.getmtime(filepath)
            if mtime < cutoff:
                cleanup_file(filepath)


def read_file_safe(filepath: str, encoding: str = 'utf-8') -> Optional[str]:
    """
    安全读取文件
    
    Args:
        filepath: 文件路径
        encoding: 文件编码
        
    Returns:
        str: 文件内容，失败返回 None
    """
    try:
        with open(filepath, 'r', encoding=encoding) as f:
            return f.read()
    except UnicodeDecodeError:
        # 尝试其他编码
        for enc in ['utf-8-sig', 'gbk', 'big5']:
            try:
                with open(filepath, 'r', encoding=enc) as f:
                    return f.read()
            except UnicodeDecodeError:
                continue
    except Exception as e:
        logger.error(f"❌ 读取文件失败 {filepath}: {e}")
    
    return None


def write_file_safe(content: str, filepath: str, encoding: str = 'utf-8') -> bool:
    """
    安全写入文件
    
    Args:
        content: 文件内容
        filepath: 文件路径
        encoding: 文件编码
        
    Returns:
        bool: 是否成功
    """
    try:
        # 确保目录存在
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        with open(filepath, 'w', encoding=encoding) as f:
            f.write(content)
        
        return True
    except Exception as e:
        logger.error(f"❌ 写入文件失败 {filepath}: {e}")
        return False


class TaskManager:
    """任务管理器 - 管理异步任务状态"""
    
    def __init__(self):
        self.tasks: Dict[str, Dict[str, Any]] = {}
    
    def create_task(self, task_id: str, **kwargs) -> Dict[str, Any]:
        """
        创建新任务
        
        Args:
            task_id: 任务 ID
            
        Returns:
            Dict: 任务信息
        """
        self.tasks[task_id] = {
            'status': 'pending',
            'progress': 0,
            'message': '等待处理',
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat(),
            'result': None,
            'error': None,
            **kwargs,
        }
        return self.tasks[task_id]
    
    def update_task(self, task_id: str, **kwargs) -> bool:
        """
        更新任务状态
        
        Args:
            task_id: 任务 ID
            
        Returns:
            bool: 是否成功
        """
        if task_id not in self.tasks:
            return False
        
        self.tasks[task_id].update(kwargs)
        self.tasks[task_id]['updated_at'] = datetime.now().isoformat()
        return True
    
    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """
        获取任务信息
        
        Args:
            task_id: 任务 ID
            
        Returns:
            Dict: 任务信息，不存在返回 None
        """
        return self.tasks.get(task_id)
    
    def delete_task(self, task_id: str) -> bool:
        """
        删除任务
        
        Args:
            task_id: 任务 ID
            
        Returns:
            bool: 是否成功
        """
        if task_id in self.tasks:
            del self.tasks[task_id]
            return True
        return False
    
    def cleanup_completed_tasks(self, max_age_hours: int = 1):
        """
        清理已完成的任务
        
        Args:
            max_age_hours: 最大保留时间（小时）
        """
        now = datetime.now()
        cutoff = now.timestamp() - max_age_hours * 3600
        
        completed_statuses = ['completed', 'failed', 'error']
        
        for task_id, task in list(self.tasks.items()):
            if task['status'] in completed_statuses:
                updated_at = task.get('updated_at', '')
                if updated_at:
                    try:
                        task_time = datetime.fromisoformat(updated_at).timestamp()
                        if task_time < cutoff:
                            self.delete_task(task_id)
                    except:
                        pass
