const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const downloader = require('./services/downloader');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const progressStore = new Map();

app.get('/api/info', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: '缺少 URL 参数' });
    }

    console.log(`获取视频信息: ${url}`);
    const info = await downloader.fetchVideoInfo(url);
    
    res.json(info);
  } catch (error) {
    console.error('获取视频信息失败:', error);
    res.status(500).json({ 
      error: '获取视频信息失败', 
      message: error.message 
    });
  }
});

app.post('/api/download/video', async (req, res) => {
  try {
    const { url, formatId } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: '缺少 URL 参数' });
    }

    const downloadId = Date.now().toString();
    progressStore.set(downloadId, {
      progress: 0,
      status: 'starting',
      message: '准备下载...'
    });

    res.json({ 
      downloadId,
      message: '下载任务已创建，请通过进度接口查询下载状态'
    });

    downloader.downloadVideo({
      url,
      formatId,
      onProgress: (progress) => {
        progressStore.set(downloadId, {
          progress: progress.percent || 0,
          status: 'downloading',
          message: progress.status || '下载中...',
          speed: progress.speed,
          eta: progress.eta
        });
      }
    })
    .then((result) => {
      progressStore.set(downloadId, {
        progress: 100,
        status: 'completed',
        message: '下载完成',
        filename: result.filename,
        filepath: result.filepath
      });
    })
    .catch((error) => {
      console.error('下载失败:', error);
      progressStore.set(downloadId, {
        progress: 0,
        status: 'error',
        message: error.message
      });
    });

  } catch (error) {
    console.error('视频下载失败:', error);
    res.status(500).json({ 
      error: '视频下载失败', 
      message: error.message 
    });
  }
});

app.post('/api/download/audio', async (req, res) => {
  try {
    const { url, audioFormat } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: '缺少 URL 参数' });
    }

    const downloadId = Date.now().toString();
    progressStore.set(downloadId, {
      progress: 0,
      status: 'starting',
      message: '准备下载音频...'
    });

    res.json({ 
      downloadId,
      message: '音频下载任务已创建，请通过进度接口查询下载状态'
    });

    downloader.downloadAudio({
      url,
      audioFormat: audioFormat || 'mp3',
      onProgress: (progress) => {
        progressStore.set(downloadId, {
          progress: progress.percent || 0,
          status: 'downloading',
          message: progress.status || '下载中...',
          speed: progress.speed,
          eta: progress.eta
        });
      }
    })
    .then((result) => {
      progressStore.set(downloadId, {
        progress: 100,
        status: 'completed',
        message: '下载完成',
        filename: result.filename,
        filepath: result.filepath
      });
    })
    .catch((error) => {
      console.error('音频下载失败:', error);
      progressStore.set(downloadId, {
        progress: 0,
        status: 'error',
        message: error.message
      });
    });

  } catch (error) {
    console.error('音频下载失败:', error);
    res.status(500).json({ 
      error: '音频下载失败', 
      message: error.message 
    });
  }
});

app.get('/api/progress/:id', (req, res) => {
  const { id } = req.params;
  const progress = progressStore.get(id);
  
  if (!progress) {
    return res.status(404).json({ error: '找不到该下载任务' });
  }
  
  res.json(progress);
  
  if (progress.status === 'completed' || progress.status === 'error') {
    setTimeout(() => progressStore.delete(id), 60000);
  }
});

app.get('/api/downloads/:filename', (req, res) => {
  const { filename } = req.params;
  const downloadsDir = process.env.DOWNLOADS_DIR || './downloads';
  const filepath = path.join(downloadsDir, filename);
  
  res.download(filepath, (err) => {
    if (err) {
      console.error('文件下载失败:', err);
      if (!res.headersSent) {
        res.status(404).json({ error: '文件不存在' });
      }
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`API 文档: http://localhost:${PORT}/api-test.html`);
});
