# YouTube Download API Documentation

A robust Express.js API for downloading YouTube videos and audio with real-time progress tracking via Server-Sent Events (SSE).

## Features

- 🎥 **Video Download**: Download YouTube videos in various formats
- 🎵 **Audio Download**: Extract and download audio tracks
- 📊 **Real-time Progress**: Server-Sent Events for live download progress
- 🛡️ **Security**: Rate limiting, input validation, and error handling
- ⚡ **Performance**: Streaming downloads with cancellation support
- 🔧 **Robust Error Handling**: Comprehensive error responses

## Installation

```bash
# Install dependencies
npm install

# Start the server
npm start

# Development mode (auto-restart)
npm run dev
```

The server will start on `http://localhost:3000`

## API Endpoints

### 1. Get Video Information

**Endpoint**: `GET /api/info`

**Description**: Retrieve metadata and available formats for a YouTube video.

**Query Parameters**:
- `url` (string, required): YouTube video URL

**Example Request**:
```bash
GET /api/info?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "title": "Rick Astley - Never Gonna Give You Up (Official Video)",
    "author": "Rick Astley",
    "length": "212",
    "viewCount": "123456789",
    "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    "formats": [
      {
        "itag": 18,
        "mimeType": "video/mp4; codecs=\"avc1.42001E, mp4a.40.2\"",
        "quality": "360p",
        "qualityLabel": "360p",
        "container": "mp4",
        "bitrate": "800000",
        "audioBitrate": "96"
      }
    ]
  }
}
```

**Error Response**:
```json
{
  "error": "Invalid URL. Only YouTube URLs are supported.",
  "details": "Validation failed"
}
```

### 2. Download Video

**Endpoint**: `POST /api/download/video`

**Description**: Download a YouTube video file as a stream.

**Request Headers**:
- `Content-Type: application/json`

**Request Body**:
```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "formatId": "18"
}
```

**Response Headers**:
- `Content-Disposition: attachment; filename="video_title.mp4"`
- `Content-Type: video/mp4`

**Example Response**: Binary video file stream

**Error Response**:
```json
{
  "error": "Failed to download video",
  "details": "Video is unavailable"
}
```

### 3. Download Audio

**Endpoint**: `POST /api/download/audio`

**Description**: Download the audio track from a YouTube video.

**Request Headers**:
- `Content-Type: application/json`

**Request Body**:
```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "formatId": "140"
}
```

**Response Headers**:
- `Content-Disposition: attachment; filename="audio_title.m4a"`
- `Content-Type: audio/mpeg`

**Example Response**: Binary audio file stream

**Error Response**:
```json
{
  "error": "Failed to download audio",
  "details": "Requested format not found"
}
```

### 4. Progress Tracking (SSE)

**Endpoint**: `GET /api/progress/:id`

**Description**: Real-time progress updates via Server-Sent Events.

**Path Parameters**:
- `id` (string, required): Download ID returned from download requests

**Example Request**:
```bash
GET /api/progress/abc123-def456-ghi789
```

**Response Format**: Server-Sent Events stream

**Example Progress Events**:
```json
{
  "id": "abc123-def456-ghi789",
  "status": "downloading",
  "title": "Video Title",
  "filename": "video_title.mp4",
  "progress": 45,
  "downloaded": "4718592",
  "total": "10485760",
  "speed": "1048576",
  "updatedAt": "2023-12-15T10:30:00.000Z"
}
```

**Possible Status Values**:
- `initializing`: Download is starting
- `downloading`: File is being downloaded
- `completed`: Download finished successfully
- `cancelled`: Download was cancelled
- `error`: Download failed with error
- `not_found`: Download ID not found

### 5. Cancel Download

**Endpoint**: `POST /api/cancel/:id`

**Description**: Cancel an ongoing download.

**Path Parameters**:
- `id` (string, required): Download ID to cancel

**Example Request**:
```bash
POST /api/cancel/abc123-def456-ghi789
```

**Example Response**:
```json
{
  "success": true,
  "message": "Download cancelled"
}
```

### 6. Health Check

**Endpoint**: `GET /api/health`

**Description**: Check API server status and active connections.

**Example Response**:
```json
{
  "status": "healthy",
  "timestamp": "2023-12-15T10:30:00.000Z",
  "activeDownloads": 2,
  "sseClients": 1
}
```

## Client Implementation Examples

### JavaScript (Browser)

```javascript
// Get video info
const getVideoInfo = async (url) => {
  const response = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
  const data = await response.json();
  return data;
};

// Download video with progress tracking
const downloadVideo = async (url, formatId) => {
  // Start download
  const response = await fetch('/api/download/video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, formatId })
  });

  if (!response.ok) {
    throw new Error('Download failed');
  }

  // Extract download ID (you'll need to modify the API to return this)
  const downloadId = response.headers.get('X-Download-ID');
  
  // Track progress via SSE
  const eventSource = new EventSource(`/api/progress/${downloadId}`);
  
  eventSource.onmessage = (event) => {
    const progress = JSON.parse(event.data);
    console.log(`Progress: ${progress.progress}%`);
    
    if (progress.status === 'completed') {
      eventSource.close();
    }
  };

  // Download file
  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `video.${format.container}`;
  a.click();
  window.URL.revokeObjectURL(downloadUrl);
};

// Cancel download
const cancelDownload = async (downloadId) => {
  await fetch(`/api/cancel/${downloadId}`, { method: 'POST' });
};
```

### cURL Examples

```bash
# Get video info
curl "http://localhost:3000/api/info?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ"

# Download video (saves to file)
curl -X POST "http://localhost:3000/api/download/video" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ","formatId":"18"}' \
  --output video.mp4

# Cancel download
curl -X POST "http://localhost:3000/api/cancel/abc123-def456-ghi789"

# Health check
curl "http://localhost:3000/api/health"
```

### Python Example

```python
import requests
import json

def get_video_info(url):
    response = requests.get(f"http://localhost:3000/api/info", params={"url": url})
    return response.json()

def download_video(url, format_id, filename):
    data = {"url": url, "formatId": format_id}
    
    with requests.post("http://localhost:3000/api/download/video", 
                       json=data, stream=True) as response:
        response.raise_for_status()
        
        with open(filename, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)

def track_progress(download_id):
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    
    response = requests.get(f"http://localhost:3000/api/progress/{download_id}", 
                          stream=True)
    
    for line in response.iter_lines():
        if line:
            data = json.loads(line.decode('utf-8'))
            print(f"Progress: {data.get('progress', 0)}%")
```

## Error Handling

### Common Error Codes

- **400 Bad Request**: Invalid input parameters
- **404 Not Found**: Video unavailable or private
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server processing error
- **503 Service Unavailable**: YouTube API issues

### Error Response Format

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": "Additional error details (development mode only)"
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse:
- **Limit**: 100 requests per 15-minute window per IP
- **Headers**: Rate limit information included in response headers
- **Error**: HTTP 429 with retry-after header when limit exceeded

## Security Features

- **URL Validation**: Only YouTube URLs are accepted
- **Input Sanitization**: All inputs are validated and sanitized
- **CORS**: Configurable cross-origin resource sharing
- **Helmet.js**: Security headers for protection
- **Request Size Limits**: Prevent large payload attacks

## Format IDs Reference

### Common Video Formats
- **18**: 360p MP4 (good quality, small file)
- **22**: 720p MP4 (HD quality)
- **36**: 240p 3GP (low quality, very small)
- **37**: 1080p MP4 (full HD)
- **38**: 3072p MP4 (4K)

### Common Audio Formats
- **139**: 48kbps AAC (very low quality)
- **140**: 128kbps AAC (standard quality)
- **171**: 128kbps WebM Vorbis
- **251**: 160kbps WebM Opus (high quality)

## Testing

A comprehensive test client is available at `/api-test.html`. Open it in your browser to:

1. Test video information retrieval
2. Download videos with progress tracking
3. Download audio files
4. Monitor download progress in real-time
5. Cancel downloads
6. View API responses

## Troubleshooting

### Common Issues

1. **"Video unavailable"**: The video may be private, deleted, or geo-blocked
2. **"Signatures extraction failed"**: YouTube updated their system, try again later
3. **Rate limit exceeded**: Wait before making more requests
4. **CORS errors**: Ensure the API URL is correct and CORS is properly configured

### Debug Mode

Set environment variable for detailed error messages:
```bash
NODE_ENV=development npm start
```

## Performance Considerations

- **Streaming**: Files are streamed, not loaded entirely into memory
- **Progress Tracking**: SSE connections may impact server resources
- **Rate Limiting**: Protects against DoS attacks
- **Memory Management**: Download status is cleared after completion

## License

MIT License - see the main project README for details.

## Support

For issues and feature requests, please check the test client first and review the error responses carefully. Most issues are related to:

1. Invalid YouTube URLs
2. Private/unavailable videos
3. Network connectivity issues
4. YouTube API rate limiting