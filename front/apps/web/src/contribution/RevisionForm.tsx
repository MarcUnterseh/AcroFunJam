import {
  changedFields,
  checkPoseName,
  currentValueLabel,
  keepRevisionInput,
  myProposalsLabels,
  openPoseRevision,
  rebaseRevisionInput,
  poseNameLength,
  proposalFieldErrorLabel,
  proposalLabels,
  proposePoseRevision,
  publishesDirectly,
  restoreRevisionInput,
  revisionDocumentTitle,
  revisionLabels,
  revisionMessageErrorLabel,
  revisionNameRefusalLabel,
  validatePoseRevision,
  validatorTextLength,
  type OpenPoseRevisionError,
  type PendingRevision,
  type PoseFieldValue,
  type PoseRevisionInput,
  type PoseValueChange,
  type ProposalField,
  type ProposalFieldError,
  type ProposalOutcome,
  type RevisablePose,
  type RevisionMessageError,
} from '@acrofunjam/core';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type RefObject } from 'react';
import { Link } from 'react-router';
import { publishedPosesKey } from '../catalog/usePublishedPoses';
import { useSession } from '../identity/SessionContext';
import { useAnnounce } from '../layout/Announcer';
import { focusPageTitle } from '../layout/focus';
import { Field, FormAlert, TextAreaField } from '../layout/form-controls';
import { Icon } from '../layout/Icon';
import { catalogPath, myProposalsPath, revisionPath, signInPath } from '../paths';
import { nameCounter, NameCounter } from './NameCounter';
import { answerOf, answers, levels } from './pose-choices';
import { PoseChangeList } from './PoseChangeList';
import { usePoseRevision } from './PoseRevisionContext';
import { RevisionSuccess } from './RevisionSuccess';
import { TileRadioGroup } from './TileRadioGroup';
import { useCounterAnnouncement } from './useCounterAnnouncement';
import { validatorTextCounter, ValidatorTextCounter } from './ValidatorTextCounter';

type Opening =
  | { readonly status: 'loading' }
  | { readonly status: 'failed'; readonly error: OpenPoseRevisionError }
  | { readonly status: 'loaded'; readonly pose: RevisablePose; readonly pending: PendingRevision | null };

/** Global alerts, at the top of the form; the input is kept for each of them. */
type Alert =
  | 'changes-nothing'
  | 'pose-changed'
  | 'unreachable'
  | 'outdated'
  | 'session-expired'
  | 'revision-already-pending'
  | 'not-found';

type NameRefusal = 'name-already-in-catalog' | 'name-already-pending';

const valueOf = (pose: RevisablePose, field: ProposalField) =>
  ({ field, value: pose[field] }) as PoseFieldValue;

const inputOf = (pose: RevisablePose): PoseRevisionInput => ({ values: pose, message: '' });

/**
 * A block in place of the form (6-proposer-une-modification.md): nothing to type, only a way out. Shown as the page
 * opens, it is announced politely; in place of a form that was sent, it takes the focus (the button is gone).
 */
function NothingToType({
  text,
  seeMyProposals = false,
  focused = false,
}: {
  readonly text: string;
  readonly seeMyProposals?: boolean;
  readonly focused?: boolean;
}) {
  const announce = useAnnounce();
  const block = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focused) block.current?.focus();
    else announce(text);
  }, [focused, text, announce]);
  return (
    <>
      <div
        ref={block}
        tabIndex={focused ? -1 : undefined}
        className="form-alert form-alert--info revision-page__block"
      >
        <Icon name="info" />
        <div className="form-alert__content">
          <p>{text}</p>
          {seeMyProposals && <Link to={myProposalsPath}>{myProposalsLabels.seeMyProposals}</Link>}
        </div>
      </div>
      <Link to={catalogPath} className="button button--secondary link-button revision-page__exit">
        {revisionLabels.seeCatalog}
      </Link>
    </>
  );
}

/**
 * Form « Proposer une modification » (docs/design/ecrans/6-proposer-une-modification.md): the pose read with its
 * version, prefilled with its current values, each reminded (« Actuellement : … ») and each changed field tagged
 * « Modifiée ». A pose that has a pending revision, or that left the catalog, is told in place of the form. A
 * validator or an administrator checks a summary « actuellement → nouveau », then publishes directly. An expired
 * session, an outage or an outdated site keep the input of the pose for its owner (ADR 0019); a pose changed
 * meanwhile shows its new values, keeping the input.
 */
export function RevisionForm({
  poseId,
  owner,
  sessionExpired,
}: {
  readonly poseId: string;
  /** Address of the person the form was shown to. */
  readonly owner: string;
  readonly sessionExpired: boolean;
}) {
  const { gateway, store } = usePoseRevision();
  const { session, sessionExpired: expireSession } = useSession();
  const queryClient = useQueryClient();
  const announce = useAnnounce();
  const announceNameCounter = useCounterAnnouncement(nameCounter);
  const announceMessageCounter = useCounterAnnouncement(validatorTextCounter);
  const [opening, setOpening] = useState<Opening>({ status: 'loading' });
  const [retryingOpening, setRetryingOpening] = useState(false);
  const [pose, setPose] = useState<RevisablePose | null>(null);
  const [input, setInput] = useState<PoseRevisionInput | null>(null);
  const [errors, setErrors] = useState<readonly ProposalFieldError[]>([]);
  const [messageError, setMessageError] = useState<RevisionMessageError | null>(null);
  const [nameRefusal, setNameRefusal] = useState<NameRefusal | null>(null);
  const [alert, setAlert] = useState<Alert | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<readonly PoseValueChange[] | null>(null);
  const [outcome, setOutcome] = useState<ProposalOutcome | null>(null);
  /** Refused when sent, nothing to type any more: the form is replaced by a block. */
  const [closedBy, setClosedBy] = useState<'revision-already-pending' | 'not-found' | null>(null);
  const [focus, setFocus] = useState<
    'retry' | 'summary' | 'name' | 'message' | 'alert' | Exclude<ProposalField, 'name'> | null
  >(null);
  const submitting = useRef(false);
  const restored = useRef(false);
  const mounted = useRef(true);
  const refs = {
    name: useRef<HTMLInputElement>(null),
    retry: useRef<HTMLButtonElement>(null),
    summary: useRef<HTMLHeadingElement>(null),
    message: useRef<HTMLTextAreaElement>(null),
    alert: useRef<HTMLDivElement>(null),
  };
  const firstRadios: Record<Exclude<ProposalField, 'name'>, RefObject<HTMLInputElement | null>> = {
    baseDifficulty: useRef<HTMLInputElement>(null),
    flyerDifficulty: useRef<HTMLInputElement>(null),
    canStartFlow: useRef<HTMLInputElement>(null),
    canEndFlow: useRef<HTMLInputElement>(null),
  };
  const focusable = { ...refs, ...firstRadios };
  const ids = {
    box: useId(),
    introduction: useId(),
    startHelp: useId(),
    endHelp: useId(),
    poseLine: useId(),
  };
  // Fixed when the form is shown: a session that expires meanwhile does not turn the form of a validator into
  // the one of a user.
  const [directly] = useState(() =>
    publishesDirectly(session.status === 'signedIn' ? session.capabilities : []),
  );
  const expired = sessionExpired || alert === 'session-expired';
  const inputKept = expired || alert === 'unreachable' || alert === 'outdated';

  const open = useCallback(async () => {
    const answer = await openPoseRevision(gateway, poseId);
    if (!mounted.current) return null;
    if (answer.ok) {
      setPose(answer.value.pose);
      setInput((current) => current ?? inputOf(answer.value.pose));
      setOpening({ status: 'loaded', ...answer.value });
    } else setOpening({ status: 'failed', error: answer.error });
    return answer;
  }, [gateway, poseId]);

  useEffect(() => {
    mounted.current = true;
    void open();
    return () => {
      mounted.current = false;
    };
  }, [open]);

  // The title of the document names the pose, once known.
  const name = pose?.name;
  useEffect(() => {
    if (name) document.title = `${revisionDocumentTitle(name)} – AcroFunJam`;
  }, [name]);

  // The input kept in the tab for this pose (after an expired session or an outage) is given back once, to its owner.
  const loadedPoseId = opening.status === 'loaded' ? opening.pose.id : null;
  useEffect(() => {
    if (!loadedPoseId || restored.current) return;
    restored.current = true;
    const kept = restoreRevisionInput(store, loadedPoseId, owner);
    if (!kept) return;
    setInput(kept);
    announce(revisionLabels.inputRestored);
  }, [loadedPoseId, store, owner, announce]);

  // While the input is said to be kept (expired session, outage), what the person keeps typing is kept too.
  useEffect(() => {
    if (inputKept && input && pose) keepRevisionInput(store, pose.id, input, owner);
  }, [inputKept, input, pose, store, owner]);

  // Signed in again (another tab): the "session expired" alert no longer applies.
  useEffect(() => {
    if (session.status === 'signedIn')
      setAlert((current) => (current === 'session-expired' ? null : current));
  }, [session.status]);

  useEffect(() => {
    if (!focus) return;
    focusable[focus].current?.focus();
    setFocus(null);
  }, [focus]);

  // The session expired as the form opened: the session ends on the site too, which then tells it in the form.
  const openingExpired = opening.status === 'failed' && opening.error.kind === 'session-expired';
  useEffect(() => {
    if (openingExpired) expireSession();
  }, [openingExpired, expireSession]);

  const retryOpening = async () => {
    setRetryingOpening(true);
    const answer = await open();
    setRetryingOpening(false);
    if (answer?.ok) focusPageTitle();
    else announce(revisionLabels.loadingFailed);
  };

  if (opening.status === 'loading')
    return (
      <p role="status" className="follow-up-page__status">
        {revisionLabels.loading}
      </p>
    );

  if (opening.status === 'failed') {
    switch (opening.error.kind) {
      case 'not-found':
        return <NothingToType text={revisionLabels.notFound} />;
      case 'outdated':
        return (
          <div className="form-alert">
            <Icon name="error" />
            <div className="form-alert__content">
              <p role="alert">{revisionLabels.loadingOutdated}</p>
              <button type="button" className="button button--secondary" onClick={() => location.reload()}>
                {revisionLabels.reload}
              </button>
            </div>
          </div>
        );
      case 'session-expired':
        return (
          <FormAlert variant="info">
            <Icon name="info" />
            <div className="form-alert__content">
              <p>{revisionLabels.sessionExpired}</p>
              <Link to={signInPath(revisionPath(poseId))}>{revisionLabels.signIn}</Link>
            </div>
          </FormAlert>
        );
      default:
        return (
          <div className="form-alert">
            <Icon name="error" />
            <div className="form-alert__content">
              <p role="alert">{revisionLabels.loadingFailed}</p>
              <button
                type="button"
                className="button button--secondary"
                aria-disabled={retryingOpening || undefined}
                onClick={() => (retryingOpening ? undefined : void retryOpening())}
              >
                {retryingOpening ? revisionLabels.retrying : revisionLabels.retry}
              </button>
            </div>
          </div>
        );
    }
  }

  if (!pose || !input) return null;
  // The name of a pose renamed by a direct publication is the new one (from the answer of the API).
  const shownOutcome = outcome && { ...outcome, name: outcome.name || pose.name };
  const poseLine = (
    <p id={ids.poseLine} className="revision-page__pose">
      {revisionLabels.poseLine}
      <strong>{shownOutcome?.status === 'published' ? shownOutcome.name : pose.name}</strong>
    </p>
  );
  if (shownOutcome)
    return (
      <>
        {poseLine}
        <RevisionSuccess outcome={shownOutcome} />
      </>
    );
  if (closedBy)
    return (
      <>
        {poseLine}
        <NothingToType
          text={closedBy === 'not-found' ? revisionLabels.notFound : revisionLabels.pendingBySomeoneElse}
          focused
        />
      </>
    );
  if (opening.pending)
    return (
      <>
        {poseLine}
        <NothingToType
          text={opening.pending.isYours ? revisionLabels.pendingByYou : revisionLabels.pendingBySomeoneElse}
          seeMyProposals={opening.pending.isYours}
        />
      </>
    );

  const changed = changedFields(pose, input.values);
  const nameLength = poseNameLength(input.values.name);
  const messageLength = validatorTextLength(input.message);

  const changeValue = <F extends ProposalField>(field: F, value: PoseRevisionInput['values'][F]) => {
    const values = { ...input.values, [field]: value };
    setInput({ ...input, values });
    if (alert === 'changes-nothing') setAlert(null);
    if (field === 'name') {
      setNameRefusal(null);
      const checked = checkPoseName(values.name);
      // A message disappears once its field is corrected; it only changes before sending again.
      setErrors((current) =>
        current.flatMap((error) =>
          error.field !== 'name' ? [error] : checked.ok ? [] : [{ field: 'name', code: checked.error }],
        ),
      );
      announceNameCounter(poseNameLength(input.values.name), poseNameLength(values.name));
    } else setErrors((current) => current.filter((error) => error.field !== field));
  };

  const changeMessage = (message: string) => {
    announceMessageCounter(validatorTextLength(input.message), validatorTextLength(message));
    setInput({ ...input, message });
    if (messageError && validatorTextLength(message) <= validatorTextCounter.maxLength) setMessageError(null);
  };

  const errorOf = (field: ProposalField): string | undefined => {
    if (field === 'name' && nameRefusal) return revisionNameRefusalLabel(nameRefusal);
    const error = errors.find((e) => e.field === field);
    return error ? proposalFieldErrorLabel(error.code, nameLength) : undefined;
  };

  /** After a render: the fields may not be on screen yet (coming back from the summary). */
  const focusFirstError = (inError: readonly ProposalFieldError[], message: boolean) => {
    const first = inError[0]?.field;
    if (first) setFocus(first);
    else if (message) setFocus('message');
  };

  /** Checked locally: the errors in their fields, or « rien modifié » at the top; true when it may be sent. */
  const checkedLocally = (): readonly PoseValueChange[] | null => {
    const revision = validatePoseRevision(pose, input);
    if (revision.ok) return revision.value.changes;
    setAttempt((n) => n + 1);
    if (revision.error.kind === 'changes-nothing') {
      setErrors([]);
      setMessageError(null);
      setAlert('changes-nothing');
      return null;
    }
    setAlert(null);
    setErrors(revision.error.errors);
    setMessageError(revision.error.message ?? null);
    focusFirstError(revision.error.errors, revision.error.message !== undefined);
    return null;
  };

  const send = async (retrying = false) => {
    if (submitting.current) return; // no double submission, even before the next render
    submitting.current = true;
    setBusy(true);
    const result = await proposePoseRevision(gateway, store, pose, input, owner);
    submitting.current = false;
    setBusy(false);
    setAttempt((n) => n + 1); // a new alert node: an identical failure is announced again
    if (result.ok) {
      if (result.value.status !== 'pending')
        void queryClient.invalidateQueries({ queryKey: publishedPosesKey });
      setOutcome(result.value);
      return;
    }
    const failure = result.error;
    // Sent from the summary: its button disappears with it, the alert takes the focus.
    const fromSummary = summary !== null;
    setSummary(null);
    if (fromSummary) setFocus('alert');
    switch (failure.kind) {
      case 'invalid-input':
        setAlert(null);
        setErrors(failure.errors);
        setMessageError(failure.message ?? null);
        focusFirstError(failure.errors, failure.message !== undefined);
        return;
      case 'name-already-in-catalog':
      case 'name-already-pending':
        setAlert(null);
        setErrors([]);
        setNameRefusal(failure.kind);
        setFocus('name');
        return;
      case 'pose-changed':
        setInput(rebaseRevisionInput(input, pose, failure.pose));
        setPose(failure.pose);
        setAlert('pose-changed');
        return;
      case 'session-expired':
        setAlert('session-expired');
        expireSession();
        return;
      case 'unreachable':
        setAlert('unreachable');
        if (retrying) setFocus('retry');
        return;
      case 'revision-already-pending':
      case 'not-found':
        // Nothing to type any more: the form gives way to a block, which takes the focus.
        setFocus(null);
        setClosedBy(failure.kind);
        return;
      default:
        setAlert(failure.kind);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!directly) return void send();
    // A validator or an administrator checks the summary « actuellement → nouveau » before publishing.
    const changes = checkedLocally();
    if (!changes) return;
    setAlert(null);
    setSummary(changes);
    setFocus('summary');
  };

  const reminder = (field: ProposalField) => currentValueLabel(valueOf(pose, field));
  const tag = (field: ProposalField) => (changed.includes(field) ? revisionLabels.modified : undefined);

  const alertNode = expired ? (
    <FormAlert ref={refs.alert} key={attempt} variant="info">
      <Icon name="info" />
      <div className="form-alert__content">
        <p>{revisionLabels.sessionExpired}</p>
        <Link to={signInPath(revisionPath(pose.id))}>{revisionLabels.signIn}</Link>
      </div>
    </FormAlert>
  ) : alert === 'pose-changed' ? (
    <FormAlert ref={refs.alert} key={attempt} variant="info">
      <Icon name="info" />
      <p>{revisionLabels.poseChanged}</p>
    </FormAlert>
  ) : alert === 'unreachable' ? (
    <FormAlert ref={refs.alert} key={attempt}>
      <Icon name="error" />
      <div className="form-alert__content">
        <p>{revisionLabels.unreachable}</p>
        <button
          ref={refs.retry}
          type="button"
          className="button button--secondary"
          aria-disabled={busy || undefined}
          onClick={() => (busy ? undefined : void send(true))}
        >
          {busy ? (directly ? revisionLabels.publishing : revisionLabels.submitting) : revisionLabels.retry}
        </button>
      </div>
    </FormAlert>
  ) : alert === 'outdated' ? (
    <FormAlert ref={refs.alert} key={attempt}>
      <Icon name="error" />
      <div className="form-alert__content">
        <p>{revisionLabels.outdated}</p>
        <button type="button" className="button button--secondary" onClick={() => location.reload()}>
          {revisionLabels.reload}
        </button>
      </div>
    </FormAlert>
  ) : alert ? (
    <FormAlert ref={refs.alert} key={attempt}>
      <Icon name="error" />
      <p>
        {alert === 'changes-nothing'
          ? revisionLabels.changesNothing
          : alert === 'not-found'
            ? revisionLabels.notFound
            : revisionLabels.pendingBySomeoneElse}
      </p>
    </FormAlert>
  ) : null;

  const box = directly && (
    <div className="info-box">
      <Icon name="info" />
      <p id={ids.box}>{revisionLabels.publishesDirectly}</p>
    </div>
  );

  if (summary)
    return (
      <>
        {poseLine}
        {box}
        <div className="adjustment-summary revision-summary">
          <h2 ref={refs.summary} tabIndex={-1} className="revision-summary__title">
            {revisionLabels.summaryTitle}
          </h2>
          <PoseChangeList
            changes={summary}
            readingKey={revisionLabels.summaryKey}
            beforeLabel={revisionLabels.summaryBefore}
            afterLabel={revisionLabels.summaryAfter}
          />
          <p className="adjustment-summary__rest">{revisionLabels.summaryRest}</p>
        </div>
        <div className="revision-page__actions">
          <button
            type="button"
            className="button button--primary"
            aria-disabled={busy || undefined}
            onClick={() => (busy ? undefined : void send())}
          >
            {busy ? revisionLabels.publishing : revisionLabels.publish}
          </button>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => {
              setSummary(null);
              setFocus('name');
            }}
          >
            {revisionLabels.backToForm}
          </button>
          <Link to={catalogPath} className="button button--secondary link-button">
            {revisionLabels.cancel}
          </Link>
        </div>
      </>
    );

  return (
    <>
      {poseLine}
      {box}
      <p id={ids.introduction} className="proposal-page__introduction">
        {revisionLabels.introduction}
      </p>
      <form
        aria-label={revisionLabels.title}
        aria-describedby={[ids.poseLine, directly && ids.box, ids.introduction].filter(Boolean).join(' ')}
        className="proposal-form"
        noValidate
        onSubmit={submit}
      >
        {alertNode}
        <Field
          ref={refs.name}
          label={proposalLabels.name}
          tag={tag('name')}
          name="name"
          autoComplete="off"
          spellCheck={false}
          value={input.values.name}
          onChange={(event) => changeValue('name', event.target.value)}
          help={[reminder('name'), revisionLabels.nameHelp]}
          counter={<NameCounter length={nameLength} />}
          error={errorOf('name')}
        />
        <TileRadioGroup
          legend={proposalLabels.baseDifficulty}
          tone="base"
          tag={tag('baseDifficulty')}
          name="baseDifficulty"
          layout="levels"
          options={levels}
          value={input.values.baseDifficulty}
          onChange={(level) => changeValue('baseDifficulty', level)}
          help={reminder('baseDifficulty')}
          error={errorOf('baseDifficulty')}
          firstRadioRef={firstRadios.baseDifficulty}
        />
        <TileRadioGroup
          legend={proposalLabels.flyerDifficulty}
          tone="flyer"
          tag={tag('flyerDifficulty')}
          name="flyerDifficulty"
          layout="levels"
          options={levels}
          value={input.values.flyerDifficulty}
          onChange={(level) => changeValue('flyerDifficulty', level)}
          help={reminder('flyerDifficulty')}
          error={errorOf('flyerDifficulty')}
          firstRadioRef={firstRadios.flyerDifficulty}
        />
        <div className="flow-questions">
          <div className="flow-questions__help">
            <p id={ids.startHelp}>{proposalLabels.startFlowHelp}</p>
            <p id={ids.endHelp}>{proposalLabels.endFlowHelp}</p>
          </div>
          <TileRadioGroup
            legend={proposalLabels.canStartFlow}
            tag={tag('canStartFlow')}
            name="canStartFlow"
            layout="yes-no"
            options={answers}
            value={answerOf(input.values.canStartFlow)}
            onChange={(answer) => changeValue('canStartFlow', answer === 'yes')}
            helpId={ids.startHelp}
            help={reminder('canStartFlow')}
            error={errorOf('canStartFlow')}
            firstRadioRef={firstRadios.canStartFlow}
          />
          <TileRadioGroup
            legend={proposalLabels.canEndFlow}
            tag={tag('canEndFlow')}
            name="canEndFlow"
            layout="yes-no"
            options={answers}
            value={answerOf(input.values.canEndFlow)}
            onChange={(answer) => changeValue('canEndFlow', answer === 'yes')}
            helpId={ids.endHelp}
            help={reminder('canEndFlow')}
            error={errorOf('canEndFlow')}
            firstRadioRef={firstRadios.canEndFlow}
          />
        </div>
        {/* A validator or an administrator publishes directly: there is no validator to write to. */}
        {!directly && (
          <TextAreaField
            ref={refs.message}
            label={revisionLabels.message}
            help={revisionLabels.messageHelp}
            value={input.message}
            onChange={(event) => changeMessage(event.target.value)}
            counter={<ValidatorTextCounter length={messageLength} />}
            error={messageError ? revisionMessageErrorLabel(messageLength) : undefined}
          />
        )}
        <div className="revision-page__actions">
          <button type="submit" className="button button--primary" aria-disabled={busy || undefined}>
            {directly ? revisionLabels.check : busy ? revisionLabels.submitting : revisionLabels.submit}
          </button>
          <Link to={catalogPath} className="button button--secondary link-button">
            {revisionLabels.cancel}
          </Link>
        </div>
      </form>
    </>
  );
}
