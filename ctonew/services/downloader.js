const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const DOWNLOADS_DIR = process.env.DOWNLOADS_DIR || './downloads';

if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

function parseProgress(line) {
  const progress = {};
  
  const percentMatch = line.match(/(\d+\.?\d*)%/);
  if (percentMatch) {
    progress.percent = parseFloat(percentMatch[1]);
  }
  
  const speedMatch = line.match(/(\d+\.?\d*(?:K|M|G)?iB\/s)/);
  if (speedMatch) {
    progress.speed = speedMatch[1];
  }
  
  const etaMatch = line.match(/ETA\s+(\d+:\d+)/);
  if (etaMatch) {
    progress.eta = etaMatch[1];
  }
  
  if (line.includes('[download]')) {
    progress.status = '下载中...';
  } else if (line.includes('[Merger]') || line.includes('[ExtractAudio]')) {
    progress.status = '处理中...';
  }
  
  return progress;
}

async function fetchVideoInfo(url) {
  return new Promise((resolve, reject) => {
    const args = [
      '-j',
      '--no-warnings',
      url
    ];

    const ytDlp = spawn('yt-dlp', args);
    let output = '';
    let errorOutput = '';

    ytDlp.stdout.on('data', (data) => {
      output += data.toString();
    });

    ytDlp.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    ytDlp.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`yt-dlp 执行失败: ${errorOutput}`));
        return;
      }

      try {
        const info = JSON.parse(output);
        
        const formats = info.formats
          ?.filter(f => f.ext && f.filesize)
          .map(f => ({
            formatId: f.format_id,
            ext: f.ext,
            resolution: f.resolution || `${f.width}x${f.height}`,
            filesize: f.filesize,
            filesizeStr: formatFileSize(f.filesize),
            vcodec: f.vcodec,
            acodec: f.acodec,
            fps: f.fps,
            quality: f.quality
          })) || [];

        const audioFormats = info.formats
          ?.filter(f => f.acodec && f.acodec !== 'none' && (!f.vcodec || f.vcodec === 'none'))
          .map(f => ({
            formatId: f.format_id,
            ext: f.ext,
            abr: f.abr,
            acodec: f.acodec,
            filesize: f.filesize,
            filesizeStr: formatFileSize(f.filesize)
          })) || [];

        resolve({
          title: info.title,
          duration: info.duration,
          thumbnail: info.thumbnail,
          uploader: info.uploader,
          description: info.description,
          formats: formats,
          audioFormats: audioFormats
        });
      } catch (error) {
        reject(new Error(`解析视频信息失败: ${error.message}`));
      }
    });

    ytDlp.on('error', (error) => {
      reject(new Error(`启动 yt-dlp 失败: ${error.message}`));
    });
  });
}

async function downloadVideo({ url, formatId, onProgress }) {
  return new Promise((resolve, reject) => {
    const outputTemplate = path.join(DOWNLOADS_DIR, '%(title)s.%(ext)s');
    
    const args = [
      '--newline',
      '--no-warnings',
      '-o', outputTemplate
    ];

    if (formatId) {
      args.push('-f', formatId);
    } else {
      args.push('-f', 'bestvideo+bestaudio/best');
    }

    args.push(url);

    const ytDlp = spawn('yt-dlp', args);
    let errorOutput = '';
    let lastProgress = {};

    ytDlp.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          console.log(line);
          const progress = parseProgress(line);
          if (Object.keys(progress).length > 0) {
            lastProgress = { ...lastProgress, ...progress };
            if (onProgress) {
              onProgress(lastProgress);
            }
          }
          
          const destMatch = line.match(/\[Merger\] Merging formats into "(.+)"/);
          if (destMatch) {
            lastProgress.filename = path.basename(destMatch[1]);
          }
          
          const alreadyDownloadedMatch = line.match(/\[download\] (.+) has already been downloaded/);
          if (alreadyDownloadedMatch) {
            lastProgress.filename = path.basename(alreadyDownloadedMatch[1]);
          }
        }
      });
    });

    ytDlp.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.error('yt-dlp stderr:', data.toString());
    });

    ytDlp.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`视频下载失败: ${errorOutput}`));
        return;
      }

      resolve({
        success: true,
        filename: lastProgress.filename || '下载完成',
        filepath: path.join(DOWNLOADS_DIR, lastProgress.filename || '')
      });
    });

    ytDlp.on('error', (error) => {
      reject(new Error(`启动 yt-dlp 失败: ${error.message}`));
    });
  });
}

async function downloadAudio({ url, audioFormat = 'mp3', onProgress }) {
  return new Promise((resolve, reject) => {
    const outputTemplate = path.join(DOWNLOADS_DIR, '%(title)s.%(ext)s');
    
    const args = [
      '--newline',
      '--no-warnings',
      '-x',
      '--audio-format', audioFormat,
      '-o', outputTemplate,
      url
    ];

    const ytDlp = spawn('yt-dlp', args);
    let errorOutput = '';
    let lastProgress = {};

    ytDlp.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          console.log(line);
          const progress = parseProgress(line);
          if (Object.keys(progress).length > 0) {
            lastProgress = { ...lastProgress, ...progress };
            if (onProgress) {
              onProgress(lastProgress);
            }
          }
          
          const destMatch = line.match(/\[ExtractAudio\] Destination: (.+)/);
          if (destMatch) {
            lastProgress.filename = path.basename(destMatch[1]);
          }
          
          const alreadyDownloadedMatch = line.match(/\[download\] (.+) has already been downloaded/);
          if (alreadyDownloadedMatch) {
            lastProgress.filename = path.basename(alreadyDownloadedMatch[1]);
          }
        }
      });
    });

    ytDlp.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.error('yt-dlp stderr:', data.toString());
    });

    ytDlp.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`音频下载失败: ${errorOutput}`));
        return;
      }

      resolve({
        success: true,
        filename: lastProgress.filename || '下载完成',
        filepath: path.join(DOWNLOADS_DIR, lastProgress.filename || '')
      });
    });

    ytDlp.on('error', (error) => {
      reject(new Error(`启动 yt-dlp 失败: ${error.message}`));
    });
  });
}

function formatFileSize(bytes) {
  if (!bytes) return 'N/A';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

module.exports = {
  fetchVideoInfo,
  downloadVideo,
  downloadAudio
};
