// Demo script to test tweet collection without Chrome extension
// This simulates the collection process for demonstration purposes

const fs = require('fs').promises;
const path = require('path');

// Sample tweet data for demonstration
const sampleTweets = [
  {
    text: "VRChatの新機能がすごい！メタバースの未来を感じる https://example.com/vrchat-news",
    timestamp: new Date().toISOString(),
    urls: ["https://example.com/vrchat-news"],
    index: 0
  },
  {
    text: "Unity 2023の最新情報 https://unity.com/releases/2023",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    urls: ["https://unity.com/releases/2023"],
    index: 1
  },
  {
    text: "今日も開発頑張ります！",
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    urls: [],
    index: 2
  },
  {
    text: "MetaQuest 3のレビュー記事書きました https://example.com/quest3-review #VR #MetaQuest",
    timestamp: new Date(Date.now() - 10800000).toISOString(),
    urls: ["https://example.com/quest3-review"],
    index: 3
  },
  {
    text: "WebGLの最適化テクニック https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API",
    timestamp: new Date(Date.now() - 14400000).toISOString(),
    urls: ["https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API"],
    index: 4
  }
];

async function fetchUrlContent(url) {
  console.log(`  Fetching: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
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

    return {
      url,
      title,
      description,
      content: bodyText.substring(0, 1000)
    };
  } catch (error) {
    console.error(`  Error fetching ${url}:`, error.message);
    return {
      url,
      title: 'Error fetching content',
      description: '',
      content: error.message
    };
  }
}

async function collectAndSaveTweets() {
  console.log('\n========================================');
  console.log('Twitter News Collector - Demo');
  console.log('========================================\n');

  console.log(`Processing ${sampleTweets.length} sample tweets...\n`);

  // Process each tweet
  for (const tweet of sampleTweets) {
    console.log(`Tweet ${tweet.index + 1}: "${tweet.text.substring(0, 50)}..."`);

    tweet.linkedContent = [];

    if (tweet.urls.length > 0) {
      console.log(`  Found ${tweet.urls.length} URL(s)`);

      for (const url of tweet.urls) {
        const content = await fetchUrlContent(url);
        tweet.linkedContent.push(content);
        console.log(`    ✓ ${content.title}`);
      }
    } else {
      console.log(`  No URLs found`);
    }

    console.log('');
  }

  // Save to JSON file
  const dataDir = path.join(__dirname, '..', 'data', 'tweets');
  await fs.mkdir(dataDir, { recursive: true });

  const date = new Date();
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
  const filename = `${dateStr}_goromian.json`;
  const filepath = path.join(dataDir, filename);

  const data = {
    username: 'GOROman',
    collectedAt: date.toISOString(),
    tweetCount: sampleTweets.length,
    tweets: sampleTweets
  };

  await fs.writeFile(filepath, JSON.stringify(data, null, 2));

  console.log('========================================');
  console.log(`✓ Saved ${sampleTweets.length} tweets to:`);
  console.log(`  ${filepath}`);
  console.log('========================================\n');

  // Display summary
  console.log('Summary:');
  console.log(`  Total tweets: ${data.tweetCount}`);
  console.log(`  Tweets with URLs: ${sampleTweets.filter(t => t.urls.length > 0).length}`);
  console.log(`  Total URLs processed: ${sampleTweets.reduce((sum, t) => sum + t.urls.length, 0)}`);
  console.log('');

  return data;
}

// Run demo
collectAndSaveTweets()
  .then(() => {
    console.log('Demo completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Demo failed:', error);
    process.exit(1);
  });
