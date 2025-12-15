const fs = require('fs-extra');
const path = require('path');
const tmp = require('tmp');
const { v4: uuidv4 } = require('uuid');
const ytDlpExec = require('yt-dlp-exec');

// Allow configuring binary path
const binaryPath = process.env.YT_DLP_PATH;
const ytDlp = binaryPath ? ytDlpExec.create(binaryPath) : ytDlpExec;

// Error codes
const ERROR_CODES = {
    GEO_BLOCK: 'GEO_BLOCK',
    PRIVATE_VIDEO: 'PRIVATE_VIDEO',
    INVALID_URL: 'INVALID_URL',
    DOWNLOAD_FAILED: 'DOWNLOAD_FAILED',
    UNKNOWN: 'UNKNOWN'
};

class DownloaderError extends Error {
    constructor(message, code, originalError = null) {
        super(message);
        this.name = 'DownloaderError';
        this.code = code;
        this.originalError = originalError;
    }
}

function parseError(err) {
    const stderr = err.stderr || err.message || '';
    if (stderr.includes('unavailable in your country') || stderr.includes('uploader has not made this video available')) {
        return new DownloaderError('Video is geo-blocked', ERROR_CODES.GEO_BLOCK, err);
    }
    if (stderr.includes('Private video') || stderr.includes('This video is private')) {
        return new DownloaderError('Video is private', ERROR_CODES.PRIVATE_VIDEO, err);
    }
    if (stderr.includes('Incomplete YouTube ID') || stderr.includes('Not a valid URL')) {
        return new DownloaderError('Invalid URL', ERROR_CODES.INVALID_URL, err);
    }
    return new DownloaderError('Download failed', ERROR_CODES.DOWNLOAD_FAILED, err);
}

/**
 * Fetch video info
 * @param {string} url 
 * @returns {Promise<Object>}
 */
async function fetchVideoInfo(url) {
    try {
        const output = await ytDlp(url, {
            dumpJson: true,
            noWarnings: true,
            noCallHome: true
        });

        // The output is already parsed JSON because yt-dlp-exec does it if dump-json is set? 
        // Actually yt-dlp-exec parses stdout if it looks like JSON.
        // But let's check.
        
        const info = output; 

        // Normalize formats
        const formats = (info.formats || []).map(f => ({
            formatId: f.format_id,
            ext: f.ext,
            resolution: f.resolution || (f.width && f.height ? `${f.width}x${f.height}` : 'unknown'),
            note: f.format_note,
            filesize: f.filesize,
            vcodec: f.vcodec,
            acodec: f.acodec
        }));

        return {
            title: info.title,
            thumbnail: info.thumbnail,
            duration: info.duration,
            formats: formats,
            id: info.id
        };
    } catch (err) {
        throw parseError(err);
    }
}

async function executeWithRetry(fn, retries = 3) {
    let lastError;
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            // Retry only on transient errors? 
            // For simplicity, retry on all unless it's clearly fatal (like invalid URL or private)
            if (err instanceof DownloaderError) {
                if (err.code === ERROR_CODES.INVALID_URL || 
                    err.code === ERROR_CODES.PRIVATE_VIDEO || 
                    err.code === ERROR_CODES.GEO_BLOCK) {
                    throw err;
                }
            }
            // Wait a bit
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
    throw lastError;
}

/**
 * Download video
 * @param {Object} options
 * @param {string} options.url
 * @param {string} options.formatId
 * @param {Function} options.onProgress
 * @returns {Promise<string>} path to downloaded file
 */
async function downloadVideo({ url, formatId, onProgress }) {
    // Enforce safe temp directories
    const tmpDir = tmp.dirSync({ prefix: 'yt-dlp-', unsafeCleanup: true });
    const outputPath = path.join(tmpDir.name, `${uuidv4()}.%(ext)s`);

    const args = {
        output: outputPath,
        format: formatId || 'best',
        noWarnings: true,
        noCallHome: true
    };

    try {
        return await executeWithRetry(async () => {
            return new Promise((resolve, reject) => {
                const subprocess = ytDlp.exec(url, args);
                
                subprocess.stdout.on('data', (data) => {
                    const lines = data.toString().split('\n');
                    for (const line of lines) {
                        if (onProgress) {
                            const progress = parseProgress(line);
                            if (progress) onProgress(progress);
                        }
                    }
                });

                subprocess.stderr.on('data', (data) => {
                    // yt-dlp might output progress to stderr in some versions or configurations, but usually stdout
                    // Check if it's an error
                });

                subprocess.then((result) => {
                    // Find the downloaded file
                    try {
                        const files = fs.readdirSync(tmpDir.name);
                        if (files.length === 0) {
                            reject(new DownloaderError('No file downloaded', ERROR_CODES.DOWNLOAD_FAILED));
                            return;
                        }
                        resolve(path.join(tmpDir.name, files[0]));
                    } catch (e) {
                        reject(e);
                    }
                }).catch(err => {
                    reject(parseError(err));
                });
            });
        });
    } catch (err) {
        // Cleanup on failure
        try {
            tmpDir.removeCallback();
        } catch (e) {
            // ignore cleanup error
        }
        throw err;
    }
}

/**
 * Download audio
 * @param {Object} options
 * @param {string} options.url
 * @param {string} options.audioFormat
 * @param {Function} options.onProgress
 * @returns {Promise<string>} path to downloaded file
 */
async function downloadAudio({ url, audioFormat = 'mp3', onProgress }) {
    const tmpDir = tmp.dirSync({ prefix: 'yt-dlp-audio-', unsafeCleanup: true });
    const outputPath = path.join(tmpDir.name, `${uuidv4()}.%(ext)s`);

    const args = {
        output: outputPath,
        extractAudio: true,
        audioFormat: audioFormat,
        noWarnings: true,
        noCallHome: true
    };

    try {
        return await executeWithRetry(async () => {
            return new Promise((resolve, reject) => {
                const subprocess = ytDlp.exec(url, args);
                
                subprocess.stdout.on('data', (data) => {
                    const lines = data.toString().split('\n');
                    for (const line of lines) {
                        if (onProgress) {
                            const progress = parseProgress(line);
                            if (progress) onProgress(progress);
                        }
                    }
                });

                subprocess.then((result) => {
                     try {
                        const files = fs.readdirSync(tmpDir.name);
                        if (files.length === 0) {
                            reject(new DownloaderError('No file downloaded', ERROR_CODES.DOWNLOAD_FAILED));
                            return;
                        }
                        resolve(path.join(tmpDir.name, files[0]));
                    } catch (e) {
                        reject(e);
                    }
                }).catch(err => {
                    reject(parseError(err));
                });
            });
        });
    } catch (err) {
        // Cleanup on failure
        try {
            tmpDir.removeCallback();
        } catch (e) {
            // ignore
        }
        throw err;
    }
}

function parseProgress(line) {
    // Example: [download]  45.0% of 10.00MiB at 2.00MiB/s ETA 00:03
    const match = line.match(/\[download\]\s+(\d+\.?\d*)%\s+of\s+([~]?\d+\.?\d*\w+)\s+at\s+([\d\.]+\w+\/s)\s+ETA\s+(\d{2}:\d{2}(?::\d{2})?)/);
    if (match) {
        return {
            percentage: parseFloat(match[1]),
            totalSize: match[2],
            speed: match[3],
            eta: match[4]
        };
    }
    return null;
}

module.exports = {
    fetchVideoInfo,
    downloadVideo,
    downloadAudio,
    DownloaderError,
    ERROR_CODES
};
