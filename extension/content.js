// Content script for Twitter/X page

console.log('Twitter News Collector content script loaded');

// Function to extract tweet author from tweet element
function extractTweetAuthor(tweetEl) {
  try {
    // Try to find the author's username
    const authorLink = tweetEl.querySelector('a[href*="/"][role="link"]');
    if (authorLink) {
      const href = authorLink.getAttribute('href');
      const match = href.match(/^\/([^\/]+)$/);
      if (match) {
        return match[1];
      }
    }

    // Alternative: Look for username in aria-label
    const userElements = tweetEl.querySelectorAll('[data-testid="User-Name"] a');
    for (const elem of userElements) {
      const href = elem.getAttribute('href');
      if (href && href.startsWith('/')) {
        const username = href.substring(1).split('/')[0];
        if (username && username !== 'i') {
          return username;
        }
      }
    }

    return 'unknown';
  } catch (error) {
    console.error('Error extracting author:', error);
    return 'unknown';
  }
}

// Function to extract tweet data from the DOM
function extractTweets(maxCount = 20) {
  const tweets = [];

  // Twitter/X uses article elements for tweets
  const tweetElements = document.querySelectorAll('article[data-testid="tweet"]');

  console.log(`Found ${tweetElements.length} tweet elements`);

  const limit = Math.min(tweetElements.length, maxCount);

  for (let i = 0; i < limit; i++) {
    const tweetEl = tweetElements[i];

    try {
      // Extract tweet author
      const author = extractTweetAuthor(tweetEl);

      // Extract tweet text
      const tweetTextEl = tweetEl.querySelector('[data-testid="tweetText"]');
      const tweetText = tweetTextEl ? tweetTextEl.innerText : '';

      // Extract timestamp
      const timeEl = tweetEl.querySelector('time');
      const timestamp = timeEl ? timeEl.getAttribute('datetime') : new Date().toISOString();

      // Extract URLs from the tweet
      const urls = [];
      const tweetUrls = []; // Twitter/X status URLs (thread, reply)

      const linkElements = tweetEl.querySelectorAll('a[href*="http"]');
      linkElements.forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;

        // Check if it's a Twitter/X status link (thread or reply)
        if (href.includes('/status/')) {
          const fullUrl = href.startsWith('http') ? href : `https://x.com${href}`;
          if (!tweetUrls.includes(fullUrl)) {
            tweetUrls.push(fullUrl);
          }
        }
        // External links (not Twitter/X)
        else if (!href.includes('twitter.com') && !href.includes('x.com')) {
          if (!urls.includes(href)) {
            urls.push(href);
          }
        }
      });

      // Also check for t.co links (shortened URLs)
      const tcoLinks = tweetEl.querySelectorAll('a[href*="t.co"]');
      tcoLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && !urls.includes(href)) {
          urls.push(href);
        }
      });

      tweets.push({
        author: author,
        text: tweetText,
        timestamp: timestamp,
        urls: urls,
        tweetUrls: tweetUrls, // Thread/reply links
        index: i
      });
    } catch (error) {
      console.error('Error extracting tweet:', error);
    }
  }

  return tweets;
}

// Auto-scroll function to load more tweets
async function autoScrollToLoadTweets(targetCount, onProgress) {
  console.log(`Auto-scrolling to load ${targetCount} tweets...`);

  let lastHeight = 0;
  let scrollAttempts = 0;
  const maxScrollAttempts = 30; // Prevent infinite loops

  while (scrollAttempts < maxScrollAttempts) {
    const currentTweetCount = document.querySelectorAll('article[data-testid="tweet"]').length;

    // Update progress
    if (onProgress) {
      onProgress(currentTweetCount, targetCount);
    }

    // Check if we have enough tweets
    if (currentTweetCount >= targetCount) {
      console.log(`Loaded ${currentTweetCount} tweets (target: ${targetCount})`);
      break;
    }

    // Scroll to bottom
    window.scrollTo(0, document.body.scrollHeight);

    // Wait for new content to load
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Check if page height changed (new content loaded)
    if (document.body.scrollHeight === lastHeight) {
      console.log('No more content to load');
      break;
    }

    lastHeight = document.body.scrollHeight;
    scrollAttempts++;
  }

  // Scroll back to top
  window.scrollTo(0, 0);

  const finalCount = document.querySelectorAll('article[data-testid="tweet"]').length;
  console.log(`Auto-scroll complete: ${finalCount} tweets loaded`);
  return finalCount;
}

// Function to collect tweets and process URLs
async function collectTweets(username = null, autoScroll = false) {
  console.log('Starting tweet collection...');

  // Get user settings
  const settings = await chrome.storage.local.get(['xAccount', 'tweetCount']);
  if (!username) {
    username = settings.xAccount || 'timeline';
  }
  const maxTweets = settings.tweetCount || 20;

  // Auto-scroll if requested
  if (autoScroll) {
    await autoScrollToLoadTweets(maxTweets, (current, target) => {
      console.log(`Loading tweets: ${current}/${target}`);
    });
  }

  // Extract tweets from DOM
  const tweets = extractTweets(maxTweets);
  console.log(`Extracted ${tweets.length} tweets (max: ${maxTweets})`);

  // Determine the collection source
  const currentUrl = window.location.href;
  let source = 'timeline';
  if (currentUrl.includes('/home')) {
    source = 'home_timeline';
  } else if (currentUrl.match(/\/[^\/]+$/)) {
    const match = currentUrl.match(/\/([^\/]+)$/);
    source = match ? match[1] : 'timeline';
  }

  // Process URLs in tweets
  for (const tweet of tweets) {
    tweet.linkedContent = [];

    for (const url of tweet.urls) {
      console.log(`Fetching content from: ${url}`);

      try {
        // Send message to background script to fetch URL content
        const response = await chrome.runtime.sendMessage({
          action: 'fetchUrlContent',
          url: url
        });

        if (response && response.success) {
          tweet.linkedContent.push(response.content);
        }
      } catch (error) {
        console.error(`Error fetching ${url}:`, error);
        tweet.linkedContent.push({
          url: url,
          title: 'Error',
          content: error.message
        });
      }
    }
  }

  // Save tweets
  console.log('Saving tweets...');
  const saveResponse = await chrome.runtime.sendMessage({
    action: 'saveTweets',
    data: {
      tweets: tweets,
      username: username,
      source: source
    }
  });

  if (saveResponse && saveResponse.success) {
    console.log('Tweets saved successfully:', saveResponse.result);
    alert(`Successfully collected ${tweets.length} tweets from ${source} and saved to ${saveResponse.result.filename}`);
  } else {
    console.error('Error saving tweets:', saveResponse?.error);
    alert('Error saving tweets: ' + (saveResponse?.error || 'Unknown error'));
  }

  return tweets;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'collectTweets') {
    const autoScroll = request.autoScroll || false;
    collectTweets(null, autoScroll)
      .then(tweets => sendResponse({ success: true, tweets }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep the message channel open
  }
});

// Auto-collect when page is loaded (optional)
// Uncomment the following to enable auto-collection
// window.addEventListener('load', () => {
//   setTimeout(collectTweets, 3000); // Wait 3 seconds for page to fully load
// });
