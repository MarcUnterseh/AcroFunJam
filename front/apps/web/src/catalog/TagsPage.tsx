import {
  addTag,
  canManageTags,
  carriedByLabel,
  carriedRefusalLabel,
  changeTag,
  impliedRefusalLabel,
  pendingPoseCarrierLabel,
  removalQuestion,
  removeTag,
  scopeCarriedRefusalLabel,
  scopeNeededRefusalLabel,
  tagAnnouncements,
  tagAppliesToPoses,
  tagCarrierLabel,
  tagCounterLabel,
  tagDescriptionLength,
  tagDescriptionPolicy,
  tagFieldErrorMessage,
  tagLabels,
  tagNameLength,
  tagNamePolicy,
  tagScopeChoiceLabel,
  tagScopeLabel,
  tagScopes,
  type Tag,
  type TagCarrier,
  type TagCarriers,
  type TagEditError,
  type TagScope,
  type TagInput,
  type TagRemovalError,
} from '@acrofunjam/core';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useSession } from '../identity/SessionContext';
import { useAnnounce } from '../layout/Announcer';
import { focusPageTitle } from '../layout/focus';
import { Field, FormAlert, TextAreaField } from '../layout/form-controls';
import { Icon } from '../layout/Icon';
import { TileRadioGroup } from '../layout/TileRadioGroup';
import { catalogPath, posePath } from '../paths';
import { useTagListGateway } from './TagListContext';
import { tagListKey, useTags } from './useTags';

/** Not collapsed with the spaces around a hidden text (which would then vanish on screen). */
const noBreakSpace = String.fromCharCode(0xa0);

/** What the site tells after a refused change: under a field, or in an alert of the zone. */
type Refusal = {
  readonly name?: string;
  readonly description?: string;
  /** Story 9a: what the tag applies to was not chosen. */
  readonly scope?: string;
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
    // Story 9a: a narrower scope refused; told in full by ChangeRefusal (the carriers, the tags adding it).
    case 'carried':
    case 'scope-needed-by-impliers':
      return {};
    case 'scope-exceeds-implied':
      return { alert: tagLabels.scopeExceedsImplied };
  }
};

const scopeOptions = tagScopes.map((scope) => ({ value: scope, label: tagScopeChoiceLabel(scope) }));

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
  attempt = 0,
}: {
  readonly input: TagInput;
  readonly refusal: Refusal;
  readonly onChange: (input: TagInput) => void;
  readonly autoFocus?: boolean;
  /** Changes at each refused sending: the focus then goes to the first field in error (name, description, scope). */
  readonly attempt?: number;
}) {
  const scopeGroupName = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const scopeRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (attempt === 0) return;
    if (refusal.name) nameRef.current?.focus();
    else if (refusal.description) descriptionRef.current?.focus();
    else if (refusal.scope) scopeRef.current?.focus();
    // Only after a refused sending (attempt), not while typing: the refusal is read as it is then.
  }, [attempt]);
  return (
    <>
      <Field
        ref={nameRef}
        label={tagLabels.name}
        value={input.name}
        error={refusal.name}
        autoComplete="off"
        autoFocus={autoFocus}
        onChange={(event) => onChange({ ...input, name: event.target.value })}
        counter={<Counter length={tagNameLength(input.name)} maxLength={tagNamePolicy.maxLength} />}
      />
      <TextAreaField
        ref={descriptionRef}
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
      {/* Story 9a (ADR 0035): after the description, none chosen when adding (9a-etiquettes-des-poses.md, § 3). */}
      <TileRadioGroup<TagScope>
        legend={tagLabels.scope}
        name={`${scopeGroupName}-scope`}
        options={scopeOptions}
        value={input.scope}
        onChange={(scope) => onChange({ ...input, scope })}
        error={refusal.scope}
        firstRadioRef={scopeRef}
        layout="scope"
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

const emptyInput: TagInput = { name: '', description: '', scope: null };

/** Panel « Ajouter une étiquette » (8-etiquettes.md): the only primary button of the page at rest. */
function AddTagPanel() {
  const gateway = useTagListGateway();
  const change = useTagChange();
  const titleId = useId();
  const [input, setInput] = useState(emptyInput);
  const [refusal, setRefusal] = useState<Refusal>({});
  const [sending, setSending] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    const error = await change(() => addTag(gateway, input), tagAnnouncements.added(input.name.trim()));
    setSending(false);
    if (error) {
      setRefusal(refusalOf(error));
      setAttempt((n) => n + 1);
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
        <TagFields input={input} refusal={refusal} onChange={setInput} attempt={attempt} />
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
  const [input, setInput] = useState<TagInput>({
    name: tag.name,
    description: tag.description,
    scope: tag.scope,
  });
  const [refusal, setRefusal] = useState<Refusal>({});
  const [refused, setRefused] = useState<TagEditError | null>(null);
  const [sending, setSending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    const sent = input;
    const error = await change(
      () => changeTag(gateway, tag.id, sent),
      tagAnnouncements.saved(sent.name.trim()),
    );
    setSending(false);
    setRefused(error);
    if (error) setRefusal(refusalOf(error));
    else onClose();
  };

  return (
    <form className="tag__zone tag-form" noValidate onSubmit={(event) => void submit(event)}>
      {refused && <ChangeRefusal tag={tag} requested={input.scope} error={refused} />}
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

/** Story 9a: the published poses carrying the tag, each a link to its page (9a-etiquettes-des-poses.md, § 3). */
function CarryingPoses({ carriers }: { readonly carriers: TagCarriers }) {
  if (carriers.poses.length === 0) return null;
  return (
    <>
      <p className="tag__carriers-title">{tagLabels.catalogPoses}</p>
      <ul className="tag__carriers">
        {carriers.poses.map((pose) => (
          <li key={pose.id}>
            <Link to={posePath(pose.id)} className="tag__carrier-link">
              {pose.name}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

/** The pending proposals carrying the tag: transitions, then poses (story 9a), without link (they have no page). */
function PendingCarriers({ carriers }: { readonly carriers: TagCarriers }) {
  if (carriers.pendingProposals.length === 0 && carriers.pendingPoses.length === 0) return null;
  return (
    <>
      <p className="tag__carriers-title">{tagLabels.pendingProposals}</p>
      <ul className="tag__carriers">
        {carriers.pendingPoses.map((carrier) => (
          <li key={carrier.id}>{pendingPoseCarrierLabel(carrier)}</li>
        ))}
        {carriers.pendingProposals.map((carrier) => (
          <li key={carrier.id}>{tagCarrierLabel(carrier)}</li>
        ))}
      </ul>
    </>
  );
}

/** Everything carrying the tag, in the order of the screen: poses, transitions, pending proposals. */
function AllCarriers({ carriers }: { readonly carriers: TagCarriers }) {
  return (
    <>
      <CarryingPoses carriers={carriers} />
      <Carriers title={tagLabels.catalogTransitions} carriers={carriers.transitions} linked />
      <PendingCarriers carriers={carriers} />
    </>
  );
}

/** Story 9a: a narrower scope refused (ADR 0035), the input kept: what still carries the tag, or the tags adding it. */
function ChangeRefusal({
  tag,
  requested,
  error,
}: {
  readonly tag: Tag;
  readonly requested: TagScope | null;
  readonly error: TagEditError;
}) {
  switch (error.kind) {
    case 'carried': {
      // What it no longer applies to: the poses when it ceases to apply to them, otherwise the transitions.
      const withdrawn =
        tagAppliesToPoses(tag) && requested !== null && !tagAppliesToPoses({ scope: requested });
      return (
        <ZoneAlert>
          <p>{scopeCarriedRefusalLabel(tag.name, withdrawn ? 'poses' : 'transitions')}</p>
          <AllCarriers carriers={error} />
        </ZoneAlert>
      );
    }
    case 'scope-needed-by-impliers':
      return (
        <ZoneAlert>
          <p>{scopeNeededRefusalLabel(tag.name, error.impliedBy)}</p>
        </ZoneAlert>
      );
    default:
      return null;
  }
}

/** Why the removal was refused (alerte-formulaire.md, error variant): the carriers, or the tags implying it. */
function RemovalRefusal({ tag, error }: { readonly tag: Tag; readonly error: TagRemovalError }) {
  switch (error.kind) {
    case 'carried':
      return (
        <ZoneAlert>
          <p>{carriedRefusalLabel(tag.name)}</p>
          <AllCarriers carriers={error} />
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
      {/* Story 9a: what it applies to, for everybody, under the name (element-etiquette.md). */}
      <p className="tag__scope">{tagScopeLabel(tag.scope)}</p>
      {mode === 'edit' ? (
        <EditZone tag={tag} onClose={close} />
      ) : (
        <>
          <p className="tag__description">{tag.description}</p>
          {manages && <p className="tag__count">{carriedByLabel(tag)}</p>}
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
