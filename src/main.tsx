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
import { ErrorBoundary } from './components/ErrorBoundary'
import { aplicarTema, leerTema } from './lib/tema'

// Tema: se aplica antes de montar React para que no haya un destello claro
// en quien tiene el modo oscuro elegido.
aplicarTema(leerTema())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
