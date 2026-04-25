import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { WalletProvider } from './WalletContent';
import { WebSocketProvider } from './context/WebSocketContext';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <WebSocketProvider>
          <AuthProvider>
            <WalletProvider>
              <App />
            </WalletProvider>
          </AuthProvider>
        </WebSocketProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA
serviceWorkerRegistration.register();
