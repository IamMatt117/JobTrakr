import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import SignIn from './components/SignIn';
import SignUp from './components/SignUp';
import JobScraper from './components/JobScraper';
import './App.css';

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route
              path="/jobscraper"
              element={
                <ProtectedRoute>
                  <JobScraper />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/jobscraper" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App; 