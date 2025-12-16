/**
 * Utility functions for the download API
 */

/**
 * Format bytes to human readable format
 * @param {number} bytes - Number of bytes
 * @param {number} decimals - Number of decimal places
 * @returns {string} - Formatted string
 */
const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Format seconds to human readable format
 * @param {number} seconds - Number of seconds
 * @returns {string} - Formatted time string
 */
const formatTime = (seconds) => {
    if (seconds < 60) {
        return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.round(seconds % 60);
        return `${minutes}m ${remainingSeconds}s`;
    } else {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }
};

/**
 * Format file size with appropriate unit
 * @param {number} bytes - Number of bytes
 * @returns {string} - Formatted size string
 */
const formatFileSize = (bytes) => {
    return formatBytes(bytes);
};

/**
 * Calculate download speed
 * @param {number} downloadedBytes - Downloaded bytes
 * @param {number} elapsedSeconds - Elapsed time in seconds
 * @returns {string} - Formatted speed string
 */
const formatSpeed = (downloadedBytes, elapsedSeconds) => {
    if (elapsedSeconds <= 0) return '0 B/s';
    const speed = downloadedBytes / elapsedSeconds;
    return formatBytes(speed) + '/s';
};

/**
 * Generate a safe filename
 * @param {string} title - Original title
 * @param {string} extension - File extension
 * @returns {string} - Safe filename
 */
const generateSafeFilename = (title, extension) => {
    const sanitizedTitle = title
        .replace(/[^a-zA-Z0-9一-龥]/g, '_') // Allow Chinese characters
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .substring(0, 100); // Limit length
    
    const timestamp = Date.now();
    return `${sanitizedTitle}_${timestamp}.${extension}`;
};

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {boolean} - Validation result
 */
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Generate a random ID
 * @param {number} length - ID length
 * @returns {string} - Random ID
 */
const generateRandomId = (length = 8) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

/**
 * Sleep/delay function
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} - Promise that resolves after delay
 */
const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

/**
 * Clean up old download records
 * @param {Map} downloadsMap - Downloads map to clean
 * @param {number} maxAge - Maximum age in milliseconds
 * @returns {number} - Number of cleaned items
 */
const cleanupOldDownloads = (downloadsMap, maxAge = 3600000) => {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [id, download] of downloadsMap.entries()) {
        if (download.createdAt && now - download.createdAt.getTime() > maxAge) {
            downloadsMap.delete(id);
            cleanedCount++;
        }
    }
    
    return cleanedCount;
};

/**
 * Get client IP address
 * @param {Object} req - Express request object
 * @returns {string} - Client IP address
 */
const getClientIP = (req) => {
    return req.ip || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
           '0.0.0.0';
};

/**
 * Check if request is from a bot
 * @param {Object} req - Express request object
 * @returns {boolean} - True if bot
 */
const isBot = (req) => {
    const userAgent = req.get('User-Agent') || '';
    const botPatterns = [
        /bot/i, /crawler/i, /spider/i, /scraper/i,
        /googlebot/i, /bingbot/i, /slurp/i, /duckduckbot/i
    ];
    
    return botPatterns.some(pattern => pattern.test(userAgent));
};

/**
 * Rate limiting key generator
 * @param {Object} req - Express request object
 * @param {string} prefix - Key prefix
 * @returns {string} - Rate limit key
 */
const generateRateLimitKey = (req, prefix = 'api') => {
    const ip = getClientIP(req);
    const userAgent = req.get('User-Agent') || '';
    
    // Use IP + User-Agent hash for more unique identification
    return `${prefix}:${ip}:${Buffer.from(userAgent).toString('base64').substring(0, 8)}`;
};

/**
 * Sanitize filename for security
 * @param {string} filename - Original filename
 * @returns {string} - Sanitized filename
 */
const sanitizeFilename = (filename) => {
    return filename
        .replace(/[/\\?%*:|"<>]/g, '') // Remove invalid characters
        .replace(/\.\./g, '') // Remove path traversal
        .trim()
        .substring(0, 255); // Limit length
};

/**
 * Check if URL is allowed
 * @param {string} url - URL to check
 * @returns {boolean} - True if allowed
 */
const isAllowedUrl = (url) => {
    try {
        const parsed = new URL(url);
        
        // Only allow HTTP/HTTPS
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return false;
        }
        
        // Block local and private network addresses
        const hostname = parsed.hostname.toLowerCase();
        const blockedHosts = [
            'localhost',
            '127.0.0.1',
            '0.0.0.0'
        ];
        
        if (blockedHosts.includes(hostname)) {
            return false;
        }
        
        // Check for private IP ranges
        if (hostname.startsWith('192.168.') ||
            hostname.startsWith('10.') ||
            hostname.startsWith('172.') ||
            hostname === '::1') {
            return false;
        }
        
        return true;
    } catch (error) {
        return false;
    }
};

module.exports = {
    formatBytes,
    formatTime,
    formatFileSize,
    formatSpeed,
    generateSafeFilename,
    isValidEmail,
    generateRandomId,
    sleep,
    debounce,
    cleanupOldDownloads,
    getClientIP,
    isBot,
    generateRateLimitKey,
    sanitizeFilename,
    isAllowedUrl
};