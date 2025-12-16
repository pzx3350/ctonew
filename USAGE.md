# 生日贺卡 & YouTube 下载器 - 使用说明

这是一个集成了互动生日贺卡和 YouTube 下载功能的完整 Web 应用。

## 📋 功能概述

### 1. 互动生日贺卡
- 淡粉色星空背景动画
- 烟花特效
- 用户上传照片和音乐
- 响应式设计

### 2. YouTube 下载器
- 获取 YouTube 视频信息
- 下载完整视频
- 提取音频 (MP3, WAV, M4A, OPUS)
- 已下载文件管理

## 🚀 快速开始

### 前置要求

- Node.js 14.0.0 或更高版本
- npm 或 yarn
- yt-dlp (自动或手动安装)

### 安装步骤

1. **克隆或下载项目**
```bash
git clone <repository-url>
cd birthday-card-youtube-downloader
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**
```bash
cp .env.example .env
```

编辑 `.env` 文件（可选，默认值已设置）：
```env
PORT=3000
NODE_ENV=production
DOWNLOAD_DIR=./downloads
YTDLP_BINARY_PATH=yt-dlp
```

4. **安装 yt-dlp**

#### 选项 A: 自动安装 (推荐)
```bash
# macOS (使用 Homebrew)
brew install yt-dlp

# Ubuntu/Debian
sudo apt-get install yt-dlp

# Windows (使用 Chocolatey)
choco install yt-dlp

# 或直接从官方下载
# https://github.com/yt-dlp/yt-dlp/releases
```

#### 选项 B: 手动配置
如果 yt-dlp 不在 PATH 中，在 `.env` 中设置完整路径：
```env
YTDLP_BINARY_PATH=/path/to/yt-dlp
```

5. **启动服务器**
```bash
npm start
```

服务器将在 `http://localhost:3000` 启动。

## 📱 使用方法

### 访问生日贺卡

在浏览器中打开 `http://localhost:3000`：

1. **上传照片** - 选择一张生日照片
2. **上传音乐** (可选) - 选择背景音乐
3. **点击"开始体验"** - 进入卡片
4. **点击"拆礼物"** - 触发烟花动画
5. **欣赏祝福** - 照片展示和音乐播放

### 使用 YouTube 下载器

#### 方式 1: 通过 API 测试页面 (推荐)

访问 `http://localhost:3000/api-test.html`，这个页面提供了友好的 UI 来测试所有功能：

- **获取视频信息** - 查看视频元数据
- **下载视频** - 下载完整视频
- **下载音频** - 仅提取音频
- **管理文件** - 查看、下载、删除已下载文件

#### 方式 2: 通过 API

你也可以直接调用 API：

**获取视频信息**
```bash
curl "http://localhost:3000/api/video/info?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

**下载视频**
```bash
curl -X POST http://localhost:3000/api/video/download \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "format": "best"
  }'
```

**下载音频**
```bash
curl -X POST http://localhost:3000/api/audio/download \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "audioFormat": "mp3"
  }'
```

**列出已下载文件**
```bash
curl http://localhost:3000/api/downloads
```

**删除已下载文件**
```bash
curl -X DELETE "http://localhost:3000/api/downloads/filename.mp4"
```

## 🔌 API 文档

### 端点列表

| 方法 | 路由 | 描述 |
|------|------|------|
| GET | `/` | 生日贺卡主页 |
| GET | `/api-test.html` | API 测试页面 |
| GET | `/api/test` | 健康检查 |
| GET | `/api/video/info` | 获取视频信息 |
| POST | `/api/video/download` | 下载视频 |
| POST | `/api/audio/download` | 下载音频 |
| GET | `/api/downloads` | 列出已下载文件 |
| DELETE | `/api/downloads/:filename` | 删除文件 |

### 请求/响应示例

#### 获取视频信息
```
请求:
GET /api/video/info?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ

响应:
{
  "success": true,
  "data": {
    "id": "dQw4w9WgXcQ",
    "title": "Rick Astley - Never Gonna Give You Up",
    "duration": 212,
    "thumbnail": "https://...",
    "uploader": "Rick Astley",
    "formats": 48
  }
}
```

#### 下载视频
```
请求:
POST /api/video/download
Content-Type: application/json

{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "format": "best",
  "filename": "%(title)s.%(ext)s"
}

响应:
{
  "success": true,
  "data": {
    "filename": "Rick Astley - Never Gonna Give You Up.mp4",
    "path": "/path/to/downloads/...",
    "url": "/downloads/Rick Astley - Never Gonna Give You Up.mp4"
  }
}
```

#### 下载音频
```
请求:
POST /api/audio/download
Content-Type: application/json

{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "audioFormat": "mp3",
  "filename": "%(title)s.%(ext)s"
}

响应:
{
  "success": true,
  "data": {
    "filename": "Rick Astley - Never Gonna Give You Up.mp3",
    "path": "/path/to/downloads/...",
    "url": "/downloads/Rick Astley - Never Gonna Give You Up.mp3"
  }
}
```

## 📁 项目结构

```
.
├── server.js                 # Express 服务器主文件
├── package.json              # 项目依赖配置
├── .env.example              # 环境变量示例
├── USAGE.md                  # 本文档
├── api-test.html             # API 测试页面
├── public/                   # 前端静态文件
│   ├── index.html            # 生日贺卡 HTML
│   ├── script.js             # 贺卡交互逻辑
│   └── styles.css            # 贺卡样式
├── services/                 # 服务模块
│   └── downloader.js         # YouTube 下载服务
├── downloads/                # 已下载文件存储目录 (自动创建)
└── .gitignore                # Git 忽略文件
```

## 🛠️ 开发命令

```bash
# 启动生产环境
npm start

# 启动开发环境
npm run dev

# 手动测试 API
curl http://localhost:3000/api/test
```

## ⚙️ 配置说明

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | 3000 | 服务器监听端口 |
| `NODE_ENV` | production | 运行环境 |
| `DOWNLOAD_DIR` | ./downloads | 文件下载保存目录 |
| `YTDLP_BINARY_PATH` | yt-dlp | yt-dlp 可执行文件路径 |

### 修改贺卡内容

编辑 `public/index.html` 和 `public/styles.css`：

**修改祝福文字**
```html
<!-- 在 public/index.html 中 -->
<h1 class="birthday-text">生日快乐！</h1>
```

**修改颜色主题**
```css
/* 在 public/styles.css 中 */
body {
    background: linear-gradient(135deg, #ffc9e0 0%, #ffb3d9 50%, #ffa6d5 100%);
}
```

**调整烟花数量**
```javascript
// 在 public/script.js 中
const fireworkCount = 15; // 修改此数值
```

## 🔒 安全建议

1. **验证用户输入** - URL 验证已在代码中实现
2. **防止目录遍历** - 文件删除操作包含路径验证
3. **限制下载大小** - 考虑在生产环境添加文件大小限制
4. **使用 HTTPS** - 在生产环境部署时使用 HTTPS
5. **定期清理** - 定期清理 downloads 目录中的过期文件

## 🐛 故障排除

### "yt-dlp not found"
- **原因**: yt-dlp 未安装或不在 PATH 中
- **解决方案**: 安装 yt-dlp 或在 `.env` 中设置完整路径

### 下载超时
- **原因**: 视频过大或网络连接慢
- **解决方案**: 选择更低质量的格式或检查网络连接

### 音频提取失败
- **原因**: yt-dlp 缺少 ffmpeg 依赖
- **解决方案**: 
  ```bash
  # macOS
  brew install ffmpeg
  
  # Ubuntu/Debian
  sudo apt-get install ffmpeg
  
  # Windows
  choco install ffmpeg
  ```

### CORS 错误
- **原因**: 跨域请求问题
- **解决方案**: 在 `server.js` 中添加 CORS 中间件

### 内存不足
- **原因**: 下载大视频时内存溢出
- **解决方案**: 使用更小的视频或增加服务器内存

## 📝 日志

查看服务器日志以排查问题：
```bash
# 启动时会输出配置信息
npm start
```

## 🤝 贡献

欢迎提交 Issues 和 Pull Requests！

## 📄 许可证

MIT License - 可自由使用和修改

## 📞 联系方式

如有问题或建议，请提交 Issue 或联系开发者。

---

**最后更新**: 2024
**版本**: 1.0.0
