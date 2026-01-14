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
      const linkElements = tweetEl.querySelectorAll('a[href*="http"]');
      linkElements.forEach(link => {
        const href = link.getAttribute('href');
        // Filter out Twitter internal links
        if (href && !href.includes('twitter.com') && !href.includes('x.com') && !href.includes('t.co')) {
          if (!urls.includes(href)) {
            urls.push(href);
          }
        }
      });

      // Also check for t.co links and extract them
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
        index: i
      });
    } catch (error) {
      console.error('Error extracting tweet:', error);
    }
  }

  return tweets;
}

// Function to collect tweets and process URLs
async function collectTweets(username = null) {
  console.log('Starting tweet collection...');

  // Get user settings if no username provided
  if (!username) {
    const settings = await chrome.storage.local.get(['xAccount']);
    username = settings.xAccount || 'timeline';
  }

  // Extract tweets from DOM
  const tweets = extractTweets(20);
  console.log(`Extracted ${tweets.length} tweets`);

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
    collectTweets()
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
