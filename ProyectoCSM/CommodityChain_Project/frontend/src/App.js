import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import DashboardPage from './DashboardPage';
import BatchDetailPage from './BatchDetailPage';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => sessionStorage.getItem('isAuthenticated') === 'true');

  const handleLogin = (username) => {
    sessionStorage.setItem('isAuthenticated', 'true');
    sessionStorage.setItem('authUsername', username);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('isAuthenticated');
    sessionStorage.removeItem('authUsername');
    setIsAuthenticated(false);
  };

  const ProtectedRoute = ({ children }) => {
    return isAuthenticated ? children : <Navigate to="/" replace />;
  };

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login onLogin={handleLogin} />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage onLogout={handleLogout} /></ProtectedRoute>} />
          <Route path="/batch/:id" element={<ProtectedRoute><BatchDetailPage onLogout={handleLogout} /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/'} replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;