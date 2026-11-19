import {
  transitionTagChoices,
  tagTransition,
  tagTransitionButtonName,
  tagTransitionFailureLabel,
  transitionTaggingLabels,
  type LinkedTransition,
  type TagReference,
  type TagTransitionError,
} from '@acrofunjam/core';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useSession } from '../identity/SessionContext';
import { useAnnounce } from '../layout/Announcer';
import { FormAlert } from '../layout/form-controls';
import { Icon } from '../layout/Icon';
import { TagChoiceGroup } from '../layout/tag-parts';
import { useTransitionTaggingGateway } from './TransitionTaggingContext';
import { publishedPosesKey } from './usePublishedPoses';
import { tagListKey, useTags } from './useTags';

/** Every page of a pose and the catalog: a washing machine, or the other pose of the transition, show its tags too. */

/**
 * The zone « Étiqueter » of a published transition (zone-etiqueter.md), for a validator or an administrator: the button,
 * replaced once open by the tags of the list, the current ones checked. Recorded: the zone closes, the page is read
 * again (the line « Étiquettes » is the proof), and « Étiquettes enregistrées. » is announced.
 */
export function TransitionTagging({
  transition,
  spokenTitle,
}: {
  readonly transition: LinkedTransition;
  /** « Pop to Bird », « de Bird vers Folded Leaf »: completes the name of the button. */
  readonly spokenTitle: string;
}) {
  const gateway = useTransitionTaggingGateway();
  const queryClient = useQueryClient();
  const announce = useAnnounce();
  const { sessionExpired } = useSession();
  const { data: fullList, error: listError, refetch } = useTags();
  // Story 9a (ADR 0035): only the tags that apply to transitions.
  const list = useMemo(() => fullList && transitionTagChoices(fullList), [fullList]);
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<readonly TagReference[]>(transition.tags);
  const [error, setError] = useState<TagTransitionError | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const firstBox = useRef<HTMLInputElement>(null);
  const [focus, setFocus] = useState<'button' | 'group' | null>(null);

  useEffect(() => {
    if (focus === 'button') button.current?.focus();
    else if (focus === 'group') firstBox.current?.focus();
    setFocus(null);
  }, [focus]);

  const start = () => {
    setChosen(transition.tags);
    setError(null);
    setOpen(true);
    setFocus('group');
  };

  const close = () => {
    setOpen(false);
    setError(null);
    setFocus('button');
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (saving || !list) return;
    setSaving(true);
    const result = await tagTransition(
      gateway,
      transition.id,
      chosen.map((tag) => tag.id),
    );
    if (!result.ok) {
      setSaving(false);
      setAttempt((n) => n + 1);
      setError(result.error);
      if (result.error.kind === 'session-expired') sessionExpired();
      // A tag gone meanwhile: the list is read again, without it.
      if (result.error.kind === 'tags-not-in-list') {
        const gone = new Set(result.error.tagIds);
        setChosen((current) => current.filter((tag) => !gone.has(tag.id)));
        await queryClient.invalidateQueries({ queryKey: tagListKey });
      }
      return;
    }
    // The page read again shows the tags; the counts of the list change too.
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: publishedPosesKey }),
      queryClient.invalidateQueries({ queryKey: tagListKey }),
    ]);
    setSaving(false);
    close();
    announce(transitionTaggingLabels.saved);
  };

  return (
    <div className="transition__manage">
      {!open ? (
        <button ref={button} type="button" className="button button--secondary" onClick={start}>
          <span aria-hidden="true">{transitionTaggingLabels.tag}</span>
          <span className="visually-hidden">{tagTransitionButtonName(spokenTitle)}</span>
        </button>
      ) : (
        <form className="tagging-zone" noValidate onSubmit={(event) => void save(event)}>
          {error && (
            <FormAlert key={attempt} variant={error.kind === 'session-expired' ? 'info' : 'error'}>
              <Icon name={error.kind === 'session-expired' ? 'info' : 'error'} />
              <div className="form-alert__content">
                <p>{tagTransitionFailureLabel(error)}</p>
              </div>
            </FormAlert>
          )}
          {list ? (
            <TagChoiceGroup
              list={list}
              chosen={chosen}
              onChange={setChosen}
              legend={transitionTaggingLabels.legend}
              firstBoxRef={firstBox}
            />
          ) : listError ? (
            <FormAlert>
              <Icon name="error" />
              <div className="form-alert__content">
                <p>{transitionTaggingLabels.loadingFailed}</p>
                <button type="button" className="button button--secondary" onClick={() => void refetch()}>
                  {transitionTaggingLabels.retry}
                </button>
              </div>
            </FormAlert>
          ) : (
            <p role="status">{transitionTaggingLabels.loading}</p>
          )}
          <div className="tagging-zone__actions">
            <button
              type="submit"
              className="button button--primary"
              aria-disabled={saving || !list || undefined}
            >
              {saving ? transitionTaggingLabels.saving : transitionTaggingLabels.save}
            </button>
            <button type="button" className="button button--secondary" onClick={close}>
              {transitionTaggingLabels.cancel}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
