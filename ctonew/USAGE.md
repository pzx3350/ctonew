# YouTube 下载器使用说明

这是一个基于 yt-dlp 和 Express 的 YouTube 视频下载服务。

## 📋 系统要求

- Node.js >= 14.0.0
- yt-dlp (需要单独安装)
- FFmpeg (可选，用于格式转换和合并)

## 🔧 安装步骤

### 1. 安装 Node.js 依赖

```bash
cd ctonew
npm install
```

### 2. 安装 yt-dlp

**Linux / macOS:**
```bash
# 使用 pip
pip install yt-dlp

# 或使用包管理器
# Ubuntu/Debian
sudo apt install yt-dlp

# macOS
brew install yt-dlp
```

**Windows:**
```bash
# 使用 pip
pip install yt-dlp

# 或下载可执行文件
# 从 https://github.com/yt-dlp/yt-dlp/releases 下载 yt-dlp.exe
# 并将其放在 PATH 环境变量中
```

### 3. 安装 FFmpeg (可选但推荐)

**Linux:**
```bash
sudo apt install ffmpeg
```

**macOS:**
```bash
brew install ffmpeg
```

**Windows:**
下载并安装 FFmpeg：https://ffmpeg.org/download.html

### 4. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件：
```env
PORT=3000
DOWNLOADS_DIR=./downloads
NODE_ENV=development
```

## 🚀 启动服务

```bash
npm start
```

服务器将在 `http://localhost:3000` 启动。

## 📖 API 文档

### 1. 获取视频信息

**端点:** `GET /api/info`

**参数:**
- `url` (必需): YouTube 视频 URL

**示例:**
```bash
curl "http://localhost:3000/api/info?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

**响应:**
```json
{
  "title": "视频标题",
  "duration": 213,
  "thumbnail": "缩略图 URL",
  "uploader": "上传者",
  "description": "视频描述",
  "formats": [...],
  "audioFormats": [...]
}
```

### 2. 下载视频

**端点:** `POST /api/download/video`

**请求体:**
```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "formatId": "137+140"  // 可选
}
```

**响应:**
```json
{
  "downloadId": "1234567890",
  "message": "下载任务已创建，请通过进度接口查询下载状态"
}
```

### 3. 下载音频

**端点:** `POST /api/download/audio`

**请求体:**
```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "audioFormat": "mp3"  // 可选: mp3, m4a, wav, opus
}
```

**响应:**
```json
{
  "downloadId": "1234567890",
  "message": "音频下载任务已创建，请通过进度接口查询下载状态"
}
```

### 4. 查询下载进度

**端点:** `GET /api/progress/:id`

**示例:**
```bash
curl "http://localhost:3000/api/progress/1234567890"
```

**响应:**
```json
{
  "progress": 45.6,
  "status": "downloading",
  "message": "下载中...",
  "speed": "2.5MiB/s",
  "eta": "00:30"
}
```

**状态值:**
- `starting`: 准备下载
- `downloading`: 下载中
- `completed`: 完成
- `error`: 错误

### 5. 下载文件

**端点:** `GET /api/downloads/:filename`

**示例:**
```bash
curl -O "http://localhost:3000/api/downloads/video.mp4"
```

## 🎨 Web 界面

### API 测试页面
访问 `http://localhost:3000/api-test.html` 查看可视化的 API 测试界面。

### 生日卡片页面
访问 `http://localhost:3000/` 查看原生日卡片应用。

## 📁 项目结构

```
ctonew/
├── package.json           # 项目依赖配置
├── server.js             # Express 服务器
├── .env.example          # 环境变量示例
├── services/
│   └── downloader.js     # yt-dlp 下载服务
├── public/               # 静态文件
│   ├── index.html       # 生日卡片页面
│   ├── script.js        # 生日卡片脚本
│   └── styles.css       # 生日卡片样式
├── api-test.html        # API 测试页面
├── downloads/           # 下载文件保存目录 (自动创建)
└── USAGE.md            # 本文档
```

## 🐛 常见问题

### 1. yt-dlp 命令未找到
确保 yt-dlp 已安装并在 PATH 中：
```bash
which yt-dlp  # Linux/macOS
where yt-dlp  # Windows
```

### 2. 下载失败
- 检查视频 URL 是否正确
- 某些地区可能需要代理
- 确保网络连接正常

### 3. 格式合并失败
安装 FFmpeg 以支持格式合并和转换。

### 4. 端口被占用
修改 `.env` 文件中的 `PORT` 值。

## 🔐 安全建议

1. **不要在生产环境中直接暴露此服务**
2. **添加身份验证和授权机制**
3. **限制请求频率**
4. **定期清理下载目录**
5. **使用 HTTPS**

## 📝 开发模式

使用 nodemon 实现自动重启：
```bash
npm run dev
```

## 📦 部署

### 使用 PM2
```bash
npm install -g pm2
pm2 start server.js --name youtube-downloader
pm2 save
pm2 startup
```

### 使用 Docker (示例)
```dockerfile
FROM node:18-alpine
RUN apk add --no-cache python3 py3-pip ffmpeg
RUN pip3 install yt-dlp
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 支持

如有问题，请联系项目维护者。
