import {
  chosenTagsCountLabel,
  difficultyLevelName,
  difficultyScale,
  fewerTransitions,
  flowGenerationLabels as labels,
  listTags,
  maxFlowLength,
  minFlowLength,
  moreTransitions,
  tagCriterionOf,
  toggleTag,
  transitionsCountLabel,
  wideningHints,
  type DifficultyLevel,
  type FlowCriteria,
  type Tag,
  type TagCriterion,
} from '@acrofunjam/core';
import { radius, sizes, spacing, typography } from '@acrofunjam/ui-tokens';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useGenerator, type NoFlow } from './GeneratorContext';
import { ActionBar, Button, CriteriaRecap, MessageDock, styles as ui, focusDelayMillis, T, usePalette } from './ui';

/** The tags of the list (story 8), read once; a failure leaves the generator without tags (UX-6). */
const useTagList = () => {
  const { adapters } = useGenerator();
  return useQuery<readonly Tag[]>({
    queryKey: ['catalog', 'tags'],
    queryFn: async () => {
      const result = await listTags(adapters.tags);
      if (!result.ok) throw new Error(result.error.kind);
      return result.value;
    },
    retry: false,
    networkMode: 'always',
  });
};

/** « Nombre de transitions »: − and +, one adjustable element for screen readers (M7, Q221). */
function Counter({
  criteria,
  onChange,
}: {
  readonly criteria: FlowCriteria;
  readonly onChange: (next: FlowCriteria) => void;
}) {
  const palette = usePalette();
  const fewer = () => onChange(fewerTransitions(criteria));
  const more = () => onChange(moreTransitions(criteria));
  const step = (label: string, sign: string, disabled: boolean, onPress: () => void) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        local.step,
        disabled
          ? { backgroundColor: palette.disabledSurface, borderColor: palette.border, borderStyle: 'dashed' }
          : { backgroundColor: palette.surface, borderColor: palette.border },
      ]}
    >
      <T style={[local.sign, { color: disabled ? palette.textMuted : palette.text }]}>{sign}</T>
    </Pressable>
  );
  return (
    <View style={{ gap: spacing.sm }}>
      <T style={[ui.label, { color: palette.text }]}>{labels.length}</T>
      <T style={[ui.help, { color: palette.textMuted }]}>{labels.lengthHelp}</T>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={labels.length}
        accessibilityValue={{
          min: minFlowLength,
          max: maxFlowLength,
          now: criteria.length,
          text: transitionsCountLabel(criteria.length),
        }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={({ nativeEvent }) => {
          if (nativeEvent.actionName === 'increment') more();
          else if (nativeEvent.actionName === 'decrement') fewer();
        }}
        style={local.counter}
      >
        {step(labels.fewerTransitions, '−', criteria.length <= minFlowLength, fewer)}
        <T scale="title" style={[local.value, { color: palette.text }]}>
          {criteria.length}
        </T>
        {step(labels.moreTransitions, '+', criteria.length >= maxFlowLength, more)}
      </View>
    </View>
  );
}

/** A ceiling: radio buttons with the level written (never the colour alone). */
function Ceiling({
  legend,
  tone,
  value,
  onChange,
}: {
  readonly legend: string;
  readonly tone: 'base' | 'flyer';
  readonly value: DifficultyLevel;
  readonly onChange: (level: DifficultyLevel) => void;
}) {
  const palette = usePalette();
  const { fontScale } = useWindowDimensions();
  const [accent, surface] =
    tone === 'base' ? [palette.base, palette.baseSurface] : [palette.flyer, palette.flyerSurface];
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={legend} style={{ gap: spacing.sm }}>
      <T style={[ui.label, { color: palette.text }]}>{legend}</T>
      <View style={local.tiles}>
        {difficultyScale.map((level) => {
          const checked = level === value;
          return (
            <Pressable
              key={level}
              accessibilityRole="radio"
              accessibilityLabel={difficultyLevelName(level)}
              accessibilityState={{ checked }}
              onPress={() => onChange(level)}
              style={[
                local.tile,
                // One column once the enlarged font no longer fits two tiles side by side.
                { flexBasis: sizes.tileMinWidth * fontScale },
                checked
                  ? { backgroundColor: surface, borderColor: accent, borderWidth: sizes.borderWidthStrong }
                  : { backgroundColor: palette.surface, borderColor: palette.border },
              ]}
            >
              <T style={[ui.label, { color: palette.text }]}>{difficultyLevelName(level)}</T>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function TagGroup({
  criterion,
  tags,
  criteria,
  onChange,
}: {
  readonly criterion: TagCriterion;
  readonly tags: readonly Tag[];
  readonly criteria: FlowCriteria;
  readonly onChange: (next: FlowCriteria) => void;
}) {
  const palette = usePalette();
  const [legend, help] =
    criterion === 'requested'
      ? [labels.requested, labels.requestedHelp]
      : [labels.excluded, labels.excludedHelp];
  return (
    <View style={{ gap: spacing.sm }}>
      <T style={[ui.label, { color: palette.text }]}>{legend}</T>
      <T style={[ui.help, { color: palette.textMuted }]}>{help}</T>
      <View accessibilityRole="list" accessibilityLabel={legend} style={ui.row}>
        {tags.map((tag) => {
          const chosenIn = tagCriterionOf(criteria, tag.id);
          const disabled = chosenIn !== null && chosenIn !== criterion;
          const mark = chosenIn === 'requested' ? labels.requestedMark : labels.excludedMark;
          const name = disabled ? `${tag.name} ${mark}` : tag.name;
          return (
            <Pressable
              key={tag.id}
              accessibilityRole="checkbox"
              accessibilityLabel={name}
              accessibilityState={{ checked: chosenIn === criterion, disabled }}
              disabled={disabled}
              onPress={() => onChange(toggleTag(criteria, criterion, tag.id))}
              style={[
                local.tagBox,
                disabled
                  ? {
                      backgroundColor: palette.disabledSurface,
                      borderColor: palette.border,
                      borderStyle: 'dashed',
                    }
                  : chosenIn === criterion
                    ? {
                        backgroundColor: palette.selectedSurface,
                        borderColor: palette.selected,
                        borderWidth: sizes.borderWidthStrong,
                      }
                    : { backgroundColor: palette.surface, borderColor: palette.border },
              ]}
            >
              <T style={[ui.help, { color: disabled ? palette.textMuted : palette.text }]}>{name}</T>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function TagsFold({
  tags,
  criteria,
  onChange,
  open,
  onToggle,
}: {
  readonly tags: readonly Tag[];
  readonly criteria: FlowCriteria;
  readonly onChange: (next: FlowCriteria) => void;
  readonly open: boolean;
  readonly onToggle: () => void;
}) {
  const palette = usePalette();
  const count = chosenTagsCountLabel(criteria.requestedTagIds.length + criteria.excludedTagIds.length);
  return (
    <View style={[local.fold, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={count ? `${labels.tags}, ${count}` : labels.tags}
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={local.foldSummary}
      >
        <T style={[ui.label, { color: palette.text }]}>{labels.tags}</T>
        {count && <T style={[ui.help, { color: palette.text }]}>{count}</T>}
      </Pressable>
      {open && (
        <View style={local.foldContent}>
          <TagGroup criterion="requested" tags={tags} criteria={criteria} onChange={onChange} />
          <TagGroup criterion="excluded" tags={tags} criteria={criteria} onChange={onChange} />
        </View>
      )}
    </View>
  );
}

/** No flow (§ 3): the panel replaces the form on this screen. */
function NoFlowPanel({
  kind,
  criteria,
  tags,
}: {
  readonly kind: NoFlow;
  readonly criteria: FlowCriteria;
  readonly tags: readonly Tag[];
}) {
  const palette = usePalette();
  const hints = wideningHints(criteria);
  const title = useRef<unknown>(null);
  // The button that had the focus is gone: the focus goes to what happened, the title of the panel.
  useEffect(() => {
    const task = setTimeout(() => {
      const node = title.current ? findNodeHandle(title.current as never) : null;
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    }, focusDelayMillis);
    return () => clearTimeout(task);
  }, [kind]);
  return (
    <View style={[local.panel, { backgroundColor: palette.surface, borderColor: palette.divider }]}>
      <T ref={title as never} accessibilityRole="header" style={[local.panelTitle, { color: palette.text }]}>
        {kind === 'catalog-insufficient' ? labels.catalogInsufficient : labels.tooRestrictive}
      </T>
      {kind === 'catalog-insufficient' ? (
        <T style={[ui.intro, { color: palette.text }]}>{labels.catalogInsufficientDetail}</T>
      ) : (
        <>
          <CriteriaRecap criteria={criteria} tags={tags} />
          {hints.length > 0 && (
            <>
              <T style={[ui.intro, { color: palette.text }]}>{labels.wideningLead}</T>
              <View style={{ gap: spacing.xs }}>
                {hints.map((hint, index) => (
                  <T key={hint} style={[ui.intro, { color: palette.text }]}>
                    {`• ${hint}${index === hints.length - 1 ? '.' : ' ;'}`}
                  </T>
                ))}
              </View>
            </>
          )}
        </>
      )}
    </View>
  );
}

/**
 * The screen « Critères » (story 9b, 9b-generer-un-flow-mobile.md § 1): length, ceilings, tags, then « Générer un flow »
 * in the bottom bar; the panel without flow replaces the form. With a flow kept, the application opens on it (M1).
 */
export function CriteriaScreen({ onFlow }: { readonly onFlow: () => void }) {
  const palette = usePalette();
  const generator = useGenerator();
  const { criteria, setCriteria, noFlow, dock, generating, restored, state } = generator;
  const tagList = useTagList();
  const tags = (tagList.data ?? []).filter((tag) => !generator.gone.includes(tag.id));
  const [tagsOpen, setTagsOpen] = useState(false);
  const opened = useRef(false);

  useEffect(() => {
    if (!restored || opened.current) return;
    opened.current = true;
    if (state.shown) onFlow();
  }, [restored, state.shown, onFlow]);

  useEffect(() => {
    if (dock?.kind === 'tags-gone') setTagsOpen(true);
  }, [dock]);

  const generate = async () => {
    if ((await generator.generate(criteria)) === 'flow') onFlow();
  };

  return (
    <View style={[ui.screen, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={ui.content}>
        <View style={{ gap: spacing.sm }}>
          <T accessibilityRole="header" scale="title" style={[ui.h1, { color: palette.text }]}>
            {labels.generate}
          </T>
          {!noFlow && <T style={[ui.intro, { color: palette.textMuted }]}>{labels.intro}</T>}
        </View>
        {noFlow ? (
          <NoFlowPanel kind={noFlow} criteria={criteria} tags={tagList.data ?? []} />
        ) : (
          <>
            <Counter criteria={criteria} onChange={setCriteria} />
            <View style={{ gap: spacing.md }}>
              <T style={[ui.help, { color: palette.textMuted }]}>{labels.ceilingsHelp}</T>
              <Ceiling
                legend={labels.baseCeiling}
                tone="base"
                value={criteria.baseCeiling}
                onChange={(level) => setCriteria({ ...criteria, baseCeiling: level })}
              />
              <Ceiling
                legend={labels.flyerCeiling}
                tone="flyer"
                value={criteria.flyerCeiling}
                onChange={(level) => setCriteria({ ...criteria, flyerCeiling: level })}
              />
            </View>
            {tagList.isError ? (
              <View style={[local.note, { backgroundColor: palette.infoSurface }]}>
                <T style={[ui.help, { color: palette.text }]}>{labels.tagsNotLoaded}</T>
              </View>
            ) : (
              tags.length > 0 && (
                <TagsFold
                  tags={tags}
                  criteria={criteria}
                  onChange={setCriteria}
                  open={tagsOpen}
                  onToggle={() => setTagsOpen((open) => !open)}
                />
              )
            )}
          </>
        )}
      </ScrollView>
      {dock && dock.kind !== 'new-flow' && (
        <MessageDock dock={dock} tags={tagList.data ?? []} onBack={generator.backToPrevious} />
      )}
      <ActionBar>
        {noFlow ? (
          <Button
            testID="modifier-les-criteres"
            label={labels.changeCriteria}
            variant={noFlow === 'criteria-too-restrictive' ? 'primary' : 'secondary'}
            onPress={generator.changeCriteria}
          />
        ) : (
          <Button
            testID="generer-un-flow"
            label={generating ? labels.generating : labels.generate}
            variant="primary"
            busy={generating}
            onPress={() => void generate()}
          />
        )}
      </ActionBar>
    </View>
  );
}

const local = StyleSheet.create({
  counter: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  step: {
    width: sizes.control,
    height: sizes.control,
    borderRadius: radius.pill,
    borderWidth: sizes.borderWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sign: { fontFamily: typography.fontFamilies.bodyBold, fontSize: typography.size.lg },
  value: {
    minWidth: 64,
    textAlign: 'center',
    fontFamily: typography.fontFamilies.display,
    fontSize: typography.size.xl,
  },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    flexGrow: 1,
    flexBasis: sizes.tileMinWidth,
    minHeight: sizes.control,
    borderRadius: radius.md,
    borderWidth: sizes.borderWidth,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  fold: { borderWidth: sizes.borderWidth, borderRadius: radius.md },
  foldSummary: {
    minHeight: sizes.control,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  foldContent: { padding: spacing.md, gap: spacing.lg },
  tagBox: {
    minHeight: sizes.control,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: sizes.borderWidth,
  },
  note: { padding: spacing.md, borderRadius: radius.md },
  panel: { padding: spacing.lg, borderRadius: radius.lg, borderWidth: sizes.borderWidth, gap: spacing.md },
  panelTitle: { fontFamily: typography.fontFamilies.display, fontSize: typography.size.lg },
});
