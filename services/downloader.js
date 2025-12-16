const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

const execAsync = promisify(exec);

const YTDLP_BINARY_PATH = process.env.YTDLP_BINARY_PATH || 'yt-dlp';
const DOWNLOAD_DIR = process.env.DOWNLOAD_DIR || path.join(__dirname, '..', 'downloads');

// Ensure download directory exists
if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

/**
 * Fetch video information from YouTube using yt-dlp
 * @param {string} url - YouTube video URL
 * @returns {Promise<Object>} Video information
 */
async function fetchVideoInfo(url) {
  try {
    const command = `${YTDLP_BINARY_PATH} -j "${url}"`;
    const { stdout } = await execAsync(command);
    const videoInfo = JSON.parse(stdout);
    
    return {
      success: true,
      data: {
        id: videoInfo.id,
        title: videoInfo.title,
        duration: videoInfo.duration,
        thumbnail: videoInfo.thumbnail,
        uploader: videoInfo.uploader,
        formats: videoInfo.formats ? videoInfo.formats.length : 0
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Download video from YouTube using yt-dlp
 * @param {string} url - YouTube video URL
 * @param {Object} options - Download options
 * @returns {Promise<Object>} Download result
 */
async function downloadVideo(url, options = {}) {
  try {
    const filename = options.filename || '%(title)s.%(ext)s';
    const outputPath = path.join(DOWNLOAD_DIR, filename);
    
    const format = options.format || 'best';
    const command = `${YTDLP_BINARY_PATH} -f "${format}" -o "${outputPath}" "${url}"`;
    
    const { stdout, stderr } = await execAsync(command);
    
    // Get the actual downloaded file path
    const files = fs.readdirSync(DOWNLOAD_DIR);
    const latestFile = files
      .map(f => ({
        name: f,
        time: fs.statSync(path.join(DOWNLOAD_DIR, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time)[0];
    
    return {
      success: true,
      data: {
        filename: latestFile.name,
        path: path.join(DOWNLOAD_DIR, latestFile.name),
        url: `/downloads/${latestFile.name}`
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Download audio only from YouTube using yt-dlp
 * @param {string} url - YouTube video URL
 * @param {Object} options - Download options
 * @returns {Promise<Object>} Download result
 */
async function downloadAudio(url, options = {}) {
  try {
    const filename = options.filename || '%(title)s.%(ext)s';
    const outputPath = path.join(DOWNLOAD_DIR, filename);
    
    const audioFormat = options.audioFormat || 'mp3';
    const command = `${YTDLP_BINARY_PATH} -f "bestaudio/best" -x --audio-format ${audioFormat} -o "${outputPath}" "${url}"`;
    
    const { stdout, stderr } = await execAsync(command);
    
    // Get the actual downloaded file path
    const files = fs.readdirSync(DOWNLOAD_DIR);
    const latestFile = files
      .map(f => ({
        name: f,
        time: fs.statSync(path.join(DOWNLOAD_DIR, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time)[0];
    
    return {
      success: true,
      data: {
        filename: latestFile.name,
        path: path.join(DOWNLOAD_DIR, latestFile.name),
        url: `/downloads/${latestFile.name}`
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get list of downloaded files
 * @returns {Array} List of files in download directory
 */
function getDownloadedFiles() {
  try {
    const files = fs.readdirSync(DOWNLOAD_DIR);
    return files.map(file => ({
      name: file,
      path: path.join(DOWNLOAD_DIR, file),
      url: `/downloads/${file}`,
      size: fs.statSync(path.join(DOWNLOAD_DIR, file)).size
    }));
  } catch (error) {
    return [];
  }
}

/**
 * Delete a downloaded file
 * @param {string} filename - Name of the file to delete
 * @returns {Promise<Object>} Deletion result
 */
async function deleteDownloadedFile(filename) {
  try {
    const filePath = path.join(DOWNLOAD_DIR, filename);
    
    // Prevent directory traversal attacks
    if (!filePath.startsWith(DOWNLOAD_DIR)) {
      return {
        success: false,
        error: 'Invalid file path'
      };
    }
    
    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        error: 'File not found'
      };
    }
    
    fs.unlinkSync(filePath);
    
    return {
      success: true,
      message: `File ${filename} deleted successfully`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  fetchVideoInfo,
  downloadVideo,
  downloadAudio,
  getDownloadedFiles,
  deleteDownloadedFile,
  DOWNLOAD_DIR
};
