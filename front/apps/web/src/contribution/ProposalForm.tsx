import {
  checkPoseName,
  difficultyLevelName,
  difficultyScale,
  emptyPoseProposalInput,
  keepProposalInput,
  nameCounterLabel,
  poseNameLength,
  poseNamePolicy,
  proposalFieldErrorLabel,
  proposalLabels,
  proposalRefusalLabel,
  proposePose,
  publishesDirectly,
  restoreProposalInput,
  type DifficultyLevel,
  type PoseProposalInput,
  type ProposalField,
  type ProposalFieldError,
  type ProposalOutcome,
} from '@acrofunjam/core';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState, type FormEvent, type RefObject } from 'react';
import { Link } from 'react-router';
import { publishedPosesKey } from '../catalog/usePublishedPoses';
import { useSession } from '../identity/SessionContext';
import { useAnnounce } from '../layout/Announcer';
import { Field, FormAlert } from '../layout/form-controls';
import { Icon } from '../layout/Icon';
import { proposePosePath, signInPath } from '../paths';
import { useContribution } from './ContributionContext';
import { ProposalSuccess } from './ProposalSuccess';
import { TileRadioGroup, type TileOption } from './TileRadioGroup';

const levels: readonly TileOption<DifficultyLevel>[] = difficultyScale.map((level) => ({
  value: level,
  label: difficultyLevelName(level),
}));

type Answer = 'yes' | 'no';
const answers: readonly TileOption<Answer>[] = [
  { value: 'yes', label: proposalLabels.yes },
  { value: 'no', label: proposalLabels.no },
];
const answerOf = (value: boolean | null): Answer | null => (value === null ? null : value ? 'yes' : 'no');

type NameRefusal = 'name-already-in-catalog' | 'name-already-pending';
/** Global failures, shown in an alert at the top of the form; the input is kept for each of them. */
type Alert = 'unreachable' | 'outdated' | 'session-expired';

/** How the counter reads: it is announced when it appears, when the limit is passed, and when back under it. */
const counterStage = (length: number) =>
  length > poseNamePolicy.maxLength ? 'over' : nameCounterLabel(length) ? 'near' : 'far';

function NameCounter({ length }: { readonly length: number }) {
  const label = nameCounterLabel(length);
  if (!label) return null;
  const over = length > poseNamePolicy.maxLength;
  return (
    <p className={`field__counter${over ? ' field__counter--over' : ''}`}>
      {over && <Icon name="error" />}
      {label}
    </p>
  );
}

/**
 * Form « Proposer une pose » (docs/design/ecrans/3-proposer-une-pose.md): checked before sending with the rules
 * of the API, every message in its field, the focus on the first field in error. Replaced by the success panel
 * once the proposal is received. An expired session, an outage or an outdated site keep the input for its
 * owner, the address of the session (ADR 0019).
 */
export function ProposalForm({
  owner,
  sessionExpired,
}: {
  /** Address of the person the form was shown to. */
  readonly owner: string;
  readonly sessionExpired: boolean;
}) {
  const { gateway, store } = useContribution();
  const { session, sessionExpired: expireSession } = useSession();
  const queryClient = useQueryClient();
  const announce = useAnnounce();
  const [input, setInput] = useState<PoseProposalInput>(emptyPoseProposalInput);
  const [errors, setErrors] = useState<readonly ProposalFieldError[]>([]);
  const [nameRefusal, setNameRefusal] = useState<NameRefusal | null>(null);
  const [alert, setAlert] = useState<Alert | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<ProposalOutcome | null>(null);
  const [focus, setFocus] = useState<'name' | 'retry' | null>(null);
  const submitting = useRef(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const retryRef = useRef<HTMLButtonElement>(null);
  const firstRadios: Record<Exclude<ProposalField, 'name'>, RefObject<HTMLInputElement | null>> = {
    baseDifficulty: useRef<HTMLInputElement>(null),
    flyerDifficulty: useRef<HTMLInputElement>(null),
    canStartFlow: useRef<HTMLInputElement>(null),
    canEndFlow: useRef<HTMLInputElement>(null),
  };
  const ids = { box: useId(), introduction: useId(), startHelp: useId(), endHelp: useId() };
  const capabilities = session.status === 'signedIn' ? session.capabilities : [];
  const directly = publishesDirectly(capabilities);
  const nameLength = poseNameLength(input.name);
  const expired = sessionExpired || alert === 'session-expired';
  const inputKept = expired || alert === 'unreachable' || alert === 'outdated';

  // The input kept in the tab (after an expired session or an outage) is given back once, to its owner only.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const kept = restoreProposalInput(store, owner);
    if (!kept) return;
    setInput(kept);
    announce(proposalLabels.inputRestored);
  }, [store, owner, announce]);

  // While the input is said to be kept (expired session, outage), what the person keeps typing is kept too.
  useEffect(() => {
    if (inputKept) keepProposalInput(store, input, owner);
  }, [inputKept, input, store, owner]);

  // Signed in again (another tab): the "session expired" alert no longer applies.
  useEffect(() => {
    if (session.status === 'signedIn')
      setAlert((current) => (current === 'session-expired' ? null : current));
  }, [session.status]);

  // Focus after a render: the name (empty form again), or « Réessayer » of the alert given anew.
  useEffect(() => {
    if (!focus) return;
    (focus === 'name' ? nameRef : retryRef).current?.focus();
    setFocus(null);
  }, [focus]);

  const change = <F extends ProposalField>(field: F, value: PoseProposalInput[F]) => {
    const next = { ...input, [field]: value };
    setInput(next);
    if (field === 'name') {
      setNameRefusal(null);
      const name = checkPoseName(next.name);
      // A message disappears once its field is corrected; it only changes before sending again.
      setErrors((current) =>
        current.flatMap((error) =>
          error.field !== 'name' ? [error] : name.ok ? [] : [{ field: 'name', code: name.error }],
        ),
      );
      const before = counterStage(poseNameLength(input.name));
      const after = counterStage(poseNameLength(next.name));
      if (after !== before && after !== 'far') announce(nameCounterLabel(poseNameLength(next.name)) ?? '');
    } else setErrors((current) => current.filter((error) => error.field !== field));
  };

  const errorOf = (field: ProposalField): string | undefined => {
    if (field === 'name' && nameRefusal) return proposalRefusalLabel(nameRefusal);
    const error = errors.find((e) => e.field === field);
    return error ? proposalFieldErrorLabel(error.code, nameLength) : undefined;
  };

  const focusFirstError = (inError: readonly ProposalFieldError[]) => {
    const first = inError[0]?.field;
    if (!first) return;
    (first === 'name' ? nameRef : firstRadios[first]).current?.focus();
  };

  const submit = async (event?: FormEvent, retrying = false) => {
    event?.preventDefault();
    if (submitting.current) return; // no double submission, even before the next render
    submitting.current = true;
    setBusy(true);
    // The alert stays while retrying: its button, busy, keeps the focus.
    const result = await proposePose(gateway, store, input, owner);
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
        setErrors(failure.errors);
        focusFirstError(failure.errors);
        return;
      case 'name-already-in-catalog':
      case 'name-already-pending':
        setAlert(null);
        setErrors([]);
        setNameRefusal(failure.kind);
        nameRef.current?.focus();
        return;
      case 'session-expired':
        setAlert('session-expired');
        expireSession();
        return;
      case 'unreachable':
      case 'outdated':
        setAlert(failure.kind);
        if (retrying) setFocus('retry');
    }
  };

  const proposeAnother = () => {
    setInput(emptyPoseProposalInput);
    setErrors([]);
    setNameRefusal(null);
    setAlert(null);
    setOutcome(null);
    setFocus('name');
  };

  if (outcome) return <ProposalSuccess outcome={outcome} onProposeAnother={proposeAnother} />;

  return (
    <>
      {directly && (
        <div className="info-box">
          <Icon name="info" />
          <p id={ids.box}>{proposalLabels.publishesDirectly}</p>
        </div>
      )}
      <p id={ids.introduction} className="proposal-page__introduction">
        {proposalLabels.introduction}
      </p>
      <form
        aria-label={proposalLabels.title}
        aria-describedby={directly ? `${ids.box} ${ids.introduction}` : ids.introduction}
        className="proposal-form"
        noValidate
        onSubmit={(event) => void submit(event)}
      >
        {expired ? (
          <FormAlert key={attempt} variant="info">
            <Icon name="info" />
            <div className="form-alert__content">
              <p>{proposalLabels.sessionExpired}</p>
              <Link to={signInPath(proposePosePath)}>{proposalLabels.signIn}</Link>
            </div>
          </FormAlert>
        ) : alert === 'unreachable' ? (
          <FormAlert key={attempt}>
            <Icon name="error" />
            <div className="form-alert__content">
              <p>{proposalLabels.unreachable}</p>
              <button
                ref={retryRef}
                type="button"
                className="button button--secondary"
                aria-disabled={busy || undefined}
                onClick={() => void submit(undefined, true)}
              >
                {busy ? proposalLabels.submitting : proposalLabels.retry}
              </button>
            </div>
          </FormAlert>
        ) : (
          alert === 'outdated' && (
            <FormAlert key={attempt}>
              <Icon name="error" />
              <div className="form-alert__content">
                <p>{proposalLabels.outdated}</p>
                <button type="button" className="button button--secondary" onClick={() => location.reload()}>
                  {proposalLabels.reload}
                </button>
              </div>
            </FormAlert>
          )
        )}
        <Field
          ref={nameRef}
          label={proposalLabels.name}
          name="name"
          autoComplete="off"
          spellCheck={false}
          value={input.name}
          onChange={(event) => change('name', event.target.value)}
          help={proposalLabels.nameHelp}
          counter={<NameCounter length={nameLength} />}
          error={errorOf('name')}
        />
        <TileRadioGroup
          legend={proposalLabels.baseDifficulty}
          name="baseDifficulty"
          layout="levels"
          options={levels}
          value={input.baseDifficulty}
          onChange={(level) => change('baseDifficulty', level)}
          error={errorOf('baseDifficulty')}
          firstRadioRef={firstRadios.baseDifficulty}
        />
        <TileRadioGroup
          legend={proposalLabels.flyerDifficulty}
          name="flyerDifficulty"
          layout="levels"
          options={levels}
          value={input.flyerDifficulty}
          onChange={(level) => change('flyerDifficulty', level)}
          error={errorOf('flyerDifficulty')}
          firstRadioRef={firstRadios.flyerDifficulty}
        />
        <div className="flow-questions">
          {/* Shown together; each question is described by its own definition only. */}
          <div className="flow-questions__help">
            <p id={ids.startHelp}>{proposalLabels.startFlowHelp}</p>
            <p id={ids.endHelp}>{proposalLabels.endFlowHelp}</p>
          </div>
          <TileRadioGroup
            legend={proposalLabels.canStartFlow}
            name="canStartFlow"
            layout="yes-no"
            options={answers}
            value={answerOf(input.canStartFlow)}
            onChange={(answer) => change('canStartFlow', answer === 'yes')}
            error={errorOf('canStartFlow')}
            helpId={ids.startHelp}
            firstRadioRef={firstRadios.canStartFlow}
          />
          <TileRadioGroup
            legend={proposalLabels.canEndFlow}
            name="canEndFlow"
            layout="yes-no"
            options={answers}
            value={answerOf(input.canEndFlow)}
            onChange={(answer) => change('canEndFlow', answer === 'yes')}
            error={errorOf('canEndFlow')}
            helpId={ids.endHelp}
            firstRadioRef={firstRadios.canEndFlow}
          />
        </div>
        <button type="submit" className="button button--primary" aria-disabled={busy || undefined}>
          {busy ? proposalLabels.submitting : proposalLabels.submit}
        </button>
      </form>
    </>
  );
}
