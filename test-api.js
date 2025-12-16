#!/usr/bin/env node

/**
 * Simple test script for the download API
 * This script tests all the API endpoints to ensure they work correctly
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

const testEndpoints = {
    // Test health check
    async testHealth() {
        try {
            console.log('🔍 Testing health endpoint...');
            const response = await axios.get(`${BASE_URL}/health`);
            console.log('✅ Health check passed:', response.data);
            return true;
        } catch (error) {
            console.error('❌ Health check failed:', error.message);
            return false;
        }
    },

    // Test API info endpoint
    async testInfoEndpoint() {
        try {
            console.log('🔍 Testing info endpoint...');
            const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; // Sample YouTube URL
            const response = await axios.get(`${BASE_URL}/api/info?url=${encodeURIComponent(testUrl)}`);
            console.log('✅ Info endpoint passed:', response.data);
            return true;
        } catch (error) {
            console.error('❌ Info endpoint failed:', error.message);
            return false;
        }
    },

    // Test video download endpoint
    async testVideoDownload() {
        try {
            console.log('🔍 Testing video download endpoint...');
            const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
            const response = await axios.post(`${BASE_URL}/api/download/video`, {
                url: testUrl,
                format: '720'
            });
            console.log('✅ Video download endpoint passed:', response.data);
            
            // Return download ID for further testing
            return response.data.downloadId;
        } catch (error) {
            console.error('❌ Video download endpoint failed:', error.message);
            return false;
        }
    },

    // Test audio download endpoint
    async testAudioDownload() {
        try {
            console.log('🔍 Testing audio download endpoint...');
            const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
            const response = await axios.post(`${BASE_URL}/api/download/audio`, {
                url: testUrl
            });
            console.log('✅ Audio download endpoint passed:', response.data);
            
            // Return download ID for further testing
            return response.data.downloadId;
        } catch (error) {
            console.error('❌ Audio download endpoint failed:', error.message);
            return false;
        }
    },

    // Test progress endpoint
    async testProgressEndpoint(downloadId) {
        try {
            console.log('🔍 Testing progress endpoint...');
            const response = await axios.get(`${BASE_URL}/api/progress/${downloadId}/status`);
            console.log('✅ Progress endpoint passed:', response.data);
            return true;
        } catch (error) {
            console.error('❌ Progress endpoint failed:', error.message);
            return false;
        }
    },

    // Test Server-Sent Events
    async testSSE(downloadId) {
        try {
            console.log('🔍 Testing Server-Sent Events...');
            
            return new Promise((resolve) => {
                const axios = require('axios');
                
                // Make request to SSE endpoint
                const sseUrl = `${BASE_URL}/api/progress/${downloadId}`;
                
                // Use fetch instead of axios for better SSE handling
                fetch(sseUrl)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }
                        
                        const reader = response.body.getReader();
                        const decoder = new TextDecoder();
                        let buffer = '';
                        let eventCount = 0;
                        
                        function read() {
                            reader.read().then(({ done, value }) => {
                                if (done) {
                                    console.log('✅ SSE test completed - received', eventCount, 'events');
                                    resolve(true);
                                    return;
                                }
                                
                                buffer += decoder.decode(value, { stream: true });
                                const lines = buffer.split('\n');
                                buffer = lines.pop(); // Keep incomplete line in buffer
                                
                                for (const line of lines) {
                                    if (line.startsWith('data: ')) {
                                        eventCount++;
                                        const data = JSON.parse(line.slice(6));
                                        console.log('📡 SSE Event:', data.type);
                                        
                                        // Stop after receiving a few events
                                        if (eventCount >= 3) {
                                            reader.cancel();
                                            resolve(true);
                                            return;
                                        }
                                    }
                                }
                                
                                if (!done) {
                                    read();
                                }
                            });
                        }
                        
                        read();
                    })
                    .catch(error => {
                        console.error('❌ SSE test failed:', error.message);
                        resolve(false);
                    });
            });
        } catch (error) {
            console.error('❌ SSE test failed:', error.message);
            return false;
        }
    },

    // Test cancellation endpoint
    async testCancellation(downloadId) {
        try {
            console.log('🔍 Testing cancellation endpoint...');
            const response = await axios.post(`${BASE_URL}/api/cancel/${downloadId}`);
            console.log('✅ Cancellation endpoint passed:', response.data);
            return true;
        } catch (error) {
            console.error('❌ Cancellation endpoint failed:', error.message);
            return false;
        }
    },

    // Test validation errors
    async testValidationErrors() {
        try {
            console.log('🔍 Testing validation errors...');
            
            // Test invalid URL
            try {
                await axios.get(`${BASE_URL}/api/info?url=invalid-url`);
                console.log('❌ Validation test failed - should have rejected invalid URL');
                return false;
            } catch (error) {
                if (error.response && error.response.status === 400) {
                    console.log('✅ Invalid URL validation passed');
                } else {
                    throw error;
                }
            }
            
            // Test missing format
            try {
                await axios.post(`${BASE_URL}/api/download/video`, {
                    url: 'https://example.com/video'
                    // Missing format
                });
                console.log('❌ Validation test failed - should have rejected missing format');
                return false;
            } catch (error) {
                if (error.response && error.response.status === 400) {
                    console.log('✅ Missing format validation passed');
                } else {
                    throw error;
                }
            }
            
            return true;
        } catch (error) {
            console.error('❌ Validation test failed:', error.message);
            return false;
        }
    },

    // Run all tests
    async runAllTests() {
        console.log('🚀 Starting API tests...\n');
        
        const results = [];
        
        // Test health endpoint
        results.push(await this.testHealth());
        console.log('');
        
        // Test info endpoint
        results.push(await this.testInfoEndpoint());
        console.log('');
        
        // Test video download
        const videoDownloadId = await this.testVideoDownload();
        console.log('');
        
        if (videoDownloadId) {
            // Test progress endpoint
            await this.testProgressEndpoint(videoDownloadId);
            console.log('');
            
            // Test SSE
            await this.testSSE(videoDownloadId);
            console.log('');
            
            // Test cancellation
            await this.testCancellation(videoDownloadId);
            console.log('');
        }
        
        // Test audio download
        const audioDownloadId = await this.testAudioDownload();
        console.log('');
        
        // Test validation errors
        results.push(await this.testValidationErrors());
        console.log('');
        
        // Summary
        const passed = results.filter(result => result !== false).length;
        const total = results.length;
        
        console.log('📊 Test Summary:');
        console.log(`✅ Passed: ${passed}/${total}`);
        console.log(`❌ Failed: ${total - passed}/${total}`);
        
        if (passed === total) {
            console.log('🎉 All tests passed!');
            process.exit(0);
        } else {
            console.log('💥 Some tests failed!');
            process.exit(1);
        }
    }
};

// Check if server is running
async function checkServer() {
    try {
        await axios.get(`${BASE_URL}/health`);
        return true;
    } catch (error) {
        console.error('❌ Server is not running. Please start the server with: npm start');
        process.exit(1);
    }
}

// Main execution
if (require.main === module) {
    checkServer().then(() => {
        testEndpoints.runAllTests().catch(error => {
            console.error('Test execution failed:', error);
            process.exit(1);
        });
    });
}

module.exports = testEndpoints;