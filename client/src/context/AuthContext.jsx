
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';

axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || '';
axios.defaults.withCredentials = true;

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const { pathname } = useLocation();
  const navigate = useNavigate();

  const fetchCurrentUser = async () => {
    try {
      const { data } = await axios.get('/api/auth/me');

      setUser(data.user || null);
      return data.user || null;
    } catch (error) {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const publicRoutes = ['/login', '/register'];

    if (publicRoutes.includes(pathname)) {
      setLoading(false);
      return;
    }

    fetchCurrentUser();
  }, []);

  const login = async (email, password) => {
    setLoading(true);

    try {
      const { data } = await axios.post('/api/auth/login', {
        email,
        password,
      });

      if (!data.user) {
        throw new Error('Login successful, but user data was not returned.');
      }

      setUser(data.user);
      navigate('/', { replace: true });

      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password) => {
    setLoading(true);

    try {
      const { data } = await axios.post('/api/auth/register', {
        name,
        email,
        password,
      });

      if (data.user) {
        setUser(data.user);
        navigate('/', { replace: true });
        return data.user;
      }

      return await fetchCurrentUser();
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);

    try {
      await axios.post('/api/auth/logout');
    } finally {
      setUser(null);
      setLoading(false);
      navigate('/login', { replace: true });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
