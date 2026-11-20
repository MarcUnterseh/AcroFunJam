import {
  catalogLabels,
  difficultyLevelName,
  flowGenerationLabels as labels,
  tagsNoLongerAvailableLabel,
  type DifficultyLevel,
  type FlowCriteria,
  type Tag,
  type TagReference,
} from '@acrofunjam/core';
import { colors, colorsDark, radius, sizes, spacing, typography } from '@acrofunjam/ui-tokens';
import type { ComponentProps, ReactNode } from 'react';
import { useEffect } from 'react';
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Dock } from './GeneratorContext';

// The pieces of the screens of the generator (docs/design/ecrans/9b-generer-un-flow-mobile.md), direction ADR 0031.

/** The time of a transition of the stack: the focus of screen readers is moved after it, Android ignoring it before. */
export const focusDelayMillis = 300;

export type Palette = { readonly [Role in keyof typeof colors]: string };

/** The palette of the system theme: the dawn by day, the night when the system is dark. */
export const usePalette = (): Palette => (useColorScheme() === 'dark' ? colorsDark : colors);

type Scale = keyof typeof typography.maxFontScale;

/** A text that follows the font size of the system, up to the cap of its kind (token maxFontScale). */
export function T({ scale = 'text', ...props }: ComponentProps<typeof Text> & { readonly scale?: Scale }) {
  // React 19: the ref is a prop, passed through with the others.
  return <Text maxFontSizeMultiplier={typography.maxFontScale[scale]} {...props} />;
}

export function Button({
  label,
  onPress,
  variant,
  busy = false,
  accessibilityLabel,
  testID,
}: {
  readonly label: string;
  readonly onPress: () => void;
  readonly variant: 'primary' | 'secondary';
  readonly busy?: boolean;
  readonly accessibilityLabel?: string;
  /** For the Maestro flows (a title may bear the same words as the button). */
  readonly testID?: string;
}) {
  const palette = usePalette();
  const { fontScale } = useWindowDimensions();
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ busy, disabled: busy }}
      testID={testID}
      onPress={() => !busy && onPress()}
      style={({ pressed }) => [
        styles.button,
        // Two side by side while they fit, stacked once the font size of the system no longer lets them (M8).
        { flexBasis: sizes.tileMinWidth * fontScale },
        primary
          ? {
              backgroundColor: pressed ? palette.primaryActive : palette.primary,
              borderColor: palette.primary,
            }
          : {
              backgroundColor: pressed ? palette.surfaceHover : palette.surface,
              borderColor: palette.border,
            },
      ]}
    >
      <T
        style={[styles.buttonLabel, { color: primary ? palette.primaryContrast : palette.text }]}
      >
        {label}
      </T>
    </Pressable>
  );
}

/** The fixed bottom bar (BarreActions): one action, or « Modifier les critères » left and the primary one right (M8). */
export function ActionBar({ children }: { readonly children: ReactNode }) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: palette.surface, borderTopColor: palette.divider },
        { paddingBottom: Math.max(spacing.sm, insets.bottom) },
      ]}
    >
      {children}
    </View>
  );
}

/** The message above the bar (MessageDock), announced politely, the focus left where it is. */
export function MessageDock({
  dock,
  tags,
  onBack,
}: {
  readonly dock: Dock;
  readonly tags: readonly Tag[];
  readonly onBack: () => void;
}) {
  const palette = usePalette();
  const error = dock.kind === 'unreachable' || dock.kind === 'outdated';
  const text =
    dock.kind === 'unreachable'
      ? labels.unreachable
      : dock.kind === 'outdated'
        ? labels.outdatedApplication
        : dock.kind === 'tags-gone'
          ? tagsNoLongerAvailableLabel(
              dock.tagIds.flatMap((id) => tags.find((tag) => tag.id === id)?.name ?? []),
            )
          : labels.newFlowDrawn;
  // Android reads the live region; iOS has none: the message is announced, the focus left where it is.
  useEffect(() => {
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(text);
  }, [text]);
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        styles.dock,
        {
          backgroundColor: error ? palette.dangerSurface : palette.infoSurface,
          borderLeftColor: error ? palette.danger : palette.info,
        },
      ]}
    >
      <T style={[styles.dockText, { color: palette.text }]}>{text}</T>
      {dock.kind === 'new-flow' && (
        <Pressable accessibilityRole="button" testID="revenir-au-flow-precedent" onPress={onBack} style={styles.dockAction}>
          <T style={[styles.dockActionLabel, { color: palette.primary }]}>{labels.backToPreviousFlow}</T>
        </Pressable>
      )}
    </View>
  );
}

function RolePill({ role, level }: { readonly role: 'base' | 'flyer'; readonly level: DifficultyLevel }) {
  const palette = usePalette();
  return (
    <View
      style={[styles.pill, { backgroundColor: role === 'base' ? palette.baseSurface : palette.flyerSurface }]}
    >
      <T style={[styles.pillRole, { color: role === 'base' ? palette.base : palette.flyer }]}>
        {role === 'base' ? catalogLabels.base : catalogLabels.flyer}
      </T>
      <T style={[styles.pillLevel, { color: palette.text }]}>{difficultyLevelName(level)}</T>
    </View>
  );
}

/** The two difficulties of a pose or a transition: the role is written, never carried by the colour alone. */
export function Difficulties({
  base,
  flyer,
}: {
  readonly base: DifficultyLevel;
  readonly flyer: DifficultyLevel;
}) {
  return (
    <View style={styles.row}>
      <RolePill role="base" level={base} />
      <RolePill role="flyer" level={flyer} />
    </View>
  );
}

export function TagPills({ tags }: { readonly tags: readonly TagReference[] }) {
  const palette = usePalette();
  if (tags.length === 0) return null;
  return (
    <View
      accessible
      style={styles.row}
      accessibilityLabel={`Étiquettes : ${tags.map((tag) => tag.name).join(', ')}`}
    >
      {tags.map((tag) => (
        <T
          key={tag.id}
          style={[
            styles.tag,
            { backgroundColor: palette.tagSurface, borderColor: palette.tagBorder, color: palette.text },
          ]}
        >
          {tag.name}
        </T>
      ))}
    </View>
  );
}

/** The criteria read again (recapitulatif-criteres.md). */
export function CriteriaRecap({
  criteria,
  tags,
}: {
  readonly criteria: FlowCriteria;
  readonly tags: readonly Tag[];
}) {
  const palette = usePalette();
  const names = (ids: readonly string[]) =>
    ids.flatMap((id) => tags.find((tag) => tag.id === id)?.name ?? []).join(', ') || labels.none;
  const rows: Array<[string, string]> = [
    [labels.length, String(criteria.length)],
    [labels.baseCeiling, difficultyLevelName(criteria.baseCeiling)],
    [labels.flyerCeiling, difficultyLevelName(criteria.flyerCeiling)],
    ...(criteria.requestedTagIds.length > 0
      ? [[labels.requested, names(criteria.requestedTagIds)] as [string, string]]
      : []),
    ...(criteria.excludedTagIds.length > 0
      ? [[labels.excluded, names(criteria.excludedTagIds)] as [string, string]]
      : []),
  ];
  return (
    <View style={[styles.recap, { backgroundColor: palette.surfaceHover }]}>
      <T accessibilityRole="header" scale="title" style={[styles.recapTitle, { color: palette.text }]}>
        {labels.criteria}
      </T>
      {rows.map(([term, value]) => (
        <View key={term} style={styles.recapRow}>
          <T style={[styles.recapTerm, { color: palette.textMuted }]}>{term}</T>
          <T style={[styles.recapValue, { color: palette.text }]}>{value}</T>
        </View>
      ))}
    </View>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
  },
  h1: {
    fontFamily: typography.fontFamilies.display,
    fontSize: typography.size.xl,
    lineHeight: typography.size.xl * typography.lineHeight.tight,
  },
  intro: {
    fontFamily: typography.fontFamilies.body,
    fontSize: typography.size.md,
    lineHeight: typography.size.md * typography.lineHeight.normal,
  },
  label: { fontFamily: typography.fontFamilies.bodySemibold, fontSize: typography.size.md },
  help: {
    fontFamily: typography.fontFamilies.body,
    fontSize: typography.size.sm,
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },
  button: {
    flex: 1,
    minHeight: sizes.control,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: sizes.borderWidth,
  },
  buttonLabel: {
    fontFamily: typography.fontFamilies.bodySemibold,
    fontSize: typography.size.md,
    textAlign: 'center',
  },
  bar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.lg,
    rowGap: spacing.md,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: sizes.borderWidth,
  },
  dock: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderLeftWidth: sizes.accentBar,
    gap: spacing.xs,
  },
  dockText: { fontFamily: typography.fontFamilies.bodySemibold, fontSize: typography.size.md },
  dockAction: {
    
    minHeight: sizes.control,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  dockActionLabel: { fontFamily: typography.fontFamilies.bodySemibold, fontSize: typography.size.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
  },
  pillRole: { fontFamily: typography.fontFamilies.bodyBold, fontSize: typography.size.xs },
  pillLevel: { fontFamily: typography.fontFamilies.bodySemibold, fontSize: typography.size.sm },
  tag: {
    fontFamily: typography.fontFamilies.body,
    fontSize: typography.size.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: sizes.borderWidth,
    overflow: 'hidden',
  },
  recap: { padding: spacing.md, borderRadius: radius.sm, gap: spacing.xs },
  recapTitle: { fontFamily: typography.fontFamilies.bodySemibold, fontSize: typography.size.sm },
  recapRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm },
  recapTerm: { fontFamily: typography.fontFamilies.body, fontSize: typography.size.sm },
  recapValue: { fontFamily: typography.fontFamilies.bodySemibold, fontSize: typography.size.sm },
});
