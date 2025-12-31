import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './pwa'
import App from './App.tsx'
import { FocusSessionProvider } from './state/FocusSessionContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <FocusSessionProvider>
        <App />
      </FocusSessionProvider>
    </BrowserRouter>
  </StrictMode>,
)
