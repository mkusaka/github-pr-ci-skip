(() => {
  // background.ts
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.url) {
      chrome.tabs.sendMessage(tabId, {
        url: changeInfo.url
      });
    }
  });
})();
