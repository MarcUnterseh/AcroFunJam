import { expect, type Locator, type Page } from '@playwright/test';
import { Given, Then, When } from '../fixtures';
import type { IdentityApi } from '../support/identity-api';
import type { TagApi } from '../support/tag-api';
import { startRevision } from './revision-form.steps';

// Story 9a « Étiqueter les poses », volet Contribution: scenarios @web of contribution/etiqueter-une-pose.feature, and
// the texts of the page « Étiquettes ».

/** « "lunaire" et "vrille" »: the names between straight quotes. */
const quoted = (names: string) => [...names.matchAll(/"([^"]+)"/g)].map((match) => match[1]!);

const tagGroup = (page: import('@playwright/test').Page) =>
  page
    .getByRole('form', { name: 'Proposer une pose' })
    .getByRole('group', { name: 'Étiquettes (facultatives)' });

// --- The texts of a page -----------------------------------------------------------------------------------------

When(/^(?:un visiteur|\S+) consulte la liste des étiquettes sur le site$/, async ({ tagsPage }) => {
  await tagsPage.open();
});

Then(/^le site présente « (.+) »$/, async ({ page }, text: string) => {
  await expect(page.getByRole('main').getByText(text, { exact: true })).toBeVisible();
});

// --- The form « Proposer une pose » ----------------------------------------------------------------------------

Given(/^(\S+) a commencé à proposer une pose sur le site$/, async ({ proposalForm, page }, _who: string) => {
  await proposalForm.open();
  await tagGroup(page).getByRole('checkbox').first().waitFor();
});

When(
  /^(\S+) propose sur le site la pose "([^"]+)", avec (?:l'étiquette|les étiquettes) ((?:"[^"]+"(?:, | et )?)+)$/,
  async ({ proposalForm, page }, _who: string, name: string, names: string) => {
    if (!proposalForm.isOpen()) await proposalForm.open();
    await proposalForm.fill({ name });
    for (const tag of quoted(names))
      await tagGroup(page).getByRole('checkbox', { name: tag, exact: true }).check();
    await proposalForm.submit();
  },
);

Then(
  /^le formulaire de proposition propose exactement les étiquettes ((?:"[^"]+"(?:, | et )?)+)$/,
  async ({ page }, names: string) => {
    const boxes = tagGroup(page).getByRole('checkbox');
    await expect(boxes).toHaveCount(quoted(names).length);
    for (const name of quoted(names))
      await expect(tagGroup(page).getByRole('checkbox', { name, exact: true })).toBeVisible();
  },
);

Then('le formulaire de proposition permet de lire ce que veut dire chaque étiquette', async ({ page }) => {
  await tagGroup(page).getByText('Ce que veulent dire les étiquettes', { exact: true }).click();
  for (const name of await tagGroup(page)
    .getByRole('checkbox')
    .evaluateAll((boxes) => boxes.map((box) => box.closest('label')?.textContent ?? '')))
    await expect(
      tagGroup(page)
        .getByRole('term')
        .filter({ hasText: new RegExp(`^${name}$`) }),
    ).toBeVisible();
});

Then(/^le formulaire de proposition présente « (.+) »$/, async ({ page }, text: string) => {
  await expect(page.getByText(text, { exact: true })).toBeVisible();
});

Then(
  /^le formulaire de proposition présente pour les étiquettes l'aide « (.+) »$/,
  async ({ page }, help: string) => {
    await expect(tagGroup(page)).toHaveAccessibleDescription(
      new RegExp(help.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    );
  },
);

Then('le formulaire de proposition ne présente aucune étiquette', async ({ page }) => {
  await expect(page.getByRole('form', { name: 'Proposer une pose' })).toBeVisible();
  await expect(page.getByText('Tous les champs sont obligatoires.', { exact: true })).toBeVisible();
  await expect(tagGroup(page)).toHaveCount(0);
});

Then(
  /^la pose "([^"]+)" saisie par (\S+) est conservée, sans l'étiquette « (.+) »$/,
  async ({ proposalForm, page }, name: string, _who: string, tag: string) => {
    await expect(proposalForm.name).toHaveValue(name);
    await expect(tagGroup(page).getByRole('checkbox', { name: tag, exact: true, checked: true })).toHaveCount(
      0,
    );
  },
);

// --- Proposals and revisions made before the scenario ----------------------------------------------------------

const emailOf = (identityApi: IdentityApi, name: string) =>
  identityApi.people.get(name)?.email ?? `${name.toLowerCase()}@example.org`;

const isValidator = (identityApi: IdentityApi, email: string) =>
  (identityApi.roleOf(email) ?? 'user') !== 'user';

/** The tags named by a scenario, by id, as the API chooses them for a pose. */
const poseTagIds = (tagApi: TagApi, names: string) =>
  tagApi.choose(
    quoted(names).map((name) => tagApi.tagNamed(name).id),
    'pose',
  ).tagIds;

Given(
  /^(\S+) a proposé la pose "([^"]+)", avec (?:l'étiquette|les étiquettes) ((?:"[^"]+"(?:, | et )?)+)$/,
  async ({ identityApi, contributionApi, tagApi }, who: string, pose: string, names: string) => {
    const email = emailOf(identityApi, who);
    const proposal = {
      name: pose,
      baseDifficulty: 'beginner' as const,
      flyerDifficulty: 'discovery' as const,
      canStartFlow: true,
      canEndFlow: true,
      tagIds: poseTagIds(tagApi, names),
      contributorEmail: email,
    };
    if (isValidator(identityApi, email)) contributionApi.addDirectPublication(proposal);
    else contributionApi.addPending(proposal);
  },
);

Given(
  /^(\S+) a proposé de modifier la pose "([^"]+)" en changeant les étiquettes en ((?:"[^"]+"(?:, | et )?)+)$/,
  async ({ identityApi, catalogApi, contributionApi, tagApi }, who: string, pose: string, names: string) => {
    const email = emailOf(identityApi, who);
    const { id, name, baseDifficulty, flyerDifficulty, canStartFlow, canEndFlow, tagIds } =
      catalogApi.poseNamed(pose);
    const before = { name, baseDifficulty, flyerDifficulty, canStartFlow, canEndFlow, tagIds };
    contributionApi.addRevision(
      {
        poseId: id,
        before,
        changes: { tagIds: poseTagIds(tagApi, names) },
        message: null,
        contributorEmail: email,
      },
      isValidator(identityApi, email),
    );
  },
);

Given(
  /^(\S+) a accepté la proposition de la pose "([^"]+)" par (\S+) en corrigeant les étiquettes en ((?:"[^"]+"(?:, | et )?)+)$/,
  async (
    { catalogApi, contributionApi, tagApi },
    _who: string,
    pose: string,
    _contributor: string,
    names: string,
  ) => {
    const proposal = contributionApi.pending.find((pending) => pending.name === pose);
    if (!proposal) throw new Error(`Aucune proposition en attente de la pose ${pose}`);
    const { name, baseDifficulty, flyerDifficulty, canStartFlow, canEndFlow } = proposal;
    const retained = {
      name,
      baseDifficulty,
      flyerDifficulty,
      canStartFlow,
      canEndFlow,
      tagIds: poseTagIds(tagApi, names),
    };
    contributionApi.decide(proposal.id, {
      kind: 'accepted',
      retained,
      message: null,
      decidedAt: new Date(Date.UTC(2026, 10, 8, 10)).toISOString(),
    });
    catalogApi.publish(retained);
  },
);

// --- The form of a revision -------------------------------------------------------------------------------------

const revisionTags = (page: Page) =>
  page.getByRole('form', { name: 'Proposer une modification' }).getByRole('group', { name: /^Étiquettes/ });

const checkExactly = async (group: Locator, names: readonly string[]) => {
  await group.getByRole('checkbox').first().waitFor();
  for (const box of (await group.getByRole('checkbox').all()).reverse()) await box.uncheck();
  for (const name of names) await group.getByRole('checkbox', { name, exact: true }).check();
};

When(
  /^(\S+) propose sur le site de modifier la pose "([^"]+)" en changeant les étiquettes en ((?:"[^"]+"(?:, | et )?)+)$/,
  async ({ page, catalogPage, revisionForm }, _who: string, pose: string, names: string) => {
    await startRevision(catalogPage, revisionForm, pose);
    await checkExactly(revisionTags(page), quoted(names));
    await revisionForm.submit();
  },
);

Then(
  /^le formulaire de modification présente la pose "([^"]+)" avec l'étiquette « (.+) » choisie$/,
  async ({ page }, _pose: string, name: string) => {
    await expect(revisionTags(page).getByRole('checkbox', { name, exact: true })).toBeChecked();
  },
);

Then(
  /^le formulaire de modification présente pour les étiquettes le rappel « (.+) » et la marque « (.+) »$/,
  async ({ page }, reminder: string, mark: string) => {
    await expect(revisionTags(page)).toHaveAccessibleDescription(new RegExp(reminder));
    await expect(revisionTags(page).getByText(mark, { exact: true })).toBeVisible();
  },
);

// --- The validation queue and « Mes propositions » -------------------------------------------------------------

/** « inversion, lunaire »: the names in one pair of French quotation marks. */
const listed = (names: string) =>
  names
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);

const valueOfTerm = (container: Locator, term: string) =>
  container
    .getByRole('term')
    .filter({ hasText: new RegExp(`^${term}$`) })
    .locator('xpath=following-sibling::dd[1]');

Then(
  /^le site présente la proposition de la pose "([^"]+)" avec les étiquettes « (.+) »$/,
  async ({ page }, pose: string, names: string) => {
    const card = page.getByRole('article', { name: pose, exact: true });
    await expect(
      card.getByRole('list', { name: 'Étiquettes', exact: true }).getByRole('listitem'),
    ).toHaveText(listed(names));
  },
);

Then(
  /^le site présente la proposition de la pose "([^"]+)" avec « Étiquettes : aucune »$/,
  async ({ page }, pose: string) => {
    await expect(
      valueOfTerm(page.getByRole('article', { name: pose, exact: true }), 'Étiquettes'),
    ).toHaveText('aucune');
  },
);

When(
  /^(\S+) ajuste sur le site la proposition de la pose "([^"]+)" par (\S+) en corrigeant les étiquettes en ((?:"[^"]+"(?:, | et )?)+)$/,
  async ({ validationPage }, _who: string, pose: string, _contributor: string, names: string) => {
    if (!validationPage.isOpen()) await validationPage.open();
    const card = validationPage.card(pose);
    await card.getByRole('button', { name: 'Ajuster avant de publier' }).click();
    await checkExactly(card.getByRole('group', { name: 'Étiquettes', exact: true }), quoted(names));
    await card.getByRole('button', { name: 'Vérifier les ajustements' }).click();
  },
);

Then(
  /^le site présente la modification de la pose "([^"]+)" par "([^"]+)", étiquettes « (.+) » → « (.+) »$/,
  async ({ validationPage }, pose: string, _email: string, before: string, after: string) => {
    if (!validationPage.isOpen()) await validationPage.open();
    // The line of « Ce qui change dans la pose » (the revised pose has a line « Étiquettes » too).
    const tags = valueOfTerm(validationPage.revisionCard(pose), 'Étiquettes')
      .filter({ hasText: before })
      .first();
    await expect(tags).toContainText(after);
  },
);

Then(
  /^le site présente pour la proposition de la pose "([^"]+)" l'ajustement des étiquettes « (.+) » → « (.+) »$/,
  async ({ page }, pose: string, proposed: string, retained: string) => {
    // The line of the adjustments (the pose has a line « Étiquettes » too).
    const adjustment = valueOfTerm(page.getByRole('article', { name: pose, exact: true }), 'Étiquettes')
      .filter({ hasText: proposed })
      .first();
    await expect(adjustment).toContainText(retained);
  },
);
