const MESSAGE_TYPES = {
  DOWNLOAD_TEXT: "download-text",
  GET_ACTIVE_CHATGPT_TAB: "get-active-chatgpt-tab"
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== "object") {
    return false;
  }

  if (message.type === MESSAGE_TYPES.DOWNLOAD_TEXT) {
    downloadTextFile(message)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: String(error && error.message ? error.message : error) }));
    return true;
  }

  if (message.type === MESSAGE_TYPES.GET_ACTIVE_CHATGPT_TAB) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs && tabs[0];
      sendResponse({
        ok: true,
        tab: tab
          ? {
              id: tab.id,
              title: tab.title,
              url: tab.url
            }
          : null
      });
    });
    return true;
  }

  return false;
});

async function downloadTextFile(message) {
  const filename = sanitizeDownloadPath(message.filename || `chatgpt-export-${Date.now()}.txt`);
  const mime = message.mime || "text/plain;charset=utf-8";
  const text = typeof message.text === "string" ? message.text : JSON.stringify(message.text, null, 2);
  const url = textToDataUrl(text, mime);
  const downloadId = await chrome.downloads.download({
    url,
    filename,
    saveAs: false,
    conflictAction: "uniquify"
  });
  return { downloadId, filename };
}

function sanitizeDownloadPath(path) {
  return String(path)
    .replace(/^[/\\]+/, "")
    .replace(/(^|[/\\])\.\.(?=$|[/\\])/g, "")
    .replace(/[<>:"|?*\u0000-\u001f]/g, "_")
    .slice(0, 240);
}

function textToDataUrl(text, mime) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return `data:${mime};base64,${btoa(binary)}`;
}
