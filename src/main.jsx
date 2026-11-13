import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './admin.css';
import './admin-orders.css';
import './admin-products.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
