require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');

const downloader = require('./services/downloader');

const app = express();
const PORT = process.env.PORT || 3000;
const DOWNLOAD_DIR = downloader.DOWNLOAD_DIR;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Ensure downloads directory exists and is accessible
if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

// Serve downloaded files
app.use('/downloads', express.static(DOWNLOAD_DIR));

// Routes

/**
 * GET / - Serve the birthday card application
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * GET /api/video/info - Get video information
 * Query: url (YouTube video URL)
 */
app.get('/api/video/info', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }
    
    const result = await downloader.fetchVideoInfo(url);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/video/download - Download video
 * Body: { url, format?, filename? }
 */
app.post('/api/video/download', async (req, res) => {
  try {
    const { url, format, filename } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }
    
    const options = {};
    if (format) options.format = format;
    if (filename) options.filename = filename;
    
    const result = await downloader.downloadVideo(url, options);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/audio/download - Download audio only
 * Body: { url, audioFormat?, filename? }
 */
app.post('/api/audio/download', async (req, res) => {
  try {
    const { url, audioFormat, filename } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }
    
    const options = {};
    if (audioFormat) options.audioFormat = audioFormat;
    if (filename) options.filename = filename;
    
    const result = await downloader.downloadAudio(url, options);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/downloads - Get list of downloaded files
 */
app.get('/api/downloads', (req, res) => {
  try {
    const files = downloader.getDownloadedFiles();
    res.json({
      success: true,
      data: files
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/downloads/:filename - Delete a downloaded file
 */
app.delete('/api/downloads/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const result = await downloader.deleteDownloadedFile(filename);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/test - Health check endpoint
 */
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working correctly',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✨ Birthday Card & YouTube Downloader Server`);
  console.log(`🎂 Server is running on http://localhost:${PORT}`);
  console.log(`📁 Download directory: ${DOWNLOAD_DIR}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'production'}`);
});

module.exports = app;
