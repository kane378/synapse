// FILE: client/src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(() => localStorage.getItem('synapse_token'));
  const [loading, setLoading] = useState(true);

  // Validate token on mount
  useEffect(() => {
    const validate = async () => {
      if (!token) { setLoading(false); return; }
      try {
        const res = await api.get('/auth/me');
        setUser(res.data.user);
      } catch {
        // Token invalid/expired — clear it
        localStorage.removeItem('synapse_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    validate();
  }, [token]);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: newToken, user: newUser } = res.data;
    newUser.hospitalName = newUser.hospitalName || newUser.hospital_name;
    newUser.fullName = newUser.fullName || newUser.full_name;
    newUser.hospitalName = newUser.hospitalName || newUser.hospital_name;
    localStorage.setItem('synapse_token', newToken);
    setToken(newToken);
    setUser(newUser);
    return newUser;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('synapse_token');
    setToken(null);
    setUser(null);
  }, []);

  const isSuperAdmin   = user?.role === 'SuperAdmin';
  const isHospitalAdmin = user?.role === 'HospitalAdmin';

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isSuperAdmin, isHospitalAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
