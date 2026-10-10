import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi } from '../services/authApi';

const TOKEN_KEY = 'authToken';

// How often an open page asks the server whether the session is still valid.
const SESSION_CHECK_MS = 60 * 1000;

/**
 * Auth Context
 * Manages global authentication state including current user, loading states, and auth operations
 */
const AuthContext = createContext();

/**
 * Auth Provider Component
 * Wraps the application and provides authentication state and methods
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  // True only while the stored token is being checked when the app starts.
  const [loading, setLoading] = useState(true);
  // Name of a banner (see content/copy.js) for the login page to show once,
  // for example "expired" or "loggedOut".
  const [notice, setNotice] = useState(null);

  /**
   * Forget the session in this browser
   */
  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  /**
   * End the session because the token is no longer accepted
   */
  const expireSession = useCallback(() => {
    clearSession();
    setNotice('expired');
  }, [clearSession]);

  /**
   * Initialize authentication state on app load
   * Check if token exists in localStorage and validate it with the server
   */
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);

      if (storedToken) {
        try {
          const response = await authApi.getCurrentUser(storedToken);
          setToken(storedToken);
          setUser(response.user);
        } catch (err) {
          if (err.status === 401) {
            // The server refused the token (expired, revoked or invalid): remove it.
            expireSession();
          } else {
            // The server could not be reached, so the session cannot be
            // confirmed. Stay logged out for now but keep the token, so a
            // reload works once the server is back.
            setNotice('unreachable');
          }
        }
      }

      setLoading(false);
    };

    initializeAuth();
  }, [expireSession]);

  /**
   * While logged in, check regularly (and when the tab is shown again) that
   * the server still accepts the token. An expired or revoked token then
   * logs the user out cleanly instead of leaving a stale dashboard open.
   */
  useEffect(() => {
    if (!token) return undefined;

    const checkSession = async () => {
      try {
        await authApi.getCurrentUser(token);
      } catch (err) {
        if (err.status === 401) expireSession();
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') checkSession();
    };

    // A page brought back by the browser's Back button can come from its
    // cache with this old state still in memory, so it is re-checked at once.
    const onPageShow = (event) => {
      if (event.persisted) checkSession();
    };

    const interval = setInterval(checkSession, SESSION_CHECK_MS);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [token, expireSession]);

  /**
   * Register new user
   * Returns the new user. Throws an ApiError if the server refuses.
   */
  const register = async (username, email, password, confirmPassword) => {
    const response = await authApi.register(username, email, password, confirmPassword);
    return response.user;
  };

  /**
   * Login user
   * Checks the credentials and returns the session, without opening it yet.
   * The login page shows its "Logged in" state first and then calls
   * startSession. Throws an ApiError if the server refuses.
   */
  const login = async (identifier, password) => {
    const response = await authApi.login(identifier, password);
    return { token: response.token, user: response.user };
  };

  /**
   * Store the token and mark the user as logged in
   */
  const startSession = useCallback((session) => {
    localStorage.setItem(TOKEN_KEY, session.token);
    setNotice(null);
    setToken(session.token);
    setUser(session.user);
  }, []);

  /**
   * Logout user
   * The server revokes the token; the browser forgets it either way.
   */
  const logout = async () => {
    try {
      if (token) {
        await authApi.logout(token);
      }
    } catch (err) {
      // Nothing to do: the local session is cleared below regardless.
    } finally {
      clearSession();
      setNotice('loggedOut');
    }
  };

  /**
   * Check if user is authenticated
   */
  const isAuthenticated = !!user && !!token;

  const value = {
    user,
    token,
    loading,
    notice,
    isAuthenticated,
    register,
    login,
    startSession,
    logout,
    expireSession,
    setNotice,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Custom hook to use Auth Context
 * Must be used inside AuthProvider
 */
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
};
