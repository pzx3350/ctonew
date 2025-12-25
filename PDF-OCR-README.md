# PDF OCR 文字识别工具 使用说明

## 功能概述

这是一个基于纯前端技术实现的PDF文件OCR文字识别工具，可以将PDF文档中的图片和扫描内容转换为可编辑的文字。

## 主要功能

### 1. 文件上传
- ✅ 支持拖拽上传PDF文件
- ✅ 支持点击选择文件上传
- ✅ 文件大小限制：50MB
- ✅ 仅支持PDF格式文件

### 2. PDF处理
- ✅ 使用 pdf.js 库读取PDF文件
- ✅ 自动识别PDF页数
- ✅ 逐页转换PDF为高清图片（2倍分辨率）
- ✅ 支持多页PDF文档处理

### 3. OCR文字识别
- ✅ 使用 Tesseract.js 进行OCR识别
- ✅ 支持中文（简体）和英文识别
- ✅ 实时显示处理进度和当前页数
- ✅ 自动合并所有页面的识别结果

### 4. 结果展示
- ✅ 文本预览区域显示所有识别内容
- ✅ 显示总页数、识别字数和处理时间
- ✅ 每页内容带有页码标记，便于定位

### 5. 文本导出
- ✅ 一键复制所有识别文本
- ✅ 导出为TXT文件下载
- ✅ 文件名自动添加时间戳
- ✅ 支持重新上传功能

## 技术栈

### 核心库
- **PDF.js** (v3.11.174) - Mozilla开发的PDF渲染库
- **Tesseract.js** (v4.1.1) - 纯JavaScript的OCR识别引擎

### 前端技术
- HTML5 - 语义化结构
- CSS3 - 动画和响应式设计
- Vanilla JavaScript - 无框架依赖
- Canvas API - PDF页面渲染和星空背景动画
- File API - 文件读取和处理
- Blob API - 文件下载

## 文件结构

```
project/
├── pdf-ocr.html      # 主HTML页面
├── pdf-ocr.css       # 样式文件
├── pdf-ocr.js        # 核心JavaScript逻辑
└── PDF-OCR-README.md # 使用说明文档
```

## 使用方法

### 方式一：直接打开HTML文件
1. 在浏览器中打开 `pdf-ocr.html` 文件
2. 拖拽或点击上传PDF文件
3. 等待处理完成
4. 复制或导出识别结果

### 方式二：本地服务器运行
```bash
# 使用Python启动简单HTTP服务器
python -m http.server 8000

# 或使用Node.js的http-server
npx http-server
```

然后在浏览器访问：`http://localhost:8000/pdf-ocr.html`

## 交互流程

```
1. 用户上传PDF文件
   ↓
2. 系统加载PDF文档
   ↓
3. 逐页渲染PDF为图片
   ↓
4. 对每页图片进行OCR识别
   ↓
5. 实时显示处理进度
   ↓
6. 合并所有页面的文字
   ↓
7. 显示识别结果和统计信息
   ↓
8. 用户可以复制或下载TXT文件
```

## 代码架构

### 主要函数说明

#### 初始化函数
- `initStarfield()` - 初始化星空背景动画
- `Star` 类 - 星星对象，处理位置、透明度和动画

#### 文件处理函数
- `handleFileUpload(file)` - 处理上传的PDF文件
- `processPdfPages(numPages)` - 逐页处理PDF文档
- `updateProgress(percent, text)` - 更新进度条

#### 结果处理函数
- `showResults()` - 显示识别结果
- `resetUpload()` - 重置到初始状态

#### 事件处理
- 文件选择事件
- 拖拽上传事件
- 复制文本功能
- 下载TXT功能

## 性能优化

### 已实现的优化
1. **高分辨率渲染** - 使用2倍scale提高识别准确率
2. **异步处理** - 使用async/await避免阻塞UI
3. **进度反馈** - 实时显示处理进度
4. **内存管理** - 及时释放Canvas和Blob对象
5. **Worker隔离** - Tesseract使用Web Worker避免阻塞主线程

### 处理时间参考
- 单页PDF（简单文字）：约5-10秒
- 单页PDF（复杂图文）：约10-20秒
- 多页PDF：每页增加10-20秒

*注：实际时间取决于PDF页数、图片质量和设备性能*

## 浏览器兼容性

### 推荐浏览器
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Edge 90+
- ✅ Safari 14+

### 所需特性支持
- Canvas API
- File API
- Blob API
- Async/Await
- Web Workers
- ES6+

## 响应式设计

### 支持的设备
- 📱 手机端（320px - 767px）
- 📱 平板端（768px - 1023px）
- 💻 桌面端（1024px+）

### 适配特性
- 流式布局自动适应屏幕宽度
- 触摸友好的按钮和交互区域
- 可读性优化的字体大小
- 移动端优化的进度显示

## 注意事项

### 文件要求
- 仅支持PDF格式
- 文件大小不超过50MB
- 建议使用清晰的扫描文档

### 识别准确度
- 清晰的打印文字识别率较高
- 手写文字识别率较低
- 图片质量直接影响识别效果
- 支持中英文混合识别

### 隐私安全
- ⚠️ 所有处理完全在浏览器本地完成
- ⚠️ 不会上传文件到任何服务器
- ⚠️ 刷新页面后数据会丢失
- ⚠️ 请自行保存识别结果

## 故障排除

### 常见问题

#### 1. PDF加载失败
- 检查文件是否损坏
- 确认文件格式为PDF
- 尝试减小文件大小

#### 2. OCR识别失败
- 检查网络连接（首次需下载语言包）
- 清除浏览器缓存后重试
- 尝试使用Chrome浏览器

#### 3. 识别结果不准确
- 确保PDF中的文字清晰
- 避免倾斜、模糊的扫描件
- 简单文字识别率更高

#### 4. 处理速度慢
- 大文件需要更长处理时间
- 关闭其他占用资源的标签页
- 使用性能更好的设备

## 未来改进方向

- [ ] 支持更多语言识别（日语、韩语等）
- [ ] 添加图片预处理（去噪、增强对比度）
- [ ] 支持识别结果编辑功能
- [ ] 添加PDF页面选择功能
- [ ] 支持批量处理多个PDF
- [ ] 导出为Word/Markdown格式
- [ ] 添加识别结果对比功能

## 开发者信息

### CDN依赖
```html
<!-- PDF.js -->
<script src="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js"></script>

<!-- Tesseract.js -->
<script src="https://cdn.jsdelivr.net/npm/tesseract.js@4.1.1/dist/tesseract.min.js"></script>
```

### 配置说明
```javascript
// PDF.js Worker配置
pdfjsLib.GlobalWorkerOptions.workerSrc = 
    'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

// Tesseract语言包配置
const worker = await Tesseract.createWorker('chi_sim+eng', 1, {
    logger: m => console.log(m)  // 可选的日志记录
});
```

## 许可协议

本项目使用的开源库：
- PDF.js: Apache License 2.0
- Tesseract.js: Apache License 2.0

## 联系方式

如有问题或建议，欢迎提出反馈。

---

**最后更新时间：** 2024年12月

**版本：** v1.0.0
