import React from 'react';
import ReactDOM from 'react-dom/client';
import { SmartBinProvider } from './context/SmartBinContext';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SmartBinProvider>
      <App />
    </SmartBinProvider>
  </React.StrictMode>,
);
