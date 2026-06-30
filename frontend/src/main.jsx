import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import './index.css'
import App from './App.jsx'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  console.warn("VITE_CLERK_PUBLISHABLE_KEY is not defined. Using a placeholder key for local development to prevent crashes.");
}

const clerkKey = PUBLISHABLE_KEY || 'pk_test_YWN0aXZlLW1hcm1vc2V0LTkxLmNsZXJrLmFjY291bnRzLmRldiQ';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ClerkProvider publishableKey={clerkKey}>
        <App />
      </ClerkProvider>
    </BrowserRouter>
  </StrictMode>,
)
