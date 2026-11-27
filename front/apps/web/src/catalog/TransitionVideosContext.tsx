import type { TransitionVideosGateway, VideoInspector } from '@acrofunjam/core';
import { createContext, useContext, type ReactNode } from 'react';

/** Story 12 (ADR 0041): the ports of the videos of the transitions, for a file of the browser. */
export type TransitionVideosPorts = {
  readonly gateway: TransitionVideosGateway<File>;
  readonly inspector: VideoInspector<File>;
};

const TransitionVideosContext = createContext<TransitionVideosPorts | null>(null);

/** Injects the adapters of the videos chosen by the composition root (main.tsx, or fakes). */
export function TransitionVideosProvider({
  ports,
  children,
}: {
  ports: TransitionVideosPorts;
  children: ReactNode;
}) {
  return <TransitionVideosContext.Provider value={ports}>{children}</TransitionVideosContext.Provider>;
}

export function useTransitionVideosPorts(): TransitionVideosPorts {
  const ports = useContext(TransitionVideosContext);
  if (!ports) throw new Error('useTransitionVideosPorts must be used inside a TransitionVideosProvider');
  return ports;
}
