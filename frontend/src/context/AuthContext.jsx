import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  getCurrentUserProfile, 
  getFinancialAccounts, 
  loginUser, 
  registerUser, 
  logoutUser,
  initCsrfToken 
} from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authView, setAuthView] = useState(null); // 'login' | 'register' | 'forgot' | 'reset' | null

  // Refresh profile and accounts from backend
  const refreshUserData = async ({ preserveUser = false } = {}) => {
    try {
      await initCsrfToken();
      const profile = await getCurrentUserProfile();
      setUser(profile);

      const userAccounts = await getFinancialAccounts();
      setAccounts(userAccounts);

      const defaultAcc = userAccounts.find(a => a.is_default) || userAccounts[0] || null;
      setSelectedAccount(defaultAcc);
      return profile;
    } catch {
      if (!preserveUser) {
        setUser(null);
        setAccounts([]);
        setSelectedAccount(null);
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUserData();
  }, []);

  const login = async ({ email, password }) => {
    const res = await loginUser({ email, password });
    if (res?.user) {
      setUser(res.user);
    }
    await refreshUserData({ preserveUser: true });
    setAuthView(null);
    return res;
  };

  const register = async ({ full_name, email, password }) => {
    const res = await registerUser({ full_name, email, password });
    if (res?.user) {
      setUser(res.user);
    }
    await refreshUserData({ preserveUser: true });
    setAuthView(null);
    return res;
  };

  const logout = async () => {
    try {
      await logoutUser();
    } finally {
      setUser(null);
      setAccounts([]);
      setSelectedAccount(null);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      accounts,
      selectedAccount,
      setSelectedAccount,
      isAuthenticated: !!user,
      loading,
      authView,
      setAuthView,
      login,
      register,
      logout,
      refreshUserData,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
