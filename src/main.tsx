import React from 'react'
import ReactDOM from 'react-dom/client'
import { HotkeysProvider } from 'use-kbd'
import 'bootstrap/dist/css/bootstrap.css'
import 'react-resizable/css/styles.css'
import 'use-kbd/styles.css'
import './theme.scss'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HotkeysProvider config={{ storageKey: 'apvd-kbd' }}>
      <App />
    </HotkeysProvider>
  </React.StrictMode>,
)
