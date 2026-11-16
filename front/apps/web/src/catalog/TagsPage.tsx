import {
  addTag,
  canManageTags,
  carriedByLabel,
  carriedRefusalLabel,
  changeTag,
  impliedRefusalLabel,
  listTags,
  removalQuestion,
  removeTag,
  tagAnnouncements,
  tagCarrierLabel,
  tagCounterLabel,
  tagDescriptionLength,
  tagDescriptionPolicy,
  tagFieldErrorMessage,
  tagLabels,
  tagNameLength,
  tagNamePolicy,
  type Tag,
  type TagCarrier,
  type TagEditError,
  type TagInput,
  type TagListFailure,
  type TagRemovalError,
} from '@acrofunjam/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useSession } from '../identity/SessionContext';
import { useAnnounce } from '../layout/Announcer';
import { focusPageTitle } from '../layout/focus';
import { Field, FormAlert, TextAreaField } from '../layout/form-controls';
import { Icon } from '../layout/Icon';
import { catalogPath, posePath } from '../paths';
import { useTagListGateway } from './TagListContext';

/** Not collapsed with the spaces around a hidden text (which would then vanish on screen). */
const noBreakSpace = String.fromCharCode(0xa0);

/** The list could not be read: carries the failure of the use case. */
class TagListLoadingFailed extends Error {
  readonly failure: TagListFailure;

  constructor(failure: TagListFailure) {
    super(failure.kind);
    this.failure = failure;
    this.name = 'TagListLoadingFailed';
  }
}

/** Cache key of the list of tags, under the catalog. */
export const tagListKey = ['catalog', 'tags'] as const;

function useTags() {
  const gateway = useTagListGateway();
  return useQuery<readonly Tag[], TagListLoadingFailed>({
    queryKey: tagListKey,
    queryFn: async () => {
      const result = await listTags(gateway);
      if (!result.ok) throw new TagListLoadingFailed(result.error);
      return result.value;
    },
    // As the catalog: the failure is shown at once with « Réessayer », even when the browser believes it is offline.
    retry: false,
    networkMode: 'always',
  });
}

/** What the site tells after a refused change: under a field, or in an alert of the zone. */
type Refusal = {
  readonly name?: string;
  readonly description?: string;
  readonly alert?: string;
};

const refusalOf = (error: TagEditError): Refusal => {
  switch (error.kind) {
    case 'invalid-input':
      return Object.fromEntries(error.errors.map((e) => [e.field, tagFieldErrorMessage(e.code)]));
    case 'name-taken':
      return { name: tagLabels.nameTaken };
    case 'not-found':
      return { alert: tagLabels.notFound };
    case 'session-expired':
      return { alert: tagLabels.sessionExpired };
    case 'role-withdrawn':
      return { alert: tagLabels.roleWithdrawn };
    case 'unreachable':
      return { alert: tagLabels.unreachable };
    case 'outdated':
      return { alert: tagLabels.outdated };
  }
};

/** A counter always shown under a field of a tag (short limits); over the limit, in danger with its icon. */
function Counter({ length, maxLength }: { readonly length: number; readonly maxLength: number }) {
  const over = length > maxLength;
  return (
    <p className={`field__counter${over ? ' field__counter--over' : ''}`}>
      {over && <Icon name="error" />}
      {tagCounterLabel(length, maxLength)}
    </p>
  );
}

/** The name and the description of a tag, with their counters and the rules they break. */
function TagFields({
  input,
  refusal,
  onChange,
  autoFocus = false,
}: {
  readonly input: TagInput;
  readonly refusal: Refusal;
  readonly onChange: (input: TagInput) => void;
  readonly autoFocus?: boolean;
}) {
  return (
    <>
      <Field
        label={tagLabels.name}
        value={input.name}
        error={refusal.name}
        autoComplete="off"
        autoFocus={autoFocus}
        onChange={(event) => onChange({ ...input, name: event.target.value })}
        counter={<Counter length={tagNameLength(input.name)} maxLength={tagNamePolicy.maxLength} />}
      />
      <TextAreaField
        label={tagLabels.description}
        help={tagLabels.descriptionHelp}
        value={input.description}
        rows={3}
        error={refusal.description}
        onChange={(event) => onChange({ ...input, description: event.target.value })}
        counter={
          <Counter
            length={tagDescriptionLength(input.description)}
            maxLength={tagDescriptionPolicy.maxLength}
          />
        }
      />
    </>
  );
}

function ZoneAlert({ children }: { readonly children: ReactNode }) {
  return (
    <FormAlert>
      <Icon name="error" />
      <div className="form-alert__content">{children}</div>
    </FormAlert>
  );
}

/**
 * Sends a change of the list and reads the list again once recorded; a refusal is returned to the zone. An expired
 * session ends on the site too (ADR 0018).
 */
function useTagChange() {
  const queryClient = useQueryClient();
  const announce = useAnnounce();
  const { sessionExpired } = useSession();
  return async <E extends { readonly kind: string }>(
    send: () => Promise<{ ok: true; value: unknown } | { ok: false; error: E }>,
    announcement: string,
  ): Promise<E | null> => {
    const result = await send();
    if (!result.ok) {
      if (result.error.kind === 'session-expired') sessionExpired();
      if (result.error.kind === 'not-found') await queryClient.invalidateQueries({ queryKey: tagListKey });
      return result.error;
    }
    await queryClient.invalidateQueries({ queryKey: tagListKey });
    announce(announcement);
    return null;
  };
}

const emptyInput: TagInput = { name: '', description: '' };

/** Panel « Ajouter une étiquette » (8-etiquettes.md): the only primary button of the page at rest. */
function AddTagPanel() {
  const gateway = useTagListGateway();
  const change = useTagChange();
  const titleId = useId();
  const [input, setInput] = useState(emptyInput);
  const [refusal, setRefusal] = useState<Refusal>({});
  const [sending, setSending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    const error = await change(() => addTag(gateway, input), tagAnnouncements.added(input.name.trim()));
    setSending(false);
    if (error) {
      setRefusal(refusalOf(error));
      return;
    }
    setInput(emptyInput);
    setRefusal({});
  };

  return (
    <section className="tag-panel" aria-labelledby={titleId}>
      <h2 id={titleId}>{tagLabels.addTitle}</h2>
      <form className="tag-form" noValidate onSubmit={(event) => void submit(event)}>
        {refusal.alert && (
          <ZoneAlert>
            <p>{refusal.alert}</p>
          </ZoneAlert>
        )}
        <TagFields input={input} refusal={refusal} onChange={setInput} />
        <div className="tag-form__actions">
          <button type="submit" className="button button--primary" aria-disabled={sending || undefined}>
            {sending ? tagLabels.adding : tagLabels.add}
          </button>
        </div>
      </form>
    </section>
  );
}

type Opened = { readonly id: string; readonly mode: 'edit' | 'remove' } | null;

/** Modifier en place (element-etiquette.md): the title keeps the current name until it is saved. */
function EditZone({ tag, onClose }: { readonly tag: Tag; readonly onClose: () => void }) {
  const gateway = useTagListGateway();
  const change = useTagChange();
  const [input, setInput] = useState<TagInput>({ name: tag.name, description: tag.description });
  const [refusal, setRefusal] = useState<Refusal>({});
  const [sending, setSending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    const error = await change(
      () => changeTag(gateway, tag.id, input),
      tagAnnouncements.saved(input.name.trim()),
    );
    setSending(false);
    if (error) setRefusal(refusalOf(error));
    else onClose();
  };

  return (
    <form className="tag__zone tag-form" noValidate onSubmit={(event) => void submit(event)}>
      {refusal.alert && (
        <ZoneAlert>
          <p>{refusal.alert}</p>
        </ZoneAlert>
      )}
      <TagFields input={input} refusal={refusal} onChange={setInput} autoFocus />
      <div className="tag-form__actions">
        <button type="submit" className="button button--primary" aria-disabled={sending || undefined}>
          {sending ? tagLabels.saving : tagLabels.save}
        </button>
        <button type="button" className="button button--secondary" onClick={onClose}>
          {tagLabels.cancel}
        </button>
      </div>
    </form>
  );
}

function Carriers({
  title,
  carriers,
  linked,
}: {
  readonly title: string;
  readonly carriers: readonly TagCarrier[];
  /** A published transition links to the page of its start pose; a pending proposal has no page. */
  readonly linked: boolean;
}) {
  if (carriers.length === 0) return null;
  return (
    <>
      <p className="tag__carriers-title">{title}</p>
      <ul className="tag__carriers">
        {carriers.map((carrier) => {
          return (
            <li key={carrier.id}>
              <span>{tagCarrierLabel(carrier)}</span>{' '}
              {linked && (
                <Link to={posePath(carrier.fromPose.id)} className="tag__carrier-link">
                  {/* A no-break space: around the hidden text, ordinary spaces collapse and vanish on screen. */}
                  {tagLabels.seePose + noBreakSpace}
                  <span className="visually-hidden">{tagLabels.seePoseHidden + noBreakSpace}</span>
                  {carrier.fromPose.name}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** Why the removal was refused (alerte-formulaire.md, error variant): the carriers, or the tags implying it. */
function RemovalRefusal({ tag, error }: { readonly tag: Tag; readonly error: TagRemovalError }) {
  switch (error.kind) {
    case 'carried':
      return (
        <ZoneAlert>
          <p>{carriedRefusalLabel(tag.name)}</p>
          <Carriers title={tagLabels.catalogTransitions} carriers={error.transitions} linked />
          <Carriers title={tagLabels.pendingProposals} carriers={error.pendingProposals} linked={false} />
          <p>{tagLabels.carriedAdvice}</p>
        </ZoneAlert>
      );
    case 'implied':
      return (
        <ZoneAlert>
          <p>{impliedRefusalLabel(tag.name, error.impliedBy)}</p>
        </ZoneAlert>
      );
    default:
      return (
        <ZoneAlert>
          <p>{refusalOf(error).alert}</p>
        </ZoneAlert>
      );
  }
}

/** Retirer : confirmation en place, then the refusal when the tag cannot be removed. */
function RemoveZone({ tag, onClose }: { readonly tag: Tag; readonly onClose: () => void }) {
  const gateway = useTagListGateway();
  const change = useTagChange();
  const [refused, setRefused] = useState<TagRemovalError | null>(null);
  const [sending, setSending] = useState(false);

  const confirm = async () => {
    if (sending) return;
    setSending(true);
    const error = await change(() => removeTag(gateway, tag.id), tagAnnouncements.removed(tag.name));
    setSending(false);
    if (error) setRefused(error);
  };

  if (refused)
    return (
      <div className="tag__zone">
        <RemovalRefusal tag={tag} error={refused} />
        <div className="tag-form__actions">
          <button type="button" className="button button--secondary" onClick={onClose}>
            {tagLabels.close}
          </button>
        </div>
      </div>
    );

  return (
    <div className="tag__zone">
      <p className="tag__question">{removalQuestion(tag.name)}</p>
      <p className="tag__consequence">{tagLabels.removalConsequence}</p>
      <div className="tag-form__actions">
        <button
          type="button"
          className="button button--primary"
          aria-disabled={sending || undefined}
          onClick={() => void confirm()}
        >
          {sending ? tagLabels.removing : tagLabels.confirmRemoval}
        </button>
        <button type="button" className="button button--secondary" onClick={onClose}>
          {tagLabels.cancel}
        </button>
      </div>
    </div>
  );
}

/** An entry of the glossary (element-etiquette.md); for a person who manages, its count and its actions, in place. */
function TagItem({
  tag,
  manages,
  opened,
  onOpen,
}: {
  readonly tag: Tag;
  readonly manages: boolean;
  readonly opened: Opened;
  readonly onOpen: (opened: Opened) => void;
}) {
  const mode = opened?.id === tag.id ? opened.mode : null;
  const close = () => onOpen(null);
  return (
    <li className="tag">
      <h2 className="tag__name">{tag.name}</h2>
      {mode === 'edit' ? (
        <EditZone tag={tag} onClose={close} />
      ) : (
        <>
          <p className="tag__description">{tag.description}</p>
          {manages && <p className="tag__count">{carriedByLabel(tag.transitionCount)}</p>}
          {manages &&
            (mode === 'remove' ? (
              <RemoveZone tag={tag} onClose={close} />
            ) : (
              <div className="tag__actions">
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={() => onOpen({ id: tag.id, mode: 'edit' })}
                >
                  {tagLabels.edit} <span className="visually-hidden">{tag.name}</span>
                </button>
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={() => onOpen({ id: tag.id, mode: 'remove' })}
                >
                  {tagLabels.remove} <span className="visually-hidden">{tag.name}</span>
                </button>
              </div>
            ))}
        </>
      )}
    </li>
  );
}

function LoadingFailure({ retrying, onRetry }: { readonly retrying: boolean; readonly onRetry: () => void }) {
  return (
    <div className="form-alert">
      <Icon name="error" />
      <div className="form-alert__content">
        <p role="alert">{tagLabels.loadingFailed}</p>
        <button
          type="button"
          className="button button--secondary"
          aria-disabled={retrying || undefined}
          onClick={() => (retrying ? undefined : onRetry())}
        >
          {retrying ? tagLabels.retrying : tagLabels.retry}
        </button>
      </div>
    </div>
  );
}

/**
 * Page « Étiquettes » (docs/design/ecrans/8-etiquettes.md): the glossary of the tags, public; a validator or an
 * administrator (capability "manage-tags") adds, renames, describes and removes them, one zone open at a time.
 */
export function TagsPage() {
  const { session } = useSession();
  const manages = canManageTags(session);
  const { data: tags, error, refetch } = useTags();
  const announce = useAnnounce();
  const [retrying, setRetrying] = useState(false);
  const [opened, setOpened] = useState<Opened>(null);

  useEffect(() => {
    document.title = `${tagLabels.title} – AcroFunJam`;
  }, []);

  const retry = async () => {
    setRetrying(true);
    const result = await refetch();
    setRetrying(false);
    if (result.isError) announce(tagLabels.loadingFailed);
    else focusPageTitle();
  };

  let content: ReactNode;
  if (tags === undefined && (error || retrying))
    content = <LoadingFailure retrying={retrying} onRetry={() => void retry()} />;
  else if (tags === undefined)
    content = (
      <p role="status" className="follow-up-page__status">
        {tagLabels.loading}
      </p>
    );
  else if (tags.length === 0) content = <p className="tag-list__empty">{tagLabels.empty}</p>;
  else
    content = (
      // role="list" restores the list semantics that some browsers drop with "list-style: none".
      <ul className="tag-list" role="list">
        {tags.map((tag) => (
          <TagItem key={tag.id} tag={tag} manages={manages} opened={opened} onOpen={setOpened} />
        ))}
      </ul>
    );

  return (
    <section className="follow-up-page tags-page">
      <Link to={catalogPath} className="back-link">
        <Icon name="chevronLeft" />
        {tagLabels.back}
      </Link>
      <h1 tabIndex={-1}>{tagLabels.title}</h1>
      <p className="follow-up-page__introduction">{tagLabels.introduction}</p>
      {manages && <AddTagPanel />}
      {manages && <h2 className="tags-page__list-title">{tagLabels.listTitle}</h2>}
      {content}
    </section>
  );
}
