import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import SignIn from './components/SignIn';
import SignUp from './components/SignUp';
import JobScraper from './components/JobScraper';
import SavedJobs from './components/SavedJobs';
import Navbar from './components/Navbar';
import { SnackbarProvider } from 'notistack';
import './App.css';

const App = () => {
  return (
    <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
      <AuthProvider>
        <Router>
          <div className="App">
            <Navbar />
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
              <Route
                path="/saved-jobs"
                element={
                  <ProtectedRoute>
                    <SavedJobs />
                  </ProtectedRoute>
                }
              />
              <Route path="/" element={<Navigate to="/jobscraper" replace />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </SnackbarProvider>
  );
};

export default App; 