import {
  flowGenerationLabels as labels,
  flowStepTitle,
  flowSummary,
  listTags,
  type FlowPose,
  type GeneratedFlow,
  type Tag,
} from '@acrofunjam/core';
import { radius, sizes, spacing, typography } from '@acrofunjam/ui-tokens';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, findNodeHandle, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useGenerator } from './GeneratorContext';
import {
  ActionBar,
  Button,
  CriteriaRecap,
  Difficulties,
  focusDelayMillis,
  MessageDock,
  styles as ui,
  T,
  TagPills,
  usePalette,
} from './ui';

/** A pose of the thread: « Départ : » or « Vers » on its own line, then its name in large, as plain text (Q213). */
function Station({
  pose,
  start = false,
  samePose = false,
}: {
  readonly pose: FlowPose;
  readonly start?: boolean;
  readonly samePose?: boolean;
}) {
  const palette = usePalette();
  return (
    <View style={local.station}>
      <T style={[local.lead, { color: palette.textMuted }]}>{start ? labels.start : labels.towards}</T>
      <T scale="display" style={[local.poseName, { color: palette.text }]}>
        {pose.name}
      </T>
      {samePose && <T style={[ui.intro, { color: palette.textMuted }]}>{labels.samePose}</T>}
      <Difficulties base={pose.baseDifficulty} flyer={pose.flyerDifficulty} />
      <TagPills tags={pose.tags} />
    </View>
  );
}

function StepCard({ flow, index }: { readonly flow: GeneratedFlow; readonly index: number }) {
  const palette = usePalette();
  const step = flow.steps[index]!;
  const title = flowStepTitle(flow, index);
  const [open, setOpen] = useState(false);
  const name = title.name ?? title.unnamed?.spoken ?? '';
  return (
    <View style={[local.card, { backgroundColor: palette.surface, borderColor: palette.divider }]}>
      <View accessible accessibilityRole="header" accessibilityLabel={`${title.number} · ${name}`}>
        <View style={local.numberLine}>
          <T style={[local.stepWord, { color: palette.textMuted }]}>Étape</T>
          <T scale="display" style={[local.stepNumber, { color: palette.sunStrong }]}>
            {String(step.number)}
          </T>
        </View>
        <T scale="title" style={[local.transitionName, { color: palette.text }]}>
          {title.name ?? title.unnamed?.shown.join(' → ')}
        </T>
      </View>
      {step.isWashingMachine && (
        <T style={[local.lead, { color: palette.textMuted }]}>{labels.washingMachine}</T>
      )}
      <Difficulties base={step.transition.baseDifficulty} flyer={step.transition.flyerDifficulty} />
      <TagPills tags={step.transition.tags} />
      {step.transition.description && (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={labels.description}
            accessibilityState={{ expanded: open }}
            onPress={() => setOpen((value) => !value)}
            style={local.descriptionToggle}
          >
            <T style={[ui.label, { color: palette.primary }]}>{labels.description}</T>
          </Pressable>
          {open && <T style={[ui.intro, { color: palette.text }]}>{step.transition.description}</T>}
        </>
      )}
    </View>
  );
}

/**
 * The screen « Flow » (story 9b, 9b-generer-un-flow-mobile.md § 2): « Ton flow », the summary, the spotter reminder
 * above the start (never folded), the thread in large for the mat, the criteria at the end; the fixed bottom bar
 * (M8) and the message above it (M6, M9).
 */
export function FlowScreen({ onCriteria }: { readonly onCriteria: () => void }) {
  const palette = usePalette();
  const generator = useGenerator();
  const { state, dock, sameAsShown, generating } = generator;
  const tagList = useQuery<readonly Tag[]>({
    queryKey: ['catalog', 'tags'],
    queryFn: async () => {
      const result = await listTags(generator.adapters.tags);
      if (!result.ok) throw new Error(result.error.kind);
      return result.value;
    },
    retry: false,
    networkMode: 'always',
  });
  // Typed by what is used of them: the instances of React Native 0.88 are not the component types.
  const scroll = useRef<{ scrollTo(options: { y: number; animated: boolean }): void } | null>(null);
  const title = useRef<unknown>(null);
  const shown = state.shown;

  // Each new flow: back to the top, the focus of screen readers on « Ton flow ».
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
    // After the transition of the stack (earlier, Android often ignores the focus). The message above the bar announces
    // itself (MessageDock); « même flow » is in the content.
    const task = setTimeout(() => {
      const node = title.current ? findNodeHandle(title.current as never) : null;
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
      if (sameAsShown) AccessibilityInfo.announceForAccessibility(labels.sameFlowAgain);
    }, focusDelayMillis);
    return () => clearTimeout(task);
  }, [shown]);

  if (!shown) return <View style={[ui.screen, { backgroundColor: palette.background }]} />;
  const { flow, criteria } = shown;

  // Leaving the screen withdraws the offer and shows the criteria of the flow (the route, flow.tsx).
  const changeCriteria = onCriteria;

  return (
    <View style={[ui.screen, { backgroundColor: palette.background }]}>
      <ScrollView ref={scroll as never} contentContainerStyle={ui.content}>
        <T
          ref={title as never}
          accessibilityRole="header"
          scale="title"
          style={[ui.h1, { color: palette.text }]}
          accessibilityActions={
            dock?.kind === 'new-flow' ? [{ name: 'revenir', label: labels.backToPreviousFlow }] : []
          }
          onAccessibilityAction={({ nativeEvent }) =>
            nativeEvent.actionName === 'revenir' && generator.backToPrevious()
          }
        >
          {labels.title}
        </T>
        <T style={[local.summary, { color: palette.text }]}>{flowSummary(flow)}</T>
        {sameAsShown && (
          <View style={[local.info, { backgroundColor: palette.infoSurface, borderLeftColor: palette.info }]}>
            <T style={[ui.intro, { color: palette.text }]}>{labels.sameFlowAgain}</T>
          </View>
        )}
        <View style={[local.safety, { backgroundColor: palette.sunSurface }]}>
          <T style={[ui.intro, { color: palette.text }]}>{labels.spotterReminder}</T>
        </View>
        <View style={local.thread}>
          <View importantForAccessibility="no" style={[local.rail, { borderLeftColor: palette.sunStrong }]} />
          <View style={local.threadContent}>
            <Station pose={flow.start} start />
            {flow.steps.map((step, index) => (
              <View key={step.number} style={{ gap: spacing.md }}>
                <StepCard flow={flow} index={index} />
                <Station pose={step.arrival} samePose={step.isWashingMachine} />
              </View>
            ))}
          </View>
        </View>
        <View style={{ marginTop: spacing.xl }}>
          <CriteriaRecap criteria={criteria} tags={tagList.data ?? []} />
        </View>
      </ScrollView>
      {dock && <MessageDock dock={dock} tags={tagList.data ?? []} onBack={generator.backToPrevious} />}
      <ActionBar>
        <Button
          testID="modifier-les-criteres"
          label={labels.changeCriteria}
          variant="secondary"
          onPress={changeCriteria}
        />
        <Button
          testID="generer-un-autre-flow"
          label={generating ? labels.generating : labels.generateAnother}
          variant="primary"
          busy={generating}
          onPress={() => void generator.generateAnother()}
        />
      </ActionBar>
    </View>
  );
}

const local = StyleSheet.create({
  summary: {
    fontFamily: typography.fontFamilies.bodySemibold,
    fontSize: typography.size.lg,
    lineHeight: typography.size.lg * typography.lineHeight.tight,
  },
  info: { padding: spacing.md, borderRadius: radius.md, borderLeftWidth: sizes.accentBar },
  safety: { padding: spacing.md, borderRadius: radius.md },
  thread: { flexDirection: 'row', gap: spacing.sm },
  rail: {
    width: sizes.icon / 2,
    borderLeftWidth: sizes.borderWidthStrong,
    borderStyle: 'dotted',
    marginLeft: sizes.icon / 2,
  },
  threadContent: { flex: 1, gap: spacing.md },
  station: { gap: spacing.sm, paddingBottom: spacing.md },
  lead: { fontFamily: typography.fontFamilies.bodySemibold, fontSize: typography.size.md },
  poseName: {
    fontFamily: typography.fontFamilies.display,
    fontSize: typography.size.xxl,
    lineHeight: typography.size.xxl * typography.lineHeight.tight,
    letterSpacing: -0.04 * typography.size.xxl,
  },
  card: { padding: spacing.md, borderRadius: radius.md, borderWidth: sizes.borderWidth, gap: spacing.sm },
  numberLine: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  stepWord: { fontFamily: typography.fontFamilies.bodySemibold, fontSize: typography.size.sm },
  stepNumber: {
    fontFamily: typography.fontFamilies.displayBold,
    fontSize: typography.size.display,
    lineHeight: typography.size.display * typography.lineHeight.display,
  },
  transitionName: {
    fontFamily: typography.fontFamilies.display,
    fontSize: typography.size.xl,
    lineHeight: typography.size.xl * typography.lineHeight.tight,
  },
  descriptionToggle: { minHeight: sizes.control, justifyContent: 'center' },
});
