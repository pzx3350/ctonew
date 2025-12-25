const pdfFileInput = document.getElementById('pdfFile');
const processBtn = document.getElementById('processBtn');
const downloadBtn = document.getElementById('downloadBtn');
const clearBtn = document.getElementById('clearBtn');
const languageSelect = document.getElementById('language');
const fileNameSpan = document.getElementById('fileName');
const resultText = document.getElementById('resultText');
const progressSection = document.getElementById('progressSection');
const progressBar = document.getElementById('progress');
const progressText = document.getElementById('progressText');
const resultSection = document.getElementById('resultSection');
const errorSection = document.getElementById('errorSection');
const errorMsg = document.getElementById('errorMsg');

let currentPdfFile = null;
let extractedText = '';

pdfFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        if (file.type !== 'application/pdf') {
            showError('请选择有效的PDF文件');
            return;
        }
        currentPdfFile = file;
        fileNameSpan.textContent = `已选择: ${file.name}`;
        resultSection.style.display = 'none';
        errorSection.style.display = 'none';
    }
});

function showError(msg) {
    errorMsg.textContent = msg;
    errorSection.style.display = 'block';
    resultSection.style.display = 'none';
    progressSection.style.display = 'none';
}

function updateProgress(current, total) {
    const percentage = Math.round((current / total) * 100);
    progressBar.style.width = percentage + '%';
    progressText.textContent = `处理中: ${percentage}%`;
}

processBtn.addEventListener('click', async () => {
    if (!currentPdfFile) {
        showError('请先选择PDF文件');
        return;
    }

    processBtn.disabled = true;
    progressSection.style.display = 'block';
    errorSection.style.display = 'none';
    resultSection.style.display = 'none';
    extractedText = '';
    updateProgress(0, 100);

    try {
        const arrayBuffer = await currentPdfFile.arrayBuffer();
        const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const totalPages = pdfDoc.numPages;

        const { createWorker } = Tesseract;
        const worker = await createWorker();

        const selectedLanguage = languageSelect.value;
        const languages = selectedLanguage.split('+');
        if (selectedLanguage === 'chi_sim+chi_tra+eng') {
            await worker.loadLanguage('chi_sim,chi_tra,eng');
            await worker.initialize('chi_sim+chi_tra+eng');
        } else {
            await worker.loadLanguage(selectedLanguage);
            await worker.initialize(selectedLanguage);
        }

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: 2 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            const { data: { text } } = await worker.recognize(canvas);
            extractedText += text + '\n\n';

            updateProgress(pageNum, totalPages);
        }

        await worker.terminate();

        resultText.value = extractedText.trim();
        resultSection.style.display = 'block';
        progressSection.style.display = 'none';

    } catch (error) {
        console.error('OCR错误:', error);
        showError(`处理失败: ${error.message}`);
    } finally {
        processBtn.disabled = false;
    }
});

downloadBtn.addEventListener('click', () => {
    if (!extractedText) {
        showError('没有可下载的文本');
        return;
    }

    let filename = 'extracted-text.txt';
    if (currentPdfFile) {
        filename = currentPdfFile.name.replace('.pdf', '.txt');
    }

    const blob = new Blob([extractedText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
});

clearBtn.addEventListener('click', () => {
    extractedText = '';
    resultText.value = '';
    pdfFileInput.value = '';
    fileNameSpan.textContent = '';
    currentPdfFile = null;
    resultSection.style.display = 'none';
    errorSection.style.display = 'none';
    progressSection.style.display = 'none';
});

window.addEventListener('load', () => {
    console.log('PDF OCR 工具已就绪');
});
