import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

const AnnounceContext = createContext<(message: string) => void>(() => {});

/**
 * A permanent polite live region (role="status"): it tells screen readers what changed
 * (signed in, signed out) without moving the focus.
 */
export function AnnouncerProvider({ children }: { children: ReactNode }) {
  // Each announcement gets a new node, so that the same message announced twice is read twice.
  const [message, setMessage] = useState({ text: '', id: 0 });
  const announce = useCallback((text: string) => setMessage(({ id }) => ({ text, id: id + 1 })), []);
  return (
    <AnnounceContext.Provider value={announce}>
      {children}
      <p role="status" className="visually-hidden">
        <span key={message.id}>{message.text}</span>
      </p>
    </AnnounceContext.Provider>
  );
}

export const useAnnounce = () => useContext(AnnounceContext);
