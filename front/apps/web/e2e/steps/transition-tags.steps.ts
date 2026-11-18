import { expect, type Locator, type Page } from '@playwright/test';
import { Given, Then, When } from '../fixtures';
import { difficultyCode } from '../support/catalog-api';
import type { TagApi } from '../support/tag-api';
import { beforeTheIncidents } from '../support/reachability';
import { publishTransition } from './pose-page.steps';

// Story 8 « Étiquettes », part 2: scenarios @web of consulter-les-etiquettes-des-transitions.feature,
// etiqueter-une-transition-publiee.feature and contribution/etiqueter-une-transition.feature.

/** « "pop" et "vrille" », « "dynamique", "icarien" et "whip" »: the names between straight quotes. */
const quoted = (names: string) => [...names.matchAll(/"([^"]+)"/g)].map((match) => match[1]!);
/** « « dynamique » et « pop » »: the names between French quotation marks. */
const guillemets = (names: string) => [...names.matchAll(/«\s*([^»]+?)\s*»/g)].map((match) => match[1]!);

/** The tags named by a scenario, by id, with the tags they add (as the API chooses them). */
const tagIdsOf = (tagApi: TagApi, names: string) =>
  tagApi.choose(quoted(names).map((name) => tagApi.tagNamed(name).id)).tagIds;

/** « la transition "Pop to Bird" de "Throne" vers "Bird" » or « une transition sans nom de "Throne" vers "Bird" ». */
const aTransition = /(?:la transition "([^"]+)"|une transition sans nom) de "([^"]+)" vers "([^"]+)"/.source;
const withTags = /, avec (?:l'étiquette|les étiquettes) (.+)/.source;

/** The no-break space inside the French quotation marks of a name (no literal one: ESLint forbids it). */
const nbsp = String.fromCharCode(0xa0);

/** The title of the card of a transition proposal: « Transition Pop to Bird de Throne vers Bird ». */
const cardTitle = (name: string | null | undefined, from: string, to: string) =>
  name ? `Transition ${name} de ${from} vers ${to}` : `Transition de ${from} vers ${to}`;

/** The transition of the page of a pose titled so (« Pop to Bird », « de Bird vers Folded Leaf »), in any section. */
const transitionTitled = (page: Page, title: string): Locator =>
  page
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { level: 3, name: title, exact: true }) })
    .first();

const tagLineOf = (container: Locator) =>
  container.getByRole('list', { name: 'Étiquettes', exact: true }).getByRole('listitem');

/** The value of the term « Étiquettes » of a card (the line of the transition, or a line of adjustments). */
const tagsValueOf = (container: Locator) =>
  container
    .getByRole('term')
    .filter({ hasText: /^Étiquettes$/ })
    .locator('xpath=following-sibling::dd[1]');

// --- The list and the transitions carrying tags -------------------------------------------------------------

Given('la liste des étiquettes est la liste amorcée', async ({ tagApi }) => {
  tagApi.seed();
});

Given(
  new RegExp(
    `^la transition publiée (?:sans nom|"([^"]+)") de "([^"]+)" vers "([^"]+)" de difficulté base "([^"]+)" et de difficulté flyer "([^"]+)"${withTags}$`,
  ),
  async (
    { catalogApi, tagApi },
    name: string | null | undefined,
    from: string,
    to: string,
    base: string,
    flyer: string,
    tags: string,
  ) => {
    publishTransition(catalogApi, {
      from,
      to,
      name: name ?? null,
      base,
      flyer,
      description: null,
      tagIds: tagIdsOf(tagApi, tags),
    });
  },
);

Given(
  /^(\S+) a retiré l'étiquette "([^"]+)" de la liste$/,
  async ({ tagApi }, _who: string, name: string) => {
    tagApi.removeElsewhere(name);
  },
);

Given(
  new RegExp(`^(\\S+) a proposé ${aTransition}${withTags}$`),
  async (
    { identityApi, catalogApi, contributionApi, tagApi },
    who: string,
    name: string | null | undefined,
    from: string,
    to: string,
    tags: string,
  ) => {
    const email = identityApi.people.get(who)?.email ?? `${who.toLowerCase()}@example.org`;
    contributionApi.addTransition(
      {
        fromPoseId: catalogApi.poseNamed(from).id,
        toPoseId: catalogApi.poseNamed(to).id,
        contributorEmail: email,
        name: name ?? null,
        baseDifficulty: difficultyCode('débutant'),
        flyerDifficulty: difficultyCode('débutant'),
        description: null,
        tagIds: tagIdsOf(tagApi, tags),
      },
      (identityApi.roleOf(email) ?? 'user') !== 'user',
    );
  },
);

Given(
  new RegExp(
    `^(\\S+) a accepté la proposition de ${aTransition} par (\\S+) en corrigeant les étiquettes en (.+)$`,
  ),
  async (
    { catalogApi, contributionApi, transitionApi, tagApi },
    _who: string,
    name: string | null | undefined,
    from: string,
    to: string,
    _contributor: string,
    tags: string,
  ) => {
    const [fromId, toId] = [catalogApi.poseNamed(from).id, catalogApi.poseNamed(to).id];
    const transition = contributionApi.pendingTransitions.find(
      (pending) =>
        pending.fromPoseId === fromId && pending.toPoseId === toId && pending.name === (name ?? null),
    );
    if (!transition) throw new Error(`Aucune proposition en attente de ${from} vers ${to}`);
    transitionApi.acceptElsewhere(transition, tagIdsOf(tagApi, tags));
  },
);

// --- The page of a pose ---------------------------------------------------------------------------------------

When(
  /^un visiteur déplie la transition « (.+) » sur la page de la pose "([^"]+)"$/,
  async ({ page, posePage, catalogApi }, title: string, pose: string) => {
    await posePage.open(catalogApi.poseNamed(pose).id);
    await transitionTitled(page, title)
      .getByText('Ce que veulent dire ces étiquettes', { exact: true })
      .click();
  },
);

When(
  /^(\S+) étiquette sur le site, depuis (?:la section des transitions depuis )?la pose "([^"]+)", la transition « (.+) » avec les étiquettes (.+)$/,
  async ({ posePage, catalogApi }, _who: string, pose: string, title: string, tags: string) => {
    if (!posePage.isOpen()) await posePage.open(catalogApi.poseNamed(pose).id);
    await posePage.tag(posePage.transition('from', pose, title), quoted(tags));
  },
);

Then(/^la transition « (.+) » ne présente aucune étiquette$/, async ({ page }, title: string) => {
  const transition = transitionTitled(page, title);
  await expect(transition).toBeVisible();
  await expect(tagLineOf(transition)).toHaveCount(0);
  await expect(transition.getByText('Ce que veulent dire ces étiquettes')).toHaveCount(0);
});

Then(
  /^le site présente la description de l'étiquette « (.+) » : « (.+) »$/,
  async ({ page }, name: string, description: string) => {
    const meaning = page
      .getByRole('main')
      .getByRole('term')
      .filter({ hasText: new RegExp(`^${name}$`) })
      .locator('xpath=following-sibling::dd[1]');
    await expect(meaning).toBeVisible();
    await expect(meaning).toHaveText(description);
  },
);

Then(
  /^la page de la pose invite (\S+) à étiqueter la transition « (.+) »$/,
  async ({ page }, _who: string, title: string) => {
    await expect(
      transitionTitled(page, title).getByRole('button', { name: `Étiqueter ${title}`, exact: true }),
    ).toBeVisible();
  },
);

Then(
  /^la page de la pose n'invite pas (\S+) à étiqueter la transition « (.+) »$/,
  async ({ page }, _who: string, title: string) => {
    const transition = transitionTitled(page, title);
    await expect(transition).toBeVisible();
    await expect(transition.getByRole('button', { name: /^Étiqueter/ })).toHaveCount(0);
  },
);

Then(
  /^les transitions (depuis|vers) la pose "([^"]+)" présentent la transition « (.+) » avec les étiquettes (.+)$/,
  async ({ posePage }, direction: string, pose: string, title: string, tags: string) => {
    const transition = posePage.transition(direction === 'depuis' ? 'from' : 'to', pose, title);
    await expect(tagLineOf(transition)).toHaveText(guillemets(tags));
  },
);

// --- The form « Proposer une transition » ---------------------------------------------------------------------

Then(
  /^le formulaire de transition propose exactement les étiquettes (.+)$/,
  async ({ transitionForm }, tags: string) => {
    await expect(transitionForm.tags.getByRole('checkbox')).toHaveCount(quoted(tags).length);
    for (const tag of quoted(tags)) await expect(transitionForm.tag(tag)).not.toBeChecked();
  },
);

Then(
  'le formulaire de transition permet de lire ce que veut dire chaque étiquette',
  async ({ transitionForm }) => {
    await transitionForm.tags.getByText('Ce que veulent dire les étiquettes', { exact: true }).click();
    const names = await transitionForm.tags
      .getByRole('checkbox')
      .evaluateAll((boxes) => boxes.map((box) => box.closest('label')?.textContent?.trim() ?? ''));
    for (const name of names)
      await expect(
        transitionForm.tags
          .getByRole('term')
          .filter({ hasText: new RegExp(`^${name}$`) })
          .locator('xpath=following-sibling::dd[1]'),
      ).toBeVisible();
  },
);

When(/^(\S+) choisit l'étiquette "([^"]+)"$/, async ({ transitionForm }, _who: string, name: string) => {
  await transitionForm.tag(name).check();
});

Then(
  /^le formulaire de transition présente aussi l'étiquette "([^"]+)" choisie, et explique que (.+) l'ajoutent$/,
  async ({ transitionForm }, implied: string, implying: string) => {
    await expect(transitionForm.tag(implied)).toBeChecked();
    const note = transitionForm.tags.getByText(`« ${implied} » est ajoutée`, { exact: false });
    await expect(note).toBeVisible();
    for (const name of guillemets(implying)) await expect(note).toContainText(`« ${name} »`);
  },
);

When(
  new RegExp(`^(\\S+) propose sur le site ${aTransition}${withTags}$`),
  async (
    { posePage, transitionForm, identityApi, catalogApi, contributionApi },
    _who: string,
    name: string | null | undefined,
    from: string,
    to: string,
    tags: string,
  ) => {
    if (transitionForm.isOpen()) await expect(transitionForm.form).toBeVisible();
    else
      await beforeTheIncidents({ identityApi, catalogApi, contributionApi }, async () => {
        await posePage.open(catalogApi.poseNamed(from).id);
        await posePage.proposeTransitionLink(from).click();
        await transitionForm.loaded();
      });
    await transitionForm.fill({ to, name: name ?? '', tags: quoted(tags) });
    await transitionForm.submit();
  },
);

Then(
  /^le site confirme à (\S+) que sa transition « (.+) » de (.+) vers (.+) est envoyée et attend une validation$/,
  async ({ page, transitionForm }, _who: string, name: string, from: string, to: string) => {
    await expect(transitionForm.successTitle).toHaveText('Merci, ta transition est envoyée.');
    await expect(
      page.getByText(
        `La transition «${nbsp}${name}${nbsp}» de ${from} vers ${to} est en attente de validation. Elle apparaîtra sur la page des deux poses quand un validateur l'aura acceptée.`,
        { exact: true },
      ),
    ).toBeVisible();
  },
);

Then(
  /^le site indique que l'étiquette « (.+) » ne fait plus partie de la liste des étiquettes$/,
  async ({ transitionForm }, name: string) => {
    await expect(transitionForm.alert).toContainText(
      `L'étiquette « ${name} » ne fait plus partie de la liste des étiquettes.`,
    );
  },
);

Then(
  /^la transition saisie par (\S+) est conservée, sans l'étiquette « (.+) »$/,
  async ({ transitionForm }, _who: string, gone: string) => {
    const { to, name, tags = [] } = transitionForm.lastFilled;
    if (to) expect(await transitionForm.selected(transitionForm.toPose)).toBe(to);
    await expect(transitionForm.name).toHaveValue(name ?? '');
    await expect(transitionForm.tag(gone)).toHaveCount(0);
    for (const tag of tags.filter((t) => t !== gone)) await expect(transitionForm.tag(tag)).toBeChecked();
  },
);

// --- The validation queue and « Mes propositions » -------------------------------------------------------------

Then(
  /^le site présente la proposition « (Transition .+) » avec les étiquettes (.+)$/,
  async ({ page }, title: string, tags: string) => {
    const card = page.getByRole('article', { name: title, exact: true });
    await expect(tagLineOf(card)).toHaveText(guillemets(tags));
  },
);

Then(
  /^le site présente la proposition « (Transition .+) » avec « Étiquettes : aucune »$/,
  async ({ page }, title: string) => {
    const card = page.getByRole('article', { name: title, exact: true });
    await expect(tagsValueOf(card)).toHaveText('aucune');
  },
);

When(
  new RegExp(
    `^(\\S+) ajuste sur le site la proposition de ${aTransition} par (\\S+) en corrigeant les étiquettes en (.+)$`,
  ),
  async (
    { validationPage },
    _who: string,
    name: string | null | undefined,
    from: string,
    to: string,
    _contributor: string,
    tags: string,
  ) => {
    if (!validationPage.isOpen()) await validationPage.open();
    const card = validationPage.card(cardTitle(name, from, to));
    await card.getByRole('button', { name: 'Ajuster avant de publier' }).click();
    const group = card.getByRole('group', { name: 'Étiquettes (facultatives)' });
    await group.getByRole('checkbox').first().waitFor();
    // From the last to the first: a tag adding another is unchecked before the one it adds.
    for (const box of (await group.getByRole('checkbox').all()).reverse()) await box.uncheck();
    for (const tag of quoted(tags)) await group.getByRole('checkbox', { name: tag, exact: true }).check();
    await card.getByRole('button', { name: 'Vérifier les ajustements' }).click();
  },
);

Then(
  /^le récapitulatif des ajustements présente les étiquettes « (.+) » → « (.+) »$/,
  async ({ page }, proposed: string, retained: string) => {
    const summary = page.getByRole('main');
    await expect(tagsValueOf(summary)).toHaveText(`Proposé : ${proposed}, retenu : ${retained}`);
  },
);

Then(
  /^le site présente pour la proposition « (Transition .+) » l'ajustement des étiquettes « (.+) » → « (.+) »$/,
  async ({ myProposalsPage }, title: string, proposed: string, retained: string) => {
    // The line « Étiquettes » of the transition, then the one of « Ajustements apportés »: the latter.
    await expect(tagsValueOf(myProposalsPage.card(title)).filter({ hasText: 'retenu' })).toHaveText(
      `Proposé : ${proposed}, retenu : ${retained}`,
    );
  },
);
