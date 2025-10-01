import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { Buffer } from 'buffer';
import process from 'process';

// Make Buffer available globally
if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
}

// Make process available globally for environment variables
if (typeof window !== 'undefined') {
  window.process = process;
}


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
