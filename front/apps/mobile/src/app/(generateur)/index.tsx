import { router } from 'expo-router';
import { useCallback } from 'react';
import { CriteriaScreen } from '@/flow-generation/CriteriaScreen';
import { useGenerator } from '@/flow-generation/GeneratorContext';

/** The first screen (M1): the criteria; with a flow kept, the stack opens as [criteria, flow] (ADR 0038). */
export default function CriteriaRoute() {
  const { restored } = useGenerator();
  const showFlow = useCallback(() => router.push('/flow'), []);
  // The splash screen stays the time the flow kept is read: no criteria seen for an instant before the flow.
  if (!restored) return null;
  return <CriteriaScreen onFlow={showFlow} />;
}
