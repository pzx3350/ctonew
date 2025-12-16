/**
 * Global error handling middleware
 */
const globalErrorHandler = (err, req, res, next) => {
    console.error('🚨 Global Error Handler:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
    });

    // Default error response
    let status = 500;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let message = 'Internal server error';
    let details = null;

    // Handle specific error types
    if (err.name === 'ValidationError') {
        status = 400;
        errorCode = 'VALIDATION_ERROR';
        message = 'Request validation failed';
        details = err.details || err.message;
    } else if (err.name === 'CastError') {
        status = 400;
        errorCode = 'INVALID_ID';
        message = 'Invalid ID format';
    } else if (err.code === 'ENOENT') {
        status = 404;
        errorCode = 'FILE_NOT_FOUND';
        message = 'File not found';
    } else if (err.code === 'EACCES') {
        status = 403;
        errorCode = 'ACCESS_DENIED';
        message = 'Access denied';
    } else if (err.code === 'EMFILE' || err.code === 'ENFILE') {
        status = 503;
        errorCode = 'RESOURCE_EXHAUSTED';
        message = 'Too many open files, please try again later';
    } else if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT') {
        status = 408;
        errorCode = 'REQUEST_TIMEOUT';
        message = 'Request timed out';
    } else if (err.message && err.message.includes('URL')) {
        status = 400;
        errorCode = 'URL_ERROR';
        message = err.message;
    } else if (err.message && err.message.includes('download')) {
        status = 400;
        errorCode = 'DOWNLOAD_ERROR';
        message = err.message;
    } else if (err.message && err.message.includes('format')) {
        status = 400;
        errorCode = 'FORMAT_ERROR';
        message = err.message;
    } else if (err.message && err.message.includes('timeout')) {
        status = 408;
        errorCode = 'TIMEOUT_ERROR';
        message = 'Operation timed out';
    } else if (err.message && err.message.includes('rate limit')) {
        status = 429;
        errorCode = 'RATE_LIMIT_ERROR';
        message = 'Rate limit exceeded';
    }

    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    const errorResponse = {
        success: false,
        error: message,
        code: errorCode,
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method
    };

    // Include additional details in development
    if (isDevelopment) {
        errorResponse.stack = err.stack;
        errorResponse.details = details;
        errorResponse.fullMessage = err.message;
    }

    // Include request ID if available
    if (req.id) {
        errorResponse.requestId = req.id;
    }

    res.status(status).json(errorResponse);
};

/**
 * Handle 404 errors for unmatched routes
 */
const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        code: 'NOT_FOUND',
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });
};

/**
 * Async error wrapper
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * Custom error classes
 */
class DownloadError extends Error {
    constructor(message, code = 'DOWNLOAD_ERROR') {
        super(message);
        this.name = 'DownloadError';
        this.code = code;
    }
}

class ValidationError extends Error {
    constructor(message, details = null) {
        super(message);
        this.name = 'ValidationError';
        this.code = 'VALIDATION_ERROR';
        this.details = details;
    }
}

class TimeoutError extends Error {
    constructor(message = 'Operation timed out') {
        super(message);
        this.name = 'TimeoutError';
        this.code = 'TIMEOUT_ERROR';
    }
}

class RateLimitError extends Error {
    constructor(message = 'Rate limit exceeded') {
        super(message);
        this.name = 'RateLimitError';
        this.code = 'RATE_LIMIT_ERROR';
    }
}

module.exports = {
    globalErrorHandler,
    notFoundHandler,
    asyncHandler,
    DownloadError,
    ValidationError,
    TimeoutError,
    RateLimitError
};