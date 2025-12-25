/**
 * PDF OCR 文字提取工具
 * 功能：解析PDF文件，使用Tesseract进行OCR识别，提取文字内容
 */

class PDFOCR {
    constructor() {
        // DOM元素引用
        this.pdfFile = document.getElementById('pdfFile');
        this.fileName = document.getElementById('fileName');
        this.language = document.getElementById('language');
        this.processBtn = document.getElementById('processBtn');
        this.progressSection = document.getElementById('progressSection');
        this.progress = document.getElementById('progress');
        this.progressText = document.getElementById('progressText');
        this.resultSection = document.getElementById('resultSection');
        this.resultText = document.getElementById('resultText');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.copyBtn = document.getElementById('copyBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.errorSection = document.getElementById('errorSection');
        this.errorMsg = document.getElementById('errorMsg');

        // 状态变量
        this.selectedFile = null;
        this.extractedText = '';

        // 初始化事件监听
        this.initEventListeners();
    }

    /**
     * 初始化所有事件监听器
     */
    initEventListeners() {
        // 文件选择事件
        this.pdfFile.addEventListener('change', (e) => this.handleFileSelect(e));

        // 处理按钮点击事件
        this.processBtn.addEventListener('click', () => this.startOCR());

        // 下载按钮点击事件
        this.downloadBtn.addEventListener('click', () => this.downloadText());

        // 复制按钮点击事件
        this.copyBtn.addEventListener('click', () => this.copyText());

        // 清空按钮点击事件
        this.clearBtn.addEventListener('click', () => this.clearAll());

        // 拖拽上传支持
        this.setupDragAndDrop();
    }

    /**
     * 处理文件选择
     */
    handleFileSelect(event) {
        const file = event.target.files[0];

        if (!file) {
            this.fileName.textContent = '';
            this.selectedFile = null;
            return;
        }

        // 验证文件类型
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            this.showError('请选择有效的PDF文件');
            this.pdfFile.value = '';
            this.fileName.textContent = '';
            return;
        }

        // 验证文件大小（限制为50MB）
        const maxSize = 50 * 1024 * 1024;
        if (file.size > maxSize) {
            this.showError('文件大小不能超过50MB');
            this.pdfFile.value = '';
            this.fileName.textContent = '';
            return;
        }

        this.selectedFile = file;
        this.fileName.textContent = `已选择: ${file.name} (${this.formatFileSize(file.size)})`;

        // 隐藏之前的结果和错误
        this.hideResult();
        this.hideError();

        console.log(`文件已选择: ${file.name}, 大小: ${this.formatFileSize(file.size)}`);
    }

    /**
     * 设置拖拽上传功能
     */
    setupDragAndDrop() {
        const dropZone = document.querySelector('.upload-section');

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        // 拖拽进入时高亮
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.style.borderColor = '#667eea';
                dropZone.style.background = '#f0f4ff';
            });
        });

        // 拖拽离开时恢复
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.style.borderColor = '#e8eaff';
                dropZone.style.background = '#f8f9ff';
            });
        });

        // 放置文件
        dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.pdfFile.files = files;
                this.handleFileSelect({ target: { files: files } });
            }
        });
    }

    /**
     * 开始OCR处理
     */
    async startOCR() {
        if (!this.selectedFile) {
            this.showError('请先选择PDF文件');
            return;
        }

        // 检查Tesseract.js是否加载
        if (typeof Tesseract === 'undefined') {
            this.showError('OCR引擎加载失败，请刷新页面重试');
            return;
        }

        // 检查PDF.js是否加载
        if (typeof pdfjsLib === 'undefined') {
            this.showError('PDF解析库加载失败，请刷新页面重试');
            return;
        }

        try {
            // 禁用按钮防止重复点击
            this.setButtonLoading(true);

            // 隐藏之前的结果和错误
            this.hideResult();
            this.hideError();

            // 显示进度条
            this.showProgress();

            // 获取选择的语言
            const lang = this.language.value;
            console.log(`开始处理PDF，语言: ${lang}`);

            // 解析PDF文件
            this.updateProgress(10, '正在解析PDF文件...');
            const pdf = await this.loadPDF(this.selectedFile);

            // 获取页面数量
            const numPages = pdf.numPages;
            console.log(`PDF共有 ${numPages} 页`);

            // 提取所有页面的文字
            this.extractedText = '';
            const pageResults = [];

            for (let i = 1; i <= numPages; i++) {
                const progressPercent = 10 + Math.floor((i / numPages) * 70);
                this.updateProgress(progressPercent, `正在识别第 ${i}/${numPages} 页...`);

                const pageText = await this.processPage(pdf, i, lang);
                pageResults.push({ page: i, text: pageText });

                console.log(`第 ${i} 页识别完成，文字长度: ${pageText.length}`);
            }

            // 合并所有页面的文字
            this.extractedText = this.mergeResults(pageResults, numPages);

            // 完成
            this.updateProgress(100, '识别完成！');

            // 延迟一点显示结果
            setTimeout(() => {
                this.showResult();
                this.setButtonLoading(false);
            }, 500);

        } catch (error) {
            console.error('OCR处理错误:', error);
            this.showError(`处理失败: ${error.message}`);
            this.setButtonLoading(false);
            this.hideProgress();
        }
    }

    /**
     * 加载PDF文件
     */
    async loadPDF(file) {
        const arrayBuffer = await file.arrayBuffer();
        return await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    }

    /**
     * 处理单个页面
     */
    async processPage(pdf, pageNumber, lang) {
        // 获取页面
        const page = await pdf.getPage(pageNumber);

        // 获取页面渲染配置
        const viewport = page.getViewport({ scale: 2.0 }); // 提高分辨率以获得更好的OCR效果

        // 创建Canvas元素
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // 渲染页面到Canvas
        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;

        // 尝试使用Tesseract进行OCR识别
        try {
            const result = await Tesseract.recognize(canvas, lang, {
                logger: (m) => {
                    if (m.status === 'recognizing text') {
                        const pageProgress = 10 + Math.floor((m.progress * 30));
                        // 可以在这里更新单个页面的进度
                    }
                }
            });

            return result.data.text.trim();
        } catch (ocrError) {
            console.warn(`第 ${pageNumber} 页OCR识别失败，尝试备选方法`);

            // 备选方法：尝试获取PDF中的可搜索文本
            try {
                const textContent = await page.getTextContent();
                if (textContent && textContent.items && textContent.items.length > 0) {
                    const text = textContent.items.map(item => item.str).join(' ');
                    if (text.trim()) {
                        return text;
                    }
                }
            } catch (textError) {
                console.warn(`第 ${pageNumber} 页文本提取也失败`);
            }

            // 如果都失败，返回空字符串但继续处理其他页面
            return '';
        }
    }

    /**
     * 合并识别结果
     */
    mergeResults(pageResults, totalPages) {
        let mergedText = '';

        for (const result of pageResults) {
            if (result.text && result.text.trim()) {
                // 清理和格式化文本
                const cleanedText = this.cleanText(result.text);
                mergedText += `[第 ${result.page} 页]\n${cleanedText}\n\n`;
            } else {
                mergedText += `[第 ${result.page} 页]\n(未能识别到文字)\n\n`;
            }
        }

        return mergedText.trim();
    }

    /**
     * 清理和格式化文本
     */
    cleanText(text) {
        // 移除多余的空白字符
        let cleaned = text.replace(/\s+/g, ' ').trim();

        // 规范化标点符号
        cleaned = cleaned.replace(/[　\s]+/g, ' ');

        // 移除可能的乱码字符
        cleaned = cleaned.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');

        return cleaned;
    }

    /**
     * 更新进度条
     */
    updateProgress(percent, message) {
        this.progress.style.width = `${percent}%`;
        this.progressText.textContent = message || `处理中: ${percent}%`;
    }

    /**
     * 显示进度条
     */
    showProgress() {
        this.progressSection.style.display = 'block';
        this.progress.style.width = '0%';
        this.progressText.textContent = '准备中...';
    }

    /**
     * 隐藏进度条
     */
    hideProgress() {
        this.progressSection.style.display = 'none';
    }

    /**
     * 显示结果
     */
    showResult() {
        this.resultText.value = this.extractedText;
        this.resultSection.style.display = 'block';

        // 添加成功提示
        this.showToast('识别完成！');
    }

    /**
     * 隐藏结果
     */
    hideResult() {
        this.resultSection.style.display = 'none';
        this.resultText.value = '';
    }

    /**
     * 显示错误
     */
    showError(message) {
        this.errorMsg.textContent = message;
        this.errorSection.style.display = 'block';
    }

    /**
     * 隐藏错误
     */
    hideError() {
        this.errorSection.style.display = 'none';
        this.errorMsg.textContent = '';
    }

    /**
     * 设置按钮加载状态
     */
    setButtonLoading(loading) {
        if (loading) {
            this.processBtn.disabled = true;
            this.processBtn.innerHTML = '<span class="loading"></span>处理中...';
        } else {
            this.processBtn.disabled = false;
            this.processBtn.textContent = '开始提取文字';
        }
    }

    /**
     * 下载TXT文件
     */
    downloadText() {
        if (!this.extractedText.trim()) {
            this.showError('没有可下载的文字内容');
            return;
        }

        try {
            // 创建Blob对象
            const blob = new Blob([this.extractedText], { type: 'text/plain;charset=utf-8' });

            // 创建下载链接
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `OCR结果_${this.getTimestamp()}.txt`;

            // 触发下载
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // 释放URL对象
            URL.revokeObjectURL(url);

            console.log('文件下载成功');
            this.showToast('文件下载成功！');
        } catch (error) {
            console.error('下载失败:', error);
            this.showError('下载失败，请重试');
        }
    }

    /**
     * 复制文字到剪贴板
     */
    async copyText() {
        if (!this.extractedText.trim()) {
            this.showError('没有可复制的文字内容');
            return;
        }

        try {
            await navigator.clipboard.writeText(this.extractedText);
            console.log('文字已复制到剪贴板');
            this.showToast('已复制到剪贴板！');
        } catch (error) {
            // 备选方案
            const textarea = document.createElement('textarea');
            textarea.value = this.extractedText;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            this.showToast('已复制到剪贴板！');
        }
    }

    /**
     * 清空所有内容
     */
    clearAll() {
        this.selectedFile = null;
        this.extractedText = '';
        this.pdfFile.value = '';
        this.fileName.textContent = '';
        this.hideResult();
        this.hideError();
        this.hideProgress();
        console.log('已清空所有内容');
    }

    /**
     * 显示成功提示
     */
    showToast(message) {
        // 移除已存在的提示
        const existingToast = document.querySelector('.success-toast');
        if (existingToast) {
            existingToast.remove();
        }

        // 创建新提示
        const toast = document.createElement('div');
        toast.className = 'success-toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        // 3秒后移除
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /**
     * 格式化文件大小
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 获取时间戳
     */
    getTimestamp() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        const minute = String(now.getMinutes()).padStart(2, '0');
        const second = String(now.getSeconds()).padStart(2, '0');
        return `${year}${month}${day}_${hour}${minute}${second}`;
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.pdfOCR = new PDFOCR();
    console.log('PDF OCR 工具已初始化');
});
