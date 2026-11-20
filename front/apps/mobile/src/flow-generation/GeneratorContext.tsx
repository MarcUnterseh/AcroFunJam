import {
  canShowPrevious,
  defaultFlowCriteria,
  drawFlow,
  forgetPrevious,
  lastShownFlow,
  noShownFlow,
  showDrawn,
  showPreviousFlow,
  withoutTags,
  type FlowCriteria,
  type FlowGenerationFailure,
  type FlowGenerationGateway,
  type LastShownFlowStore,
  type ShownFlowState,
  type TagListGateway,
} from '@acrofunjam/core';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AccessibilityInfo } from 'react-native';

/** The adapters of the generator, chosen by the composition root (the root layout, or the fakes of the tests). */
export type GeneratorAdapters = {
  readonly flows: FlowGenerationGateway;
  readonly tags: TagListGateway;
  readonly store: LastShownFlowStore;
};

/** Why no flow is shown on the screen of the criteria (§ 3 of the screen spec). */
export type NoFlow = 'criteria-too-restrictive' | 'catalog-insufficient';

/** The message above the action bar (MessageDock): an outage, a tag gone, or the short-lived offer of M9. */
export type Dock =
  | { readonly kind: 'unreachable' }
  | { readonly kind: 'outdated' }
  | { readonly kind: 'tags-gone'; readonly tagIds: readonly string[] }
  | { readonly kind: 'new-flow' };

/** What a draw led to, for the screen to navigate. */
export type DrawOutcome = 'flow' | 'no-flow' | 'stay';

type Generator = {
  readonly adapters: GeneratorAdapters;
  /** The flow kept was read (the application may show its first screen). */
  readonly restored: boolean;
  readonly state: ShownFlowState;
  /** The criteria of the form (those of the flow shown once one is). */
  readonly criteria: FlowCriteria;
  readonly setCriteria: (criteria: FlowCriteria) => void;
  readonly noFlow: NoFlow | null;
  readonly dock: Dock | null;
  readonly sameAsShown: boolean;
  readonly generating: boolean;
  /** Tags the API said are no longer in the list: hidden from the groups. */
  readonly gone: readonly string[];
  readonly generate: (criteria: FlowCriteria) => Promise<DrawOutcome>;
  readonly generateAnother: () => Promise<DrawOutcome>;
  readonly backToPrevious: () => void;
  /** « Modifier les critères » or back from the flow: the form, with the criteria of the flow shown. */
  readonly changeCriteria: () => void;
  readonly dismissDock: () => void;
};

const GeneratorContext = createContext<Generator | null>(null);

/** How long the offer « Revenir au flow précédent » stays (Q223): 10 s, the accessibility timeout of Android if longer. */
export const newFlowMessageMillis = 10_000;

export function GeneratorProvider({
  adapters,
  children,
}: {
  adapters: GeneratorAdapters;
  children: ReactNode;
}) {
  const [restored, setRestored] = useState(false);
  const [state, setState] = useState<ShownFlowState>(noShownFlow);
  const [criteria, setCriteria] = useState<FlowCriteria>(defaultFlowCriteria);
  const [noFlow, setNoFlow] = useState<NoFlow | null>(null);
  const [dock, setDock] = useState<Dock | null>(null);
  const [sameAsShown, setSameAsShown] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [gone, setGone] = useState<readonly string[]>([]);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    let cancelled = false;
    void lastShownFlow(adapters.store).then((kept) => {
      if (cancelled) return;
      if (kept) {
        setState(showDrawn(noShownFlow, kept));
        setCriteria(kept.criteria);
      }
      setRestored(true);
    });
    return () => {
      cancelled = true;
    };
  }, [adapters.store]);

  // The offer of M9 goes after its delay, unless a screen reader is on (WCAG 2.2.1).
  useEffect(() => {
    if (dock?.kind !== 'new-flow') return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    void (async () => {
      if (await AccessibilityInfo.isScreenReaderEnabled()) return;
      const recommended = await AccessibilityInfo.getRecommendedTimeoutMillis(newFlowMessageMillis).catch(
        () => newFlowMessageMillis,
      );
      // Android only: elsewhere (or unknown) the 10 s of Q223.
      const delay = typeof recommended === 'number' && recommended > 0 ? recommended : newFlowMessageMillis;
      if (cancelled) return;
      timer = setTimeout(() => {
        setDock(null);
        setState(forgetPrevious);
      }, delay);
    })();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [dock]);

  const failed = useCallback((failure: FlowGenerationFailure, chosen: FlowCriteria): DrawOutcome => {
    switch (failure.kind) {
      case 'criteria-too-restrictive':
      case 'catalog-insufficient':
        setNoFlow(failure.kind);
        setCriteria(chosen);
        setDock(null);
        return 'no-flow';
      case 'tags-not-in-list':
        setGone((previous) => [...previous, ...failure.tagIds]);
        setCriteria(withoutTags(chosen, failure.tagIds));
        setDock({ kind: 'tags-gone', tagIds: failure.tagIds });
        return 'stay';
      case 'unreachable':
        setDock({ kind: 'unreachable' });
        return 'stay';
      case 'outdated':
        setDock({ kind: 'outdated' });
        return 'stay';
    }
  }, []);

  const draw = useCallback(
    async (chosen: FlowCriteria): Promise<DrawOutcome> => {
      setGenerating(true);
      const drawn = await drawFlow(adapters.flows, adapters.store, stateRef.current, chosen);
      setGenerating(false);
      setState(drawn.state);
      if (drawn.failure) return failed(drawn.failure, chosen);
      setCriteria(chosen);
      setNoFlow(null);
      setSameAsShown(drawn.sameAsShown);
      setDock(canShowPrevious(drawn.state) ? { kind: 'new-flow' } : null);
      return 'flow';
    },
    [adapters, failed],
  );

  const generator = useMemo<Generator>(
    () => ({
      adapters,
      restored,
      state,
      criteria,
      setCriteria: (next) => {
        setCriteria(next);
        setNoFlow(null);
      },
      noFlow,
      dock,
      sameAsShown,
      generating,
      gone,
      generate: draw,
      generateAnother: () => (state.shown ? draw(state.shown.criteria) : Promise.resolve('stay')),
      backToPrevious: () => {
        setSameAsShown(false);
        setDock(null);
        void showPreviousFlow(adapters.store, stateRef.current).then((restoredFlow) => {
          setState(restoredFlow);
          if (restoredFlow.shown) setCriteria(restoredFlow.shown.criteria);
        });
      },
      changeCriteria: () => {
        setState(forgetPrevious);
        if (stateRef.current.shown) setCriteria(stateRef.current.shown.criteria);
        setSameAsShown(false);
        setDock(null);
        setNoFlow(null);
      },
      dismissDock: () => setDock(null),
    }),
    [adapters, restored, state, criteria, noFlow, dock, sameAsShown, generating, gone, draw],
  );

  return <GeneratorContext.Provider value={generator}>{children}</GeneratorContext.Provider>;
}

export function useGenerator(): Generator {
  const generator = useContext(GeneratorContext);
  if (!generator) throw new Error('useGenerator must be used inside a GeneratorProvider');
  return generator;
}
