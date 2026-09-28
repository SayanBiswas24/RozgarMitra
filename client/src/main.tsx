import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// StrictMode removed: it double-fires effects and callbacks,
// which causes duplicate mic recordings, duplicate API calls,
// and duplicate chat messages in development.
createRoot(document.getElementById('root')!).render(
  <App />,
)
