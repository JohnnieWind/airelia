const { app, BrowserWindow, shell } = require("electron");
const path = require("node:path");

// 开发环境由 Vite dev server 提供页面；生产环境加载已经构建出的静态文件。
const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
// 后端 API 地址允许外部覆盖，默认连接本机 Spring Boot 服务。
const apiUrl = process.env.AIRELIA_API_URL ?? "http://localhost:8080";

function createWindow() {
  // 创建主窗口，并通过 preload 暴露少量安全的桌面能力给前端。
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: "Airelia",
    backgroundColor: "#0f172a",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  // 所有新窗口请求都交给系统浏览器打开，避免在桌面壳内加载外部页面。
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // 开发时连接热更新页面；打包后直接读取前端构建产物。
  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "packages", "web", "dist", "index.html"));
  }
}

app.whenReady().then(() => {
  // preload 脚本从进程环境读取 API 地址，因此在窗口创建前统一写回。
  process.env.AIRELIA_API_URL = apiUrl;
  createWindow();

  // macOS 上点击 Dock 图标时，如果没有窗口则重新创建一个。
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  // macOS 习惯保留应用进程，其它平台关闭最后一个窗口时退出应用。
  if (process.platform !== "darwin") {
    app.quit();
  }
});
