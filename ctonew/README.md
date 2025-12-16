# 🎬 YouTube 下载器

基于 yt-dlp 和 Express 的 YouTube 视频/音频下载服务

## ✨ 特性

- 🎥 支持下载 YouTube 视频（多种分辨率）
- 🎵 支持提取音频（MP3/M4A/WAV/OPUS）
- 📊 实时下载进度跟踪
- 🔍 获取视频详细信息和可用格式
- 🌐 提供 RESTful API 接口
- 🎨 包含 Web 测试界面
- 💾 自动管理下载文件

## 🚀 快速开始

### 前置要求

- Node.js >= 14.0.0
- yt-dlp
- FFmpeg (推荐)

### 安装

1. **安装依赖**
```bash
npm install
```

2. **安装 yt-dlp**
```bash
# Linux/macOS
pip install yt-dlp

# Windows
pip install yt-dlp
```

3. **配置环境变量**
```bash
cp .env.example .env
```

4. **启动服务**
```bash
npm start
```

服务将在 http://localhost:3000 启动

## 📖 使用方法

### Web 界面

访问 http://localhost:3000/api-test.html 使用可视化测试界面

### API 调用

#### 获取视频信息
```bash
curl "http://localhost:3000/api/info?url=https://www.youtube.com/watch?v=VIDEO_ID"
```

#### 下载视频
```bash
curl -X POST http://localhost:3000/api/download/video \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=VIDEO_ID"}'
```

#### 下载音频
```bash
curl -X POST http://localhost:3000/api/download/audio \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=VIDEO_ID", "audioFormat": "mp3"}'
```

详细文档请查看 [USAGE.md](./USAGE.md)

## 📁 文件清单

```
ctonew/
├── 📄 package.json           - 项目依赖配置
├── 🚀 server.js             - Express 服务器主程序
├── 📝 .env.example          - 环境变量示例
├── 🔧 services/
│   └── downloader.js        - yt-dlp 下载服务模块
├── 🌐 public/               - 静态文件目录
│   ├── index.html          - 生日卡片页面
│   ├── script.js           - 前端脚本
│   └── styles.css          - 样式文件
├── 🎨 api-test.html        - API 测试界面
├── 📖 USAGE.md             - 详细使用文档
├── 📖 README.md            - 本文件
└── 🙈 .gitignore           - Git 忽略配置
```

## 🛠️ API 端点

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/info` | 获取视频信息 |
| POST | `/api/download/video` | 下载视频 |
| POST | `/api/download/audio` | 下载音频 |
| GET | `/api/progress/:id` | 查询下载进度 |
| GET | `/api/downloads/:filename` | 下载文件 |
| GET | `/health` | 健康检查 |

## 💡 技术栈

- **后端:** Node.js + Express
- **下载工具:** yt-dlp
- **格式处理:** FFmpeg
- **前端:** 原生 HTML/CSS/JavaScript

## 🐛 故障排除

### yt-dlp 未找到
```bash
# 检查安装
which yt-dlp  # Linux/macOS
where yt-dlp  # Windows

# 重新安装
pip install --upgrade yt-dlp
```

### FFmpeg 未找到
```bash
# Ubuntu/Debian
sudo apt install ffmpeg

# macOS
brew install ffmpeg

# Windows
# 从 https://ffmpeg.org 下载并添加到 PATH
```

### 端口冲突
编辑 `.env` 文件更改端口：
```env
PORT=3001
```

## 📝 注意事项

1. ⚠️ 请遵守 YouTube 服务条款
2. ⚠️ 仅供个人学习和研究使用
3. ⚠️ 请勿用于商业用途
4. ⚠️ 尊重版权，合理使用

## 🔐 生产环境部署建议

- 添加身份验证机制
- 实现请求频率限制
- 使用反向代理（Nginx/Apache）
- 启用 HTTPS
- 定期清理下载文件
- 监控服务器资源

## 📄 许可证

MIT License

## 🙏 致谢

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - 强大的视频下载工具
- [Express](https://expressjs.com/) - Web 框架
- [FFmpeg](https://ffmpeg.org/) - 多媒体处理

---

**享受使用！如有问题，请查看 [USAGE.md](./USAGE.md) 获取更多帮助。**
