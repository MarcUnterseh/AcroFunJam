import { expect } from '@playwright/test';
import { Given, Then, When } from '../fixtures';
import { revisionPath } from '../pages/revision-form';
import { difficultyCode } from '../support/catalog-api';
import type { PoseChanges } from '../support/contribution-api';
import type { IdentityApi } from '../support/identity-api';
import { startRevision } from './revision-form.steps';

// Story 6 « Proposer une modification d'une pose publiée », scenarios @web of proposer-une-modification.feature.

/** The scenarios write the levels as domain terms (« découverte »); the site shows them capitalised. */
const displayed = (level: string) => level.charAt(0).toLocaleUpperCase('fr-FR') + level.slice(1);

const emailOf = (identityApi: IdentityApi, name: string) =>
  identityApi.people.get(name)?.email ?? `${name.toLowerCase()}@example.org`;

/** « en changeant la difficulté flyer en "découverte" »: the field and its new value, as the API receives it. */
const aChange = /en changeant (le nom|la difficulté base|la difficulté flyer) en "([^"]+)"/.source;
const changeOf = (field: string, value: string): PoseChanges => {
  switch (field) {
    case 'le nom':
      return { name: value };
    case 'la difficulté base':
      return { baseDifficulty: difficultyCode(value) };
    default:
      return { flyerDifficulty: difficultyCode(value) };
  }
};

// --- Revisions proposed before the scenario ---------------------------------------------------------

// As the API does: a validator's or an administrator's revision is published directly (story 6, decision C).
Given(
  new RegExp(`^(\\S+) a proposé (?:entre-temps )?de modifier la pose "([^"]+)" ${aChange}$`),
  async (
    { identityApi, catalogApi, contributionApi },
    who: string,
    pose: string,
    field: string,
    value: string,
  ) => {
    const email = emailOf(identityApi, who);
    const published = catalogApi.poseNamed(pose);
    const { id, name, baseDifficulty, flyerDifficulty, canStartFlow, canEndFlow } = published;
    const before = { name, baseDifficulty, flyerDifficulty, canStartFlow, canEndFlow };
    contributionApi.addRevision(
      { poseId: id, before, changes: changeOf(field, value), message: null, contributorEmail: email },
      (identityApi.roleOf(email) ?? 'user') !== 'user',
    );
  },
);

// --- Validation queue -------------------------------------------------------------------------------

When(
  /^(\S+) accepte sur le site la proposition de modification de la pose "([^"]+)" par (\S+)$/,
  async ({ validationPage }, _who: string, pose: string, _contributor: string) => {
    if (!validationPage.isOpen()) await validationPage.open();
    await validationPage.revisionCard(pose).getByRole('button', { name: 'Accepter la modification' }).click();
  },
);

Then(
  /^le site présente la modification de la pose "([^"]+)" par "([^"]+)", difficulté (base|flyer) « ([^»]+) » → « ([^»]+) »$/,
  async (
    { validationPage },
    pose: string,
    email: string,
    role: string,
    current: string,
    proposed: string,
  ) => {
    const card = validationPage.revisionCard(pose);
    await expect(card.getByText(/^Proposée par /)).toHaveText(new RegExp(`^Proposée par ${email} le `));
    await expect(validationPage.valueIn(card, `Difficulté ${role}`)).toHaveText(
      `Actuellement : ${displayed(current)}, proposé : ${displayed(proposed)}`,
    );
  },
);

// --- « Mes propositions » -----------------------------------------------------------------------------

Then(
  /^le site présente la modification de la pose "([^"]+)", difficulté (base|flyer) « ([^»]+) » → « ([^»]+) », en attente de validation$/,
  async ({ myProposalsPage }, pose: string, role: string, before: string, proposed: string) => {
    const title = `Modification de ${pose}`;
    await expect(myProposalsPage.status(title)).toHaveText('Statut : En attente de validation');
    await expect(
      myProposalsPage.text(title, 'La pose changera dans le catalogue une fois la modification acceptée.'),
    ).toBeVisible();
    await expect(myProposalsPage.value(title, `Difficulté ${role}`)).toHaveText(
      `Avant : ${displayed(before)}, proposé : ${displayed(proposed)}`,
    );
  },
);

// --- Catalog and form ---------------------------------------------------------------------------------

/** The scenarios write the levels as domain terms (« débutant »); the tiles show them capitalised. */
const tile = displayed;

Then(
  "le catalogue n'invite pas à proposer une modification de la pose {string}",
  async ({ catalogPage, header }, pose: string) => {
    // Wait until the poses are received and the session is known: the link would only appear then.
    await expect(catalogPage.poseList).toBeVisible();
    await expect(header.account.getByRole('link', { name: 'Se connecter' })).toBeVisible();
    await expect(catalogPage.revisionLink(pose)).toHaveCount(0);
    await expect(catalogPage.revisionLinks).toHaveCount(0);
  },
);

Then(
  'le catalogue invite à proposer une modification de la pose {string}',
  async ({ catalogPage, catalogApi }, pose: string) => {
    await expect(catalogPage.revisionLink(pose)).toBeVisible();
    await expect(catalogPage.revisionLink(pose)).toHaveAttribute(
      'href',
      revisionPath(catalogApi.poseNamed(pose).id),
    );
  },
);

When(
  /^(\S+) commence à proposer sur le site une modification de la pose "([^"]+)"$/,
  async ({ catalogPage, revisionForm }, _who: string, pose: string) => {
    await startRevision(catalogPage, revisionForm, pose);
  },
);

Then(
  /^le formulaire de modification présente la pose "([^"]+)" de difficulté base "([^"]+)" et de difficulté flyer "([^"]+)"$/,
  async ({ revisionForm }, pose: string, base: string, flyer: string) => {
    await expect(revisionForm.name).toHaveValue(pose);
    await expect(revisionForm.name).toHaveAccessibleDescription(
      `Actuellement : ${pose} 60 caractères au maximum.`,
    );
    await expect(revisionForm.checked(revisionForm.baseDifficulty)).toHaveAccessibleName(tile(base));
    await expect(revisionForm.baseDifficulty).toHaveAccessibleDescription(`Actuellement : ${tile(base)}`);
    await expect(revisionForm.checked(revisionForm.flyerDifficulty)).toHaveAccessibleName(tile(flyer));
    await expect(revisionForm.flyerDifficulty).toHaveAccessibleDescription(`Actuellement : ${tile(flyer)}`);
  },
);
