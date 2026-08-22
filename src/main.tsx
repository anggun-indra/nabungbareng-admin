import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { registerAdminServiceWorker } from './utils/pwaUpdater'

// Register Service Worker for Desktop PWA & Caching
registerAdminServiceWorker()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
