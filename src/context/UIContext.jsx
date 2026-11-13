import { createContext, useContext, useCallback, useState } from 'react';

const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const toggleMobileMenu = useCallback(() => setMobileMenuOpen((v) => !v), []);
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);
  const toggleSearch = useCallback(() => setSearchOpen((v) => !v), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  return (
    <UIContext.Provider
      value={{
        mobileMenuOpen,
        toggleMobileMenu,
        closeMobileMenu,
        searchOpen,
        toggleSearch,
        closeSearch,
      }}
    >
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used inside <UIProvider>');
  return ctx;
}
