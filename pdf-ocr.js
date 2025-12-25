// PDF OCR 文字识别工具 - 主逻辑

// 配置 PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

// 获取DOM元素
const starfieldCanvas = document.getElementById('starfield');
const starfieldCtx = starfieldCanvas.getContext('2d');
const uploadArea = document.getElementById('uploadArea');
const pdfFileInput = document.getElementById('pdfFileInput');
const selectFileBtn = document.getElementById('selectFileBtn');
const progressSection = document.getElementById('progressSection');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const progressPercent = document.getElementById('progressPercent');
const pageInfo = document.getElementById('pageInfo');
const resultSection = document.getElementById('resultSection');
const extractedText = document.getElementById('extractedText');
const totalPages = document.getElementById('totalPages');
const totalChars = document.getElementById('totalChars');
const processTime = document.getElementById('processTime');
const copyTextBtn = document.getElementById('copyTextBtn');
const downloadTxtBtn = document.getElementById('downloadTxtBtn');
const resetBtn = document.getElementById('resetBtn');

// 全局变量
let pdfDocument = null;
let allExtractedText = '';
let startTime = 0;

// 初始化星空背景
function initStarfield() {
    starfieldCanvas.width = window.innerWidth;
    starfieldCanvas.height = window.innerHeight;
    
    const stars = [];
    const starCount = Math.floor((window.innerWidth * window.innerHeight) / 3000);
    
    // 星星类
    class Star {
        constructor() {
            this.reset();
        }
        
        reset() {
            this.x = Math.random() * starfieldCanvas.width;
            this.y = Math.random() * starfieldCanvas.height;
            this.size = Math.random() * 2 + 0.5;
            this.speed = Math.random() * 0.3 + 0.1;
            this.opacity = Math.random();
            this.fadeDirection = Math.random() > 0.5 ? 1 : -1;
        }
        
        update() {
            this.y += this.speed;
            this.opacity += this.fadeDirection * 0.01;
            
            if (this.opacity <= 0 || this.opacity >= 1) {
                this.fadeDirection *= -1;
            }
            
            if (this.y > starfieldCanvas.height) {
                this.y = 0;
                this.x = Math.random() * starfieldCanvas.width;
            }
        }
        
        draw() {
            starfieldCtx.beginPath();
            starfieldCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            starfieldCtx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
            starfieldCtx.fill();
        }
    }
    
    // 创建星星
    for (let i = 0; i < starCount; i++) {
        stars.push(new Star());
    }
    
    // 动画循环
    function animate() {
        starfieldCtx.clearRect(0, 0, starfieldCanvas.width, starfieldCanvas.height);
        
        stars.forEach(star => {
            star.update();
            star.draw();
        });
        
        requestAnimationFrame(animate);
    }
    
    animate();
}

// 窗口大小改变时重新初始化
window.addEventListener('resize', initStarfield);
initStarfield();

// 点击选择文件按钮
selectFileBtn.addEventListener('click', () => {
    pdfFileInput.click();
});

// 点击上传区域
uploadArea.addEventListener('click', (e) => {
    if (e.target === uploadArea || e.target.closest('.upload-content')) {
        pdfFileInput.click();
    }
});

// 文件选择事件
pdfFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        handleFileUpload(file);
    }
});

// 拖拽上传
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
        handleFileUpload(file);
    } else {
        alert('请上传PDF文件！');
    }
});

// 处理文件上传
async function handleFileUpload(file) {
    // 检查文件大小（50MB限制）
    if (file.size > 50 * 1024 * 1024) {
        alert('文件大小超过50MB，请选择较小的文件！');
        return;
    }
    
    // 重置状态
    allExtractedText = '';
    startTime = Date.now();
    
    // 显示进度区域，隐藏上传区域
    uploadArea.classList.add('hidden');
    progressSection.classList.remove('hidden');
    resultSection.classList.add('hidden');
    
    // 更新进度
    updateProgress(0, '正在加载PDF文件...');
    
    try {
        // 读取PDF文件
        const fileReader = new FileReader();
        
        fileReader.onload = async function() {
            try {
                const typedArray = new Uint8Array(this.result);
                
                // 加载PDF文档
                pdfDocument = await pdfjsLib.getDocument(typedArray).promise;
                const numPages = pdfDocument.numPages;
                
                totalPages.textContent = numPages;
                pageInfo.textContent = `第 0 / ${numPages} 页`;
                
                updateProgress(5, `PDF加载完成，共 ${numPages} 页`);
                
                // 逐页处理PDF
                await processPdfPages(numPages);
                
            } catch (error) {
                console.error('PDF加载失败:', error);
                alert('PDF文件加载失败，请确保文件格式正确！');
                resetUpload();
            }
        };
        
        fileReader.onerror = function() {
            alert('文件读取失败！');
            resetUpload();
        };
        
        fileReader.readAsArrayBuffer(file);
        
    } catch (error) {
        console.error('文件处理错误:', error);
        alert('文件处理失败！');
        resetUpload();
    }
}

// 处理PDF所有页面
async function processPdfPages(numPages) {
    const textParts = [];
    
    // 初始化Tesseract
    const worker = await Tesseract.createWorker('chi_sim+eng', 1, {
        logger: m => {
            // 可以在这里记录详细的OCR进度
            if (m.status === 'recognizing text') {
                // OCR识别进度
            }
        }
    });
    
    try {
        // 逐页处理
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            updateProgress(
                5 + (pageNum - 1) / numPages * 85,
                `正在处理第 ${pageNum} / ${numPages} 页...`
            );
            pageInfo.textContent = `第 ${pageNum} / ${numPages} 页`;
            
            // 获取页面
            const page = await pdfDocument.getPage(pageNum);
            
            // 将PDF页面渲染为图片
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            const viewport = page.getViewport({ scale: 2.0 });
            
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;
            
            // 将Canvas转为Blob
            const imageBlob = await new Promise(resolve => {
                canvas.toBlob(resolve, 'image/png');
            });
            
            // 使用Tesseract进行OCR识别
            const { data: { text } } = await worker.recognize(imageBlob);
            
            // 添加页码标记和识别文本
            if (text.trim()) {
                textParts.push(`\n========== 第 ${pageNum} 页 ==========\n`);
                textParts.push(text.trim());
                textParts.push('\n');
            }
        }
        
        // 终止worker
        await worker.terminate();
        
        // 合并所有文本
        allExtractedText = textParts.join('\n');
        
        // 显示结果
        showResults();
        
    } catch (error) {
        console.error('OCR处理错误:', error);
        alert('文字识别失败，请重试！');
        await worker.terminate();
        resetUpload();
    }
}

// 更新进度条
function updateProgress(percent, text) {
    progressBar.style.width = percent + '%';
    progressPercent.textContent = Math.round(percent) + '%';
    progressText.textContent = text;
}

// 显示识别结果
function showResults() {
    // 隐藏进度，显示结果
    progressSection.classList.add('hidden');
    resultSection.classList.remove('hidden');
    
    // 计算处理时间
    const endTime = Date.now();
    const timeTaken = ((endTime - startTime) / 1000).toFixed(1);
    processTime.textContent = timeTaken + '秒';
    
    // 显示文本内容
    extractedText.value = allExtractedText;
    
    // 统计字数（去除空白字符）
    const charCount = allExtractedText.replace(/\s/g, '').length;
    totalChars.textContent = charCount;
    
    // 完成提示
    updateProgress(100, '识别完成！');
}

// 复制文本功能
copyTextBtn.addEventListener('click', () => {
    if (!allExtractedText) {
        alert('没有可复制的文本！');
        return;
    }
    
    extractedText.select();
    document.execCommand('copy');
    
    // 临时改变按钮文本
    const originalText = copyTextBtn.innerHTML;
    copyTextBtn.innerHTML = '<span>✓</span>已复制';
    copyTextBtn.style.background = '#4caf50';
    copyTextBtn.style.color = 'white';
    
    setTimeout(() => {
        copyTextBtn.innerHTML = originalText;
        copyTextBtn.style.background = '';
        copyTextBtn.style.color = '';
    }, 2000);
});

// 下载TXT文件功能
downloadTxtBtn.addEventListener('click', () => {
    if (!allExtractedText) {
        alert('没有可下载的文本！');
        return;
    }
    
    // 创建Blob对象
    const blob = new Blob([allExtractedText], { type: 'text/plain;charset=utf-8' });
    
    // 创建下载链接
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // 生成文件名（带时间戳）
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    link.download = `PDF识别结果_${timestamp}.txt`;
    
    // 触发下载
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 释放URL对象
    URL.revokeObjectURL(url);
    
    // 临时改变按钮文本
    const originalText = downloadTxtBtn.innerHTML;
    downloadTxtBtn.innerHTML = '<span>✓</span>下载成功';
    
    setTimeout(() => {
        downloadTxtBtn.innerHTML = originalText;
    }, 2000);
});

// 重置上传功能
resetBtn.addEventListener('click', () => {
    resetUpload();
});

// 重置到初始状态
function resetUpload() {
    uploadArea.classList.remove('hidden');
    progressSection.classList.add('hidden');
    resultSection.classList.add('hidden');
    
    pdfFileInput.value = '';
    allExtractedText = '';
    pdfDocument = null;
    
    progressBar.style.width = '0%';
    progressPercent.textContent = '0%';
    progressText.textContent = '准备处理...';
    pageInfo.textContent = '第 0 / 0 页';
    extractedText.value = '';
    totalPages.textContent = '0';
    totalChars.textContent = '0';
    processTime.textContent = '0秒';
}
