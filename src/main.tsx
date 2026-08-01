import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import './app/globals.css'
import { importLegacyDesktopState } from './shared/storage/importLegacyDesktopState'

const root = document.getElementById('root')

if (!root) throw new Error('Root element not found')

async function bootstrap() {
  try {
    await importLegacyDesktopState()
  } catch (error) {
    console.error('Failed to import legacy desktop state:', error)
  }

  ReactDOM.createRoot(root!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

bootstrap()
