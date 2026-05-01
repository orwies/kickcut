/**
 * Entry point for the React application.
 * Receives no arguments as it is the top-level script.
 * Grabs the root DOM element and renders the App component wrapped in StrictMode.
 * Returns nothing.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
