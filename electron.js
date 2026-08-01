const { app, BrowserWindow } = require('electron')
const fs = require('fs')
const http = require('http')
const net = require('net')
const path = require('path')

const isDev = !app.isPackaged

let mainWindow = null
let nextServerUrl = null
let migrationSyncTimer = null
let lastMigrationValues = null

const MIGRATION_STORAGE_KEYS = [
  'piecesHistory',
  'trackSizes',
  'hiddenFixedSizes',
  'trackArchives',
  'currentTrackProject',
  'trackDesignerTheme',
]

function getMigrationStatePath() {
  return path.join(app.getPath('appData'), 'asc-track-designer', 'migration-state-v1.json')
}

function writeMigrationState(values) {
  const serializedValues = JSON.stringify(values)
  if (serializedValues === lastMigrationValues) return

  const destination = getMigrationStatePath()
  const temporary = `${destination}.${process.pid}.tmp`
  fs.mkdirSync(path.dirname(destination), { recursive: true })
  fs.writeFileSync(temporary, JSON.stringify({
    version: 1,
    source: 'electron',
    exportedAt: new Date().toISOString(),
    values,
  }, null, 2), 'utf8')
  fs.renameSync(temporary, destination)
  lastMigrationValues = serializedValues
}

async function syncMigrationState() {
  if (!mainWindow || mainWindow.isDestroyed()) return

  try {
    const values = await mainWindow.webContents.executeJavaScript(`(() => {
      const exactKeys = new Set(${JSON.stringify(MIGRATION_STORAGE_KEYS)})
      const keys = []
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index)
        if (key && (exactKeys.has(key) || key.startsWith('archive_'))) keys.push(key)
      }
      keys.sort()
      return Object.fromEntries(keys.map((key) => [key, localStorage.getItem(key)]))
    })()`)
    writeMigrationState(values)
  } catch (error) {
    console.error('Failed to sync migration state:', error)
  }
}

function startMigrationStateSync() {
  if (migrationSyncTimer) clearInterval(migrationSyncTimer)
  syncMigrationState()
  migrationSyncTimer = setInterval(syncMigrationState, 1000)
  migrationSyncTimer.unref()
}

function stopMigrationStateSync() {
  if (!migrationSyncTimer) return
  clearInterval(migrationSyncTimer)
  migrationSyncTimer = null
}

function getAvailablePort(startPort) {
  return new Promise((resolve, reject) => {
    const server = net.createServer()

    server.unref()
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        getAvailablePort(startPort + 1).then(resolve, reject)
      } else {
        reject(error)
      }
    })
    server.listen(startPort, '127.0.0.1', () => {
      const address = server.address()
      server.close(() => resolve(address.port))
    })
  })
}

function waitForServer(url) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now()
    const timeoutMs = 30000

    const check = () => {
      const request = http.get(url, (response) => {
        response.resume()
        resolve()
      })

      request.on('error', () => {
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`Timed out waiting for ${url}`))
        } else {
          setTimeout(check, 300)
        }
      })

      request.setTimeout(2000, () => {
        request.destroy()
      })
    }

    check()
  })
}

async function startNextServer() {
  const port = await getAvailablePort(3100)
  const serverDir = app.isPackaged
    ? path.join(process.resourcesPath, 'standalone')
    : path.join(__dirname, '.next', 'standalone')
  const serverPath = path.join(serverDir, 'server.js')

  process.env.HOSTNAME = '127.0.0.1'
  process.env.NODE_ENV = 'production'
  process.env.PORT = String(port)
  nextServerUrl = `http://127.0.0.1:${port}`

  require(serverPath)
  await waitForServer(nextServerUrl)
}

async function createWindow() {
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
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  await mainWindow.loadURL(isDev ? 'http://localhost:3000' : nextServerUrl)
  startMigrationStateSync()

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription)
  })

  mainWindow.on('closed', () => {
    stopMigrationStateSync()
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  if (!isDev) {
    await startNextServer()
  }

  await createWindow()

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow()
    }
  })
}).catch((error) => {
  console.error(error)
  app.quit()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
