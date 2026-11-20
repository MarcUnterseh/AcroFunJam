import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { FlowScreen } from '@/flow-generation/FlowScreen';
import { useGenerator } from '@/flow-generation/GeneratorContext';

const keepAwakeTag = 'flow-shown';

/**
 * The flow (M2). The screen stays awake only while the flow is in front (Q215, AY-5); leaving it, by the back arrow or
 * « Modifier les critères », shows the criteria of the flow (M3) and withdraws « Revenir au flow précédent » (M9).
 */
export default function FlowRoute() {
  const { changeCriteria, restored, state } = useGenerator();
  useFocusEffect(
    useCallback(() => {
      void activateKeepAwakeAsync(keepAwakeTag);
      return () => {
        void deactivateKeepAwake(keepAwakeTag);
        changeCriteria();
      };
    }, []),
  );
  // No flow to show (an address opened directly, a flow kept that could not be read): the criteria.
  if (restored && !state.shown) return <Redirect href="/" />;
  return <FlowScreen onCriteria={() => (router.canGoBack() ? router.back() : router.replace('/'))} />;
}
