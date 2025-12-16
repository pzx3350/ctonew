const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { spawn } = require('child_process');
const YTDlpWrap = require('yt-dlp-wrap').default;

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// 确保downloads目录存在
const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

// 存储下载进度
const downloadProgress = new Map();

// yt-dlp可执行文件路径
let ytDlp;
try {
  ytDlp = new YTDlpWrap('/usr/bin/yt-dlp'); // 显式指定yt-dlp路径
  console.log('✅ yt-dlp初始化成功');
} catch (error) {
  console.warn('警告: 无法初始化yt-dlp:', error.message);
}

// 获取视频信息
app.get('/api/info', async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: '请提供视频URL' });
  }

  try {
    console.log('获取视频信息:', url);
    
    if (!ytDlp) {
      throw new Error('yt-dlp不可用，请确保已安装');
    }

    const info = await ytDlp.getVideoInfo([
      url,
      '--dump-json',
      '--no-warnings',
      '--no-call-home',
      '--no-check-certificate',
      '--prefer-free-formats',
      '--youtube-skip-dash-manifest'
    ]);

    // 提取有用的信息
    const videoInfo = {
      id: info.id,
      title: info.title,
      description: info.description,
      thumbnail: info.thumbnail,
      duration: info.duration,
      viewCount: info.view_count,
      uploader: info.uploader,
      uploadDate: info.upload_date,
      formats: info.formats
        .filter(format => format.url && format.ext)
        .map(format => ({
          formatId: format.format_id,
          ext: format.ext,
          resolution: format.resolution || 'audio only',
          filesize: format.filesize,
          acodec: format.acodec,
          vcodec: format.vcodec,
          fps: format.fps,
          url: format.url
        }))
    };

    console.log('成功获取视频信息:', videoInfo.title);
    res.json({ success: true, data: videoInfo });

  } catch (error) {
    console.error('获取视频信息失败:', error.message);
    res.status(500).json({ 
      success: false, 
      error: '获取视频信息失败: ' + error.message 
    });
  }
});

// 下载视频
app.post('/api/download/video', async (req, res) => {
  const { url, format = 'best[ext=mp4]' } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: '请提供视频URL' });
  }

  const downloadId = uuidv4();
  
  try {
    console.log('开始下载视频:', url);
    
    if (!ytDlp) {
      throw new Error('yt-dlp不可用，请确保已安装');
    }

    // 获取视频信息
    const info = await ytDlp.getVideoInfo([
      url,
      '--dump-json',
      '--no-warnings',
      '--no-call-home',
      '--no-check-certificate'
    ]);

    const safeTitle = info.title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
    const outputPath = path.join(downloadsDir, `${safeTitle}.%(ext)s`);
    
    // 初始化进度
    downloadProgress.set(downloadId, {
      status: 'starting',
      progress: 0,
      title: info.title
    });

    // 启动下载
    const downloadProcess = ytDlp.exec([
      url,
      '-o', outputPath,
      '-f', format,
      '--no-warnings',
      '--no-call-home',
      '--no-check-certificate'
    ]);

    downloadProcess.on('progress', (progress) => {
      const percent = Math.round(progress.percent || 0);
      downloadProgress.set(downloadId, {
        status: 'downloading',
        progress: percent,
        eta: progress.eta || 0,
        speed: progress.speed || 0,
        downloaded: progress.downloaded || 0,
        total: progress.total || 0,
        title: info.title
      });
    });

    downloadProcess.on('end', (output) => {
      console.log('视频下载完成:', output);
      downloadProgress.set(downloadId, {
        status: 'completed',
        progress: 100,
        filename: output,
        title: info.title
      });
    });

    downloadProcess.on('error', (error) => {
      console.error('下载错误:', error);
      downloadProgress.set(downloadId, {
        status: 'error',
        error: error.message,
        title: info.title
      });
    });

    res.json({ 
      success: true, 
      downloadId, 
      title: info.title,
      message: '视频下载已开始' 
    });

  } catch (error) {
    console.error('视频下载失败:', error.message);
    res.status(500).json({ 
      success: false, 
      error: '视频下载失败: ' + error.message 
    });
  }
});

// 下载音频
app.post('/api/download/audio', async (req, res) => {
  const { url, format = 'mp3' } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: '请提供视频URL' });
  }

  const downloadId = uuidv4();
  
  try {
    console.log('开始下载音频:', url);
    
    if (!ytDlp) {
      throw new Error('yt-dlp不可用，请确保已安装');
    }

    // 获取视频信息
    const info = await ytDlp.getVideoInfo([
      url,
      '--dump-json',
      '--no-warnings',
      '--no-call-home',
      '--no-check-certificate'
    ]);

    const safeTitle = info.title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
    const outputPath = path.join(downloadsDir, `${safeTitle}.%(ext)s`);
    
    // 初始化进度
    downloadProgress.set(downloadId, {
      status: 'starting',
      progress: 0,
      title: info.title
    });

    // 启动音频下载
    const downloadProcess = ytDlp.exec([
      url,
      '-x', '--audio-format', format,
      '-o', outputPath,
      '--audio-quality', '0',
      '--no-warnings',
      '--no-call-home',
      '--no-check-certificate'
    ]);

    downloadProcess.on('progress', (progress) => {
      const percent = Math.round(progress.percent || 0);
      downloadProgress.set(downloadId, {
        status: 'downloading',
        progress: percent,
        eta: progress.eta || 0,
        speed: progress.speed || 0,
        downloaded: progress.downloaded || 0,
        total: progress.total || 0,
        title: info.title
      });
    });

    downloadProcess.on('end', (output) => {
      console.log('音频下载完成:', output);
      downloadProgress.set(downloadId, {
        status: 'completed',
        progress: 100,
        filename: output,
        title: info.title
      });
    });

    downloadProcess.on('error', (error) => {
      console.error('下载错误:', error);
      downloadProgress.set(downloadId, {
        status: 'error',
        error: error.message,
        title: info.title
      });
    });

    res.json({ 
      success: true, 
      downloadId, 
      title: info.title,
      message: '音频下载已开始' 
    });

  } catch (error) {
    console.error('音频下载失败:', error.message);
    res.status(500).json({ 
      success: false, 
      error: '音频下载失败: ' + error.message 
    });
  }
});

// 获取下载进度
app.get('/api/progress/:id', (req, res) => {
  const { id } = req.params;
  const progress = downloadProgress.get(id);
  
  if (!progress) {
    return res.status(404).json({ error: '下载任务不存在' });
  }
  
  res.json(progress);
});

// 获取已下载文件列表
app.get('/api/files', (req, res) => {
  try {
    const files = fs.readdirSync(downloadsDir)
      .filter(file => fs.statSync(path.join(downloadsDir, file)).isFile())
      .map(file => {
        const filePath = path.join(downloadsDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          size: stats.size,
          modified: stats.mtime
        };
      });
    
    res.json({ success: true, files });
  } catch (error) {
    res.status(500).json({ error: '获取文件列表失败' });
  }
});

// 下载文件
app.get('/api/download/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(downloadsDir, filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: '文件不存在' });
  }
  
  res.download(filePath);
});

// 清理下载文件
app.delete('/api/files/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(downloadsDir, filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: '文件不存在' });
  }
  
  try {
    fs.unlinkSync(filePath);
    res.json({ success: true, message: '文件已删除' });
  } catch (error) {
    res.status(500).json({ error: '删除文件失败' });
  }
});

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    ytDlpAvailable: !!ytDlp,
    timestamp: new Date().toISOString()
  });
});

// 首页重定向到测试页面
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'api-test.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 YouTube下载服务已启动`);
  console.log(`📡 服务地址: http://localhost:${PORT}`);
  console.log(`📁 下载目录: ${downloadsDir}`);
  console.log(`🔧 yt-dlp状态: ${ytDlp ? '可用' : '不可用'}`);
  console.log(`\n📋 API端点:`);
  console.log(`   GET  /api/info?url=<youtube_url>           - 获取视频信息`);
  console.log(`   POST /api/download/video                 - 下载视频`);
  console.log(`   POST /api/download/audio                 - 下载音频`);
  console.log(`   GET  /api/progress/:id                   - 获取下载进度`);
  console.log(`   GET  /api/files                          - 获取已下载文件列表`);
  console.log(`   GET  /api/download/:filename             - 下载文件`);
  console.log(`   DELETE /api/files/:filename              - 删除文件`);
  console.log(`   GET  /health                            - 健康检查`);
});