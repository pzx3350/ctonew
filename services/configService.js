const path = require('path');

function parseJSON(value) {
  if (!value) return undefined;

  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

const projectRoot = path.resolve(__dirname, '..');

const port = Number(process.env.PORT) || 3000;
const downloadDir = process.env.DOWNLOAD_DIR
  ? path.resolve(projectRoot, process.env.DOWNLOAD_DIR)
  : path.join(projectRoot, 'downloads');

const ytdlpBinaryPath = process.env.YTDLP_BINARY_PATH || 'yt-dlp';
const rateLimits = parseJSON(process.env.RATE_LIMITS) || {};

module.exports = {
  port,
  downloadDir,
  ytdlpBinaryPath,
  rateLimits,
};
