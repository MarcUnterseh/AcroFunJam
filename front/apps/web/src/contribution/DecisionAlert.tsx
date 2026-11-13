import { decisionFailureLabel, validationLabels, type DecisionError } from '@acrofunjam/core';
import type { RefObject } from 'react';
import { Link } from 'react-router';
import { FormAlert } from '../layout/form-controls';
import { Icon } from '../layout/Icon';
import { signInPath, validationPath } from '../paths';
import { RoleWithdrawn } from './RoleWithdrawn';

/** Why a decision was not recorded, told in the card (carte-proposition.md, « Alertes dans la carte »). */
export type CardAlert = DecisionError['kind'];

/** After these refusals, the proposal can no longer be decided from its card: its actions disappear. */
export const closesTheCard = (alert: CardAlert | null): boolean =>
  alert === 'already-decided' || alert === 'not-found' || alert === 'role-withdrawn';

/**
 * Alert at the top of the decision zone of a card (alerte-formulaire.md, role="alert", the focus stays put):
 * an error for an outage or a taken name, information for an expired session or a decision already taken.
 */
export function DecisionAlert({
  alert,
  inputKept,
  busy,
  onRetry,
  retryRef,
}: {
  readonly alert: CardAlert;
  /** A zone of the card is open: what the validator typed is kept, and the alert says so. */
  readonly inputKept: boolean;
  readonly busy: boolean;
  readonly onRetry: () => void;
  readonly retryRef: RefObject<HTMLButtonElement | null>;
}) {
  const message = <p>{decisionFailureLabel(alert, { inputKept })}</p>;
  switch (alert) {
    case 'role-withdrawn':
      return <RoleWithdrawn />;
    case 'session-expired':
      return (
        <FormAlert variant="info">
          <Icon name="info" />
          <div className="form-alert__content">
            {message}
            <Link to={signInPath(validationPath)}>{validationLabels.signIn}</Link>
          </div>
        </FormAlert>
      );
    case 'already-decided':
    case 'not-found':
      return (
        <FormAlert variant="info">
          <Icon name="info" />
          {message}
        </FormAlert>
      );
    case 'unreachable':
      return (
        <FormAlert>
          <Icon name="error" />
          <div className="form-alert__content">
            {message}
            <button
              ref={retryRef}
              type="button"
              className="button button--secondary"
              aria-disabled={busy || undefined}
              onClick={() => (busy ? undefined : onRetry())}
            >
              {validationLabels.retry}
            </button>
          </div>
        </FormAlert>
      );
    // The pose changed since the revision was proposed (safety net of the API): reloading shows its values.
    case 'pose-changed':
    case 'outdated':
      return (
        <FormAlert>
          <Icon name="error" />
          <div className="form-alert__content">
            {message}
            <button type="button" className="button button--secondary" onClick={() => location.reload()}>
              {validationLabels.reload}
            </button>
          </div>
        </FormAlert>
      );
    default:
      return (
        <FormAlert>
          <Icon name="error" />
          {message}
        </FormAlert>
      );
  }
}
