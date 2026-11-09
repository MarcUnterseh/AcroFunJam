import { decisionFailureLabel, validationLabels } from '@acrofunjam/core';
import { Link } from 'react-router';
import { FormAlert } from '../layout/form-controls';
import { Icon } from '../layout/Icon';
import { catalogPath } from '../paths';

/** The role was withdrawn: the person may no longer decide (information, with the way back to the catalog). */
export function RoleWithdrawn() {
  return (
    <FormAlert variant="info">
      <Icon name="info" />
      <div className="form-alert__content">
        <p>{decisionFailureLabel('role-withdrawn')}</p>
        <Link to={catalogPath}>{validationLabels.backToCatalog}</Link>
      </div>
    </FormAlert>
  );
}
