import {
  pendingRevisionTaggingLabel,
  poseTaggingLabels,
  poseTagChoices,
  tagPose,
  tagPoseButtonName,
  tagPoseFailureLabel,
  type PosePage,
  type TagPoseError,
  type TagReference,
} from '@acrofunjam/core';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useSession } from '../identity/SessionContext';
import { useAnnounce } from '../layout/Announcer';
import { FormAlert } from '../layout/form-controls';
import { Icon } from '../layout/Icon';
import { TagChoiceGroup } from '../layout/tag-parts';
import { validationPath } from '../paths';
import { usePoseTaggingGateway } from './PoseTaggingContext';
import { publishedPosesKey } from './usePublishedPoses';
import { tagListKey, useTags } from './useTags';

/**
 * « Étiqueter la pose » (story 9a, zone-etiqueter.md « Variante pose »), validators and administrators only: a secondary
 * button replaced once open by the tags of the list that apply to poses, the current ones checked. While a revision of the
 * pose is pending, the zone only tells to decide on it first (ADR 0036). Recorded: the zone closes, the page is read again.
 */
export function PoseTagging({ page }: { readonly page: PosePage }) {
  const gateway = usePoseTaggingGateway();
  const queryClient = useQueryClient();
  const announce = useAnnounce();
  const { sessionExpired } = useSession();
  const { data: fullList, error: listError, refetch } = useTags();
  const list = useMemo(() => fullList && poseTagChoices(fullList), [fullList]);
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<readonly TagReference[]>(page.tags);
  const [error, setError] = useState<TagPoseError | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const firstBox = useRef<HTMLInputElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const [focus, setFocus] = useState<'button' | 'group' | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (focus === 'button') button.current?.focus();
    else if (focus === 'group') (firstBox.current ?? cancel.current)?.focus();
    setFocus(null);
  }, [focus]);

  const start = () => {
    setChosen(page.tags);
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
    const result = await tagPose(
      gateway,
      page.id,
      chosen.map((tag) => tag.id),
    );
    if (!result.ok) {
      setSaving(false);
      setAttempt((n) => n + 1);
      setError(result.error);
      if (result.error.kind === 'session-expired') sessionExpired();
      // A tag gone or narrowed meanwhile: the list is read again, without it.
      if (result.error.kind === 'tags-not-in-list' || result.error.kind === 'tags-not-applicable') {
        const gone = new Set(result.error.tagIds);
        setChosen((current) => current.filter((tag) => !gone.has(tag.id)));
        await queryClient.invalidateQueries({ queryKey: tagListKey });
      }
      return;
    }
    // The page read again shows the tags; the cards of the catalog and the counts of the list change too.
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: publishedPosesKey }),
      queryClient.invalidateQueries({ queryKey: tagListKey }),
    ]);
    setSaving(false);
    close();
    announce(poseTaggingLabels.saved);
  };

  if (!open)
    return (
      <div className="pose-tags__manage">
        <button ref={button} type="button" className="button button--secondary" onClick={start}>
          <span aria-hidden="true">{poseTaggingLabels.tag}</span>
          <span className="visually-hidden">{tagPoseButtonName(page.name)}</span>
        </button>
      </div>
    );

  if (page.pendingRevision)
    return (
      <div className="pose-tags__manage">
        <div className="tagging-zone pose-tagging-zone" role="group" aria-labelledby={titleId}>
          <p id={titleId} className="tagging-zone__title">
            {poseTaggingLabels.legend}
          </p>
          <FormAlert variant="info">
            <Icon name="info" />
            <div className="form-alert__content">
              <p>{pendingRevisionTaggingLabel(page.name)}</p>
              <Link to={validationPath} className="form-alert__link">
                {poseTaggingLabels.validationLink}
              </Link>
            </div>
          </FormAlert>
          <div className="tagging-zone__actions">
            <button ref={cancel} type="button" className="button button--secondary" onClick={close}>
              {poseTaggingLabels.cancel}
            </button>
          </div>
        </div>
      </div>
    );

  return (
    <div className="pose-tags__manage">
      <form className="tagging-zone pose-tagging-zone" noValidate onSubmit={(event) => void save(event)}>
        {error && (
          <FormAlert key={attempt} variant={error.kind === 'session-expired' ? 'info' : 'error'}>
            <Icon name={error.kind === 'session-expired' ? 'info' : 'error'} />
            <div className="form-alert__content">
              <p>{tagPoseFailureLabel(error)}</p>
            </div>
          </FormAlert>
        )}
        {list ? (
          <TagChoiceGroup
            list={list}
            chosen={chosen}
            onChange={setChosen}
            legend={poseTaggingLabels.legend}
            firstBoxRef={firstBox}
          />
        ) : listError ? (
          <FormAlert>
            <Icon name="error" />
            <div className="form-alert__content">
              <p>{poseTaggingLabels.loadingFailed}</p>
              <button type="button" className="button button--secondary" onClick={() => void refetch()}>
                {poseTaggingLabels.retry}
              </button>
            </div>
          </FormAlert>
        ) : (
          <p role="status">{poseTaggingLabels.loading}</p>
        )}
        <div className="tagging-zone__actions">
          <button
            type="submit"
            className="button button--primary"
            aria-disabled={saving || !list || undefined}
          >
            {saving ? poseTaggingLabels.saving : poseTaggingLabels.save}
          </button>
          <button ref={cancel} type="button" className="button button--secondary" onClick={close}>
            {poseTaggingLabels.cancel}
          </button>
        </div>
      </form>
    </div>
  );
}
