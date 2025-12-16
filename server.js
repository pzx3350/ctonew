const path = require('path');

const express = require('express');
const ytdl = require('ytdl-core');

const app = express();

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

function sanitizeFilename(input) {
  if (!input) return 'download';
  return String(input)
    .replace(/[\\/:*?"<>|\u0000-\u001F]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

function pickExtensionFromFormat(format) {
  if (format?.container) return format.container;

  const mime = format?.mimeType;
  if (mime) {
    const match = mime.match(/\/(\w+);/);
    if (match?.[1]) return match[1];
  }

  return 'bin';
}

function mapFormat(format) {
  return {
    itag: format.itag,
    container: format.container,
    qualityLabel: format.qualityLabel,
    fps: format.fps,
    hasVideo: Boolean(format.hasVideo),
    hasAudio: Boolean(format.hasAudio),
    audioBitrate: format.audioBitrate,
    contentLength: format.contentLength,
    mimeType: format.mimeType
  };
}

app.use(express.static(PUBLIC_DIR));

app.get('/api/info', async (req, res) => {
  try {
    const url = String(req.query.url || '').trim();
    if (!url) return res.status(400).json({ error: '缺少 url 参数' });
    if (!ytdl.validateURL(url)) return res.status(400).json({ error: 'URL 无效或不受支持' });

    const info = await ytdl.getInfo(url);

    const videoFormats = info.formats
      .filter((f) => f.hasVideo)
      .sort((a, b) => (b.height || 0) - (a.height || 0) || (b.fps || 0) - (a.fps || 0))
      .map(mapFormat);

    const audioFormats = info.formats
      .filter((f) => f.hasAudio && !f.hasVideo)
      .sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0))
      .map(mapFormat);

    res.json({
      title: info.videoDetails?.title,
      durationSeconds: Number(info.videoDetails?.lengthSeconds || 0),
      videoFormats,
      audioFormats
    });
  } catch (err) {
    res.status(500).json({ error: err?.message || '获取信息失败' });
  }
});

app.get('/api/download', async (req, res) => {
  let stream = null;

  try {
    const url = String(req.query.url || '').trim();
    const type = String(req.query.type || 'video').trim();
    const itag = Number(req.query.itag);

    if (!url) return res.status(400).json({ error: '缺少 url 参数' });
    if (!ytdl.validateURL(url)) return res.status(400).json({ error: 'URL 无效或不受支持' });
    if (!Number.isFinite(itag)) return res.status(400).json({ error: 'itag 参数无效' });

    const info = await ytdl.getInfo(url);
    const format = info.formats.find((f) => f.itag === itag);

    if (!format) return res.status(404).json({ error: '未找到对应格式' });
    if (type === 'audio' && (!format.hasAudio || format.hasVideo)) {
      return res.status(400).json({ error: '选择的格式不是纯音频格式' });
    }
    if (type !== 'audio' && !format.hasVideo) {
      return res.status(400).json({ error: '选择的格式不是视频格式' });
    }

    const ext = pickExtensionFromFormat(format);
    const title = sanitizeFilename(info.videoDetails?.title);
    const filename = `${title}.${ext}`;

    const mime = format.mimeType?.split(';')[0] || 'application/octet-stream';

    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Filename', encodeURIComponent(filename));

    if (format.contentLength) {
      res.setHeader('Content-Length', format.contentLength);
    }

    stream = ytdl.downloadFromInfo(info, { quality: itag });

    req.on('close', () => {
      if (stream) stream.destroy();
    });

    stream.on('error', (e) => {
      if (!res.headersSent) {
        res.status(500).json({ error: e?.message || '下载失败' });
      } else {
        res.end();
      }
    });

    stream.pipe(res);
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: err?.message || '下载失败' });
    }

    if (stream) stream.destroy();
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`YouTube downloader is running on http://localhost:${PORT}`);
});
