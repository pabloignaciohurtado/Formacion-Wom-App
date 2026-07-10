import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Solo el subset latin. El paquete completo arrastra devanagari y latin-ext
// (534 KB y 75 KB) que esta app, enteramente en español, nunca renderiza.
// El subset latin cubre á é í ó ú ü ñ ¿ ¡ y el punto medio ·.
import '@fontsource/poppins/latin-400.css'
import '@fontsource/poppins/latin-500.css'
import '@fontsource/poppins/latin-600.css'
import '@fontsource/poppins/latin-700.css'
import '@fontsource/poppins/latin-800.css'
import '@fontsource/poppins/latin-900.css'
import './index.css'
import App from './App.tsx'

// Tema: preferencia guardada o la del sistema
const tema = window.localStorage.getItem('tema')
if (
  tema === 'oscuro' ||
  (!tema && window.matchMedia('(prefers-color-scheme: dark)').matches)
) {
  document.documentElement.classList.add('dark')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
