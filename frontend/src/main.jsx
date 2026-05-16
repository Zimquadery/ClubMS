import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import './index.css'
import App from './App.jsx'

document.documentElement.style.setProperty(
  '--brand-primary',
  import.meta.env.VITE_PRIMARY_BRAND_COLOR || '#1E40AF'
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
