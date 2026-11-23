import type { PhotoInspector, PhotoReducer, PosePhotosGateway } from '@acrofunjam/core';
import { createContext, useContext, type ReactNode } from 'react';

/** Story 10 (ADR 0039): the ports of the photos of the poses, for a file of the browser. */
export type PosePhotosPorts = {
  readonly gateway: PosePhotosGateway<File>;
  readonly inspector: PhotoInspector<File>;
  readonly reducer: PhotoReducer<File>;
};

const PosePhotosContext = createContext<PosePhotosPorts | null>(null);

/** Injects the adapters of the photos chosen by the composition root (main.tsx, or fakes). */
export function PosePhotosProvider({ ports, children }: { ports: PosePhotosPorts; children: ReactNode }) {
  return <PosePhotosContext.Provider value={ports}>{children}</PosePhotosContext.Provider>;
}

export function usePosePhotosPorts(): PosePhotosPorts {
  const ports = useContext(PosePhotosContext);
  if (!ports) throw new Error('usePosePhotosPorts must be used inside a PosePhotosProvider');
  return ports;
}
