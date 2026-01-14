// Popup script for Twitter News Collector

document.addEventListener('DOMContentLoaded', () => {
  const collectBtn = document.getElementById('collectBtn');
  const viewDataBtn = document.getElementById('viewDataBtn');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const statusDiv = document.getElementById('status');
  const xAccountInput = document.getElementById('xAccount');
  const googleAccountInput = document.getElementById('googleAccount');
  const currentAccountDiv = document.getElementById('currentAccount');

  // Load saved settings
  loadSettings();

  // Load settings function
  async function loadSettings() {
    try {
      const settings = await chrome.storage.local.get(['xAccount', 'googleAccount']);
      if (settings.xAccount) {
        xAccountInput.value = settings.xAccount;
        currentAccountDiv.textContent = `Current: ${settings.xAccount}`;
      }
      if (settings.googleAccount) {
        googleAccountInput.value = settings.googleAccount;
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  // Save settings button
  saveSettingsBtn.addEventListener('click', async () => {
    const xAccount = xAccountInput.value.trim();
    const googleAccount = googleAccountInput.value.trim();

    try {
      await chrome.storage.local.set({
        xAccount: xAccount,
        googleAccount: googleAccount
      });

      currentAccountDiv.textContent = `Current: ${xAccount || 'Not set'}`;
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
});
