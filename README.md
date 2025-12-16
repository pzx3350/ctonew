# YouTube 视频下载器

一个简洁的 YouTube 下载器 Web 应用：输入链接即可获取视频信息，并下载视频（音视频合并）或音频（仅音频流）。

> 注意：本项目仅用于学习与个人用途，请遵守当地法律法规与平台条款。

## 功能

- 获取视频信息：标题、时长、可用格式列表
- 下载视频：选择「音视频合并」格式下载
- 下载音频：选择「纯音频」格式下载
- 下载进度：前端显示下载进度与状态
- 响应式界面：手机/桌面均可使用

## 使用方法

### 1. 安装依赖

```bash
npm install
```

### 2. 启动服务

```bash
npm start
```

然后打开：

- http://localhost:3000

## 项目结构

```text
.
├── public/
│   ├── index.html
│   ├── styles.css
│   └── script.js
├── server.js
└── package.json
```

## 技术栈

- 前端：原生 HTML/CSS/JavaScript
- 后端：Node.js + Express
- 下载解析：ytdl-core

## 说明

- 音频下载为 YouTube 提供的音频流格式（如 m4a/webm），本项目不进行转码。
- 视频下载为「音视频合并」格式（含音频），避免下载后还需手动合并。
