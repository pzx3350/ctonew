// Initialize PDF.js
const pdfjsLib = window['pdfjs-dist/build/pdf'] || window.pdfjsLib;
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// DOM Elements
const pdfUpload = document.getElementById('pdf-upload');
const fileList = document.getElementById('file-list');
const languageSelect = document.getElementById('language-select');
const startOcrBtn = document.getElementById('start-ocr');
const progressContainer = document.getElementById('progress-container');
const progressStatus = document.getElementById('progress-status');
const progressPercent = document.getElementById('progress-percent');
const progressBar = document.getElementById('progress-bar');
const resultSection = document.getElementById('result-section');
const resultPreview = document.getElementById('result-preview');
const downloadTxtBtn = document.getElementById('download-txt');

let selectedFiles = [];
let fullText = '';

// File Selection Handler
pdfUpload.addEventListener('change', (e) => {
    selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 0) {
        fileList.textContent = `已选择 ${selectedFiles.length} 个文件: ` + selectedFiles.map(f => f.name).join(', ');
        startOcrBtn.disabled = false;
    } else {
        fileList.textContent = '';
        startOcrBtn.disabled = true;
    }
});

// Start OCR Process
startOcrBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return;

    startOcrBtn.disabled = true;
    const originalBtnText = startOcrBtn.textContent;
    startOcrBtn.textContent = '正在处理...';
    
    pdfUpload.disabled = true;
    progressContainer.style.display = 'block';
    resultSection.style.display = 'none';
    fullText = '';
    resultPreview.value = '';

    const lang = languageSelect.value;
    
    try {
        // Initialize Tesseract Worker
        progressStatus.textContent = '正在初始化 OCR 引擎 (可能需要下载语言数据，请稍候)...';
        updateProgress(0);
        
        const worker = await Tesseract.createWorker(lang, 1, {
            logger: m => {
                if (m.status === 'recognizing text') {
                    // Internal progress can be tracked here if needed
                    // For now we track by page
                }
            },
            errorHandler: err => console.error(err)
        });

        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            progressStatus.textContent = `正在读取文件: ${file.name} (${i + 1}/${selectedFiles.length})`;
            
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const numPages = pdf.numPages;

            for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                const overallProgress = ((i / selectedFiles.length) + (pageNum / numPages / selectedFiles.length)) * 100;
                progressStatus.textContent = `正在处理: ${file.name} - 第 ${pageNum}/${numPages} 页`;
                updateProgress(overallProgress);

                const page = await pdf.getPage(pageNum);
                const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({ canvasContext: context, viewport: viewport }).promise;

                // Perform OCR on the canvas
                const { data: { text } } = await worker.recognize(canvas);
                fullText += `--- ${file.name} - Page ${pageNum} ---\n${text}\n\n`;
                
                // Real-time preview update (optional, but good for UX)
                resultPreview.value = fullText;
                resultSection.style.display = 'block';
            }
        }

        await worker.terminate();

        progressStatus.textContent = '处理完成！';
        updateProgress(100);
        alert('OCR 文字提取完成！');

    } catch (error) {
        console.error('OCR Error:', error);
        progressStatus.textContent = '处理过程中出错: ' + error.message;
        alert('出错啦: ' + error.message);
    } finally {
        startOcrBtn.disabled = false;
        startOcrBtn.textContent = originalBtnText;
        pdfUpload.disabled = false;
    }
});

// Download TXT Handler
downloadTxtBtn.addEventListener('click', () => {
    if (!fullText) return;

    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    let fileName = 'ocr_result.txt';
    if (selectedFiles.length === 1) {
        fileName = selectedFiles[0].name.replace('.pdf', '') + '.txt';
    }
    
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
});

function updateProgress(percent) {
    const p = Math.min(100, Math.max(0, percent));
    progressBar.style.width = `${p}%`;
    progressPercent.textContent = `${Math.round(p)}%`;
}
