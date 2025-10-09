const { app, BrowserWindow, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const url = require('url');
const isDev = !app.isPackaged;

let mainWindow = null;

function registerLocalResourceProtocol() {
  protocol.interceptFileProtocol('file', (request, callback) => {
    const requestUrl = request.url;
    
    // 解析 URL
    let filePath = requestUrl.replace('file:///', '');
    filePath = decodeURIComponent(filePath);
    
    // Windows 路径修正：移除多余的斜杠
    if (process.platform === 'win32') {
      filePath = filePath.replace(/^\/([A-Za-z]:)/, '$1');
    }
    
    // 如果路径包含 /_next/ 或 /lab-logo.png，重定向到 ASAR 中的位置
    if (filePath.includes('/_next/')) {
      const relativePath = filePath.substring(filePath.indexOf('/_next/') + 1);
      filePath = path.join(__dirname, 'out', relativePath);
    } else if (filePath.endsWith('/lab-logo.png')) {
      filePath = path.join(__dirname, 'out', 'lab-logo.png');
    }
    
    callback({ path: path.normalize(filePath) });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'public', 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      allowRunningInsecureContent: false,
    },
    show: false,
    backgroundColor: '#ffffff',
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    // 直接加载 ASAR 中的 index.html，但通过自定义协议处理资源
    const indexPath = path.join(__dirname, 'out', 'index.html');
    mainWindow.loadFile(indexPath);
  }

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // 必须在创建窗口之前注册协议
  if (!isDev) {
    registerLocalResourceProtocol();
  }
  
  createWindow();
  
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});