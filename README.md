# 互动生日贺卡（Express + 静态前端）

一个精美的互动生日贺卡网页应用，包含星空动画、烟花特效和音乐播放功能。当前版本已从“纯静态文件”升级为 **Node.js + Express** 应用：Express 负责提供静态资源与基础 API 路由骨架，便于后续迭代后端能力。

## 快速开始

### 1) 安装依赖

```bash
npm install
```

### 2) 配置环境变量

```bash
cp .env.example .env
```

### 3) 启动服务

开发模式（自动重启）：

```bash
npm run dev
```

生产模式：

```bash
npm start
```

启动后访问：

- 页面：`http://localhost:3000/`
- 健康检查：`GET http://localhost:3000/api/health`

## 功能特点

### 视觉效果
- **淡粉色星空背景**：持续循环播放的动态星空动画效果
- **响应式设计**：支持不同屏幕尺寸（桌面端、平板、手机）
- **精美动画**：流畅的过渡效果和动画

### 交互功能
1. **上传设置**：
   - 上传生日照片（支持各种图片格式）
   - 上传背景音乐（支持各种音频格式）

2. **拆礼物按钮**：
   - 居中显示的大型交互按钮
   - 鼠标悬停有缩放效果
   - 礼物图标有跳动动画

3. **烟花效果**：
   - 点击按钮后触发五颜六色的烟花动画
   - 多个烟花依次发射
   - 粒子物理效果逼真

4. **照片展示**：
   - 烟花动画结束后展示照片
   - 照片带有白色边框和阴影效果
   - 缩放入场动画

5. **生日祝福**：
   - 照片下方显示“生日快乐！”文字
   - 文字有脉动动画效果

6. **背景音乐**：
   - 照片展示时自动播放音乐
   - 支持各种音频格式

## 后端基础（为后续需求预留）

### 已包含的中间件
- JSON / URL-Encoded 解析（`middleware/parsers.js`）
- CORS（`middleware/cors.js`）
- 请求日志（morgan，`middleware/requestLogger.js`）
- 统一 404 与错误处理（`middleware/notFound.js`、`middleware/errorHandler.js`）

### 路由 / 控制器 / 服务层
当前提供一个示例健康检查接口：

- `routes/api.js` → `controllers/healthController.js` → `services/healthService.js`

## 环境变量（.env）

示例见 `.env.example`：

- `PORT`：服务端口
- `DOWNLOAD_DIR`：下载目录（后续下载相关功能预留）
- `YTDLP_BINARY_PATH`：yt-dlp 可执行文件路径（后续音视频下载功能预留）
- `RATE_LIMITS`：限流配置（JSON 字符串，后续限流功能预留）

## 项目结构

```text
.
├── server.js                 # Express 入口
├── package.json
├── public/                   # 前端静态资源（由 Express 提供）
│   ├── index.html
│   ├── styles.css
│   └── script.js
├── routes/                   # 路由层
│   └── api.js
├── controllers/              # 控制器层
│   └── healthController.js
├── services/                 # 服务层（业务逻辑 / 配置等）
│   ├── configService.js
│   └── healthService.js
├── middleware/               # 通用中间件
│   ├── cors.js
│   ├── parsers.js
│   ├── requestLogger.js
│   ├── notFound.js
│   └── errorHandler.js
└── .env.example
```

## 技术实现

### 技术栈
- **Node.js + Express**：提供静态资源与 API 骨架
- **HTML5**：页面结构和 Canvas 画布
- **CSS3**：样式、动画和响应式布局
- **JavaScript**：交互逻辑和动画控制

### 核心技术
- **Canvas API**：用于绘制星空和烟花动画
- **File API**：处理用户上传的图片和音频文件
- **CSS Animation**：按钮和文字的动画效果
- **Responsive Design**：媒体查询实现响应式布局

## 浏览器兼容性

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+
- 移动端浏览器

## 注意事项

1. **音乐播放**：某些浏览器可能会阻止自动播放音频，需要用户交互后才能播放
2. **文件大小**：建议使用适当大小的图片和音频文件以确保加载速度
3. **图片格式**：支持 JPG、PNG、GIF 等常见图片格式
4. **音频格式**：支持 MP3、WAV、OGG 等常见音频格式

## 许可证

MIT License - 可自由使用和修改。
