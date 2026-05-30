(function initChatGptExporter() {
  if (window.__chatGptWorkspaceExporterLoaded) {
    return;
  }
  window.__chatGptWorkspaceExporterLoaded = true;

  const API_BASE = "/backend-api";
  const DEFAULTS = {
    pageSize: 100,
    delayMs: 250,
    maxConversations: 0,
    scope: "all",
    includeRawJson: true,
    includeMarkdown: true
  };

  const state = {
    panel: null,
    log: null,
    progress: null,
    summary: null,
    startButton: null,
    cancelButton: null,
    running: false,
    abortController: null,
    currentRun: null,
    clientBootstrap: undefined
  };

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message && message.type === "chatgpt-exporter:show-panel") {
      showPanel();
      sendResponse({ ok: true });
      return true;
    }
    return false;
  });

  injectStyles();
  mountLauncher();

  function injectStyles() {
    if (document.getElementById("cgpt-exporter-styles")) {
      return;
    }
    const style = document.createElement("style");
    style.id = "cgpt-exporter-styles";
    style.textContent = `
      #cgpt-exporter-launcher,
      #cgpt-exporter-panel {
        color: #1f1f1d;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        letter-spacing: 0;
      }

      #cgpt-exporter-launcher {
        position: fixed;
        right: 18px;
        bottom: 18px;
        z-index: 2147483646;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 46px;
        height: 46px;
        border: 1px solid rgba(24, 24, 21, 0.12);
        border-radius: 999px;
        background: #146c5f;
        color: #fff;
        box-shadow: 0 14px 34px rgba(0, 0, 0, 0.22);
        cursor: pointer;
        font-size: 13px;
        font-weight: 700;
      }

      #cgpt-exporter-launcher:hover {
        background: #0d5d52;
      }

      #cgpt-exporter-panel {
        position: fixed;
        right: 18px;
        bottom: 76px;
        z-index: 2147483647;
        display: none;
        width: min(420px, calc(100vw - 28px));
        max-height: min(720px, calc(100vh - 96px));
        overflow: hidden;
        border: 1px solid rgba(24, 24, 21, 0.14);
        border-radius: 10px;
        background: #fbfaf6;
        box-shadow: 0 22px 60px rgba(0, 0, 0, 0.24);
      }

      #cgpt-exporter-panel[data-open="true"] {
        display: flex;
        flex-direction: column;
      }

      .cgpt-exporter-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        border-bottom: 1px solid #e3e0d8;
        padding: 14px 14px 12px;
      }

      .cgpt-exporter-title {
        margin: 0;
        font-size: 16px;
        font-weight: 700;
      }

      .cgpt-exporter-subtitle {
        margin: 4px 0 0;
        color: #66645f;
        font-size: 12px;
        line-height: 1.45;
      }

      .cgpt-exporter-close {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border: 0;
        border-radius: 7px;
        background: transparent;
        color: #55524d;
        cursor: pointer;
        font-size: 20px;
        line-height: 1;
      }

      .cgpt-exporter-close:hover {
        background: #edeae2;
      }

      .cgpt-exporter-body {
        display: flex;
        flex-direction: column;
        gap: 12px;
        overflow: auto;
        padding: 14px;
      }

      .cgpt-exporter-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }

      .cgpt-exporter-field {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }

      .cgpt-exporter-field label,
      .cgpt-exporter-check label {
        color: #3f3d38;
        font-size: 12px;
        font-weight: 650;
      }

      .cgpt-exporter-field input,
      .cgpt-exporter-field select {
        height: 34px;
        box-sizing: border-box;
        border: 1px solid #d9d5ca;
        border-radius: 8px;
        background: #fff;
        color: #1f1f1d;
        padding: 0 10px;
        font-size: 13px;
      }

      .cgpt-exporter-checks {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      .cgpt-exporter-check {
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 34px;
        border: 1px solid #e1ded5;
        border-radius: 8px;
        background: #fff;
        padding: 0 10px;
      }

      .cgpt-exporter-check input {
        width: 16px;
        height: 16px;
        accent-color: #146c5f;
      }

      .cgpt-exporter-actions {
        display: flex;
        gap: 8px;
      }

      .cgpt-exporter-button {
        min-height: 36px;
        flex: 1;
        border: 0;
        border-radius: 8px;
        background: #146c5f;
        color: #fff;
        cursor: pointer;
        font-size: 13px;
        font-weight: 700;
      }

      .cgpt-exporter-button:hover {
        background: #0d5d52;
      }

      .cgpt-exporter-button:disabled {
        cursor: not-allowed;
        opacity: 0.58;
      }

      .cgpt-exporter-button.secondary {
        border: 1px solid #d7d3c9;
        background: #fff;
        color: #262522;
      }

      .cgpt-exporter-button.secondary:hover {
        background: #efede6;
      }

      .cgpt-exporter-progress {
        width: 100%;
        height: 8px;
        overflow: hidden;
        border: 0;
        border-radius: 999px;
        background: #e8e4db;
      }

      .cgpt-exporter-progress::-webkit-progress-bar {
        background: #e8e4db;
      }

      .cgpt-exporter-progress::-webkit-progress-value {
        border-radius: 999px;
        background: #146c5f;
      }

      .cgpt-exporter-summary {
        color: #4c4943;
        font-size: 12px;
        line-height: 1.45;
      }

      .cgpt-exporter-log {
        min-height: 120px;
        max-height: 210px;
        overflow: auto;
        border: 1px solid #dfdbd2;
        border-radius: 8px;
        background: #fff;
        padding: 9px;
        color: #3b3934;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 11px;
        line-height: 1.45;
        white-space: pre-wrap;
      }

      @media (max-width: 520px) {
        #cgpt-exporter-panel {
          right: 8px;
          bottom: 66px;
          width: calc(100vw - 16px);
        }

        #cgpt-exporter-launcher {
          right: 10px;
          bottom: 10px;
        }

        .cgpt-exporter-grid,
        .cgpt-exporter-checks {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.documentElement.appendChild(style);
  }

  function mountLauncher() {
    if (document.getElementById("cgpt-exporter-launcher")) {
      return;
    }
    const button = document.createElement("button");
    button.id = "cgpt-exporter-launcher";
    button.type = "button";
    button.title = "ChatGPT 导出";
    button.setAttribute("aria-label", "打开 ChatGPT 导出面板");
    button.textContent = "导出";
    button.addEventListener("click", showPanel);
    document.documentElement.appendChild(button);
  }

  function showPanel() {
    if (!state.panel) {
      state.panel = buildPanel();
      document.documentElement.appendChild(state.panel);
    }
    state.panel.dataset.open = "true";
  }

  function buildPanel() {
    const currentProject = getCurrentProjectInfo();
    const defaultScope = currentProject ? "currentProject" : DEFAULTS.scope;
    const panel = document.createElement("section");
    panel.id = "cgpt-exporter-panel";
    panel.setAttribute("aria-label", "ChatGPT 导出面板");
    panel.innerHTML = `
      <header class="cgpt-exporter-header">
        <div>
          <h2 class="cgpt-exporter-title">ChatGPT 对话导出</h2>
          <p class="cgpt-exporter-subtitle">将当前账号可访问的对话逐条写入本地文件夹。</p>
        </div>
        <button class="cgpt-exporter-close" type="button" aria-label="关闭">×</button>
      </header>
      <div class="cgpt-exporter-body">
        <div class="cgpt-exporter-grid">
          <div class="cgpt-exporter-field">
            <label for="cgpt-exporter-scope">导出范围</label>
            <select id="cgpt-exporter-scope" data-option="scope">
              <option value="currentProject" ${defaultScope === "currentProject" ? "selected" : ""} ${currentProject ? "" : "disabled"}>当前项目</option>
              <option value="projects" ${defaultScope === "projects" ? "selected" : ""}>所有项目</option>
              <option value="noProject" ${defaultScope === "noProject" ? "selected" : ""}>项目外</option>
              <option value="all" ${defaultScope === "all" ? "selected" : ""}>全部</option>
            </select>
          </div>
          <div class="cgpt-exporter-field">
            <label for="cgpt-exporter-page-size">每页数量</label>
            <input id="cgpt-exporter-page-size" data-option="pageSize" type="number" min="1" max="100" step="1" value="${DEFAULTS.pageSize}">
          </div>
          <div class="cgpt-exporter-field">
            <label for="cgpt-exporter-delay">请求间隔 ms</label>
            <input id="cgpt-exporter-delay" data-option="delayMs" type="number" min="0" max="5000" step="50" value="${DEFAULTS.delayMs}">
          </div>
          <div class="cgpt-exporter-field">
            <label for="cgpt-exporter-max">最多导出</label>
            <input id="cgpt-exporter-max" data-option="maxConversations" type="number" min="0" step="1" value="${DEFAULTS.maxConversations}">
          </div>
        </div>
        <div class="cgpt-exporter-checks">
          <div class="cgpt-exporter-check">
            <input id="cgpt-exporter-raw" data-option="includeRawJson" type="checkbox" checked>
            <label for="cgpt-exporter-raw">Raw JSON</label>
          </div>
          <div class="cgpt-exporter-check">
            <input id="cgpt-exporter-md" data-option="includeMarkdown" type="checkbox" checked>
            <label for="cgpt-exporter-md">Markdown</label>
          </div>
        </div>
        <div class="cgpt-exporter-actions">
          <button class="cgpt-exporter-button" type="button" data-action="start">选择文件夹并开始</button>
          <button class="cgpt-exporter-button secondary" type="button" data-action="cancel" disabled>停止</button>
        </div>
        <progress class="cgpt-exporter-progress" value="0" max="1"></progress>
        <div class="cgpt-exporter-summary">等待开始。</div>
        <div class="cgpt-exporter-log" role="log" aria-live="polite"></div>
      </div>
    `;

    state.log = panel.querySelector(".cgpt-exporter-log");
    state.progress = panel.querySelector(".cgpt-exporter-progress");
    state.summary = panel.querySelector(".cgpt-exporter-summary");
    state.startButton = panel.querySelector('[data-action="start"]');
    state.cancelButton = panel.querySelector('[data-action="cancel"]');

    panel.querySelector(".cgpt-exporter-close").addEventListener("click", () => {
      panel.dataset.open = "false";
    });
    state.startButton.addEventListener("click", () => startExport().catch((error) => finishWithError(error)));
    state.cancelButton.addEventListener("click", () => {
      if (state.abortController) {
        logLine("正在停止...");
        state.abortController.abort();
      }
    });
    return panel;
  }

  async function startExport() {
    if (state.running) {
      return;
    }

    const options = readOptions();
    if (!options.includeRawJson && !options.includeMarkdown) {
      logLine("请至少选择一种导出格式。");
      return;
    }

    state.running = true;
    state.abortController = new AbortController();
    state.clientBootstrap = undefined;
    state.currentRun = {
      startedAt: new Date(),
      exported: 0,
      failed: 0,
      total: 0
    };
    state.startButton.disabled = true;
    state.cancelButton.disabled = false;
    state.progress.value = 0;
    state.progress.max = 1;
    state.log.textContent = "";
    updateSummary("准备导出...");

    try {
      const writer = await createWriter();
      logLine(`输出方式：${writer.kind === "directory" ? "本地文件夹" : "浏览器下载"}`);
      logLine(describeRequestHeaderState());
      await exportAllConversations(options, writer, state.abortController.signal);
      updateSummary(`完成：成功 ${state.currentRun.exported} 条，失败 ${state.currentRun.failed} 条。`);
      logLine("导出完成。");
    } catch (error) {
      if (error && error.name === "AbortError") {
        updateSummary(`已停止：成功 ${state.currentRun.exported} 条，失败 ${state.currentRun.failed} 条。`);
        logLine("导出已停止。");
      } else {
        throw error;
      }
    } finally {
      state.running = false;
      state.abortController = null;
      state.startButton.disabled = false;
      state.cancelButton.disabled = true;
    }
  }

  function readOptions() {
    const values = { ...DEFAULTS };
    state.panel.querySelectorAll("[data-option]").forEach((element) => {
      const key = element.getAttribute("data-option");
      if (element.type === "checkbox") {
        values[key] = element.checked;
      } else if (element.tagName === "SELECT") {
        values[key] = element.value;
      } else {
        values[key] = Number.parseInt(element.value, 10);
      }
    });
    values.pageSize = clampNumber(values.pageSize, 1, 100, DEFAULTS.pageSize);
    values.delayMs = clampNumber(values.delayMs, 0, 5000, DEFAULTS.delayMs);
    values.maxConversations = Math.max(0, Number.isFinite(values.maxConversations) ? values.maxConversations : 0);
    values.scope = ["all", "projects", "currentProject", "noProject"].includes(values.scope) ? values.scope : DEFAULTS.scope;
    values.currentProject = getCurrentProjectInfo();
    return values;
  }

  async function createWriter() {
    const stamp = formatStamp(new Date());
    const baseName = `chatgpt-export-${stamp}`;
    if ("showDirectoryPicker" in window) {
      const selectedDirectory = await window.showDirectoryPicker({
        id: "chatgpt-workspace-export",
        mode: "readwrite"
      });
      const baseDirectory = await selectedDirectory.getDirectoryHandle(baseName, { create: true });
      return {
        kind: "directory",
        baseName,
        async writeText(relativePath, text, mime) {
          await writeTextToDirectory(baseDirectory, relativePath, text, mime);
        }
      };
    }

    return {
      kind: "downloads",
      baseName,
      async writeText(relativePath, text, mime) {
        await chrome.runtime.sendMessage({
          type: "download-text",
          filename: `${baseName}/${relativePath}`,
          text,
          mime
        });
      }
    };
  }

  async function writeTextToDirectory(baseDirectory, relativePath, text, mime) {
    const parts = safeRelativePath(relativePath).split("/").filter(Boolean);
    let directory = baseDirectory;
    for (const part of parts.slice(0, -1)) {
      directory = await directory.getDirectoryHandle(part, { create: true });
    }
    const fileName = parts[parts.length - 1] || "untitled.txt";
    const file = await directory.getFileHandle(fileName, { create: true });
    const writable = await file.createWritable();
    await writable.write(new Blob([text], { type: mime || "text/plain;charset=utf-8" }));
    await writable.close();
  }

  async function exportAllConversations(options, writer, signal) {
    const discovered = discoverProjectsAndVisibleConversations();
    await enrichProjectsFromKnownApis(discovered, signal);
    logLine(`页面发现项目 ${discovered.projects.size} 个，可见对话 ${discovered.conversationHints.size} 条。`);
    logLine(`导出范围：${describeScope(options)}`);

    const index = {
      schema_version: 1,
      exported_at: new Date().toISOString(),
      source_url: location.href,
      api_base: API_BASE,
      writer: writer.kind,
      options,
      projects: [],
      conversations: [],
      failures: []
    };

    await writer.writeText("README.txt", buildReadme(), "text/plain;charset=utf-8");

    const scopedProjects = getProjectsForScope(discovered.projects, options);
    const listItems = shouldFetchGlobalList(options) ? await fetchAllConversationListItems(options, signal) : [];
    const projectItems = shouldFetchProjectLists(options) ? await fetchAllProjectConversationListItems(scopedProjects, options, signal) : [];
    const mergedItems = mergeVisibleConversationHints([...projectItems, ...listItems], discovered.conversationHints);
    const scopedItems = filterItemsByScope(mergedItems, options);
    const limitedItems = options.maxConversations > 0 ? scopedItems.slice(0, options.maxConversations) : scopedItems;
    state.currentRun.total = limitedItems.length;
    state.progress.max = Math.max(1, limitedItems.length);
    logLine(`待导出对话 ${limitedItems.length} 条。`);

    const seenProjects = new Map(discovered.projects);

    for (let indexInRun = 0; indexInRun < limitedItems.length; indexInRun += 1) {
      throwIfAborted(signal);
      const listItem = limitedItems[indexInRun];
      const conversationId = getConversationId(listItem);
      if (!conversationId) {
        state.currentRun.failed += 1;
        index.failures.push({ reason: "missing_conversation_id", list_item: listItem });
        continue;
      }

      const title = getConversationTitle(listItem) || conversationId;
      updateSummary(`正在导出 ${indexInRun + 1}/${limitedItems.length}：${title}`);

      try {
        const detail = await fetchConversationDetail(conversationId, signal);
        const meta = buildConversationMeta({
          listItem,
          detail,
          discovered,
          seenProjects
        });
        if (!conversationMetaMatchesScope(meta, options)) {
          logLine(`跳过非目标范围：${meta.title || conversationId}`);
          state.progress.value = indexInRun + 1;
          continue;
        }
        if (meta.project_id && !seenProjects.has(meta.project_id)) {
          seenProjects.set(meta.project_id, {
            id: meta.project_id,
            name: meta.project_name || meta.project_id,
            source: "conversation"
          });
        }

        const relativeBase = buildConversationBasePath(meta);
        const exportedFiles = {};
        if (options.includeRawJson) {
          exportedFiles.raw_json = `${relativeBase}.json`;
          await writer.writeText(
            exportedFiles.raw_json,
            JSON.stringify({ export_meta: meta, list_item: listItem, conversation: detail }, null, 2),
            "application/json;charset=utf-8"
          );
        }
        if (options.includeMarkdown) {
          exportedFiles.markdown = `${relativeBase}.md`;
          await writer.writeText(
            exportedFiles.markdown,
            conversationToMarkdown(detail, meta),
            "text/markdown;charset=utf-8"
          );
        }

        index.conversations.push({
          id: conversationId,
          title: meta.title,
          project_id: meta.project_id,
          project_name: meta.project_name,
          create_time: meta.create_time,
          update_time: meta.update_time,
          url: meta.url,
          files: exportedFiles
        });
        state.currentRun.exported += 1;
        logLine(`OK ${state.currentRun.exported}/${limitedItems.length} ${title}`);
      } catch (error) {
        state.currentRun.failed += 1;
        const failure = {
          id: conversationId,
          title,
          error: String(error && error.message ? error.message : error)
        };
        index.failures.push(failure);
        logLine(`失败 ${conversationId}: ${failure.error}`);
      }

      state.progress.value = indexInRun + 1;
      if ((indexInRun + 1) % 10 === 0) {
        index.projects = [...seenProjects.values()];
        await writer.writeText("index.partial.json", JSON.stringify(index, null, 2), "application/json;charset=utf-8");
      }
      if (options.delayMs > 0) {
        await sleep(options.delayMs, signal);
      }
    }

    index.projects = [...seenProjects.values()];
    await writer.writeText("index.json", JSON.stringify(index, null, 2), "application/json;charset=utf-8");
    if (index.failures.length > 0) {
      await writer.writeText("failures.json", JSON.stringify(index.failures, null, 2), "application/json;charset=utf-8");
    }
  }

  function shouldFetchGlobalList(options) {
    return options.scope === "all" || options.scope === "noProject";
  }

  function shouldFetchProjectLists(options) {
    return options.scope === "all" || options.scope === "projects" || options.scope === "currentProject";
  }

  function getProjectsForScope(projects, options) {
    if (options.scope !== "currentProject") {
      return projects;
    }
    const currentProject = options.currentProject;
    const scoped = new Map();
    if (currentProject?.id) {
      scoped.set(currentProject.id, {
        id: currentProject.id,
        name: projects.get(currentProject.id)?.name || currentProject.name || currentProject.id,
        source: "current_url"
      });
    }
    return scoped;
  }

  function filterItemsByScope(items, options) {
    if (options.scope === "all") {
      return items;
    }
    return items.filter((item) => {
      const projectId = getItemProjectId(item);
      if (options.scope === "currentProject") {
        return projectId === options.currentProject?.id;
      }
      if (options.scope === "projects") {
        return !!projectId;
      }
      if (options.scope === "noProject") {
        return !projectId;
      }
      return true;
    });
  }

  function conversationMetaMatchesScope(meta, options) {
    if (options.scope === "all") {
      return true;
    }
    if (options.scope === "currentProject") {
      return meta.project_id === options.currentProject?.id;
    }
    if (options.scope === "projects") {
      return !!meta.project_id;
    }
    if (options.scope === "noProject") {
      return !meta.project_id;
    }
    return true;
  }

  function describeScope(options) {
    if (options.scope === "currentProject") {
      return options.currentProject?.id ? `当前项目 ${options.currentProject.name || options.currentProject.id}` : "当前项目（未检测到）";
    }
    if (options.scope === "projects") {
      return "所有项目";
    }
    if (options.scope === "noProject") {
      return "项目外";
    }
    return "全部";
  }

  async function fetchAllConversationListItems(options, signal) {
    const all = [];
    const seen = new Set();
    let offset = 0;
    let expectedTotal = null;
    let lastOffset = -1;

    for (let page = 0; page < 10000; page += 1) {
      throwIfAborted(signal);
      if (offset === lastOffset) {
        break;
      }
      lastOffset = offset;

      const query = new URLSearchParams({
        offset: String(offset),
        limit: String(options.pageSize),
        order: "updated"
      });
      const payload = await apiGet(`${API_BASE}/conversations?${query.toString()}`, signal);
      const items = normalizeConversationList(payload);
      expectedTotal = pickNumber(payload.total, payload.total_count, payload.count, expectedTotal);

      let newCount = 0;
      for (const item of items) {
        const id = getConversationId(item);
        if (id && !seen.has(id)) {
          seen.add(id);
          all.push(item);
          newCount += 1;
        }
      }

      logLine(`列表分页 ${page + 1}: +${newCount}，累计 ${all.length}${expectedTotal ? ` / ${expectedTotal}` : ""}`);

      if (options.maxConversations > 0 && all.length >= options.maxConversations) {
        break;
      }
      if (items.length === 0 || newCount === 0) {
        break;
      }
      if (payload.has_more === false || payload.has_next_page === false) {
        break;
      }
      const nextOffset = pickNumber(payload.next_offset, payload.nextOffset, offset + items.length);
      offset = nextOffset;
      if (expectedTotal !== null && offset >= expectedTotal) {
        break;
      }
      if (options.delayMs > 0) {
        await sleep(Math.min(options.delayMs, 500), signal);
      }
    }

    return all;
  }

  async function fetchAllProjectConversationListItems(projects, options, signal) {
    const all = [];
    const seen = new Set();
    const projectList = [...projects.values()].filter((project) => project && project.id);

    for (const project of projectList) {
      throwIfAborted(signal);
      let cursor = null;
      logLine(`读取项目：${project.name || project.id}`);

      for (let page = 0; page < 1000; page += 1) {
        throwIfAborted(signal);
        const query = new URLSearchParams({
          limit: String(options.pageSize)
        });
        if (cursor) {
          query.set("cursor", cursor);
        }

        let payload;
        try {
          payload = await apiGet(`${API_BASE}/gizmos/${encodeURIComponent(project.id)}/conversations?${query.toString()}`, signal);
        } catch (error) {
          logLine(`项目读取失败 ${project.name || project.id}: ${error.message || error}`);
          break;
        }

        const items = normalizeConversationList(payload);
        let newCount = 0;
        for (const item of items) {
          const id = getConversationId(item);
          if (!id || seen.has(id)) {
            continue;
          }
          seen.add(id);
          all.push({
            ...item,
            export_hint: {
              id,
              title: getConversationTitle(item) || id,
              project_id: project.id,
              project_name: project.name || project.id,
              url: `${location.origin}/g/${project.id}/c/${id}`,
              source: "project_api"
            }
          });
          newCount += 1;
        }

        logLine(`项目分页 ${project.name || project.id} #${page + 1}: +${newCount}`);
        cursor = getNextCursor(payload);
        if (!cursor || items.length === 0 || newCount === 0) {
          break;
        }
        if (options.delayMs > 0) {
          await sleep(Math.min(options.delayMs, 500), signal);
        }
      }
    }

    return all;
  }

  async function fetchConversationDetail(conversationId, signal) {
    return apiGet(`${API_BASE}/conversation/${encodeURIComponent(conversationId)}`, signal);
  }

  async function enrichProjectsFromKnownApis(discovered, signal) {
    const endpoints = [`${API_BASE}/gizmos/bootstrap?limit=200`];
    for (const endpoint of endpoints) {
      throwIfAborted(signal);
      try {
        const payload = await apiGet(endpoint, signal);
        for (const project of scanProjectObjects(payload)) {
          if (!discovered.projects.has(project.id)) {
            discovered.projects.set(project.id, {
              ...project,
              source: "gizmos_bootstrap"
            });
          }
        }
      } catch (error) {
        logLine(`项目索引接口跳过：${endpoint}`);
      }
    }
  }

  async function apiGet(path, signal, attempt = 1) {
    const url = new URL(path, location.origin).toString();
    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: {
        accept: "application/json",
        ...getChatGptRequestHeaders(path)
      },
      signal
    });

    if (response.status === 429 || response.status >= 500) {
      if (attempt < 4) {
        const retryAfter = Number.parseInt(response.headers.get("retry-after") || "", 10);
        const waitMs = Number.isFinite(retryAfter) ? retryAfter * 1000 : attempt * 1500;
        logLine(`接口暂忙 ${response.status}，${waitMs}ms 后重试。`);
        await sleep(waitMs, signal);
        return apiGet(path, signal, attempt + 1);
      }
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`HTTP ${response.status} ${response.statusText}: ${text.slice(0, 180)}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await response.text();
      throw new Error(`接口没有返回 JSON: ${text.slice(0, 180)}`);
    }

    return response.json();
  }

  function discoverProjectsAndVisibleConversations() {
    const projects = new Map();
    const conversationHints = new Map();
    const currentProject = getCurrentProjectInfo();
    if (currentProject?.id) {
      projects.set(currentProject.id, {
        id: currentProject.id,
        name: currentProject.name || currentProject.id,
        source: "current_url"
      });
    }
    const anchors = [...document.querySelectorAll("a[href]")];

    for (const anchor of anchors) {
      const href = anchor.getAttribute("href") || "";
      const text = cleanText(anchor.textContent || "");
      const aria = cleanText(anchor.getAttribute("aria-label") || "");
      const projectLink = href.match(/^\/g\/(g-p-[A-Za-z0-9]+)(?:-[^/?#]+)?\/project(?:[?#].*)?$/);
      if (projectLink) {
        const id = projectLink[1];
        projects.set(id, {
          id,
          name: extractProjectName(text, aria, id),
          source: "sidebar"
        });
      }

      const projectConversation = href.match(/^\/g\/(g-p-[A-Za-z0-9]+)(?:-[^/?#]+)?\/c\/([A-Za-z0-9-]+)/);
      if (projectConversation) {
        const projectId = projectConversation[1];
        const conversationId = projectConversation[2];
        const projectName = projects.get(projectId)?.name || extractProjectName("", aria, projectId);
        conversationHints.set(conversationId, {
          id: conversationId,
          title: text || extractTitleFromAria(aria) || conversationId,
          project_id: projectId,
          project_name: projectName,
          url: new URL(href, location.origin).toString(),
          source: "sidebar_project"
        });
        if (!projects.has(projectId)) {
          projects.set(projectId, {
            id: projectId,
            name: projectName || projectId,
            source: "sidebar_conversation"
          });
        }
        continue;
      }

      const normalConversation = href.match(/^\/c\/([A-Za-z0-9-]+)/);
      if (normalConversation) {
        const conversationId = normalConversation[1];
        if (!conversationHints.has(conversationId)) {
          conversationHints.set(conversationId, {
            id: conversationId,
            title: text || extractTitleFromAria(aria) || conversationId,
            project_id: null,
            project_name: null,
            url: new URL(href, location.origin).toString(),
            source: "sidebar"
          });
        }
      }
    }

    const currentProjectConversation = location.pathname.match(/^\/g\/(g-p-[A-Za-z0-9]+)(?:-[^/?#]+)?\/c\/([A-Za-z0-9-]+)/);
    if (currentProjectConversation) {
      const projectId = currentProjectConversation[1];
      if (!projects.has(projectId)) {
        projects.set(projectId, {
          id: projectId,
          name: currentProject?.name || projectId,
          source: "current_url"
        });
      }
      if (!conversationHints.has(currentProjectConversation[2])) {
        conversationHints.set(currentProjectConversation[2], {
          id: currentProjectConversation[2],
          title: document.title || currentProjectConversation[2],
          project_id: projectId,
          project_name: projects.get(projectId)?.name || projectId,
          url: location.href,
          source: "current_url"
        });
      }
    }

    return { projects, conversationHints };
  }

  function getCurrentProjectInfo() {
    const match = location.pathname.match(/^\/g\/(g-p-[A-Za-z0-9]+)(?:-[^/?#]+)?(?:\/(?:c\/([A-Za-z0-9-]+)|project))?/);
    if (!match) {
      return null;
    }
    const id = match[1];
    const conversationId = match[2] || null;
    const projectLink = [...document.querySelectorAll("a[href]")].find((anchor) => {
      const href = anchor.getAttribute("href") || "";
      return href.includes(`/g/${id}`) && href.includes("/project");
    });
    const name =
      cleanText(projectLink?.textContent || "") ||
      extractProjectName("", cleanText(projectLink?.getAttribute("aria-label") || ""), id) ||
      id;
    return { id, name, conversationId };
  }

  function mergeVisibleConversationHints(listItems, hints) {
    const merged = [];
    const seen = new Set();
    for (const item of listItems) {
      const id = getConversationId(item);
      if (!id || seen.has(id)) {
        continue;
      }
      seen.add(id);
      const hint = hints.get(id);
      merged.push(hint ? { ...hint, ...item, export_hint: hint } : item);
    }
    for (const hint of hints.values()) {
      if (!seen.has(hint.id)) {
        seen.add(hint.id);
        merged.push(hint);
      }
    }
    return merged;
  }

  function buildConversationMeta({ listItem, detail, discovered, seenProjects }) {
    const id = getConversationId(listItem) || detail.conversation_id || detail.id;
    const title = getConversationTitle(detail) || getConversationTitle(listItem) || id;
    const createTime = normalizeTimestamp(
      detail.create_time ||
        detail.createTime ||
        listItem.create_time ||
        listItem.createTime ||
        listItem.create_time_utc
    );
    const updateTime = normalizeTimestamp(
      detail.update_time ||
        detail.updateTime ||
        listItem.update_time ||
        listItem.updateTime ||
        listItem.updated_at
    );
    const hint = discovered.conversationHints.get(id) || listItem.export_hint || null;
    const projectId =
      normalizeProjectId(hint && hint.project_id) ||
      normalizeProjectId(listItem.project_id) ||
      normalizeProjectId(listItem.projectId) ||
      normalizeProjectId(listItem.gizmo_id) ||
      normalizeProjectId(listItem.gizmoId) ||
      normalizeProjectId(detail.project_id) ||
      normalizeProjectId(detail.projectId) ||
      normalizeProjectId(detail.gizmo_id) ||
      normalizeProjectId(detail.gizmoId) ||
      findProjectId(detail) ||
      null;
    const projectName =
      (hint && hint.project_name) ||
      (projectId && seenProjects.get(projectId)?.name) ||
      listItem.project_name ||
      listItem.projectName ||
      listItem.gizmo_name ||
      findProjectName(detail, projectId) ||
      (projectId ? projectId : null);
    const url =
      (hint && hint.url) ||
      (projectId ? `${location.origin}/g/${projectId}/c/${id}` : `${location.origin}/c/${id}`);

    return {
      id,
      title,
      create_time: createTime,
      update_time: updateTime,
      project_id: projectId,
      project_name: projectName,
      url
    };
  }

  function buildConversationBasePath(meta) {
    const time = meta.update_time || meta.create_time || "";
    const date = time ? time.slice(0, 10) : "unknown-date";
    const title = sanitizePathSegment(meta.title || "untitled").slice(0, 90) || "untitled";
    const id = sanitizePathSegment(meta.id || "unknown").slice(0, 36);
    const filename = `${date} - ${title} - ${id}`;
    if (meta.project_id) {
      const projectName = sanitizePathSegment(meta.project_name || meta.project_id).slice(0, 80) || meta.project_id;
      return `Projects/${projectName} (${sanitizePathSegment(meta.project_id)})/${filename}`;
    }
    return `No Project/${filename}`;
  }

  function conversationToMarkdown(detail, meta) {
    const lines = [];
    lines.push(`# ${escapeMarkdown(meta.title || meta.id)}`);
    lines.push("");
    lines.push(`- Conversation ID: ${meta.id}`);
    lines.push(`- URL: ${meta.url}`);
    if (meta.project_id) {
      lines.push(`- Project: ${meta.project_name || meta.project_id} (${meta.project_id})`);
    } else {
      lines.push("- Project: No Project");
    }
    if (meta.create_time) {
      lines.push(`- Created: ${meta.create_time}`);
    }
    if (meta.update_time) {
      lines.push(`- Updated: ${meta.update_time}`);
    }
    lines.push("");

    const { nodes, currentPath } = getMessageNodes(detail);
    if (nodes.length === 0) {
      lines.push("_No message nodes found in this conversation payload._");
      lines.push("");
      return lines.join("\n");
    }

    for (const node of nodes) {
      const message = node.message;
      const role = message.author && message.author.role ? message.author.role : "unknown";
      const name = message.author && message.author.name ? `:${message.author.name}` : "";
      const created = normalizeTimestamp(message.create_time || message.createTime);
      const marker = currentPath.has(node.id) ? "current path" : "branch";
      lines.push(`## ${escapeMarkdown(role + name)} · ${marker}`);
      lines.push("");
      lines.push(`- Node ID: ${node.id}`);
      if (node.parent) {
        lines.push(`- Parent: ${node.parent}`);
      }
      if (created) {
        lines.push(`- Time: ${created}`);
      }
      const model = message.metadata && (message.metadata.model_slug || message.metadata.model);
      if (model) {
        lines.push(`- Model: ${model}`);
      }
      lines.push("");
      lines.push(renderMessageContent(message.content));
      lines.push("");
    }

    return lines.join("\n");
  }

  function getMessageNodes(detail) {
    const mapping = detail && detail.mapping && typeof detail.mapping === "object" ? detail.mapping : {};
    const currentPath = new Set();
    let nodeId = detail.current_node || detail.currentNode || null;
    let guard = 0;
    while (nodeId && mapping[nodeId] && guard < 20000) {
      currentPath.add(nodeId);
      nodeId = mapping[nodeId].parent || null;
      guard += 1;
    }

    const nodes = Object.entries(mapping)
      .map(([id, node]) => ({ id, ...node }))
      .filter((node) => node.message)
      .sort((left, right) => {
        const leftTime = Number(left.message.create_time || left.message.createTime || 0);
        const rightTime = Number(right.message.create_time || right.message.createTime || 0);
        if (leftTime !== rightTime) {
          return leftTime - rightTime;
        }
        return String(left.id).localeCompare(String(right.id));
      });
    return { nodes, currentPath };
  }

  function renderMessageContent(content) {
    if (!content || typeof content !== "object") {
      return "_No content_";
    }
    const type = content.content_type || content.type || "unknown";
    const parts = Array.isArray(content.parts) ? content.parts : null;
    if (parts && parts.length > 0) {
      return parts.map((part) => renderPart(part)).join("\n\n");
    }
    if (typeof content.text === "string") {
      return content.text;
    }
    if (typeof content.result === "string") {
      return fenced(content.result, "");
    }
    return `Content type: ${type}\n\n${fenced(JSON.stringify(content, null, 2), "json")}`;
  }

  function renderPart(part) {
    if (typeof part === "string") {
      return part;
    }
    if (part && typeof part === "object") {
      if (typeof part.text === "string") {
        return part.text;
      }
      if (typeof part.content === "string") {
        return part.content;
      }
      return fenced(JSON.stringify(part, null, 2), "json");
    }
    return String(part);
  }

  function normalizeConversationList(payload) {
    if (Array.isArray(payload)) {
      return payload;
    }
    if (!payload || typeof payload !== "object") {
      return [];
    }
    if (payload.list && typeof payload.list === "object") {
      const nested = normalizeConversationList(payload.list);
      if (nested.length > 0) {
        return nested;
      }
    }
    for (const key of ["items", "conversations", "data", "results"]) {
      if (Array.isArray(payload[key])) {
        return payload[key];
      }
    }
    return [];
  }

  function getNextCursor(payload) {
    if (!payload || typeof payload !== "object") {
      return null;
    }
    return (
      payload.cursor ||
      payload.next_cursor ||
      payload.nextCursor ||
      (payload.list && (payload.list.cursor || payload.list.next_cursor || payload.list.nextCursor)) ||
      null
    );
  }

  function getConversationId(value) {
    if (!value || typeof value !== "object") {
      return null;
    }
    return (
      value.id ||
      value.conversation_id ||
      value.conversationId ||
      value.conversation?.id ||
      value.conversation?.conversation_id ||
      value.conversation?.conversationId ||
      null
    );
  }

  function getConversationTitle(value) {
    if (!value || typeof value !== "object") {
      return null;
    }
    return cleanText(value.title || value.name || value.conversation_title || value.conversation?.title || value.conversation?.name || "");
  }

  function getItemProjectId(value) {
    if (!value || typeof value !== "object") {
      return null;
    }
    return (
      normalizeProjectId(value.export_hint?.project_id) ||
      normalizeProjectId(value.project_id) ||
      normalizeProjectId(value.projectId) ||
      normalizeProjectId(value.gizmo_id) ||
      normalizeProjectId(value.gizmoId) ||
      normalizeProjectId(value.conversation?.project_id) ||
      normalizeProjectId(value.conversation?.projectId) ||
      normalizeProjectId(value.conversation?.gizmo_id) ||
      normalizeProjectId(value.conversation?.gizmoId) ||
      null
    );
  }

  function findProjectId(value, depth = 0, seen = new Set()) {
    if (!value || depth > 8) {
      return null;
    }
    if (typeof value === "string") {
      return normalizeProjectId(value);
    }
    if (typeof value !== "object" || seen.has(value)) {
      return null;
    }
    seen.add(value);
    for (const [key, child] of Object.entries(value)) {
      if (/^(gizmo_id|gizmoId|project_id|projectId)$/i.test(key)) {
        const id = normalizeProjectId(child);
        if (id) {
          return id;
        }
      }
    }
    for (const child of Object.values(value)) {
      const id = findProjectId(child, depth + 1, seen);
      if (id) {
        return id;
      }
    }
    return null;
  }

  function findProjectName(value, projectId, depth = 0, seen = new Set()) {
    if (!projectId || !value || typeof value !== "object" || depth > 8 || seen.has(value)) {
      return null;
    }
    seen.add(value);
    const maybeId = normalizeProjectId(value.id) || normalizeProjectId(value.gizmo_id) || normalizeProjectId(value.project_id);
    if (maybeId === projectId) {
      const display = value.display && typeof value.display === "object" ? value.display : null;
      return cleanText(value.name || value.title || value.display_name || (display && (display.name || display.title)) || "");
    }
    for (const child of Object.values(value)) {
      const name = findProjectName(child, projectId, depth + 1, seen);
      if (name) {
        return name;
      }
    }
    return null;
  }

  function scanProjectObjects(value, depth = 0, seen = new Set(), results = new Map()) {
    if (!value || typeof value !== "object" || depth > 8 || seen.has(value)) {
      return results.values();
    }
    seen.add(value);
    if (!Array.isArray(value)) {
      const id =
        normalizeProjectId(value.id) ||
        normalizeProjectId(value.gizmo_id) ||
        normalizeProjectId(value.gizmoId) ||
        normalizeProjectId(value.project_id) ||
        normalizeProjectId(value.projectId);
      if (id && !results.has(id)) {
        const display = value.display && typeof value.display === "object" ? value.display : null;
        const name = cleanText(value.name || value.title || value.display_name || (display && (display.name || display.title)) || id);
        results.set(id, { id, name });
      }
    }
    for (const child of Object.values(value)) {
      scanProjectObjects(child, depth + 1, seen, results);
    }
    return results.values();
  }

  function normalizeProjectId(value) {
    if (typeof value !== "string") {
      return null;
    }
    const match = value.match(/\b(g-p-[A-Za-z0-9]+)\b/);
    return match ? match[1] : null;
  }

  function extractProjectName(text, aria, fallback) {
    if (text) {
      return text;
    }
    const quoted = aria.match(/打开[“"](.+?)[”"]项目/);
    if (quoted) {
      return quoted[1];
    }
    const plain = aria.match(/打开\s+(.+?)\s+的项目选项/);
    if (plain) {
      return plain[1];
    }
    return fallback;
  }

  function extractTitleFromAria(aria) {
    if (!aria) {
      return "";
    }
    const projectTitle = aria.match(/^(.+?)\s+—\s+项目\s+.+?\s+中的聊天/);
    if (projectTitle) {
      return projectTitle[1];
    }
    const optionTitle = aria.match(/打开[“"](.+?)[”"]的对话选项/);
    if (optionTitle) {
      return optionTitle[1];
    }
    return aria.replace(/（未读）/g, "");
  }

  function buildReadme() {
    return [
      "ChatGPT Workspace Exporter",
      "",
      "This export was created from the signed-in ChatGPT web app.",
      "",
      "Files:",
      "- index.json: export manifest and conversation file paths.",
      "- Projects/: conversations whose payload or sidebar URL indicates a project id.",
      "- No Project/: conversations without a detected project id.",
      "- *.json: raw response payload from ChatGPT conversation detail API.",
      "- *.md: readable Markdown rendering of message nodes.",
      "",
      "Note: Markdown is a readable view. Raw JSON is the most complete copy."
    ].join("\n");
  }

  function getChatGptRequestHeaders(path) {
    return {
      ...getChatGptAuthHeader(),
      ...getChatGptAccountHeader(),
      ...getChatGptClientHeaders(),
      ...getOpenAiTargetHeaders(path)
    };
  }

  function getChatGptAuthHeader() {
    const token = getAccessTokenFromBootstrap();
    if (!token) {
      return {};
    }
    return {
      Authorization: `Bearer ${token}`
    };
  }

  function getChatGptAccountHeader() {
    const accountId = getWorkspaceAccountId();
    if (!accountId || accountId === "personal") {
      return {};
    }
    return {
      "ChatGPT-Account-ID": encodeURIComponent(accountId)
    };
  }

  function getChatGptClientHeaders() {
    const headers = {};
    const bootstrap = getClientBootstrap();
    const deviceId = getCookieValue("oai-did");
    const sessionId = bootstrap?.sessionId;
    const buildNumber = document.documentElement.getAttribute("data-seq");
    const clientVersion = document.documentElement.getAttribute("data-build");
    const language = document.documentElement.lang || navigator.language;
    if (language) {
      headers["OAI-Language"] = language;
    }
    if (deviceId) {
      headers["OAI-Device-Id"] = deviceId;
    }
    if (sessionId) {
      headers["OAI-Session-Id"] = sessionId;
    }
    if (buildNumber) {
      headers["OAI-Client-Build-Number"] = buildNumber;
    }
    if (clientVersion) {
      headers["OAI-Client-Version"] = clientVersion;
    }
    return headers;
  }

  function getOpenAiTargetHeaders(path) {
    const url = new URL(path, location.origin);
    return {
      "X-OpenAI-Target-Path": url.pathname,
      "X-OpenAI-Target-Route": inferTargetRoute(url.pathname)
    };
  }

  function inferTargetRoute(pathname) {
    if (/^\/backend-api\/conversation\/[^/]+$/.test(pathname)) {
      return "/backend-api/conversation/{conversation_id}";
    }
    if (/^\/backend-api\/conversation\/[^/]+\/stream_status$/.test(pathname)) {
      return "/backend-api/conversation/{conversation_id}/stream_status";
    }
    if (/^\/backend-api\/gizmos\/[^/]+\/conversations$/.test(pathname)) {
      return "/backend-api/gizmos/{gizmo_id}/conversations";
    }
    return pathname;
  }

  function describeRequestHeaderState() {
    const accountId = getWorkspaceAccountId();
    const hasAccessToken = !!getAccessTokenFromBootstrap();
    const pieces = [];
    if (!accountId || accountId === "personal") {
      pieces.push("未检测到工作区账号请求头");
    } else {
      pieces.push(`已检测到工作区账号请求头：${maskId(accountId)}`);
    }
    pieces.push(hasAccessToken ? "已检测到授权头" : "未检测到授权头");
    return pieces.join("；");
  }

  function getAccessTokenFromBootstrap() {
    const token = getClientBootstrap()?.session?.accessToken;
    return typeof token === "string" && token.length > 0 ? token : null;
  }

  function getClientBootstrap() {
    if (state.clientBootstrap !== undefined) {
      return state.clientBootstrap;
    }
    const raw = document.getElementById("client-bootstrap")?.textContent;
    if (!raw) {
      state.clientBootstrap = null;
      return state.clientBootstrap;
    }
    try {
      state.clientBootstrap = JSON.parse(raw);
    } catch {
      state.clientBootstrap = null;
    }
    return state.clientBootstrap;
  }

  function getWorkspaceAccountId() {
    const cookieAccount = getCookieValue("_account");
    if (cookieAccount) {
      return cookieAccount;
    }
    return getWorkspaceAccountIdFromBootstrap();
  }

  function getWorkspaceAccountIdFromBootstrap() {
    const bootstrap = getClientBootstrap();
    const account =
      bootstrap?.currentAccount ||
      bootstrap?.user?.currentAccount ||
      bootstrap?.session?.account ||
      bootstrap?.account ||
      null;
    const accountId =
      account?.id ||
      bootstrap?.currentAccountId ||
      bootstrap?.user?.currentAccountId ||
      bootstrap?.session?.account?.id ||
      null;
    const structure = String(account?.structure || "").toLowerCase();
    if (accountId && (!structure || structure === "workspace")) {
      return accountId;
    }
    return null;
  }

  function maskId(value) {
    const text = String(value || "");
    if (text.length <= 10) {
      return `${text.slice(0, 2)}...`;
    }
    return `${text.slice(0, 6)}...${text.slice(-4)}`;
  }

  function getCookieValue(name) {
    const prefix = `${name}=`;
    const parts = document.cookie ? document.cookie.split(";") : [];
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.startsWith(prefix)) {
        return decodeURIComponent(trimmed.slice(prefix.length));
      }
    }
    return null;
  }

  function finishWithError(error) {
    state.running = false;
    state.abortController = null;
    if (state.startButton) {
      state.startButton.disabled = false;
    }
    if (state.cancelButton) {
      state.cancelButton.disabled = true;
    }
    const message = String(error && error.message ? error.message : error);
    updateSummary(`出错：${message}`);
    logLine(`ERROR ${message}`);
  }

  function logLine(message) {
    if (!state.log) {
      return;
    }
    const timestamp = new Date().toLocaleTimeString();
    state.log.textContent += `[${timestamp}] ${message}\n`;
    state.log.scrollTop = state.log.scrollHeight;
  }

  function updateSummary(message) {
    if (state.summary) {
      state.summary.textContent = message;
    }
  }

  function safeRelativePath(path) {
    return String(path)
      .replace(/\\/g, "/")
      .replace(/^\/+/, "")
      .split("/")
      .filter((part) => part && part !== "." && part !== "..")
      .map(sanitizePathSegment)
      .join("/");
  }

  function sanitizePathSegment(segment) {
    return String(segment || "")
      .normalize("NFKC")
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
      .replace(/\s+/g, " ")
      .replace(/[. ]+$/g, "")
      .trim()
      .slice(0, 120);
  }

  function cleanText(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }

  function normalizeTimestamp(value) {
    if (value === null || value === undefined || value === "") {
      return null;
    }
    if (typeof value === "number") {
      const millis = value > 100000000000 ? value : value * 1000;
      return new Date(millis).toISOString();
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
  }

  function formatStamp(date) {
    const pad = (value) => String(value).padStart(2, "0");
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  }

  function clampNumber(value, min, max, fallback) {
    if (!Number.isFinite(value)) {
      return fallback;
    }
    return Math.min(max, Math.max(min, value));
  }

  function pickNumber(...values) {
    for (const value of values) {
      const number = Number(value);
      if (Number.isFinite(number)) {
        return number;
      }
    }
    return null;
  }

  function sleep(ms, signal) {
    return new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      const timer = window.setTimeout(resolve, ms);
      signal.addEventListener(
        "abort",
        () => {
          window.clearTimeout(timer);
          reject(new DOMException("Aborted", "AbortError"));
        },
        { once: true }
      );
    });
  }

  function throwIfAborted(signal) {
    if (signal.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
  }

  function escapeMarkdown(text) {
    return String(text || "").replace(/([\\`*_{}[\]()#+.!|-])/g, "\\$1");
  }

  function fenced(text, language) {
    const fence = String(text).includes("```") ? "````" : "```";
    return `${fence}${language || ""}\n${text}\n${fence}`;
  }
})();
