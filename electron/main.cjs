/* eslint-disable @typescript-eslint/no-require-imports */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { app, BrowserWindow, dialog, shell } = require('electron');

function getApplicationUrl() {
  let configuredUrl = process.env.FARMASTUDY_APP_URL;

  if (!configuredUrl) {
    const configName = app.isPackaged
      ? 'app-config.json'
      : 'app-config.example.json';
    const configPath = path.join(__dirname, configName);
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    configuredUrl = config.appUrl;
  }

  const url = new URL(configuredUrl);
  const isLoopback =
    url.hostname === 'localhost' || url.hostname === '127.0.0.1';

  if (
    url.protocol !== 'https:' &&
    !(url.protocol === 'http:' && isLoopback)
  ) {
    throw new Error('FARMASTUDY_APP_URL deve usar HTTPS (ou localhost em desenvolvimento).');
  }

  if (app.isPackaged && isLoopback) {
    throw new Error('Configure uma URL HTTPS hospedada antes de empacotar o aplicativo.');
  }

  return url;
}

function openExternalUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' || url.protocol === 'http:') {
      void shell.openExternal(url.href);
    }
  } catch {
    // Ignore malformed navigation targets.
  }
}

async function createWindow() {
  let appUrl;
  try {
    appUrl = getApplicationUrl();
  } catch (error) {
    dialog.showErrorBox(
      'Configuração do FarmaStudy AI',
      error instanceof Error ? error.message : 'URL da aplicação inválida.',
    );
    app.quit();
    return;
  }

  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 800,
    minHeight: 600,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openExternalUrl(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, destination) => {
    if (new URL(destination).origin !== appUrl.origin) {
      event.preventDefault();
      openExternalUrl(destination);
    }
  });

  try {
    await mainWindow.loadURL(appUrl.href);
  } catch (error) {
    dialog.showErrorBox(
      'Não foi possível abrir o FarmaStudy AI',
      error instanceof Error ? error.message : 'Verifique a URL e a ligação à internet.',
    );
  }
}

app.whenReady().then(() => {
  void createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
