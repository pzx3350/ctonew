# ⚡ 快速开始指南

欢迎使用 YouTube 下载器！这个文档将帮助你在 5 分钟内启动并运行服务。

## 📦 已为您生成的文件

✅ 所有必需的项目文件已在 `ctonew` 目录中生成完毕！

```
ctonew/
├── package.json              ← Node.js 依赖配置
├── server.js                 ← Express 服务器
├── services/downloader.js    ← yt-dlp 下载服务
├── .env.example              ← 环境变量示例
├── .gitignore                ← Git 忽略规则
├── api-test.html             ← API 测试界面
├── public/                   ← 静态文件
│   ├── index.html
│   ├── script.js
│   └── styles.css
├── README.md                 ← 项目说明
├── USAGE.md                  ← 详细文档
├── FILES.md                  ← 文件清单
└── QUICKSTART.md             ← 本文件
```

## 🚀 三步启动

### 步骤 1: 安装 Node.js 依赖

```bash
cd ctonew
npm install
```

这将安装：
- Express (Web 框架)
- dotenv (环境变量)
- cors (跨域支持)
- nodemon (开发工具)

### 步骤 2: 安装 yt-dlp

**Linux / macOS:**
```bash
pip install yt-dlp
```

**Windows:**
```bash
pip install yt-dlp
```

**验证安装:**
```bash
yt-dlp --version
```

### 步骤 3: 启动服务

```bash
npm start
```

看到以下信息表示成功：
```
服务器运行在 http://localhost:3000
API 文档: http://localhost:3000/api-test.html
```

## 🎨 使用界面

### 方式 1: Web 测试界面（推荐新手）

1. 打开浏览器
2. 访问：http://localhost:3000/api-test.html
3. 在界面中输入 YouTube URL
4. 点击按钮测试各项功能

### 方式 2: API 调用（适合开发者）

**获取视频信息:**
```bash
curl "http://localhost:3000/api/info?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

**下载视频:**
```bash
curl -X POST http://localhost:3000/api/download/video \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

**下载音频 (MP3):**
```bash
curl -X POST http://localhost:3000/api/download/audio \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ","audioFormat":"mp3"}'
```

## 📁 下载的文件在哪里？

默认保存在 `ctonew/downloads/` 目录中。

可以通过修改 `.env` 文件自定义位置：
```bash
cp .env.example .env
# 编辑 .env 文件
DOWNLOADS_DIR=./my-downloads
```

## 🎯 常见使用场景

### 场景 1: 下载音乐（MP3）

1. 访问 http://localhost:3000/api-test.html
2. 滚动到 "下载音频" 部分
3. 输入 YouTube 音乐视频 URL
4. 选择 "MP3" 格式
5. 点击 "开始下载音频"
6. 等待进度条完成
7. 文件保存在 `downloads/` 目录

### 场景 2: 下载高清视频

1. 先获取视频信息查看可用格式
2. 选择想要的分辨率（如 1080p）
3. 使用对应的格式 ID 下载
4. 系统自动合并视频和音频

### 场景 3: 批量下载（编程方式）

```javascript
// 示例: Node.js 脚本
const urls = [
  'https://www.youtube.com/watch?v=VIDEO_ID_1',
  'https://www.youtube.com/watch?v=VIDEO_ID_2',
  'https://www.youtube.com/watch?v=VIDEO_ID_3'
];

for (const url of urls) {
  await fetch('http://localhost:3000/api/download/audio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, audioFormat: 'mp3' })
  });
}
```

## ⚠️ 常见问题

### 问题 1: "yt-dlp: command not found"

**解决方案:**
```bash
# 检查是否安装
which yt-dlp  # Linux/macOS
where yt-dlp  # Windows

# 如果未安装
pip install yt-dlp

# 如果 pip 不可用
# Linux: sudo apt install yt-dlp
# macOS: brew install yt-dlp
```

### 问题 2: 端口 3000 被占用

**解决方案:**
```bash
# 创建 .env 文件并修改端口
cp .env.example .env
# 编辑 .env，将 PORT=3000 改为 PORT=3001
```

### 问题 3: 下载失败 "Format merging failed"

**解决方案:** 安装 FFmpeg
```bash
# Linux
sudo apt install ffmpeg

# macOS
brew install ffmpeg

# Windows
# 从 https://ffmpeg.org 下载并添加到 PATH
```

### 问题 4: 视频受地区限制

**解决方案:** 某些视频可能在您的地区不可用，尝试：
- 使用 VPN
- 尝试其他视频
- 检查视频是否公开

## 📚 进阶阅读

- **完整 API 文档:** 查看 [USAGE.md](./USAGE.md)
- **文件说明:** 查看 [FILES.md](./FILES.md)
- **项目概述:** 查看 [README.md](./README.md)

## 🛠️ 开发模式

如果你想修改代码并自动重启：

```bash
npm run dev
```

使用 nodemon，每次保存文件后自动重启服务器。

## 🔐 安全提示

1. **仅供个人使用** - 不要公开暴露此服务到互联网
2. **遵守法律** - 尊重版权，仅下载有权使用的内容
3. **YouTube 条款** - 确保遵守 YouTube 服务条款
4. **本地使用** - 建议仅在本地网络使用

## 💡 使用技巧

### 技巧 1: 选择最佳音质
```bash
# 下载最高音质（m4a 格式）
curl -X POST http://localhost:3000/api/download/audio \
  -H "Content-Type: application/json" \
  -d '{"url":"YOUR_URL","audioFormat":"m4a"}'
```

### 技巧 2: 查看所有可用格式
```bash
# 先调用 info API 查看所有格式
curl "http://localhost:3000/api/info?url=YOUR_URL" | jq
```

### 技巧 3: 监控进度
```bash
# 获取 downloadId 后轮询进度
curl "http://localhost:3000/api/progress/DOWNLOAD_ID"
```

## 🎉 完成！

你现在已经准备好使用 YouTube 下载器了！

**推荐步骤：**
1. ✅ 打开 http://localhost:3000/api-test.html
2. ✅ 粘贴一个 YouTube URL
3. ✅ 点击 "获取信息" 测试功能
4. ✅ 尝试下载音频或视频
5. ✅ 查看 `downloads/` 目录中的文件

**需要帮助？**
- 查看 [USAGE.md](./USAGE.md) 获取详细文档
- 检查终端输出的错误信息
- 确保 yt-dlp 和 FFmpeg 已正确安装

---

**祝使用愉快！** 🚀
