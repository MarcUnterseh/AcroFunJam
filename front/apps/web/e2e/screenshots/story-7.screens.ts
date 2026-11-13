import { expect } from '@playwright/test';
import { PosePage, posePath } from '../pages/pose-page';
import { TransitionForm, transitionPath } from '../pages/transition-form';
import { ValidationPage } from '../pages/validation-page';
import { signIn, test, type SimulatedSite } from './simulated-site';

// Story 7 « Proposer une transition » (docs/design/ecrans/7-proposer-une-transition.md): every screen in its key
// states, at 320 px and 1280 px wide, light theme. Output: screenshots/story-7/<screen>-<width>.png.

const alice = 'alice@example.org';
const bruno = 'bruno@example.org';

/** The catalog of the examples: Throne, Bird, Star; Star has a washing machine and transitions from and to it. */
const publishExamples = ({ catalogApi }: SimulatedSite) => {
  catalogApi.publish({ name: 'Bird', baseDifficulty: 'beginner', flyerDifficulty: 'beginner' });
  catalogApi.publish({ name: 'Star', baseDifficulty: 'intermediate', flyerDifficulty: 'intermediate' });
  catalogApi.publish({
    name: 'Throne',
    baseDifficulty: 'beginner',
    flyerDifficulty: 'discovery',
    canStartFlow: true,
    canEndFlow: false,
  });
  const id = (name: string) => catalogApi.poseNamed(name).id;
  catalogApi.publishTransition({
    fromPoseId: id('Star'),
    toPoseId: id('Bird'),
    name: null,
    baseDifficulty: 'intermediate',
    flyerDifficulty: 'intermediate',
    description: "Passe par Throne sans s'arrêter.",
  });
  catalogApi.publishTransition({
    fromPoseId: id('Star'),
    toPoseId: id('Star'),
    name: 'Ninja Star',
    baseDifficulty: 'advanced',
    flyerDifficulty: 'advanced',
    description: 'Rotation complète, retour en Star.\nVidéo : https://example.org/ninja-star',
  });
  catalogApi.publishTransition({
    fromPoseId: id('Throne'),
    toPoseId: id('Star'),
    name: null,
    baseDifficulty: 'beginner',
    flyerDifficulty: 'intermediate',
    description: null,
  });
};

const openPose = async (page: import('@playwright/test').Page, site: SimulatedSite, name: string) => {
  await page.goto(posePath(site.catalogApi.poseNamed(name).id));
  await expect(new PosePage(page).title(name)).toBeVisible();
};

test.describe('the catalog, clickable cards', () => {
  test('cards, at rest, hovered and focused', async ({ page, site, shoot }) => {
    publishExamples(site);
    await signIn(page, site, alice);
    await page.goto('/');
    const name = page
      .getByRole('list', { name: 'Poses du catalogue' })
      .getByRole('link', { name: 'Throne', exact: true });
    await expect(name).toBeVisible();
    await shoot('catalog');
    await page.getByRole('list', { name: 'Poses du catalogue' }).getByRole('listitem').first().hover();
    await shoot('catalog-card-hover');
    await page.mouse.move(0, 0);
    await name.focus();
    await shoot('catalog-card-focus');
  });
});

test.describe('the page of a pose', () => {
  test('nominal: a washing machine and a transition without a name, for a signed-in person', async ({
    page,
    site,
    shoot,
  }) => {
    publishExamples(site);
    await signIn(page, site, alice);
    await openPose(page, site, 'Star');
    await shoot('pose-page');
  });

  test('nominal, for a visitor', async ({ page, site, shoot }) => {
    publishExamples(site);
    await openPose(page, site, 'Star');
    await shoot('pose-page-visitor');
  });

  test('empty sections', async ({ page, site, shoot }) => {
    publishExamples(site);
    site.catalogApi.publish({
      name: 'Folded Leaf',
      baseDifficulty: 'beginner',
      flyerDifficulty: 'discovery',
    });
    await openPose(page, site, 'Folded Leaf');
    await shoot('pose-page-empty');
  });

  test('loading', async ({ page, site, shoot }) => {
    publishExamples(site);
    // The page of the pose never answers: the loading state stays on screen.
    await page.route('**/catalog/poses/*', () => undefined);
    await page.goto(posePath(site.catalogApi.poseNamed('Star').id));
    await expect(page.getByText('Chargement de la pose…')).toBeVisible();
    await shoot('pose-page-loading');
  });

  test('loading failure', async ({ page, site, shoot }) => {
    publishExamples(site);
    site.catalogApi.setUnreachable(true);
    await page.goto(posePath(site.catalogApi.poseNamed('Star').id));
    await expect(page.getByRole('alert')).toBeVisible();
    await shoot('pose-page-error');
  });

  test('not found', async ({ page, site, shoot }) => {
    publishExamples(site);
    await page.goto(posePath(crypto.randomUUID()));
    await expect(page.getByRole('heading', { level: 1, name: 'Pose introuvable' })).toBeVisible();
    await shoot('pose-page-not-found');
  });
});

test.describe('the form « Proposer une transition »', () => {
  const openForm = async (page: import('@playwright/test').Page, site: SimulatedSite, origin = 'Throne') => {
    await page.goto(transitionPath(site.catalogApi.poseNamed(origin).id));
    const form = new TransitionForm(page);
    await form.loaded();
    await expect(form.form).toBeVisible();
    return form;
  };

  test('blank, with errors, and the place taken under the name', async ({ page, site, shoot }) => {
    publishExamples(site);
    await signIn(page, site, alice);
    const form = await openForm(page, site);
    await shoot('transition-form');
    await form.submit();
    await expect(form.toPose).toHaveAttribute('aria-invalid', 'true');
    await shoot('transition-form-errors');
    await form.fill({ to: 'Star' });
    await form.submit();
    await expect(form.name).toHaveAttribute('aria-invalid', 'true');
    await shoot('transition-form-place-taken');
  });

  test('a validator, told the transition is published directly, then the success', async ({
    page,
    site,
    shoot,
  }) => {
    publishExamples(site);
    await signIn(page, site, bruno, 'validator');
    const form = await openForm(page, site, 'Star');
    await shoot('transition-form-validator');
    await form.fill({ to: 'Throne', name: 'Star Drop', base: 'Avancé', flyer: 'Intermédiaire' });
    await form.submit();
    await expect(form.successTitle).toBeVisible();
    await shoot('transition-success-validator');
  });

  test('a user, the success', async ({ page, site, shoot }) => {
    publishExamples(site);
    await signIn(page, site, alice);
    const form = await openForm(page, site);
    await form.fill({ to: 'Bird', description: 'Le flyer bascule vers l’avant, mains sur les épaules.' });
    await form.submit();
    await expect(form.successTitle).toBeVisible();
    await shoot('transition-success-user');
  });

  test('the departure pose is no longer in the catalog', async ({ page, site, shoot }) => {
    publishExamples(site);
    await signIn(page, site, alice);
    await page.goto(transitionPath(crypto.randomUUID()));
    await expect(page.getByText("Cette pose n'est plus dans le catalogue.").first()).toBeVisible();
    await shoot('transition-form-pose-gone');
  });
});

/** Alice's transitions: Ninja Star pending, Throne → Bird pending; a pose proposal too. */
const proposeAsAlice = (site: SimulatedSite) => {
  const { catalogApi, contributionApi } = site;
  const id = (name: string) => catalogApi.poseNamed(name).id;
  contributionApi.addPending({
    name: 'High Bird',
    baseDifficulty: 'intermediate',
    flyerDifficulty: 'intermediate',
    canStartFlow: false,
    canEndFlow: false,
    contributorEmail: alice,
  });
  const ninjaStar = contributionApi.addTransition(
    {
      fromPoseId: id('Star'),
      toPoseId: id('Star'),
      contributorEmail: alice,
      name: 'Ninja Star',
      baseDifficulty: 'advanced',
      flyerDifficulty: 'advanced',
      description: 'Vidéo : https://example.org/ninja-star',
    },
    false,
  );
  const throneToBird = contributionApi.addTransition(
    {
      fromPoseId: id('Throne'),
      toPoseId: id('Bird'),
      contributorEmail: alice,
      name: null,
      baseDifficulty: 'beginner',
      flyerDifficulty: 'beginner',
      description: null,
    },
    false,
  );
  return { ninjaStar, throneToBird };
};

test.describe('a pose name of 60 characters', () => {
  const longName = 'Chandelle inversée sur les mains du base avec vrille arrière';

  test('the page of the pose, then the success of a transition from it', async ({ page, site, shoot }) => {
    publishExamples(site);
    site.catalogApi.publish({ name: longName, baseDifficulty: 'advanced', flyerDifficulty: 'advanced' });
    await signIn(page, site, alice);
    await openPose(page, site, longName);
    await shoot('pose-page-long-name');
    await page.goto(transitionPath(site.catalogApi.poseNamed(longName).id));
    const form = new TransitionForm(page);
    await form.loaded();
    await form.fill({ to: 'Bird' });
    await form.submit();
    await expect(form.successTitle).toBeVisible();
    await shoot('transition-success-long-name');
  });
});

test.describe('the validation queue', () => {
  test('transition cards, then the adjustment zone of a transition', async ({ page, site, shoot }) => {
    publishExamples(site);
    proposeAsAlice(site);
    await signIn(page, site, bruno, 'validator');
    const queue = new ValidationPage(page);
    await queue.open();
    const card = queue.card('Transition Ninja Star de Star vers Star');
    await expect(card).toBeVisible();
    await shoot('validation-queue');
    await card.getByRole('button', { name: 'Ajuster avant de publier' }).click();
    await shoot('validation-transition-adjust');
  });
});

test.describe('« Mes propositions »', () => {
  test('transition cards: pending, accepted with adjustments, rejected', async ({ page, site, shoot }) => {
    publishExamples(site);
    const { ninjaStar, throneToBird } = proposeAsAlice(site);
    ninjaStar.decision = {
      kind: 'accepted',
      retained: { ...ninjaStar, description: 'Rotation complète, retour en Star.' },
      message: 'La vidéo est en lien dans la description publique : précise plutôt le passage.',
      decidedAt: new Date(Date.UTC(2026, 10, 15, 10)).toISOString(),
    };
    throneToBird.decision = {
      kind: 'rejected',
      reason: 'Cette transition arrive en Star, pas en Bird : propose-la vers Star.',
      decidedAt: new Date(Date.UTC(2026, 10, 15, 10)).toISOString(),
    };
    site.contributionApi.addTransition(
      {
        fromPoseId: site.catalogApi.poseNamed('Bird').id,
        toPoseId: site.catalogApi.poseNamed('Throne').id,
        contributorEmail: alice,
        name: null,
        baseDifficulty: 'beginner',
        flyerDifficulty: 'discovery',
        description: null,
      },
      false,
    );
    await signIn(page, site, alice);
    await page.goto('/mes-propositions');
    await expect(page.getByRole('article').first()).toBeVisible();
    await shoot('my-proposals');
  });

  test('nothing proposed yet', async ({ page, site, shoot }) => {
    publishExamples(site);
    await signIn(page, site, alice);
    await page.goto('/mes-propositions');
    await expect(page.getByText("Tu n'as encore rien proposé.")).toBeVisible();
    await shoot('my-proposals-empty');
  });
});
