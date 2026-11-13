import {
  createContext,
  useContext,
  useCallback,
  useState,
} from 'react';

const AdminContext = createContext(null);
const TOKEN_KEY = 'jbd_admin_token';

export function AdminProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || null);

  const login = useCallback(async (password) => {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: data.error || 'Login failed. Is the API server running?' };
      setToken(data.token);
      localStorage.setItem(TOKEN_KEY, data.token);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Cannot reach the server. Start it with: npm run server' };
    }
  }, []);

  const logout = useCallback(() => {
    const current = token;
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    if (current) {
      fetch('/api/admin/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${current}` },
      }).catch(() => {});
    }
  }, [token]);

  /** Authenticated fetch. Throws { status: 401 } when the session expired. */
  const adminFetch = useCallback(
    async (path, options = {}) => {
      const res = await fetch(path, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.status === 401) {
        setToken(null);
        localStorage.removeItem(TOKEN_KEY);
        const err = new Error('Session expired. Please log in again.');
        err.status = 401;
        throw err;
      }
      return res;
    },
    [token]
  );

  const adminJson = useCallback(
    async (path, options = {}) => {
      const res = await adminFetch(path, options);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data.error || `Request failed (${res.status})`);
        err.status = res.status;
        throw err;
      }
      return data;
    },
    [adminFetch]
  );

  return (
    <AdminContext.Provider value={{ token, isAdmin: !!token, login, logout, adminFetch, adminJson }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used inside <AdminProvider>');
  return ctx;
}
