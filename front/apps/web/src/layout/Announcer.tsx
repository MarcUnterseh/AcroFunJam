import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

const AnnounceContext = createContext<(message: string) => void>(() => {});

/**
 * A permanent polite live region (role="status"): it tells screen readers what changed
 * (signed in, signed out) without moving the focus.
 */
export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  const announce = useCallback((text: string) => setMessage(text), []);
  return (
    <AnnounceContext.Provider value={announce}>
      {children}
      <p role="status" className="visually-hidden">
        {message}
      </p>
    </AnnounceContext.Provider>
  );
}

export const useAnnounce = () => useContext(AnnounceContext);
