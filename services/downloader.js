const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

class DownloaderService {
    constructor() {
        this.activeDownloads = new Map();
        this.progressCallbacks = new Map();
    }

    /**
     * Generate a unique download ID
     */
    generateDownloadId() {
        return uuidv4();
    }

    /**
     * Get metadata and available formats for a URL
     * @param {string} url - The URL to analyze
     * @returns {Promise<Object>} - Metadata and formats
     */
    async getInfo(url) {
        try {
            // For demonstration, we'll simulate a metadata extraction
            // In a real implementation, this would use youtube-dl or similar
            await this.validateUrl(url);
            
            // Simulate metadata extraction delay
            await this.delay(1000);
            
            // Mock metadata - in real implementation, this would be extracted from the URL
            const mockMetadata = {
                id: 'mock-video-id',
                title: 'Sample Video Title',
                description: 'This is a sample video for testing the download API',
                duration: 180, // seconds
                thumbnail: 'https://via.placeholder.com/320x240',
                webpage_url: url,
                uploader: 'Test Channel',
                upload_date: '20231201',
                formats: [
                    {
                        format_id: 'best',
                        format: 'best',
                        ext: 'mp4',
                        resolution: '1920x1080',
                        fps: 30,
                        filesize: 104857600, // 100MB
                        acodec: 'aac',
                        vcodec: 'h264',
                        url: url,
                        quality: '1080p'
                    },
                    {
                        format_id: '720',
                        format: '720',
                        ext: 'mp4',
                        resolution: '1280x720',
                        fps: 30,
                        filesize: 52428800, // 50MB
                        acodec: 'aac',
                        vcodec: 'h264',
                        url: url,
                        quality: '720p'
                    },
                    {
                        format_id: '360',
                        format: '360',
                        ext: 'mp4',
                        resolution: '640x360',
                        fps: 30,
                        filesize: 20971520, // 20MB
                        acodec: 'aac',
                        vcodec: 'h264',
                        url: url,
                        quality: '360p'
                    },
                    {
                        format_id: 'audio',
                        format: 'audio',
                        ext: 'mp3',
                        resolution: 'audio only',
                        filesize: 5242880, // 5MB
                        acodec: 'mp3',
                        vcodec: 'none',
                        url: url,
                        quality: 'audio'
                    }
                ]
            };

            return {
                success: true,
                data: mockMetadata
            };
        } catch (error) {
            throw new Error(`Failed to get info: ${error.message}`);
        }
    }

    /**
     * Download video content
     * @param {string} url - The URL to download from
     * @param {string} formatId - The format ID to download
     * @param {Function} onProgress - Progress callback
     * @returns {Promise<Object>} - Download result
     */
    async downloadVideo(url, formatId, onProgress) {
        const downloadId = this.generateDownloadId();
        
        try {
            await this.validateUrl(url);
            await this.validateFormat(formatId);
            
            // Find the selected format
            const info = await this.getInfo(url);
            const format = info.data.formats.find(f => f.format_id === formatId);
            
            if (!format) {
                throw new Error(`Format '${formatId}' not found`);
            }

            // Initialize download status
            const downloadStatus = {
                id: downloadId,
                status: 'downloading',
                progress: 0,
                speed: 0,
                eta: 0,
                total_bytes: format.filesize,
                downloaded_bytes: 0,
                filename: `${info.data.title.replace(/[^a-z0-9]/gi, '_')}_${formatId}.${format.ext}`,
                format: formatId,
                createdAt: new Date()
            };
            
            this.activeDownloads.set(downloadId, downloadStatus);
            
            if (onProgress) {
                this.progressCallbacks.set(downloadId, onProgress);
            }

            // Simulate download with progress updates
            await this.simulateDownload(downloadId, format, onProgress);
            
            downloadStatus.status = 'completed';
            downloadStatus.progress = 100;
            
            // Clean up progress callback
            this.progressCallbacks.delete(downloadId);
            
            return {
                success: true,
                downloadId,
                filename: downloadStatus.filename,
                size: downloadStatus.total_bytes,
                format: formatId
            };
            
        } catch (error) {
            // Mark download as failed
            const downloadStatus = this.activeDownloads.get(downloadId);
            if (downloadStatus) {
                downloadStatus.status = 'failed';
                downloadStatus.error = error.message;
            }
            throw error;
        }
    }

    /**
     * Download audio content
     * @param {string} url - The URL to download from
     * @param {Function} onProgress - Progress callback
     * @returns {Promise<Object>} - Download result
     */
    async downloadAudio(url, onProgress) {
        return this.downloadVideo(url, 'audio', onProgress);
    }

    /**
     * Get download progress
     * @param {string} downloadId - The download ID
     * @returns {Object|null} - Download status or null if not found
     */
    getProgress(downloadId) {
        const status = this.activeDownloads.get(downloadId);
        return status ? { ...status } : null;
    }

    /**
     * Cancel a download
     * @param {string} downloadId - The download ID to cancel
     * @returns {boolean} - Success status
     */
    cancelDownload(downloadId) {
        const status = this.activeDownloads.get(downloadId);
        if (status && status.status === 'downloading') {
            status.status = 'cancelled';
            this.progressCallbacks.delete(downloadId);
            return true;
        }
        return false;
    }

    /**
     * Clean up old completed/failed downloads
     * @param {number} maxAge - Maximum age in milliseconds (default: 1 hour)
     */
    cleanup(maxAge = 3600000) {
        const now = Date.now();
        for (const [id, status] of this.activeDownloads.entries()) {
            if (status.status === 'completed' || status.status === 'failed' || status.status === 'cancelled') {
                if (now - status.createdAt.getTime() > maxAge) {
                    this.activeDownloads.delete(id);
                    this.progressCallbacks.delete(id);
                }
            }
        }
    }

    /**
     * Validate URL format
     * @param {string} url - URL to validate
     * @throws {Error} - If URL is invalid
     */
    async validateUrl(url) {
        if (!url || typeof url !== 'string') {
            throw new Error('URL is required and must be a string');
        }

        try {
            new URL(url);
        } catch {
            throw new Error('Invalid URL format');
        }

        // Check if URL is accessible
        try {
            const response = await axios.head(url, { 
                timeout: 10000,
                validateStatus: () => true 
            });
            
            if (response.status >= 400) {
                throw new Error(`URL returned ${response.status} status code`);
            }
        } catch (error) {
            if (error.code === 'ECONNABORTED') {
                throw new Error('URL request timed out');
            }
            throw new Error(`URL validation failed: ${error.message}`);
        }
    }

    /**
     * Validate format ID
     * @param {string} formatId - Format ID to validate
     * @throws {Error} - If format is invalid
     */
    async validateFormat(formatId) {
        const validFormats = ['best', '720', '360', 'audio'];
        if (!validFormats.includes(formatId)) {
            throw new Error(`Invalid format. Valid formats: ${validFormats.join(', ')}`);
        }
    }

    /**
     * Simulate download with progress updates
     * @param {string} downloadId - Download ID
     * @param {Object} format - Format object
     * @param {Function} onProgress - Progress callback
     */
    async simulateDownload(downloadId, format, onProgress) {
        return new Promise((resolve, reject) => {
            const status = this.activeDownloads.get(downloadId);
            if (!status) {
                reject(new Error('Download not found'));
                return;
            }

            const totalSize = format.filesize;
            const startTime = Date.now();
            let downloaded = 0;
            const chunkSize = totalSize / 100; // 100 progress updates

            const updateProgress = () => {
                const elapsed = (Date.now() - startTime) / 1000; // seconds
                const speed = downloaded / elapsed; // bytes per second
                const eta = (totalSize - downloaded) / speed;
                
                status.downloaded_bytes = downloaded;
                status.speed = speed;
                status.eta = eta;
                status.progress = Math.round((downloaded / totalSize) * 100);

                if (onProgress) {
                    onProgress({ ...status });
                }

                if (status.status === 'cancelled') {
                    reject(new Error('Download cancelled'));
                    return;
                }

                if (downloaded >= totalSize) {
                    resolve();
                } else {
                    // Simulate download speed (2MB/s)
                    const nextChunk = Math.min(chunkSize, totalSize - downloaded);
                    downloaded += nextChunk;
                    
                    setTimeout(updateProgress, 200); // 200ms intervals
                }
            };

            // Start the progress updates
            updateProgress();
        });
    }

    /**
     * Utility method to create a delay
     * @param {number} ms - Milliseconds to delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export singleton instance
module.exports = new DownloaderService();