import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './pwa'
import App from './App.tsx'
import { FocusSessionProvider } from './state/FocusSessionContext.tsx'
import { DurationFormatProvider } from './state/DurationFormatContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <DurationFormatProvider>
        <FocusSessionProvider>
          <App />
        </FocusSessionProvider>
      </DurationFormatProvider>
    </BrowserRouter>
  </StrictMode>,
)
