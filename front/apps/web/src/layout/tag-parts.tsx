import {
  impliedTagNote,
  tagsImplying,
  transitionTagLabels,
  withImpliedTags,
  type ChoosableTag,
  type TagReference,
} from '@acrofunjam/core';
import { useId, type ReactNode, type Ref } from 'react';
import { ModifiedTag } from './form-controls';
import { Icon } from './Icon';

// Story 8 « Étiquettes »: the tags of a transition, as the Catalog and Contribution present and choose them
// (pilule-etiquette.md, repli-descriptions-etiquettes.md, groupe-cases-pastilles.md).

/**
 * The line « Étiquettes » of a transition: its tags as read-only pills, in the order received. Without any tag: nothing,
 * or « aucune » where the line is always present (the validation queue).
 */
export function TagLine({
  tags,
  showNone = false,
  inList = false,
}: {
  readonly tags: readonly TagReference[];
  readonly showNone?: boolean;
  /** Story 9a: a group of the description list of a pose (a div inside its dl), not a list of its own. */
  readonly inList?: boolean;
}) {
  const termId = useId();
  if (tags.length === 0 && !showNone) return null;
  const Root = inList ? 'div' : 'dl';
  return (
    <Root className="tag-line">
      <dt id={termId} className="tag-line__term">
        {transitionTagLabels.line}
      </dt>
      <dd className="tag-line__value">
        {tags.length === 0 ? (
          transitionTagLabels.none
        ) : (
          // role="list" restores the list semantics that some browsers drop with "list-style: none".
          <ul className="tag-line__list" role="list" aria-labelledby={termId}>
            {tags.map((tag) => (
              <li key={tag.id} className="tag-pill">
                {tag.name}
              </li>
            ))}
          </ul>
        )}
      </dd>
    </Root>
  );
}

/** A native fold giving the meaning of tags: name → description; nothing without any tag. */
export function TagMeanings({
  tags,
  summary,
  id,
}: {
  readonly tags: readonly (TagReference & { readonly description: string })[];
  readonly summary: string;
  /** The id of the list of descriptions, describing a group of checkboxes. */
  readonly id?: string;
}) {
  if (tags.length === 0) return null;
  return (
    <details className="tag-meanings">
      <summary className="tag-meanings__summary">
        {summary}
        <Icon name="chevronDown" />
      </summary>
      <dl id={id} className="tag-meanings__list">
        {tags.map((tag) => (
          <div key={tag.id}>
            <dt>{tag.name}</dt>
            <dd>{tag.description}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

/**
 * The tags of a transition to choose among the list, as checkboxes drawn as pills, in the order of the list. A tag adding
 * another (« pop » adds « dynamique ») checks it too, and a note says why; the fold gives the meaning of every tag.
 */
export function TagChoiceGroup({
  list,
  chosen,
  onChange,
  legend,
  help,
  reminder,
  tag,
  firstBoxRef,
}: {
  readonly list: readonly ChoosableTag[];
  readonly chosen: readonly TagReference[];
  readonly onChange: (tags: readonly TagReference[]) => void;
  readonly legend: string;
  readonly help?: string;
  /** « Proposées : dynamique, pop », in the adjustment zone. */
  readonly reminder?: ReactNode;
  /** Story 9a: « Modifiée » in the legend, once the chosen set differs from the current one (form of a revision). */
  readonly tag?: string | undefined;
  readonly firstBoxRef?: Ref<HTMLInputElement>;
}) {
  const ids = { help: useId(), reminder: useId(), note: useId(), meanings: useId(), tag: useId() };
  const chosenIds = new Set(chosen.map((tag) => tag.id));
  const toggle = (tag: ChoosableTag, checked: boolean) => {
    const next = checked ? [...chosenIds, tag.id] : [...chosenIds].filter((id) => id !== tag.id);
    onChange(withImpliedTags(list, next));
  };
  // A tag added by a chosen one (« dynamique » by « pop »): the note names every tag of the list adding it.
  const implied = list.filter(
    (tag) => chosenIds.has(tag.id) && list.some((t) => t.impliedTagId === tag.id && chosenIds.has(t.id)),
  );
  const describedBy = [
    tag && ids.tag,
    help && ids.help,
    reminder && ids.reminder,
    implied.length > 0 && ids.note,
    list.length > 0 && ids.meanings,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <fieldset className="tag-choice" aria-describedby={describedBy || undefined}>
      <legend className={`tag-choice__legend${tag ? ' tile-group__legend--tagged' : ''}`}>
        {legend}
        {tag && <ModifiedTag id={ids.tag} text={tag} />}
      </legend>
      {help && (
        <p id={ids.help} className="tag-choice__help">
          {help}
        </p>
      )}
      {reminder && (
        <p id={ids.reminder} className="tag-choice__help">
          {reminder}
        </p>
      )}
      <div className="tag-choice__boxes">
        {list.map((tag, index) => (
          <label key={tag.id} className="tag-choice__box">
            <input
              ref={index === 0 ? firstBoxRef : undefined}
              type="checkbox"
              name="tags"
              value={tag.id}
              checked={chosenIds.has(tag.id)}
              onChange={(event) => toggle(tag, event.target.checked)}
            />
            {tag.name}
          </label>
        ))}
      </div>
      {implied.length > 0 && (
        <div id={ids.note} className="tag-choice__note">
          <Icon name="info" />
          <div>
            {implied.map((tag) => (
              <p key={tag.id}>
                {impliedTagNote(
                  tag.name,
                  tagsImplying(list, tag.id).map((t) => t.name),
                )}
              </p>
            ))}
          </div>
        </div>
      )}
      <TagMeanings tags={list} summary={transitionTagLabels.listMeanings} id={ids.meanings} />
    </fieldset>
  );
}
