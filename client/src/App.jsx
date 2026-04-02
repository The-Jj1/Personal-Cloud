import React, { useState, useEffect } from 'react';
import axios from 'axios';
import FileManager from './components/FileManager';
import Auth from './components/Auth';
import LandingPage from './components/LandingPage';

function App() {
  const [token, setToken] = useState(() => {
    const saved = localStorage.getItem('token');
    if (saved && saved !== 'null' && saved !== 'undefined') {
      axios.defaults.headers.common['Authorization'] = `Bearer ${saved}`;
      return saved;
    }
    return null;
  });
  const [username, setUsername] = useState(localStorage.getItem('username'));
  const [role, setRole] = useState(localStorage.getItem('role'));
  const [userId, setUserId] = useState(localStorage.getItem('userId'));
  const [showAuth, setShowAuth] = useState(false);

  // Global Theme Management
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('accentColor') || 'blue');

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('accentColor', accentColor);
    document.documentElement.setAttribute('data-theme', accentColor);
  }, [accentColor]);

  // Global Axios handling for 401 errors
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          setToken(null);
          setUsername(null);
          setRole(null);
          setUserId(null);
        }
        return Promise.reject(error);
      }
    );

    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
      localStorage.setItem('username', username);
      localStorage.setItem('role', role);
      localStorage.setItem('userId', userId);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('role');
      localStorage.removeItem('userId');
    }

    return () => axios.interceptors.response.eject(interceptor);
  }, [token, username, role, userId]);

  const handleLogin = (newToken, newId, newUser, newRole) => {
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUserId(newId);
    setUsername(newUser);
    setRole(newRole);
  };

  const handleLogout = () => {
    setToken(null);
    setUserId(null);
    setUsername(null);
    setRole(null);
  };

  if (!token) {
    if (!showAuth) {
      return <LandingPage onGetStarted={() => setShowAuth(true)} />;
    }
    return <Auth onLogin={handleLogin} onBack={() => setShowAuth(false)} />;
  }

  return (
    <FileManager 
      userRole={role} 
      onLogout={handleLogout} 
      theme={theme} 
      setTheme={setTheme} 
      accentColor={accentColor} 
      setAccentColor={setAccentColor} 
    />
  );
}

export default App;
