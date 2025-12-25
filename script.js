/**
 * PDF OCR Tool - Main JavaScript
 * 基于 Tesseract.js + PDF.js 实现PDF文字提取
 */

// 配置PDF.js的worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

// 状态管理
const state = {
    file: null,
    isProcessing: false,
    resultText: '',
    fileName: ''
};

// DOM元素
const elements = {
    uploadArea: document.getElementById('uploadArea'),
    fileInput: document.getElementById('fileInput'),
    fileInfo: document.getElementById('fileInfo'),
    fileName: document.getElementById('fileName'),
    removeFile: document.getElementById('removeFile'),
    languageSelect: document.getElementById('languageSelect'),
    startBtn: document.getElementById('startBtn'),
    resetBtn: document.getElementById('resetBtn'),
    progressSection: document.getElementById('progressSection'),
    progressBar: document.getElementById('progressBar'),
    progressPercentage: document.getElementById('progressPercentage'),
    progressStatus: document.getElementById('progressStatus'),
    errorSection: document.getElementById('errorSection'),
    errorMessage: document.getElementById('errorMessage'),
    errorClose: document.getElementById('errorClose'),
    resultSection: document.getElementById('resultSection'),
    resultTextarea: document.getElementById('resultTextarea'),
    resultStats: document.getElementById('resultStats'),
    downloadBtn: document.getElementById('downloadBtn')
};

/**
 * 更新进度显示
 * @param {number} percentage - 百分比 (0-100)
 * @param {string} status - 状态文本
 */
function updateProgress(percentage, status) {
    elements.progressBar.style.width = `${percentage}%`;
    elements.progressPercentage.textContent = `${Math.round(percentage)}%`;
    elements.progressStatus.textContent = status;
}

/**
 * 显示错误信息
 * @param {string} message - 错误消息
 */
function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorSection.hidden = false;
    elements.progressSection.hidden = true;
}

/**
 * 隐藏错误信息
 */
function hideError() {
    elements.errorSection.hidden = true;
}

/**
 * 验证文件
 * @param {File} file - 文件对象
 * @returns {boolean} 是否有效
 */
function validateFile(file) {
    if (!file) {
        showError('请选择文件');
        return false;
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.pdf')) {
        showError('仅支持PDF文件，请选择有效的PDF文件');
        return false;
    }

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
        showError('文件大小超过50MB限制，请选择较小的文件');
        return false;
    }

    if (file.size === 0) {
        showError('文件为空，请选择有效的PDF文件');
        return false;
    }

    hideError();
    return true;
}

/**
 * 设置文件信息
 * @param {File} file - 文件对象
 */
function setFile(file) {
    state.file = file;
    state.fileName = file.name.replace('.pdf', '');
    elements.fileName.textContent = `📄 ${file.name} (${formatFileSize(file.size)})`;
    elements.fileInfo.classList.add('active');
    elements.startBtn.disabled = false;
}

/**
 * 清除文件
 */
function clearFile() {
    state.file = null;
    state.fileName = '';
    elements.fileInput.value = '';
    elements.fileInfo.classList.remove('active');
    elements.startBtn.disabled = true;
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的大小
 */
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * 格式化字符数
 * @param {number} count - 字符数
 * @returns {string} 格式化后的字符数
 */
function formatCharCount(count) {
    if (count < 1000) return count + ' 个字符';
    if (count < 10000) return (count / 1000).toFixed(1) + 'K 个字符';
    return (count / 10000).toFixed(1) + 'W 个字符';
}

/**
 * 初始化事件监听
 */
function initEventListeners() {
    // 文件选择
    elements.fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && validateFile(file)) {
            setFile(file);
        } else {
            clearFile();
        }
    });

    // 拖拽上传
    elements.uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        elements.uploadArea.classList.add('drag-over');
    });

    elements.uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        elements.uploadArea.classList.remove('drag-over');
    });

    elements.uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        elements.uploadArea.classList.remove('drag-over');

        const file = e.dataTransfer.files[0];
        if (file && validateFile(file)) {
            setFile(file);
        }
    });

    // 点击上传区域触发文件选择
    elements.uploadArea.addEventListener('click', (e) => {
        if (e.target !== elements.removeFile) {
            elements.fileInput.click();
        }
    });

    // 移除文件
    elements.removeFile.addEventListener('click', (e) => {
        e.stopPropagation();
        clearFile();
        hideError();
    });

    // 开始识别
    elements.startBtn.addEventListener('click', startOCR);

    // 重置
    elements.resetBtn.addEventListener('click', resetAll);

    // 下载
    elements.downloadBtn.addEventListener('click', downloadResult);

    // 关闭错误
    elements.errorClose.addEventListener('click', hideError);
}

/**
 * 重置所有状态
 */
function resetAll() {
    clearFile();
    hideError();
    state.resultText = '';
    elements.progressSection.hidden = true;
    elements.resultSection.hidden = true;
    elements.resultTextarea.value = '';
    updateProgress(0, '准备中...');
    elements.progressBar.style.width = '0%';
}

/**
 * 将PDF页面转换为图像
 * @param {Object} pdf - PDF文档对象
 * @param {number} pageNum - 页码
 * @param {number} scale - 缩放比例
 * @returns {Promise<string>} Base64图像数据
 */
async function pdfPageToImage(pdf, pageNum, scale = 2) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
        canvasContext: context,
        viewport: viewport
    }).promise;

    return canvas.toDataURL('image/png');
}

/**
 * 使用Tesseract进行OCR识别
 * @param {string} imageData - Base64图像数据
 * @param {string} lang - 语言代码
 * @returns {Promise<string>} 识别文本
 */
async function performOCR(imageData, lang) {
    const worker = await Tesseract.createWorker(lang, 1, {
        logger: (m) => {
            if (m.status === 'recognizing text') {
                const progress = m.progress * 100;
                updateProgress(progress, `识别页面文字中... ${Math.round(progress)}%`);
            }
        }
    });

    const { data: { text } } = await worker.recognize(imageData);
    await worker.terminate();

    return text;
}

/**
 * 开始OCR处理
 */
async function startOCR() {
    if (!state.file || state.isProcessing) return;

    state.isProcessing = true;
    hideError();

    // UI状态更新
    elements.startBtn.disabled = true;
    elements.startBtn.querySelector('.btn-text').hidden = true;
    elements.startBtn.querySelector('.btn-loading').hidden = false;
    elements.progressSection.hidden = false;
    elements.resultSection.hidden = true;

    try {
        const language = elements.languageSelect.value;

        updateProgress(0, '正在读取PDF文件...');

        // 读取PDF文件
        const arrayBuffer = await state.file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;

        updateProgress(0, `共 ${numPages} 页，准备开始处理...`);

        let allText = '';
        const pageTexts = [];

        // 逐页处理
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            const overallProgress = ((pageNum - 1) / numPages) * 100;
            updateProgress(overallProgress, `正在处理第 ${pageNum}/${numPages} 页...`);

            // 将页面转换为图像
            const imageData = await pdfPageToImage(pdf, pageNum, 2);

            // 进行OCR识别
            const pageText = await performOCR(imageData, language);

            const pageProgress = (pageNum / numPages) * 100;
            updateProgress(pageProgress, `已完成第 ${pageNum}/${numPages} 页`);

            pageTexts.push(pageText);
        }

        // 合并所有页面的文本
        allText = pageTexts.map((text, index) =>
            `[第 ${index + 1} 页]\n${text.trim()}`
        ).join('\n\n' + '='.repeat(40) + '\n\n');

        // 清理文本
        allText = cleanText(allText);

        // 更新状态
        state.resultText = allText;

        // 显示结果
        elements.resultTextarea.value = allText;
        elements.resultStats.textContent = formatCharCount(allText.length);
        elements.resultSection.hidden = false;

        updateProgress(100, '处理完成！');

    } catch (error) {
        console.error('OCR处理错误:', error);
        showError(`处理失败: ${error.message || '未知错误'}`);
    } finally {
        state.isProcessing = false;
        elements.startBtn.disabled = false;
        elements.startBtn.querySelector('.btn-text').hidden = false;
        elements.startBtn.querySelector('.btn-loading').hidden = true;
    }
}

/**
 * 清理识别结果文本
 * @param {string} text - 原始文本
 * @returns {string} 清理后的文本
 */
function cleanText(text) {
    return text
        // 移除多余空白行
        .replace(/\n{3,}/g, '\n\n')
        // 移除行首行尾空白
        .split('\n')
        .map(line => line.trim())
        .join('\n')
        // 规范化空格
        .replace(/[ \t]+/g, ' ')
        // 移除特殊控制字符（保留基本换行）
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        // 清理常见的OCR错误
        .replace(/[|]/g, 'I')
        .replace(/[oO0]{2,}/g, (match) => match[0])
        .trim();
}

/**
 * 下载结果文本
 */
function downloadResult() {
    if (!state.resultText) {
        showError('没有可下载的识别结果');
        return;
    }

    const fileName = `${state.fileName || 'document'}.txt`;
    const blob = new Blob([state.resultText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    console.log('PDF OCR Tool 已初始化');
});
