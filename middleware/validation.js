const { validationResult } = require('express-validator');

/**
 * Middleware to validate request using express-validator results
 */
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: errors.array().map(err => ({
                field: err.param,
                message: err.msg,
                value: err.value
            })),
            timestamp: new Date().toISOString()
        });
    }
    
    next();
};

/**
 * Additional URL validation middleware
 */
const validateUrl = (req, res, next) => {
    const { url } = req.body || req.query;
    
    if (!url) {
        return res.status(400).json({
            success: false,
            error: 'URL is required',
            code: 'MISSING_URL',
            timestamp: new Date().toISOString()
        });
    }
    
    try {
        const parsedUrl = new URL(url);
        
        // Basic security checks
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            return res.status(400).json({
                success: false,
                error: 'Only HTTP and HTTPS URLs are allowed',
                code: 'INVALID_PROTOCOL',
                timestamp: new Date().toISOString()
            });
        }
        
        // Check for localhost/private IPs (security)
        const hostname = parsedUrl.hostname.toLowerCase();
        const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0'];
        
        if (blockedHosts.includes(hostname) || 
            hostname.startsWith('192.168.') ||
            hostname.startsWith('10.') ||
            hostname.startsWith('172.')) {
            return res.status(400).json({
                success: false,
                error: 'Local addresses are not allowed',
                code: 'BLOCKED_HOST',
                timestamp: new Date().toISOString()
            });
        }
        
        next();
    } catch (error) {
        return res.status(400).json({
            success: false,
            error: 'Invalid URL format',
            code: 'INVALID_URL',
            timestamp: new Date().toISOString()
        });
    }
};

module.exports = {
    validateRequest,
    validateUrl
};