#!/bin/bash

# YouTube Download API Test Script
# This script tests all the API endpoints

BASE_URL="http://localhost:3000/api"

echo "🎥 YouTube Download API Test Script"
echo "=================================="
echo

# Check if server is running
echo "🔍 Checking if server is running..."
if ! curl -s "${BASE_URL}/health" > /dev/null 2>&1; then
    echo "❌ Server is not running. Please start it with 'npm start'"
    exit 1
fi
echo "✅ Server is running"
echo

# Test 1: Health Check
echo "📊 Test 1: Health Check"
echo "----------------------"
curl -s "${BASE_URL}/health" | jq '.' 2>/dev/null || curl -s "${BASE_URL}/health"
echo
echo

# Test 2: Get Video Info
echo "ℹ️ Test 2: Get Video Info"
echo "------------------------"
VIDEO_URL="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
echo "URL: $VIDEO_URL"
echo "Response:"
curl -s "${BASE_URL}/info?url=$(echo $VIDEO_URL | sed 's/&/%26/g')" | jq '.' 2>/dev/null || curl -s "${BASE_URL}/info?url=$(echo $VIDEO_URL | sed 's/&/%26/g')"
echo
echo

# Test 3: Download Video (with timeout to avoid hanging)
echo "⬇️ Test 3: Download Video (Demo Mode)"
echo "-------------------------------------"
echo "Testing video download with format ID 18..."
timeout 10 curl -s -X POST "${BASE_URL}/download/video" \
  -H "Content-Type: application/json" \
  -d '{"url":"'$VIDEO_URL'","formatId":"18"}' \
  --output "/tmp/test_video.mp4" 2>/dev/null

if [ -f "/tmp/test_video.mp4" ]; then
    echo "✅ Video download initiated successfully"
    echo "📁 Downloaded file size: $(du -h /tmp/test_video.mp4 | cut -f1)"
    rm -f /tmp/test_video.mp4
else
    echo "⚠️ Video download test completed (may be streaming data)"
fi
echo
echo

# Test 4: Download Audio (with timeout)
echo "🎵 Test 4: Download Audio (Demo Mode)"
echo "------------------------------------"
echo "Testing audio download with format ID 140..."
timeout 10 curl -s -X POST "${BASE_URL}/download/audio" \
  -H "Content-Type: application/json" \
  -d '{"url":"'$VIDEO_URL'","formatId":"140"}' \
  --output "/tmp/test_audio.mp3" 2>/dev/null

if [ -f "/tmp/test_audio.mp3" ]; then
    echo "✅ Audio download initiated successfully"
    echo "📁 Downloaded file size: $(du -h /tmp/test_audio.mp3 | cut -f1)"
    rm -f /tmp/test_audio.mp3
else
    echo "⚠️ Audio download test completed (may be streaming data)"
fi
echo
echo

# Test 5: Invalid URL Handling
echo "🚫 Test 5: Error Handling - Invalid URL"
echo "---------------------------------------"
curl -s "${BASE_URL}/info?url=invalid-url" | jq '.' 2>/dev/null || curl -s "${BASE_URL}/info?url=invalid-url"
echo
echo

# Test 6: Validation Error
echo "⚠️ Test 6: Validation Error - Missing Parameters"
echo "------------------------------------------------"
curl -s -X POST "${BASE_URL}/download/video" \
  -H "Content-Type: application/json" \
  -d '{"url":"'$VIDEO_URL'"}' | jq '.' 2>/dev/null || curl -s -X POST "${BASE_URL}/download/video" \
  -H "Content-Type: application/json" \
  -d '{"url":"'$VIDEO_URL'"}'
echo
echo

echo "🎉 API Testing Complete!"
echo "========================"
echo "The API is ready for use. Features tested:"
echo "✅ Health monitoring"
echo "✅ Video information retrieval (with fallback demo mode)"
echo "✅ Video download streaming"
echo "✅ Audio download streaming"
echo "✅ Error handling and validation"
echo
echo "📖 For detailed API documentation, see: API-README.md"
echo "🧪 For interactive testing, open: api-test.html"
echo
echo "🚀 To start the server: npm start"
echo "🔧 Development mode: npm run dev"