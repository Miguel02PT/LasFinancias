import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'
import { CurrencyProvider } from './context/CurrencyContext'
import { BalancesProvider } from './context/BalancesContext'
import { SavingsRulesProvider } from './context/SavingsRulesContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CurrencyProvider>
      <BalancesProvider>
        <SavingsRulesProvider>
          <App />
          <Toaster />
        </SavingsRulesProvider>
      </BalancesProvider>
    </CurrencyProvider>
  </StrictMode>,
)