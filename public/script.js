const urlForm = document.getElementById('urlForm');
const urlInput = document.getElementById('urlInput');
const infoBtn = document.getElementById('infoBtn');
const refreshBtn = document.getElementById('refreshBtn');
const infoSection = document.getElementById('infoSection');
const videoTitle = document.getElementById('videoTitle');
const videoDuration = document.getElementById('videoDuration');
const formatSelect = document.getElementById('formatSelect');
const downloadBtn = document.getElementById('downloadBtn');
const statusSection = document.getElementById('statusSection');
const statusText = document.getElementById('statusText');
const progressText = document.getElementById('progressText');
const progressBar = document.getElementById('progressBar');
const cancelBtn = document.getElementById('cancelBtn');
const errorSection = document.getElementById('errorSection');
const errorText = document.getElementById('errorText');

let currentInfo = null;
let downloadAbortController = null;

function setError(message) {
  if (!message) {
    errorSection.classList.add('hidden');
    errorText.textContent = '';
    return;
  }

  errorText.textContent = message;
  errorSection.classList.remove('hidden');
}

function setInfoVisible(visible) {
  infoSection.classList.toggle('hidden', !visible);
}

function setStatusVisible(visible) {
  statusSection.classList.toggle('hidden', !visible);
}

function setLoadingInfo(isLoading) {
  infoBtn.disabled = isLoading;
  refreshBtn.disabled = isLoading;
  downloadBtn.disabled = isLoading;
  infoBtn.textContent = isLoading ? '获取中…' : '获取视频信息';
}

function setDownloading(isDownloading) {
  urlInput.disabled = isDownloading;
  infoBtn.disabled = isDownloading;
  refreshBtn.disabled = isDownloading;
  downloadBtn.disabled = isDownloading;
  cancelBtn.disabled = !isDownloading;
}

function formatDurationSeconds(totalSeconds) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '未知';

  const seconds = Math.floor(totalSeconds);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const pad = (n) => String(n).padStart(2, '0');

  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[idx]}`;
}

function getSelectedType() {
  const checked = document.querySelector('input[name="downloadType"]:checked');
  return checked?.value === 'audio' ? 'audio' : 'video';
}

function getFormatsForType(type) {
  if (!currentInfo) return [];
  return type === 'audio' ? currentInfo.audioFormats : currentInfo.videoFormats;
}

function buildFormatLabel(type, f) {
  const size = f.contentLength ? formatBytes(Number(f.contentLength)) : '';

  if (type === 'audio') {
    const bitrate = f.audioBitrate ? `${f.audioBitrate} kbps` : '未知码率';
    const container = f.container ? f.container.toUpperCase() : '音频';
    return [container, bitrate, size].filter(Boolean).join(' · ');
  }

  const q = f.qualityLabel || '未知清晰度';
  const fps = f.fps ? `${f.fps}fps` : '';
  const container = f.container ? f.container.toUpperCase() : '视频';
  const audio = f.hasAudio ? '含音频' : '无音频';
  return [container, q, fps, audio, size].filter(Boolean).join(' · ');
}

function renderFormats() {
  const type = getSelectedType();
  const formats = getFormatsForType(type);

  formatSelect.innerHTML = '';

  if (!formats.length) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = '暂无可用格式';
    formatSelect.appendChild(opt);
    downloadBtn.disabled = true;
    return;
  }

  for (const f of formats) {
    const opt = document.createElement('option');
    opt.value = String(f.itag);
    opt.textContent = buildFormatLabel(type, f);
    formatSelect.appendChild(opt);
  }

  downloadBtn.disabled = false;
}

async function fetchVideoInfo(url) {
  setError('');
  setInfoVisible(false);
  setStatusVisible(false);
  setLoadingInfo(true);

  try {
    const resp = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      throw new Error(data?.error || '获取视频信息失败');
    }

    currentInfo = data;
    videoTitle.textContent = data.title || '未知';
    videoDuration.textContent = formatDurationSeconds(Number(data.durationSeconds));

    setInfoVisible(true);
    renderFormats();
  } finally {
    setLoadingInfo(false);
  }
}

function setProgress({ percent, meta, text }) {
  if (Number.isFinite(percent)) {
    const p = Math.max(0, Math.min(100, percent));
    progressBar.style.width = `${p}%`;
    progressText.textContent = `${Math.floor(p)}%`;
    statusSection.querySelector('.progress')?.setAttribute('aria-valuenow', String(Math.floor(p)));
  } else {
    progressText.textContent = meta || '';
  }

  if (text) statusText.textContent = text;
}

function parseFilenameFromHeader(headerValue) {
  if (!headerValue) return null;

  const decoded = decodeURIComponent(headerValue);
  const safe = decoded.replace(/[\r\n]/g, '').trim();
  return safe || null;
}

async function downloadSelected() {
  const url = urlInput.value.trim();
  if (!url) {
    setError('请先输入 YouTube 链接。');
    return;
  }

  if (!currentInfo) {
    setError('请先获取视频信息。');
    return;
  }

  const type = getSelectedType();
  const itag = formatSelect.value;
  if (!itag) {
    setError('请选择可用格式。');
    return;
  }

  setError('');
  setStatusVisible(true);
  setProgress({ percent: 0, text: '开始下载…' });
  setDownloading(true);

  downloadAbortController = new AbortController();

  try {
    const resp = await fetch(
      `/api/download?url=${encodeURIComponent(url)}&type=${encodeURIComponent(type)}&itag=${encodeURIComponent(itag)}`,
      { signal: downloadAbortController.signal }
    );

    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      throw new Error(data?.error || '下载失败');
    }

    const filename =
      parseFilenameFromHeader(resp.headers.get('x-filename')) ||
      `${type === 'audio' ? 'audio' : 'video'}.bin`;

    const contentLength = Number(resp.headers.get('content-length'));
    const hasLength = Number.isFinite(contentLength) && contentLength > 0;

    statusText.textContent = '下载中…';

    const reader = resp.body?.getReader();
    if (!reader) throw new Error('当前浏览器不支持流式下载。');

    const chunks = [];
    let received = 0;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        received += value.byteLength;

        if (hasLength) {
          setProgress({
            percent: (received / contentLength) * 100,
            meta: `${formatBytes(received)} / ${formatBytes(contentLength)}`,
            text: '下载中…'
          });
        } else {
          setProgress({
            percent: NaN,
            meta: formatBytes(received),
            text: '下载中…'
          });
        }
      }
    }

    setProgress({ percent: 100, text: '正在保存文件…' });

    const blob = new Blob(chunks, {
      type: resp.headers.get('content-type') || 'application/octet-stream'
    });

    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);

    setProgress({ percent: 100, text: '完成' });
  } catch (err) {
    if (err?.name === 'AbortError') {
      setError('已取消下载。');
    } else {
      setError(err?.message || '下载过程中出现错误。');
    }
  } finally {
    setDownloading(false);
    downloadAbortController = null;
  }
}

urlForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const url = urlInput.value.trim();
  if (!url) {
    setError('请输入 YouTube 链接。');
    return;
  }

  try {
    await fetchVideoInfo(url);
  } catch (err) {
    setError(err?.message || '获取视频信息失败。');
  }
});

refreshBtn.addEventListener('click', async () => {
  const url = urlInput.value.trim();
  if (!url) return;

  try {
    await fetchVideoInfo(url);
  } catch (err) {
    setError(err?.message || '刷新失败。');
  }
});

for (const el of document.querySelectorAll('input[name="downloadType"]')) {
  el.addEventListener('change', () => {
    renderFormats();
  });
}

downloadBtn.addEventListener('click', () => {
  downloadSelected();
});

cancelBtn.addEventListener('click', () => {
  if (downloadAbortController) downloadAbortController.abort();
});
