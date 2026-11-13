import { expect, type Page } from '@playwright/test';
import { IdentityForm } from '../pages/identity-pages';
import { PosePage, posePath } from '../pages/pose-page';
import { ProposalForm } from '../pages/proposal-form';
import { RevisionForm, revisionPath } from '../pages/revision-form';
import { TransitionForm, transitionPath } from '../pages/transition-form';
import { ValidationPage } from '../pages/validation-page';
import { signIn, test, type SimulatedSite } from './simulated-site';

// The visual direction « Soleil et Lune » (ADR 0031, docs/design/maquettes/soleil-lune/): the main screens of
// stories 1 to 7, to compare with the captures of the mockup, at 320 px and 1280 px, dawn (light) and night (dark).
// Output: screenshots/soleil-lune/<screen>-<width>[-dark].png.

const alice = 'alice@example.org';
const bruno = 'bruno@example.org';

/** The catalog of the mockup: Bird, Star, Throne; Star has a washing machine and transitions from and to it. */
const publishExamples = ({ catalogApi }: SimulatedSite) => {
  catalogApi.publish({ name: 'Bird', baseDifficulty: 'discovery', flyerDifficulty: 'discovery' });
  catalogApi.publish({
    name: 'Star',
    baseDifficulty: 'intermediate',
    flyerDifficulty: 'intermediate',
    canStartFlow: false,
    canEndFlow: false,
  });
  catalogApi.publish({ name: 'Throne', baseDifficulty: 'beginner', flyerDifficulty: 'discovery' });
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
    description: 'Rotation continue par les mains.\nVidéo : https://example.org/ninja-star',
  });
  catalogApi.publishTransition({
    fromPoseId: id('Throne'),
    toPoseId: id('Star'),
    name: null,
    baseDifficulty: 'intermediate',
    flyerDifficulty: 'beginner',
    description: null,
  });
};

const catalogShown = async (page: Page) =>
  expect(
    page.getByRole('list', { name: 'Poses du catalogue' }).getByRole('link', { name: 'Throne', exact: true }),
  ).toBeVisible();

test.describe('identity', () => {
  test('sign in and register', async ({ page, shoot }) => {
    await page.goto('/connexion');
    await expect(page.getByRole('form', { name: 'Se connecter' })).toBeVisible();
    await shoot('sign-in');
    const signInForm = new IdentityForm(page, 'Se connecter');
    await signInForm.submit();
    await shoot('sign-in-errors');
    await page.goto('/inscription');
    await expect(page.getByRole('form', { name: "S'inscrire" })).toBeVisible();
    await shoot('register');
  });
});

test.describe('the catalog', () => {
  test('a visitor, then a signed-in person', async ({ page, site, shoot }) => {
    publishExamples(site);
    await page.goto('/');
    await catalogShown(page);
    await shoot('catalog-visitor');
    await signIn(page, site, alice);
    await page.goto('/');
    await catalogShown(page);
    await shoot('catalog');
  });
});

test.describe('the page of a pose', () => {
  test('Star, its washing machine and its transitions', async ({ page, site, shoot }) => {
    publishExamples(site);
    await signIn(page, site, alice);
    await page.goto(posePath(site.catalogApi.poseNamed('Star').id));
    await expect(new PosePage(page).title('Star')).toBeVisible();
    await shoot('pose-page');
  });

  test('a page that does not exist', async ({ page, shoot }) => {
    await page.goto('/une-page-qui-n-existe-pas');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await shoot('not-found');
  });
});

test.describe('the forms', () => {
  test('« Proposer une pose »: blank, errors, success', async ({ page, site, shoot }) => {
    publishExamples(site);
    await signIn(page, site, alice);
    const form = new ProposalForm(page);
    await form.open();
    await shoot('propose-pose');
    await form.submit();
    await expect(form.name).toHaveAttribute('aria-invalid', 'true');
    await shoot('propose-pose-errors');
    await form.fill({ name: 'High Bird', base: 'Intermédiaire', flyer: 'Avancé' });
    await form.submit();
    await expect(form.successTitle).toBeVisible();
    await shoot('propose-pose-success');
  });

  test('« Proposer une modification »', async ({ page, site, shoot }) => {
    publishExamples(site);
    await signIn(page, site, alice);
    await page.goto(revisionPath(site.catalogApi.poseNamed('Throne').id));
    const form = new RevisionForm(page);
    await form.loaded();
    await form.change({ base: 'Intermédiaire' });
    await shoot('revision-form');
  });

  test('« Proposer une transition »: errors, then selections, then the success', async ({
    page,
    site,
    shoot,
  }) => {
    publishExamples(site);
    await signIn(page, site, alice);
    await page.goto(transitionPath(site.catalogApi.poseNamed('Throne').id));
    const form = new TransitionForm(page);
    await form.loaded();
    await form.submit();
    await expect(form.toPose).toHaveAttribute('aria-invalid', 'true');
    await shoot('transition-form-errors');
    await form.fill({ to: 'Bird', base: 'Intermédiaire', flyer: 'Débutant' });
    await shoot('transition-form-selections');
    await form.submit();
    await expect(form.successTitle).toBeVisible();
    await shoot('transition-success');
  });
});

test.describe('follow-up', () => {
  const proposeAsAlice = ({ catalogApi, contributionApi }: SimulatedSite) => {
    contributionApi.addPending({
      name: 'High Bird',
      baseDifficulty: 'intermediate',
      flyerDifficulty: 'advanced',
      canStartFlow: false,
      canEndFlow: true,
      contributorEmail: alice,
    });
    contributionApi.addTransition(
      {
        fromPoseId: catalogApi.poseNamed('Throne').id,
        toPoseId: catalogApi.poseNamed('Bird').id,
        contributorEmail: alice,
        name: null,
        baseDifficulty: 'beginner',
        flyerDifficulty: 'beginner',
        description: 'Le flyer bascule vers l’avant.',
      },
      false,
    );
  };

  test('the validation queue', async ({ page, site, shoot }) => {
    publishExamples(site);
    proposeAsAlice(site);
    await signIn(page, site, bruno, 'validator');
    const queue = new ValidationPage(page);
    await queue.open();
    await expect(queue.card('High Bird')).toBeVisible();
    await shoot('validation-queue');
  });

  test('« Mes propositions »', async ({ page, site, shoot }) => {
    publishExamples(site);
    proposeAsAlice(site);
    await signIn(page, site, alice);
    await page.goto('/mes-propositions');
    await expect(page.getByRole('article').first()).toBeVisible();
    await shoot('my-proposals');
  });
});
