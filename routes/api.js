const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const router = express.Router();

// Import services
const downloaderService = require('../services/downloader');
const { progressTracker } = require('../services/progressTracker');

// Import middleware
const { validateRequest } = require('../middleware/validation');
const { createSSEHeaders } = require('../middleware/sse');

// Validation rules
const urlValidation = [
    query('url')
        .isURL({ require_protocol: true })
        .withMessage('Valid URL is required')
        .isLength({ max: 2048 })
        .withMessage('URL too long')
];

const downloadVideoValidation = [
    body('url')
        .isURL({ require_protocol: true })
        .withMessage('Valid URL is required')
        .isLength({ max: 2048 })
        .withMessage('URL too long'),
    body('format')
        .isIn(['best', '720', '360'])
        .withMessage('Invalid video format. Must be: best, 720, or 360')
];

const downloadAudioValidation = [
    body('url')
        .isURL({ require_protocol: true })
        .withMessage('Valid URL is required')
        .isLength({ max: 2048 })
        .withMessage('URL too long')
];

// GET /api/info?url=
router.get('/info', urlValidation, validateRequest, async (req, res) => {
    try {
        const { url } = req.query;
        
        console.log(`🔍 Getting info for URL: ${url}`);
        
        const result = await downloaderService.getInfo(url);
        
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            ...result
        });
        
    } catch (error) {
        console.error('❌ Info endpoint error:', error);
        
        res.status(400).json({
            success: false,
            error: error.message,
            code: 'INFO_FETCH_FAILED',
            timestamp: new Date().toISOString()
        });
    }
});

// POST /api/download/video
router.post('/download/video', downloadVideoValidation, validateRequest, async (req, res) => {
    try {
        const { url, format } = req.body;
        
        console.log(`📹 Starting video download: ${url} (format: ${format})`);
        
        // Start the download with progress tracking
        const downloadPromise = downloaderService.downloadVideo(url, format, (progressData) => {
            progressTracker.updateProgress(progressData.id, progressData);
        });
        
        // Set a timeout for the download (5 minutes max)
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Download timeout exceeded')), 300000);
        });
        
        const result = await Promise.race([downloadPromise, timeoutPromise]);
        
        console.log(`✅ Video download completed: ${result.downloadId}`);
        
        res.json({
            success: true,
            message: 'Download started successfully',
            downloadId: result.downloadId,
            filename: result.filename,
            size: result.size,
            format: result.format,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Video download error:', error);
        
        res.status(400).json({
            success: false,
            error: error.message,
            code: 'VIDEO_DOWNLOAD_FAILED',
            timestamp: new Date().toISOString()
        });
    }
});

// POST /api/download/audio
router.post('/download/audio', downloadAudioValidation, validateRequest, async (req, res) => {
    try {
        const { url } = req.body;
        
        console.log(`🎵 Starting audio download: ${url}`);
        
        // Start the download with progress tracking
        const downloadPromise = downloaderService.downloadAudio(url, (progressData) => {
            progressTracker.updateProgress(progressData.id, progressData);
        });
        
        // Set a timeout for the download (5 minutes max)
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Download timeout exceeded')), 300000);
        });
        
        const result = await Promise.race([downloadPromise, timeoutPromise]);
        
        console.log(`✅ Audio download completed: ${result.downloadId}`);
        
        res.json({
            success: true,
            message: 'Download started successfully',
            downloadId: result.downloadId,
            filename: result.filename,
            size: result.size,
            format: result.format,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Audio download error:', error);
        
        res.status(400).json({
            success: false,
            error: error.message,
            code: 'AUDIO_DOWNLOAD_FAILED',
            timestamp: new Date().toISOString()
        });
    }
});

// GET /api/progress/:id - Server-Sent Events for real-time progress
router.get('/progress/:id', 
    param('id').isUUID().withMessage('Valid download ID is required'),
    validateRequest,
    async (req, res) => {
        try {
            const { id } = req.params;
            
            console.log(`📊 SSE connection for download: ${id}`);
            
            // Set up Server-Sent Events
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Cache-Control'
            });
            
            // Send initial connection message
            res.write(`data: ${JSON.stringify({
                type: 'connected',
                downloadId: id,
                timestamp: new Date().toISOString()
            })}\n\n`);
            
            // Get initial progress
            const initialProgress = downloaderService.getProgress(id);
            if (initialProgress) {
                res.write(`data: ${JSON.stringify({
                    type: 'progress',
                    data: initialProgress,
                    timestamp: new Date().toISOString()
                })}\n\n`);
            }
            
            // Set up SSE client for real-time updates
            const sseClient = {
                id,
                res,
                update: (data) => {
                    res.write(`data: ${JSON.stringify({
                        type: 'progress',
                        data,
                        timestamp: new Date().toISOString()
                    })}\n\n`);
                },
                complete: (data) => {
                    res.write(`data: ${JSON.stringify({
                        type: 'complete',
                        data,
                        timestamp: new Date().toISOString()
                    })}\n\n`);
                    res.end();
                },
                error: (message) => {
                    res.write(`data: ${JSON.stringify({
                        type: 'error',
                        message,
                        timestamp: new Date().toISOString()
                    })}\n\n`);
                    res.end();
                }
            };
            
            // Register SSE client
            progressTracker.addSSEClient(sseClient);
            
            // Handle client disconnect
            req.on('close', () => {
                console.log(`📊 SSE connection closed for download: ${id}`);
                progressTracker.removeSSEClient(id);
                res.end();
            });
            
            // Send periodic heartbeat
            const heartbeat = setInterval(() => {
                if (res.writableEnded) {
                    clearInterval(heartbeat);
                    return;
                }
                res.write(`data: ${JSON.stringify({
                    type: 'heartbeat',
                    timestamp: new Date().toISOString()
                })}\n\n`);
            }, 30000); // 30 seconds
            
            // Clean up on disconnect
            req.on('close', () => {
                clearInterval(heartbeat);
                progressTracker.removeSSEClient(id);
            });
            
        } catch (error) {
            console.error('❌ Progress SSE error:', error);
            
            // Send error message via SSE if possible
            if (!res.headersSent) {
                res.write(`data: ${JSON.stringify({
                    type: 'error',
                    message: error.message,
                    timestamp: new Date().toISOString()
                })}\n\n`);
            }
            
            res.end();
        }
    }
);

// GET /api/progress/:id/status - Simple progress status
router.get('/progress/:id/status',
    param('id').isUUID().withMessage('Valid download ID is required'),
    validateRequest,
    (req, res) => {
        try {
            const { id } = req.params;
            
            const progress = downloaderService.getProgress(id);
            
            if (!progress) {
                return res.status(404).json({
                    success: false,
                    error: 'Download ID not found',
                    code: 'DOWNLOAD_NOT_FOUND',
                    timestamp: new Date().toISOString()
                });
            }
            
            res.json({
                success: true,
                data: progress,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('❌ Progress status error:', error);
            
            res.status(500).json({
                success: false,
                error: error.message,
                code: 'PROGRESS_FETCH_FAILED',
                timestamp: new Date().toISOString()
            });
        }
    }
);

// POST /api/cancel/:id - Cancel a download
router.post('/cancel/:id',
    param('id').isUUID().withMessage('Valid download ID is required'),
    validateRequest,
    (req, res) => {
        try {
            const { id } = req.params;
            
            console.log(`❌ Cancelling download: ${id}`);
            
            const cancelled = downloaderService.cancelDownload(id);
            
            if (cancelled) {
                // Notify SSE clients about cancellation
                progressTracker.notifyCancellation(id);
                
                res.json({
                    success: true,
                    message: 'Download cancelled successfully',
                    downloadId: id,
                    timestamp: new Date().toISOString()
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: 'Download not found or cannot be cancelled',
                    code: 'CANCEL_FAILED',
                    timestamp: new Date().toISOString()
                });
            }
            
        } catch (error) {
            console.error('❌ Cancel download error:', error);
            
            res.status(500).json({
                success: false,
                error: error.message,
                code: 'CANCEL_REQUEST_FAILED',
                timestamp: new Date().toISOString()
            });
        }
    }
);

module.exports = router;