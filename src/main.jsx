import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'
import { CurrencyProvider } from './context/CurrencyContext'
import { BalancesProvider } from './context/BalancesContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CurrencyProvider>
      <BalancesProvider>
        <App />
        <Toaster />
      </BalancesProvider>
    </CurrencyProvider>
  </StrictMode>,
)