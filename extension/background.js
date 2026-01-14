// Background service worker for Twitter News Collector

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveTweets') {
    handleSaveTweets(request.data)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep the message channel open for async response
  }

  if (request.action === 'fetchUrlContent') {
    handleFetchUrlContent(request.url)
      .then(content => sendResponse({ success: true, content }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Handle saving tweets to local backend
async function handleSaveTweets(data) {
  console.log('Saving tweets:', data);

  const { tweets, username, source } = data;

  // In a real implementation, this would send to a local backend
  // For now, we'll use chrome.storage.local
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('T')[0].replace(/-/g, '');
  const usernameClean = (username || 'timeline').replace('@', '');
  const filename = `${timestamp}_${usernameClean}.json`;

  const saveData = {
    timestamp: new Date().toISOString(),
    username: username || 'timeline',
    source: source || 'unknown',
    tweets: tweets,
    count: tweets.length
  };

  await chrome.storage.local.set({
    [filename]: saveData
  });

  return { filename, count: tweets.length, source };
}

// Handle fetching URL content
async function handleFetchUrlContent(url) {
  try {
    const response = await fetch(url);
    const html = await response.text();

    // Basic extraction of title and content
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : 'No title found';

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
      content: bodyText.substring(0, 1000) // Limit to 1000 chars
    };
  } catch (error) {
    console.error('Error fetching URL:', error);
    return {
      url,
      title: 'Error fetching content',
      content: error.message
    };
  }
}

console.log('Twitter News Collector background script loaded');
