class ProgressTracker {
    constructor() {
        this.sseClients = new Map();
        this.progressData = new Map();
        this.cleanupInterval = setInterval(() => {
            this.cleanupOldClients();
        }, 60000); // Clean up every minute
    }

    /**
     * Add a Server-Sent Events client
     * @param {Object} client - SSE client object
     */
    addSSEClient(client) {
        this.sseClients.set(client.id, client);
        console.log(`📊 SSE client added for download: ${client.id}`);
    }

    /**
     * Remove a Server-Sent Events client
     * @param {string} clientId - Client ID
     */
    removeSSEClient(clientId) {
        const removed = this.sseClients.delete(clientId);
        if (removed) {
            console.log(`📊 SSE client removed for download: ${clientId}`);
        }
    }

    /**
     * Update progress data and notify SSE clients
     * @param {string} downloadId - Download ID
     * @param {Object} progressData - Progress data
     */
    updateProgress(downloadId, progressData) {
        // Store progress data
        this.progressData.set(downloadId, progressData);
        
        // Notify SSE client if connected
        const client = this.sseClients.get(downloadId);
        if (client && typeof client.update === 'function') {
            client.update(progressData);
        }
        
        // Clean up if download is complete
        if (progressData.status === 'completed' || progressData.status === 'failed' || progressData.status === 'cancelled') {
            setTimeout(() => {
                this.sseClients.delete(downloadId);
                this.progressData.delete(downloadId);
            }, 5000); // Keep for 5 seconds after completion
        }
    }

    /**
     * Notify SSE clients about download completion
     * @param {string} downloadId - Download ID
     * @param {Object} data - Completion data
     */
    notifyCompletion(downloadId, data) {
        const client = this.sseClients.get(downloadId);
        if (client && typeof client.complete === 'function') {
            client.complete(data);
            setTimeout(() => {
                this.sseClients.delete(downloadId);
            }, 1000);
        }
    }

    /**
     * Notify SSE clients about download cancellation
     * @param {string} downloadId - Download ID
     */
    notifyCancellation(downloadId) {
        const client = this.sseClients.get(downloadId);
        if (client && typeof client.error === 'function') {
            client.error('Download cancelled by user');
            setTimeout(() => {
                this.sseClients.delete(downloadId);
            }, 1000);
        }
    }

    /**
     * Get progress data for a download
     * @param {string} downloadId - Download ID
     * @returns {Object|null} - Progress data or null
     */
    getProgress(downloadId) {
        return this.progressData.get(downloadId) || null;
    }

    /**
     * Get all active SSE clients
     * @returns {Array} - Array of client IDs
     */
    getActiveClients() {
        return Array.from(this.sseClients.keys());
    }

    /**
     * Get statistics about active downloads
     * @returns {Object} - Statistics object
     */
    getStats() {
        const activeDownloads = Array.from(this.progressData.values());
        return {
            activeClients: this.sseClients.size,
            totalDownloads: this.progressData.size,
            downloading: activeDownloads.filter(d => d.status === 'downloading').length,
            completed: activeDownloads.filter(d => d.status === 'completed').length,
            failed: activeDownloads.filter(d => d.status === 'failed').length,
            cancelled: activeDownloads.filter(d => d.status === 'cancelled').length
        };
    }

    /**
     * Clean up old SSE clients and progress data
     */
    cleanupOldClients() {
        const now = Date.now();
        const maxAge = 5 * 60 * 1000; // 5 minutes
        
        for (const [id, client] of this.sseClients.entries()) {
            // Check if client connection is stale
            if (!client.res || client.res.writableEnded) {
                this.sseClients.delete(id);
                console.log(`📊 Cleaned up stale SSE client: ${id}`);
            }
        }
        
        // Clean up old progress data
        for (const [id, progress] of this.progressData.entries()) {
            if (progress.createdAt && now - progress.createdAt.getTime() > maxAge) {
                this.progressData.delete(id);
                console.log(`📊 Cleaned up old progress data: ${id}`);
            }
        }
    }

    /**
     * Shutdown the tracker
     */
    shutdown() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        
        // Close all SSE connections
        for (const [id, client] of this.sseClients.entries()) {
            if (client.res && !client.res.writableEnded) {
                client.res.end();
            }
        }
        
        this.sseClients.clear();
        this.progressData.clear();
        console.log('📊 Progress tracker shutdown complete');
    }
}

// Export singleton instance
module.exports = {
    progressTracker: new ProgressTracker()
};