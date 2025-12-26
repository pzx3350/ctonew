# PDF OCR Service Configuration

# 应用配置
APP_HOST: str = "0.0.0.0"
APP_PORT: int = 8000
DEBUG: bool = True

# 文件上传配置
MAX_FILE_SIZE: int = 50 * 1024 * 1024  # 50MB
UPLOAD_DIR: str = "uploads"
OUTPUT_DIR: str = "outputs"
ALLOWED_EXTENSIONS: list = [".pdf"]

# OCR 配置
OCR_LANGUAGES: list = ["ch", "en"]  # 中文和英文
OCR_USE_GPU: bool = False  # 根据环境设置
OCR_DET_DB_THRESHOLD: float = 0.3
OCR_DET_DB_BOX_THRESHOLD: float = 0.6
OCR_REC_BATCH_NUM: int = 1

# 文本格式化配置
PRESERVE_LAYOUT: bool = True
LINE_BREAK_THRESHOLD: float = 20.0  # 像素间距，超过此值则换行
PARAGRAPH_BREAK_THRESHOLD: float = 50.0  # 像素间距，超过此值则分段

# 日志配置
LOG_LEVEL: str = "INFO"
LOG_FORMAT: str = "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{message}</cyan>"
