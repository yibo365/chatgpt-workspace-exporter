const statusEl = document.getElementById("status");
const showPanelButton = document.getElementById("show-panel");
const openChatgptButton = document.getElementById("open-chatgpt");

init();

async function init() {
  showPanelButton.disabled = true;
  const active = await chrome.runtime.sendMessage({ type: "get-active-chatgpt-tab" });
  const tab = active && active.tab;

  if (tab && tab.url && tab.url.startsWith("https://chatgpt.com/")) {
    statusEl.textContent = "已检测到 ChatGPT 页面。点击下面按钮后，页面右下角会出现导出面板。";
    showPanelButton.disabled = false;
    showPanelButton.addEventListener("click", () => showPanel(tab.id));
  } else {
    statusEl.textContent = "当前标签页不是 ChatGPT。请先打开 chatgpt.com 并确认已经登录。";
  }

  openChatgptButton.addEventListener("click", () => {
    chrome.tabs.create({ url: "https://chatgpt.com/" });
  });
}

async function showPanel(tabId) {
  showPanelButton.disabled = true;
  statusEl.textContent = "正在唤起页面导出面板...";
  try {
    await chrome.tabs.sendMessage(tabId, { type: "chatgpt-exporter:show-panel" });
    statusEl.textContent = "面板已显示。请回到 ChatGPT 页面继续操作。";
    window.close();
  } catch (error) {
    statusEl.textContent = "没有连接到页面脚本。请刷新 ChatGPT 页面后再试。";
    showPanelButton.disabled = false;
  }
}
