document.getElementById('open').addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://claude.ai/design' });
  window.close();
});
