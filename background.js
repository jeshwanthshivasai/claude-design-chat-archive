// Clicking the toolbar icon opens the export panel on a Claude Design tab,
// or opens Claude Design in a new tab with the panel already open.
// No permissions needed: it only messages its own content script.
chrome.action.onClicked.addListener(async (tab) => {
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'dce-open-panel' });
  } catch (e) {
    chrome.tabs.create({ url: 'https://claude.ai/design#export-chats' });
  }
});
