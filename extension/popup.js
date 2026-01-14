// Popup script for Twitter News Collector

document.addEventListener('DOMContentLoaded', () => {
  const collectBtn = document.getElementById('collectBtn');
  const viewDataBtn = document.getElementById('viewDataBtn');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const statusDiv = document.getElementById('status');
  const xAccountInput = document.getElementById('xAccount');
  const googleAccountInput = document.getElementById('googleAccount');
  const tweetCountInput = document.getElementById('tweetCount');
  const currentAccountDiv = document.getElementById('currentAccount');

  // Load saved settings
  loadSettings();

  // Load settings function
  async function loadSettings() {
    try {
      const settings = await chrome.storage.local.get(['xAccount', 'googleAccount', 'tweetCount']);
      if (settings.xAccount) {
        xAccountInput.value = settings.xAccount;
        currentAccountDiv.textContent = `Current: ${settings.xAccount}`;
      }
      if (settings.googleAccount) {
        googleAccountInput.value = settings.googleAccount;
      }
      if (settings.tweetCount) {
        tweetCountInput.value = settings.tweetCount;
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  // Save settings button
  saveSettingsBtn.addEventListener('click', async () => {
    const xAccount = xAccountInput.value.trim();
    const googleAccount = googleAccountInput.value.trim();
    const tweetCount = parseInt(tweetCountInput.value) || 20;

    // Validate tweet count
    if (tweetCount < 1 || tweetCount > 100) {
      statusDiv.textContent = 'Tweet count must be between 1 and 100';
      return;
    }

    try {
      await chrome.storage.local.set({
        xAccount: xAccount,
        googleAccount: googleAccount,
        tweetCount: tweetCount
      });

      currentAccountDiv.textContent = `Current: ${xAccount || 'Not set'} (${tweetCount} tweets)`;
      statusDiv.textContent = 'Settings saved successfully!';
    } catch (error) {
      statusDiv.textContent = 'Error saving settings: ' + error.message;
    }
  });

  // Collect tweets button
  collectBtn.addEventListener('click', async () => {
    collectBtn.disabled = true;
    statusDiv.textContent = 'Collecting tweets...';

    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // Check if we're on Twitter/X
      if (!tab.url.includes('twitter.com') && !tab.url.includes('x.com')) {
        statusDiv.textContent = 'Error: Please navigate to a Twitter/X page first.';
        collectBtn.disabled = false;
        return;
      }

      // Send message to content script
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'collectTweets' });

      if (response && response.success) {
        statusDiv.textContent = `Successfully collected ${response.tweets.length} tweets!`;
      } else {
        statusDiv.textContent = 'Error: ' + (response?.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error:', error);
      statusDiv.textContent = 'Error: ' + error.message;
    } finally {
      collectBtn.disabled = false;
    }
  });

  // View data button
  viewDataBtn.addEventListener('click', async () => {
    statusDiv.textContent = 'Loading saved data...';

    try {
      const data = await chrome.storage.local.get(null);
      const keys = Object.keys(data).filter(k => k.includes('.json') || (data[k].tweets && Array.isArray(data[k].tweets)));

      if (keys.length === 0) {
        statusDiv.textContent = 'No saved data found.';
        return;
      }

      // Display summary
      let summary = `Found ${keys.length} saved collection(s):\n\n`;
      keys.forEach(key => {
        const item = data[key];
        if (item.count && item.timestamp) {
          const source = item.source ? ` from ${item.source}` : '';
          summary += `${key}: ${item.count} tweets${source}\n${new Date(item.timestamp).toLocaleString()}\n\n`;
        }
      });

      statusDiv.textContent = summary;

      // Also log to console for detailed view
      console.log('Saved data:', data);
    } catch (error) {
      statusDiv.textContent = 'Error loading data: ' + error.message;
    }
  });

  // Download JSON button
  downloadBtn.addEventListener('click', async () => {
    statusDiv.textContent = 'Preparing download...';

    try {
      const data = await chrome.storage.local.get(null);
      const keys = Object.keys(data).filter(k => k.includes('.json') || (data[k].tweets && Array.isArray(data[k].tweets)));

      if (keys.length === 0) {
        statusDiv.textContent = 'No data to download.';
        return;
      }

      // Download each file
      let downloadCount = 0;
      for (const key of keys) {
        const item = data[key];
        const jsonStr = JSON.stringify(item, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        // Use chrome.downloads API to save file
        await chrome.downloads.download({
          url: url,
          filename: `ai-news-collector/${key}`,
          saveAs: false
        });

        downloadCount++;

        // Clean up the blob URL
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }

      statusDiv.textContent = `Downloaded ${downloadCount} file(s) to Downloads/ai-news-collector/`;
    } catch (error) {
      console.error('Download error:', error);
      statusDiv.textContent = 'Error downloading: ' + error.message;
    }
  });
});
