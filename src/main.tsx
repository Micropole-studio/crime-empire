import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './world-v16-live.css' // V16 : affichage normal du Monde
import App from './App.tsx'


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
