import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const SESSION_TOKEN_KEY = 'devassess_session_token';

export function AuthProvider({ children }) {
  // Read initial token strictly from tab-scoped sessionStorage (cleared when tab closes)
  const [token, setToken] = useState(() => {
    try {
      return sessionStorage.getItem(SESSION_TOKEN_KEY) || null;
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Clear session storage and reset memory
  const clearSession = useCallback((isExpired = false) => {
    try {
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
    } catch {}
    setToken(null);
    setUser(null);
    if (isExpired) {
      setSessionExpired(true);
    }
  }, []);

  // Set active session
  const saveSession = useCallback((newToken, newUser) => {
    try {
      sessionStorage.setItem(SESSION_TOKEN_KEY, newToken);
    } catch {}
    setToken(newToken);
    setUser(newUser);
    setSessionExpired(false);
  }, []);

  // Fetch current authenticated user on load or token change
  const fetchCurrentUser = useCallback(async (authToken) => {
    if (!authToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const data = await res.json();

      if (res.ok && data.user) {
        setUser(data.user);
        setSessionExpired(false);
      } else {
        // Token is invalid or expired
        console.warn('[Auth] Token validation failed:', data.message);
        clearSession(true);
      }
    } catch (err) {
      console.error('[Auth] Error fetching current user:', err);
      clearSession(false);
    } finally {
      setLoading(false);
    }
  }, [clearSession]);

  useEffect(() => {
    fetchCurrentUser(token);
  }, [token, fetchCurrentUser]);

  // Authenticated API request helper that handles token injection and session expiration
  const authFetch = useCallback(
    async (url, options = {}) => {
      const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(url, { ...options, headers });

      if (response.status === 401) {
        const errorData = await response.clone().json().catch(() => ({}));
        if (
          errorData.message?.includes('expired') ||
          errorData.message?.includes('token')
        ) {
          clearSession(true);
        }
      }

      return response;
    },
    [token, clearSession]
  );

  // User login
  const login = async ({ email, password }) => {
    setSessionExpired(false);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Login failed. Please check your credentials.');
    }

    saveSession(data.token, data.user);
    return data.user;
  };

  // User registration
  const register = async ({ name, email, password, role = 'student' }) => {
    setSessionExpired(false);
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Registration failed. Please check the provided information.');
    }

    saveSession(data.token, data.user);
    return data.user;
  };

  // User logout
  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.warn('[Auth] Server logout notification error:', err);
    } finally {
      clearSession(false);
    }
  };

  const value = {
    user,
    token,
    loading,
    sessionExpired,
    isAuthenticated: Boolean(user && token),
    login,
    register,
    logout,
    authFetch,
    clearSessionExpiredAlert: () => setSessionExpired(false),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
