import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from './FormParts';

/**
 * CheckingScreen
 * Shown while the server is being asked whether the session is still valid.
 */
export const CheckingScreen = () => (
  <div className="checking" role="status" aria-live="polite">
    <span className="checking__badge">
      <Spinner large />
    </span>
    <span className="eyebrow">Protected route</span>
    <span className="checking__text">Checking your session…</span>
  </div>
);

/**
 * ProtectedRoute Component
 * Protects routes that require authentication
 *
 * Behavior:
 * - While auth is loading: Show the checking screen
 * - If authenticated: Render the component
 * - If not authenticated: Redirect to login
 *
 * This only decides what to show. The real protection is on the server,
 * which refuses the profile request without a valid token.
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <CheckingScreen />;
  }

  // If not authenticated, redirect to login and say why
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: 'protected' }} />;
  }

  // If authenticated, render the protected component
  return children;
};

export default ProtectedRoute;
