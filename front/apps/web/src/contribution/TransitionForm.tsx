import {
  checkTransitionDescription,
  checkTransitionName,
  emptyTransitionProposalInput,
  keepTransitionInput,
  openTransitionProposal,
  proposeTransition,
  publishesDirectly,
  restoreTransitionInput,
  transitionDescriptionLength,
  transitionFieldErrorLabel,
  transitionNameHelp,
  transitionNameLength,
  transitionPlaceTakenLabel,
  transitionProposalDocumentTitle,
  transitionSuccessDocumentTitle,
  newTransitionFormAnnouncement,
  transitionProposalLabels,
  type OpenTransitionProposalError,
  type TransitionField,
  type TransitionFieldError,
  type TransitionPlaceTaken,
  type TransitionPose,
  type TransitionProposalInput,
  type TransitionProposalOutcome,
} from '@acrofunjam/core';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { publishedPosesKey } from '../catalog/usePublishedPoses';
import { useSession } from '../identity/SessionContext';
import { useAnnounce } from '../layout/Announcer';
import { focusPageTitle } from '../layout/focus';
import { Field, FormAlert, SelectField, TextAreaField } from '../layout/form-controls';
import { Icon } from '../layout/Icon';
import { catalogPath, posePath, signInPath, transitionProposalPath } from '../paths';
import { descriptionCounter, DescriptionCounter } from './DescriptionCounter';
import { nameCounter, NameCounter } from './NameCounter';
import { levels } from './pose-choices';
import { TileRadioGroup } from './TileRadioGroup';
import { TransitionSuccess } from './TransitionSuccess';
import { useCounterAnnouncement } from './useCounterAnnouncement';
import { useTransitionProposal } from './TransitionProposalContext';

type Opening =
  | { readonly status: 'loading' }
  | { readonly status: 'failed'; readonly error: OpenTransitionProposalError }
  | {
      readonly status: 'loaded';
      readonly poses: readonly TransitionPose[];
      readonly fromPose: TransitionPose;
    };

/** Global alerts, at the top of the form; the input is kept for each of them. */
type Alert = 'unreachable' | 'outdated' | 'session-expired';

/** A refusal shown under a field: the place taken between the poses (under the name), a pose gone. */
type FieldRefusal =
  | {
      readonly field: 'name';
      readonly kind: TransitionPlaceTaken;
      readonly from: string;
      readonly to: string;
    }
  | { readonly field: 'fromPoseId' | 'toPoseId'; readonly kind: 'pose-not-found' };

type Focusable = TransitionField | 'retry' | 'title';

/**
 * Form « Proposer une transition » (docs/design/ecrans/7-proposer-une-transition.md), opened from the page of a pose:
 * the departure pose prefilled with it (modifiable), the arrival pose to choose among the published poses, the
 * optional name, the two difficulties and the optional description. Checked before sending with the rules of the API,
 * every message in its field, the focus on the first field in error. Replaced by the success panel once received. An
 * expired session, an outage or an outdated site keep the input for its owner and its pose of origin (ADR 0019).
 */
export function TransitionForm({
  originPoseId,
  owner,
  sessionExpired,
  titleId,
}: {
  /** The pose consulted, the form was opened from. */
  readonly originPoseId: string;
  /** Address of the person the form was shown to. */
  readonly owner: string;
  readonly sessionExpired: boolean;
  /** The id of the title of the page, which names the form. */
  readonly titleId: string;
}) {
  const { gateway, store } = useTransitionProposal();
  const { session, sessionExpired: expireSession } = useSession();
  const queryClient = useQueryClient();
  const announce = useAnnounce();
  const announceNameCounter = useCounterAnnouncement(nameCounter);
  const announceDescriptionCounter = useCounterAnnouncement(descriptionCounter);
  const [opening, setOpening] = useState<Opening>({ status: 'loading' });
  const [retryingOpening, setRetryingOpening] = useState(false);
  const [input, setInput] = useState<TransitionProposalInput>(() =>
    emptyTransitionProposalInput(originPoseId),
  );
  const [errors, setErrors] = useState<readonly TransitionFieldError[]>([]);
  const [refusal, setRefusal] = useState<FieldRefusal | null>(null);
  const [alert, setAlert] = useState<Alert | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<TransitionProposalOutcome | null>(null);
  const [focus, setFocus] = useState<Focusable | null>(null);
  const submitting = useRef(false);
  const restored = useRef(false);
  const mounted = useRef(true);
  const refs = {
    fromPoseId: useRef<HTMLSelectElement>(null),
    toPoseId: useRef<HTMLSelectElement>(null),
    name: useRef<HTMLInputElement>(null),
    baseDifficulty: useRef<HTMLInputElement>(null),
    flyerDifficulty: useRef<HTMLInputElement>(null),
    description: useRef<HTMLTextAreaElement>(null),
    retry: useRef<HTMLButtonElement>(null),
  };
  const ids = { box: useId(), introduction: useId(), difficultyHelp: useId() };
  // Fixed when the form is shown: a session that expires meanwhile does not turn the form of a validator into the
  // one of a user.
  const [directly] = useState(() =>
    publishesDirectly(session.status === 'signedIn' ? session.capabilities : []),
  );
  const expired = sessionExpired || alert === 'session-expired';
  const inputKept = expired || alert === 'unreachable' || alert === 'outdated';

  const open = useCallback(async () => {
    const answer = await openTransitionProposal(gateway, originPoseId);
    if (!mounted.current) return null;
    // The input kept in the tab for this pose of origin is given back once, to its owner only, with the form itself
    // (the same render: the form never shows empty first).
    if (answer.ok && !restored.current) {
      restored.current = true;
      const kept = restoreTransitionInput(store, originPoseId, owner);
      if (kept) {
        setInput(kept);
        announce(transitionProposalLabels.inputRestored);
      }
    }
    setOpening(answer.ok ? { status: 'loaded', ...answer.value } : { status: 'failed', error: answer.error });
    return answer;
  }, [gateway, originPoseId, store, owner, announce]);

  useEffect(() => {
    mounted.current = true;
    void open();
    return () => {
      mounted.current = false;
    };
  }, [open]);

  // The title of the document names the pose of origin, once known.
  const originName = opening.status === 'loaded' ? opening.fromPose.name : null;
  const outcomeStatus = outcome?.status;
  useEffect(() => {
    if (outcomeStatus) document.title = `${transitionSuccessDocumentTitle(outcomeStatus)} – AcroFunJam`;
    else if (originName) document.title = `${transitionProposalDocumentTitle(originName)} – AcroFunJam`;
  }, [originName, outcomeStatus]);

  // While the input is said to be kept (expired session, outage), what the person keeps typing is kept too.
  useEffect(() => {
    if (inputKept) keepTransitionInput(store, originPoseId, input, owner);
  }, [inputKept, input, store, originPoseId, owner]);

  // Signed in again (another tab): the "session expired" alert no longer applies.
  useEffect(() => {
    if (session.status === 'signedIn')
      setAlert((current) => (current === 'session-expired' ? null : current));
  }, [session.status]);

  // Focus after a render: a field in error, the first field of a blank form, or « Réessayer » of the alert given anew.
  useEffect(() => {
    if (!focus) return;
    if (focus === 'title') focusPageTitle();
    else refs[focus].current?.focus();
    setFocus(null);
  }, [focus]);

  const retryOpening = async () => {
    setRetryingOpening(true);
    const answer = await open();
    setRetryingOpening(false);
    if (answer?.ok) focusPageTitle();
    else announce(transitionProposalLabels.loadingFailed);
  };

  if (opening.status === 'loading')
    return (
      <p role="status" className="follow-up-page__status">
        {transitionProposalLabels.loading}
      </p>
    );

  if (opening.status === 'failed') {
    switch (opening.error.kind) {
      case 'not-found':
        return <PoseGone />;
      case 'outdated':
        return (
          <div className="form-alert">
            <Icon name="error" />
            <div className="form-alert__content">
              <p role="alert">{transitionProposalLabels.loadingOutdated}</p>
              <button type="button" className="button button--secondary" onClick={() => location.reload()}>
                {transitionProposalLabels.reload}
              </button>
            </div>
          </div>
        );
      default:
        return (
          <div className="form-alert">
            <Icon name="error" />
            <div className="form-alert__content">
              <p role="alert">{transitionProposalLabels.loadingFailed}</p>
              <button
                type="button"
                className="button button--secondary"
                aria-disabled={retryingOpening || undefined}
                onClick={() => (retryingOpening ? undefined : void retryOpening())}
              >
                {retryingOpening ? transitionProposalLabels.retrying : transitionProposalLabels.retry}
              </button>
            </div>
          </div>
        );
    }
  }

  const { poses, fromPose: origin } = opening;
  const proposeAnother = () => {
    setInput(emptyTransitionProposalInput(originPoseId));
    setErrors([]);
    setRefusal(null);
    setAlert(null);
    setOutcome(null);
    // A blank form: its title takes the focus, and the pose it starts from is announced.
    setFocus('title');
    announce(newTransitionFormAnnouncement(origin.name));
  };

  if (outcome)
    return <TransitionSuccess outcome={outcome} origin={origin} onProposeAnother={proposeAnother} />;

  const nameLength = transitionNameLength(input.name);
  const descriptionLength = transitionDescriptionLength(input.description);
  const poseName = (id: string) => poses.find((pose) => pose.id === id)?.name ?? '';

  const change = <F extends TransitionField>(field: F, value: TransitionProposalInput[F]) => {
    const next = { ...input, [field]: value };
    setInput(next);
    // A place taken depends on the poses and on the name: changing one of them withdraws the refusal.
    if (field === 'fromPoseId' || field === 'toPoseId' || field === 'name') setRefusal(null);
    if (field === 'name') {
      announceNameCounter(transitionNameLength(input.name), transitionNameLength(next.name));
      const name = checkTransitionName(next.name);
      // A message disappears once its field is corrected; it only changes before sending again.
      setErrors((current) =>
        current.flatMap((error) =>
          error.field !== 'name' ? [error] : name.ok ? [] : [{ field: 'name', code: name.error }],
        ),
      );
    } else if (field === 'description') {
      announceDescriptionCounter(
        transitionDescriptionLength(input.description),
        transitionDescriptionLength(next.description),
      );
      if (checkTransitionDescription(next.description).ok)
        setErrors((current) => current.filter((error) => error.field !== 'description'));
    } else setErrors((current) => current.filter((error) => error.field !== field));
  };

  const errorOf = (field: TransitionField): string | undefined => {
    if (refusal?.field === field)
      return refusal.kind === 'pose-not-found'
        ? transitionProposalLabels.poseNotFound
        : transitionPlaceTakenLabel(refusal.kind, refusal);
    const error = errors.find((e) => e.field === field);
    return error ? transitionFieldErrorLabel(error.code, { nameLength, descriptionLength }) : undefined;
  };

  const send = async (retrying = false) => {
    if (submitting.current) return; // no double submission, even before the next render
    submitting.current = true;
    setBusy(true);
    // The alert stays while retrying: its button, busy, keeps the focus.
    const result = await proposeTransition(gateway, store, originPoseId, input, owner);
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
    switch (failure.kind) {
      case 'invalid-input':
        setAlert(null);
        setRefusal(null);
        setErrors(failure.errors);
        setFocus(failure.errors[0]?.field ?? null);
        return;
      case 'pose-not-found': {
        // The pose left the catalog: the published poses are read again, the list concerned goes back to
        // « Choisis une pose », the rest of the input is kept.
        setAlert(null);
        setErrors([]);
        const field = failure.field;
        const published = await gateway.listPublishedPoses();
        if (!mounted.current) return;
        if (published.ok) setOpening({ status: 'loaded', poses: published.value, fromPose: origin });
        setInput((current) => ({ ...current, [field]: '' }));
        setRefusal({ field, kind: 'pose-not-found' });
        setFocus(field);
        return;
      }
      case 'session-expired':
        setAlert('session-expired');
        expireSession();
        return;
      case 'unreachable':
      case 'outdated':
        setAlert(failure.kind);
        if (retrying) setFocus('retry');
        return;
      default:
        // The place is taken between these poses: told under the name, the field to change.
        setAlert(null);
        setErrors([]);
        setRefusal({
          field: 'name',
          kind: failure.kind,
          from: poseName(input.fromPoseId),
          to: poseName(input.toPoseId),
        });
        setFocus('name');
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void send();
  };

  const poseOptions = poses.map((pose) => ({ value: pose.id, label: pose.name }));

  return (
    <>
      {directly && (
        <div className="info-box">
          <Icon name="info" />
          <p id={ids.box}>{transitionProposalLabels.publishesDirectly}</p>
        </div>
      )}
      <p id={ids.introduction} className="proposal-page__introduction">
        {transitionProposalLabels.introduction}
      </p>
      <form
        aria-labelledby={titleId}
        aria-describedby={directly ? `${ids.box} ${ids.introduction}` : ids.introduction}
        className="proposal-form"
        noValidate
        onSubmit={submit}
      >
        {expired ? (
          <FormAlert key={attempt} variant="info">
            <Icon name="info" />
            <div className="form-alert__content">
              <p>{transitionProposalLabels.sessionExpired}</p>
              <Link to={signInPath(transitionProposalPath(originPoseId))}>
                {transitionProposalLabels.signIn}
              </Link>
            </div>
          </FormAlert>
        ) : alert === 'unreachable' ? (
          <FormAlert key={attempt}>
            <Icon name="error" />
            <div className="form-alert__content">
              <p>{transitionProposalLabels.unreachable}</p>
              <button
                ref={refs.retry}
                type="button"
                className="button button--secondary"
                aria-disabled={busy || undefined}
                onClick={() => (busy ? undefined : void send(true))}
              >
                {busy ? transitionProposalLabels.submitting : transitionProposalLabels.retry}
              </button>
            </div>
          </FormAlert>
        ) : (
          alert === 'outdated' && (
            <FormAlert key={attempt}>
              <Icon name="error" />
              <div className="form-alert__content">
                <p>{transitionProposalLabels.outdated}</p>
                <button type="button" className="button button--secondary" onClick={() => location.reload()}>
                  {transitionProposalLabels.reload}
                </button>
              </div>
            </FormAlert>
          )
        )}
        <SelectField
          ref={refs.fromPoseId}
          label={transitionProposalLabels.fromPose}
          name="fromPoseId"
          emptyOption={transitionProposalLabels.choosePose}
          options={poseOptions}
          value={input.fromPoseId}
          onChange={(event) => change('fromPoseId', event.target.value)}
          error={errorOf('fromPoseId')}
        />
        <SelectField
          ref={refs.toPoseId}
          label={transitionProposalLabels.toPose}
          name="toPoseId"
          emptyOption={transitionProposalLabels.choosePose}
          options={poseOptions}
          value={input.toPoseId}
          onChange={(event) => change('toPoseId', event.target.value)}
          error={errorOf('toPoseId')}
        />
        <Field
          ref={refs.name}
          label={transitionProposalLabels.name}
          name="name"
          autoComplete="off"
          spellCheck={false}
          value={input.name}
          onChange={(event) => change('name', event.target.value)}
          help={transitionNameHelp({
            from: poseName(input.fromPoseId) || null,
            to: poseName(input.toPoseId) || null,
          })}
          counter={<NameCounter length={nameLength} />}
          error={errorOf('name')}
        />
        <div className="difficulty-questions">
          {/* Shown once, before the two groups, each described by it (as the help of the flow questions). */}
          <p id={ids.difficultyHelp} className="difficulty-questions__help">
            {transitionProposalLabels.difficultyHelp}
          </p>
          <TileRadioGroup
            legend={transitionProposalLabels.baseDifficulty}
            name="baseDifficulty"
            layout="levels"
            options={levels}
            value={input.baseDifficulty}
            onChange={(level) => change('baseDifficulty', level)}
            helpId={ids.difficultyHelp}
            error={errorOf('baseDifficulty')}
            firstRadioRef={refs.baseDifficulty}
          />
          <TileRadioGroup
            legend={transitionProposalLabels.flyerDifficulty}
            name="flyerDifficulty"
            layout="levels"
            options={levels}
            value={input.flyerDifficulty}
            onChange={(level) => change('flyerDifficulty', level)}
            helpId={ids.difficultyHelp}
            error={errorOf('flyerDifficulty')}
            firstRadioRef={refs.flyerDifficulty}
          />
        </div>
        <TextAreaField
          ref={refs.description}
          label={transitionProposalLabels.description}
          name="description"
          help={transitionProposalLabels.descriptionHelp}
          value={input.description}
          onChange={(event) => change('description', event.target.value)}
          counter={<DescriptionCounter length={descriptionLength} />}
          error={errorOf('description')}
        />
        <div className="revision-page__actions">
          <button type="submit" className="button button--primary" aria-disabled={busy || undefined}>
            {busy ? transitionProposalLabels.submitting : transitionProposalLabels.submit}
          </button>
          <Link to={posePath(originPoseId)} className="button button--secondary link-button">
            {transitionProposalLabels.cancel}
          </Link>
        </div>
      </form>
    </>
  );
}

/** The pose consulted is no longer in the catalog: nothing to type, only a way back to the catalog. */
function PoseGone() {
  const announce = useAnnounce();
  useEffect(() => announce(transitionProposalLabels.notFound), [announce]);
  return (
    <>
      <div className="form-alert form-alert--info revision-page__block">
        <Icon name="info" />
        <div className="form-alert__content">
          <p>{transitionProposalLabels.notFound}</p>
        </div>
      </div>
      <Link to={catalogPath} className="button button--secondary link-button revision-page__exit">
        {transitionProposalLabels.seeCatalog}
      </Link>
    </>
  );
}
