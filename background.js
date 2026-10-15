// Clicking the toolbar icon opens the side panel (sidepanel/index.html). That is all this worker does.
// It reads no tabs, stores nothing and sends nothing anywhere.
const openOnClick = () => chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
chrome.runtime.onInstalled.addListener(openOnClick);
chrome.runtime.onStartup.addListener(openOnClick);
openOnClick();
