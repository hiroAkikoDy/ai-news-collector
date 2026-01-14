const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Ensure data directory exists
const DATA_DIR = path.join(__dirname, '..', 'data', 'tweets');

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating data directory:', error);
  }
}

// API endpoint to save tweets
app.post('/api/tweets/save', async (req, res) => {
  try {
    const { tweets, username = 'goromian' } = req.body;

    if (!tweets || !Array.isArray(tweets)) {
      return res.status(400).json({ error: 'Invalid tweets data' });
    }

    // Generate filename with date
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const filename = `${dateStr}_${username}.json`;
    const filepath = path.join(DATA_DIR, filename);

    // Prepare data structure
    const data = {
      username,
      collectedAt: date.toISOString(),
      tweetCount: tweets.length,
      tweets: tweets
    };

    // Save to file
    await fs.writeFile(filepath, JSON.stringify(data, null, 2));

    console.log(`Saved ${tweets.length} tweets to ${filename}`);

    res.json({
      success: true,
      filename,
      filepath,
      tweetCount: tweets.length
    });
  } catch (error) {
    console.error('Error saving tweets:', error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to fetch URL content (web_fetch simulation)
app.post('/api/fetch-url', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`Fetching content from: ${url}`);

    // Use fetch to get the content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const html = await response.text();

    // Extract title
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : 'No title found';

    // Extract meta description
    const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);
    const description = descMatch ? descMatch[1].trim() : '';

    // Remove scripts and styles
    let content = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    content = content.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

    // Extract text from body
    const bodyMatch = content.match(/<body[^>]*>(.*?)<\/body>/is);
    let bodyText = bodyMatch ? bodyMatch[1] : content;
    bodyText = bodyText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    res.json({
      success: true,
      data: {
        url,
        title,
        description,
        content: bodyText.substring(0, 2000) // Limit to 2000 chars
      }
    });
  } catch (error) {
    console.error('Error fetching URL:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: {
        url: req.body.url,
        title: 'Error fetching content',
        description: '',
        content: error.message
      }
    });
  }
});

// API endpoint to list saved files
app.get('/api/tweets/list', async (req, res) => {
  try {
    const files = await fs.readdir(DATA_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    const fileDetails = await Promise.all(
      jsonFiles.map(async (filename) => {
        const filepath = path.join(DATA_DIR, filename);
        const stats = await fs.stat(filepath);
        const content = await fs.readFile(filepath, 'utf-8');
        const data = JSON.parse(content);

        return {
          filename,
          size: stats.size,
          modified: stats.mtime,
          tweetCount: data.tweetCount || 0,
          collectedAt: data.collectedAt
        };
      })
    );

    res.json({
      success: true,
      files: fileDetails
    });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to get a specific file
app.get('/api/tweets/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filepath = path.join(DATA_DIR, filename);

    const content = await fs.readFile(filepath, 'utf-8');
    const data = JSON.parse(content);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error reading file:', error);
    res.status(404).json({ error: 'File not found' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
async function startServer() {
  await ensureDataDir();

  app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`Twitter News Collector Backend`);
    console.log(`========================================`);
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Data directory: ${DATA_DIR}`);
    console.log(`\nEndpoints:`);
    console.log(`  POST /api/tweets/save - Save collected tweets`);
    console.log(`  POST /api/fetch-url - Fetch URL content`);
    console.log(`  GET  /api/tweets/list - List saved files`);
    console.log(`  GET  /api/tweets/:filename - Get specific file`);
    console.log(`  GET  /health - Health check`);
    console.log(`========================================\n`);
  });
}

startServer();
