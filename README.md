# ChatGPT Workspace Exporter

一个本地 Chrome / Edge 扩展，用已登录的 `chatgpt.com` 页面导出当前账号可访问的 ChatGPT 对话。它面向 Business / Workspace 里无法一次性官方导出的情况。

> Unofficial project. This extension uses ChatGPT web app internals that may change without notice.

## 能导出什么

- 全局对话列表：分页读取 `/backend-api/conversations`。
- 项目内对话：发现 `g-p-...` 项目后，分页读取 `/backend-api/gizmos/{gizmo_id}/conversations`。
- 单条完整详情：逐条读取 `/backend-api/conversation/{conversation_id}`。
- 输出格式：每条对话的 raw JSON 和可读 Markdown。
- 目录：`Projects/<项目名 (项目ID)>/` 与 `No Project/`。

Raw JSON 是最完整的数据副本；Markdown 方便搜索和人工阅读。

## 安装

### 从源码安装

1. 打开 Chrome 的 `chrome://extensions`。
2. 开启右上角「开发者模式」。
3. 点击「加载已解压的扩展程序」。
4. 选择本仓库根目录。

### 打包

```bash
npm run check
npm run package
```

打包后的扩展 zip 会生成在 `dist/chatgpt-workspace-exporter.zip`。

## 使用

1. 在 Chrome 打开并登录 `https://chatgpt.com/`，切到需要导出的工作区。
2. 点击扩展图标，选择「显示导出面板」。
3. 回到 ChatGPT 页面右下角的导出面板。
4. 点击「选择文件夹并开始」。
5. 选择一个本地目录，等待导出完成。

如果当前 Chrome 不支持目录写入，扩展会退回到浏览器下载模式。

## 注意

- 导出依赖 ChatGPT 网页当前使用的内部接口；如果 ChatGPT 改版，可能需要更新接口适配。
- 扩展不会读取 localStorage、密码或浏览器配置文件。
- 扩展会读取当前页面的 `_account` 和 `oai-did` cookie，以及 `client-bootstrap.session.accessToken`，用于生成和 ChatGPT 前端一致的请求头。
- 授权令牌只在内存中用于本次请求，不会写入导出文件或日志。
- 请求间隔默认 250ms；如果遇到限流，可以把间隔调大。
- Business 工作区的数据权限仍由当前登录账号决定，账号看不到的对话不会被导出。

## License

MIT
