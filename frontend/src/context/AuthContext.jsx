import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export const AuthContext = createContext(null);

const API_URL = import.meta.env.VITE_API_URL || '';

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Validate existing token on mount
  useEffect(() => {
    let isMounted = true;

    const verifyExistingToken = async () => {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${storedToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.user) {
            setUser(data.user);
            setToken(storedToken);
            localStorage.setItem('user', JSON.stringify(data.user));
          }
        } else {
          // Token invalid or expired
          if (isMounted) {
            setToken(null);
            setUser(null);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        }
      } catch (err) {
        console.error('Session validation error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    verifyExistingToken();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          success: false,
          message: data.message || 'Failed to sign in. Please check your credentials.',
        };
      }

      const authToken = data.token;
      const authUser = data.user;

      setToken(authToken);
      setUser(authUser);
      localStorage.setItem('token', authToken);
      localStorage.setItem('user', JSON.stringify(authUser));

      return { success: true, user: authUser };
    } catch (err) {
      console.error('Login request error:', err);
      return {
        success: false,
        message: 'Could not connect to the authentication server. Please verify backend is running.',
      };
    }
  }, []);

  const register = useCallback(async (name, email, password) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          success: false,
          message: data.message || 'Registration failed.',
        };
      }

      // If token is returned, immediately log in
      if (data.token && data.user) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      return { success: true, user: data.user, token: data.token };
    } catch (err) {
      console.error('Register request error:', err);
      return {
        success: false,
        message: 'Could not connect to the registration server. Please verify backend is running.',
      };
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('emailId');
    sessionStorage.removeItem('roomPassword');
  }, []);

  const value = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    loading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;