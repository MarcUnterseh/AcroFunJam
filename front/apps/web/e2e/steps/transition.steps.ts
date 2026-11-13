import { expect, type Locator } from '@playwright/test';
import { Given, Then, When } from '../fixtures';
import type { MyProposalsPage } from '../pages/my-proposals-page';
import type { PosePage } from '../pages/pose-page';
import { transitionPath, type TransitionForm, type TransitionToPropose } from '../pages/transition-form';
import type { ValidationPage } from '../pages/validation-page';
import { difficultyCode } from '../support/catalog-api';
import type { IdentityApi } from '../support/identity-api';
import { beforeTheIncidents, type SimulatedApis } from '../support/reachability';

// Story 7 « Proposer une transition », scenarios @web of proposer-une-transition.feature: the form of the site, the
// validation queue and « Mes propositions ».

/** The scenarios write the levels as domain terms (« avancé »); the site shows them capitalised. */
const displayed = (level: string) => level.charAt(0).toLocaleUpperCase('fr-FR') + level.slice(1);

const emailOf = (identityApi: IdentityApi, name: string) =>
  identityApi.people.get(name)?.email ?? `${name.toLowerCase()}@example.org`;

/** « la transition "Ninja Star" de "Star" vers "Star" » or « une transition sans nom de "Throne" vers "Bird" ». */
const aTransition = /(?:la transition "([^"]+)"|une transition sans nom) de "([^"]+)" vers "([^"]+)"/.source;
const withDifficulties = /(?: de difficulté base "([^"]+)" et de difficulté flyer "([^"]+)")?/.source;
const withDescription = /(?:, avec la description « (.+) »)?/.source;

type World = SimulatedApis & { posePage: PosePage; transitionForm: TransitionForm };

/** From the page of the pose, as a person does: « Proposer une transition depuis <pose> ». */
const startTransition = async (
  { posePage, transitionForm, catalogApi }: Pick<World, 'posePage' | 'transitionForm' | 'catalogApi'>,
  origin: string,
) => {
  await posePage.open(catalogApi.poseNamed(origin).id);
  await posePage.proposeTransitionLink(origin).click();
  await transitionForm.loaded();
};

/** Fills in and sends the form, opened from the pose of origin if needed, as it was before the incidents. */
const proposeTransition = async (world: World, origin: string, transition: TransitionToPropose) => {
  const { transitionForm, posePage, ...apis } = world;
  if (transitionForm.isOpen()) await expect(transitionForm.form).toBeVisible();
  else await beforeTheIncidents(apis, () => startTransition({ posePage, transitionForm, ...apis }, origin));
  await transitionForm.fill(transition);
  await transitionForm.submit();
};

/** The departure pose differs from the pose of origin only when the scenario says so. */
const toPropose = (
  origin: string,
  name: string | null | undefined,
  from: string,
  to: string,
): TransitionToPropose => ({ ...(from !== origin && { from }), to, name: name ?? '' });

// --- Transitions proposed before the scenario ------------------------------------------------------

/** As the API does: a validator's or an administrator's transition is published directly. */
const proposedBefore = (
  { identityApi, catalogApi, contributionApi }: SimulatedApis,
  who: string,
  {
    name,
    from,
    to,
    base,
    flyer,
    description,
  }: Record<'from' | 'to', string> & {
    name: string | null;
    base: string;
    flyer: string;
    description: string | null;
  },
) => {
  const email = emailOf(identityApi, who);
  contributionApi.addTransition(
    {
      fromPoseId: catalogApi.poseNamed(from).id,
      toPoseId: catalogApi.poseNamed(to).id,
      contributorEmail: email,
      name,
      baseDifficulty: difficultyCode(base),
      flyerDifficulty: difficultyCode(flyer),
      description,
    },
    (identityApi.roleOf(email) ?? 'user') !== 'user',
  );
};

Given(
  new RegExp(`^(\\S+) a proposé ${aTransition}${withDifficulties}${withDescription}$`),
  async (
    { identityApi, catalogApi, contributionApi },
    who: string,
    name: string | null | undefined,
    from: string,
    to: string,
    base: string | null | undefined,
    flyer: string | null | undefined,
    description: string | null | undefined,
  ) => {
    proposedBefore({ identityApi, catalogApi, contributionApi }, who, {
      name: name ?? null,
      from,
      to,
      base: base ?? 'débutant',
      flyer: flyer ?? 'débutant',
      description: description ?? null,
    });
  },
);

// --- The page of a pose -----------------------------------------------------------------------------

Then(
  "la page de la pose n'invite pas à proposer une transition depuis la pose {string}",
  async ({ posePage, header }, pose: string) => {
    await expect(posePage.title(pose)).toBeVisible();
    // Wait until the session is known: the invitation would only appear once the person is signed in.
    await expect(header.account.getByRole('link', { name: 'Se connecter' })).toBeVisible();
    await expect(posePage.proposeTransitionLinks).toHaveCount(0);
  },
);

Then(
  'la page de la pose invite à proposer une transition depuis la pose {string}',
  async ({ posePage, catalogApi }, pose: string) => {
    const link = posePage.proposeTransitionLink(pose);
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', transitionPath(catalogApi.poseNamed(pose).id));
  },
);

// --- Access to the form -----------------------------------------------------------------------------

When(
  'un visiteur accède directement à la page « Proposer une transition » depuis la pose {string}',
  async ({ page, catalogApi }, pose: string) => {
    await page.goto(transitionPath(catalogApi.poseNamed(pose).id));
  },
);

Given(
  /^(\S+) a accédé directement à la page « Proposer une transition » depuis la pose "([^"]+)" en tant que visiteur$/,
  async ({ page, catalogApi, signInForm }, _who: string, pose: string) => {
    await page.goto(transitionPath(catalogApi.poseNamed(pose).id));
    await expect(signInForm.email).toBeVisible();
  },
);

When(
  /^(\S+) accède directement à la page « Proposer une transition » depuis une pose qui n'existe pas dans le catalogue$/,
  async ({ page }, _who: string) => {
    await page.goto(transitionPath(crypto.randomUUID()));
  },
);

Then(
  'le site invite le visiteur à se connecter, sans lui présenter le formulaire de transition',
  async ({ page, signInForm, transitionForm, catalogApi }) => {
    await expect(signInForm.email).toBeVisible();
    await expect(page.getByText('Connecte-toi pour proposer une transition.', { exact: true })).toBeVisible();
    expect(new URL(page.url()).searchParams.get('retour')).toBe(
      transitionPath(catalogApi.poseNamed('Throne').id),
    );
    await expect(transitionForm.form).toHaveCount(0);
  },
);

// --- The form ------------------------------------------------------------------------------------------

When(
  /^(\S+) (?:commence|a commencé) à proposer sur le site une transition depuis la pose "([^"]+)"$/,
  async ({ posePage, transitionForm, catalogApi }, _who: string, pose: string) => {
    await startTransition({ posePage, transitionForm, catalogApi }, pose);
  },
);

Then(
  'le formulaire de transition présente {string} comme pose de départ',
  async ({ transitionForm }, pose: string) => {
    await expect(transitionForm.form).toBeVisible();
    expect(await transitionForm.selected(transitionForm.fromPose)).toBe(pose);
  },
);

Then(
  /^le formulaire de transition propose comme pose d'arrivée exactement (.+)$/,
  async ({ transitionForm }, poses: string) => {
    const expected = [...poses.matchAll(/"([^"]+)"/g)].map(([, name]) => name);
    const options = (await transitionForm.toPose.getByRole('option').allInnerTexts()).map((option) =>
      option.trim(),
    );
    // The empty option first, « Choisis une pose », then the published poses only.
    expect(options).toEqual(['Choisis une pose', ...expected]);
  },
);

Then(
  'le formulaire de transition précise que les difficultés mesurent le passage seul, les poses étant supposées maîtrisées',
  async ({ transitionForm }) => {
    const help = 'La difficulté mesure le passage seul : les deux poses sont supposées maîtrisées.';
    await expect(transitionForm.baseDifficulty).toHaveAccessibleDescription(help);
    await expect(transitionForm.flyerDifficulty).toHaveAccessibleDescription(help);
  },
);

When('{word} renonce à proposer la transition', async ({ transitionForm }, _who: string) => {
  await transitionForm.cancel();
});

// --- Proposing --------------------------------------------------------------------------------------------

When(
  new RegExp(`^(\\S+) (propose|a tenté de proposer) sur le site ${aTransition}$`),
  async (
    { posePage, transitionForm, identityApi, catalogApi, contributionApi },
    _who: string,
    attempt: string,
    name: string | null | undefined,
    from: string,
    to: string,
  ) => {
    const world = { posePage, transitionForm, identityApi, catalogApi, contributionApi };
    await proposeTransition(world, from, toPropose(from, name, from, to));
    if (attempt !== 'propose') await expect(transitionForm.alert).toBeVisible();
  },
);

When(
  new RegExp(`^(\\S+) propose sur le site, depuis la pose "([^"]+)", ${aTransition}$`),
  async (
    { posePage, transitionForm, identityApi, catalogApi, contributionApi },
    _who: string,
    origin: string,
    name: string | null | undefined,
    from: string,
    to: string,
  ) => {
    const world = { posePage, transitionForm, identityApi, catalogApi, contributionApi };
    await proposeTransition(world, origin, toPropose(origin, name, from, to));
  },
);

When(
  /^(\S+) propose sur le site, depuis la pose "([^"]+)", une transition sans choisir de pose d'arrivée$/,
  async (
    { posePage, transitionForm, identityApi, catalogApi, contributionApi },
    _who: string,
    origin: string,
  ) => {
    const world = { posePage, transitionForm, identityApi, catalogApi, contributionApi };
    await proposeTransition(world, origin, { to: null });
  },
);

// --- Observations after sending -------------------------------------------------------------------------

Then(
  /^le site confirme à (\S+) que sa transition de (.+) vers (.+) est envoyée et attend une validation$/,
  async ({ page, transitionForm }, _who: string, from: string, to: string) => {
    await expect(transitionForm.successTitle).toHaveText('Merci, ta transition est envoyée.');
    await expect(transitionForm.successTitle).toBeFocused();
    await expect(
      page.getByText(
        `La transition de ${from} vers ${to} est en attente de validation. Elle apparaîtra sur la page des deux poses quand un validateur l'aura acceptée.`,
        { exact: true },
      ),
    ).toBeVisible();
  },
);

// After a transition published directly (the form), and after an acceptance (the validation queue).
Then(
  /^le site confirme à (\S+) que la transition « (.+) » de (.+) vers (.+) est publiée dans le catalogue$/,
  async ({ page, transitionForm, validationPage }, _who: string, name: string, from: string, to: string) => {
    if (validationPage.isOpen()) {
      const report = page.getByRole('heading', {
        level: 2,
        // French quotation marks with no-break spaces inside.
        name: `La transition «\u00a0${name}\u00a0» de ${from} vers ${to} est publiée dans le catalogue.`,
      });
      await expect(report).toBeVisible();
      await expect(report).toBeFocused();
      return;
    }
    await expect(transitionForm.successTitle).toHaveText(
      `La transition «\u00a0${name}\u00a0» de ${from} vers ${to} est publiée.`,
    );
    await expect(
      page.getByText('Elle apparaît maintenant sur la page des deux poses.', { exact: true }),
    ).toBeVisible();
  },
);

/** The ways out after sending, in the validated order, all of the same weight: the only actions of the page. */
const expectWaysOut = async (main: Locator, expected: Array<[string, string | null]>) => {
  await expect(main.getByRole('link').or(main.getByRole('button'))).toHaveText(
    expected.map(([label]) => label),
  );
  for (const [label, href] of expected)
    if (href)
      await expect(main.getByRole('link', { name: label, exact: true })).toHaveAttribute('href', href);
};

Then(
  /^le site propose à (\S+) de voir ses propositions, de proposer une autre transition depuis "([^"]+)" ou de revenir à la pose "([^"]+)"$/,
  async ({ page, catalogApi }, _who: string, origin: string, pose: string) => {
    await expectWaysOut(page.getByRole('main'), [
      ['Voir mes propositions', '/mes-propositions'],
      [`Proposer une autre transition depuis ${origin}`, null],
      [`Revenir à ${pose}`, `/poses/${catalogApi.poseNamed(pose).id}`],
    ]);
  },
);

Then(
  /^le site propose à (\S+) de voir la pose "([^"]+)" ou de proposer une autre transition depuis "([^"]+)"$/,
  async ({ page, catalogApi }, _who: string, pose: string, origin: string) => {
    await expectWaysOut(page.getByRole('main'), [
      [`Voir la pose ${pose}`, `/poses/${catalogApi.poseNamed(pose).id}`],
      [`Proposer une autre transition depuis ${origin}`, null],
    ]);
  },
);

// --- Refusals ------------------------------------------------------------------------------------------------

Then(
  "le site indique pour la pose d'arrivée qu'elle est obligatoire",
  async ({ transitionForm, transitionApi }) => {
    await expect(transitionForm.toPose).toHaveAccessibleDescription("Choisis la pose d'arrivée.");
    expect(transitionApi.received).toEqual([]); // checked before sending
  },
);

Then(
  "le site indique pour le nom qu'une transition de ce nom relie déjà ces poses dans le catalogue",
  async ({ transitionForm }) => {
    await expect(transitionForm.name).toHaveAccessibleDescription(
      /Une transition de ce nom va déjà de (.+) vers (.+) dans le catalogue\. Choisis un autre nom\.$/,
    );
  },
);

Then(
  "le site indique pour le nom qu'une transition sans nom relie déjà ces poses et qu'il faut nommer la sienne",
  async ({ transitionForm }) => {
    await expect(transitionForm.name).toHaveAccessibleDescription(
      /Une transition sans nom va déjà de (.+) vers (.+)\. Donne un nom à la tienne pour la distinguer\.$/,
    );
  },
);

// --- Incidents ------------------------------------------------------------------------------------------------

Then('la transition saisie par {word} est conservée', async ({ transitionForm }, _who: string) => {
  const { to, name, base, flyer } = transitionForm.lastFilled;
  await expect(transitionForm.name).toHaveValue(name ?? '');
  if (to) expect(await transitionForm.selected(transitionForm.toPose)).toBe(to);
  if (base)
    await expect(transitionForm.baseDifficulty.getByRole('radio', { name: base, exact: true })).toBeChecked();
  if (flyer)
    await expect(
      transitionForm.flyerDifficulty.getByRole('radio', { name: flyer, exact: true }),
    ).toBeChecked();
});

Then(
  /^le formulaire de transition informe (\S+) que sa session a expiré et qu'elle peut se connecter de nouveau$/,
  async ({ page, transitionForm }, _who: string) => {
    await expect(transitionForm.alert).toContainText('Ta session a expiré.');
    await expect(transitionForm.alert.getByRole('link', { name: 'Se connecter' })).toBeVisible();
    // On this page, the alert replaces the banner of the whole site.
    await expect(page.getByRole('region', { name: 'Session expirée' })).toHaveCount(0);
  },
);

Then(
  new RegExp(`^(\\S+) retrouve dans le formulaire de transition ${aTransition}$`),
  async ({ transitionForm }, _who: string, name: string | null | undefined, from: string, to: string) => {
    await expect(transitionForm.form).toBeVisible();
    await expect(transitionForm.name).toHaveValue(name ?? '');
    expect(await transitionForm.selected(transitionForm.fromPose)).toBe(from);
    expect(await transitionForm.selected(transitionForm.toPose)).toBe(to);
  },
);

// --- Validation queue -------------------------------------------------------------------------------------------

const cardOf = (validationPage: ValidationPage, title: string) => validationPage.card(title);

const titleOf = (name: string | null | undefined, from: string, to: string) =>
  name ? `Transition ${name} de ${from} vers ${to}` : `Transition de ${from} vers ${to}`;

Then(
  /^le site présente la proposition « (Transition .+) » par "([^"]+)"(?:, (\S+) \/ (\S+), avec la description « (.+) »)?$/,
  async (
    { validationPage },
    title: string,
    email: string,
    base: string | null | undefined,
    flyer: string | null | undefined,
    description: string | null | undefined,
  ) => {
    const card = cardOf(validationPage, title);
    await expect(card).toBeVisible();
    await expect(card.getByText(/^Proposée par /)).toHaveText(
      new RegExp(`^Proposée par ${email.replace('.', '\\.')} le `),
    );
    if (base) await expect(validationPage.valueIn(card, 'Base')).toHaveText(displayed(base));
    if (flyer) await expect(validationPage.valueIn(card, 'Flyer')).toHaveText(displayed(flyer));
    if (description) {
      await expect(card.getByText('Description', { exact: true })).toBeVisible();
      await expect(card.getByText(description, { exact: true })).toBeVisible();
    }
  },
);

When(
  new RegExp(`^(\\S+) accepte sur le site la proposition de ${aTransition} par (\\S+)$`),
  async (
    { validationPage },
    _who: string,
    name: string | null | undefined,
    from: string,
    to: string,
    _contributor: string,
  ) => {
    if (!validationPage.isOpen()) await validationPage.open();
    await cardOf(validationPage, titleOf(name, from, to))
      .getByRole('button', { name: 'Accepter et publier' })
      .click();
  },
);

Then(
  "le site indique à {word} qu'une transition de ce nom relie déjà ces poses dans le catalogue",
  async ({ page }, _who: string) => {
    await expect(page.getByRole('main').getByRole('alert')).toContainText(
      'Une transition de ce nom relie déjà ces poses dans le catalogue.',
    );
  },
);

// --- « Mes propositions » ----------------------------------------------------------------------------------------

const expectPending = async (myProposalsPage: MyProposalsPage, title: string) => {
  await expect(myProposalsPage.status(title)).toHaveText('Statut : En attente de validation');
  await expect(
    myProposalsPage.text(title, 'La transition apparaîtra dans le catalogue une fois acceptée.'),
  ).toBeVisible();
};

Then(
  /^le site présente la proposition « (Transition .+) », en attente de validation$/,
  async ({ myProposalsPage }, title: string) => {
    await expectPending(myProposalsPage, title);
  },
);
