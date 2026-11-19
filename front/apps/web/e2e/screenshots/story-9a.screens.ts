import { expect, type Page } from '@playwright/test';
import { CatalogPage } from '../pages/catalog-page';
import { TagsPage } from '../pages/tags-page';
import { signIn, test, type SimulatedSite } from './simulated-site';

// Story 9a « Étiqueter les poses » (docs/design/ecrans/9a-etiquettes-des-poses.md): the screens of the tags of the
// poses in their key states, at 320 px and 1280 px wide, light and dark themes. Output: screenshots/story-9a/.

const alice = 'alice@example.org';
const bruno = 'bruno@example.org';

/** The seeded list (revision 2), « contrepoids » for the poses only, three poses, two of them tagged. */
const seedExamples = ({ tagApi, catalogApi }: SimulatedSite) => {
  tagApi.seed();
  tagApi.add('contrepoids', "Base et flyer s'équilibrent en tirant l'un contre l'autre.", null, 'poses');
  catalogApi.publish({
    name: 'Candlestick',
    baseDifficulty: 'intermediate',
    flyerDifficulty: 'intermediate',
  });
  catalogApi.publish({ name: 'Folded Leaf', baseDifficulty: 'beginner', flyerDifficulty: 'discovery' });
  catalogApi.publish({ name: 'Straddle Bat', baseDifficulty: 'intermediate', flyerDifficulty: 'beginner' });
  catalogApi.publish({ name: 'Throne', baseDifficulty: 'beginner', flyerDifficulty: 'discovery' });
  const id = (name: string) => tagApi.tagNamed(name).id;
  catalogApi.tagPose('Straddle Bat', [id('inversion'), id('lunaire')]);
  catalogApi.tagPose('Candlestick', [id('inversion')]);
  catalogApi.tagPose('Folded Leaf', [id('lunaire')]);
};

const openPose = async (page: Page, site: SimulatedSite, name: string) => {
  await page.goto(`/poses/${site.catalogApi.poseNamed(name).id}`);
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
};

test.describe('the page « Étiquettes »', () => {
  test('what each tag applies to, its counter, adding and narrowing refused', async ({
    page,
    site,
    shoot,
  }) => {
    seedExamples(site);
    await signIn(page, site, bruno, 'validator');
    const tags = new TagsPage(page);
    await tags.open();
    await shoot('tags-scope-validator');

    await tags.add('équilibre', 'Le duo cherche son point fixe.', null);
    await expect(tags.addPanel.getByText("Choisis à quoi s'applique l'étiquette.")).toBeVisible();
    await shoot('tags-add-scope-required');

    await tags.change('lunaire', { scope: 'transitions' });
    await expect(tags.tag('lunaire').getByRole('alert')).toBeVisible();
    await shoot('tags-scope-refused');
  });
});

test.describe('the tags of a pose', () => {
  test('the catalog: a line « Étiquettes » on each tagged card', async ({ page, site, shoot }) => {
    seedExamples(site);
    await new CatalogPage(page).open();
    await shoot('catalog-cards');
  });

  test('the page of a pose: the tags under the sky, their meaning', async ({ page, site, shoot }) => {
    seedExamples(site);
    await openPose(page, site, 'Straddle Bat');
    await shoot('pose-visitor');
    await page.getByText('Ce que veulent dire les étiquettes de la pose').click();
    await shoot('pose-visitor-meanings');
  });

  test('the page of a pose for a validator: the zone, then a pending revision', async ({
    page,
    site,
    shoot,
  }) => {
    seedExamples(site);
    await signIn(page, site, bruno, 'validator');
    await openPose(page, site, 'Throne');
    await shoot('pose-validator-untagged');
    await page.getByRole('button', { name: 'Étiqueter la pose Throne' }).click();
    await shoot('pose-validator-zone');

    const { catalogApi, contributionApi } = site;
    const leaf = catalogApi.poseNamed('Folded Leaf');
    const { name, baseDifficulty, flyerDifficulty, canStartFlow, canEndFlow, tagIds } = leaf;
    contributionApi.addRevision(
      {
        poseId: leaf.id,
        before: { name, baseDifficulty, flyerDifficulty, canStartFlow, canEndFlow, tagIds },
        changes: { flyerDifficulty: 'beginner' },
        message: null,
        contributorEmail: alice,
      },
      false,
    );
    await openPose(page, site, 'Folded Leaf');
    await page.getByRole('button', { name: 'Étiqueter la pose Folded Leaf' }).click();
    await shoot('pose-validator-pending-revision');
  });
});

test.describe('the forms of a pose', () => {
  test('« Proposer une pose » with its tags, then a tag no longer applying', async ({
    page,
    site,
    shoot,
  }) => {
    seedExamples(site);
    await signIn(page, site, alice);
    await page.goto('/proposer-une-pose');
    await page.getByRole('checkbox', { name: 'lunaire', exact: true }).check();
    await shoot('proposal-form-tags');
  });

  test('« Proposer une modification »: the current tags, then « Modifiée »', async ({
    page,
    site,
    shoot,
  }) => {
    seedExamples(site);
    await signIn(page, site, alice);
    await page.goto(`/poses/${site.catalogApi.poseNamed('Folded Leaf').id}/proposer-une-modification`);
    await page.getByRole('checkbox', { name: 'inversion', exact: true }).check();
    await shoot('revision-form-tags');
  });
});

test.describe('the validation queue and « Mes propositions »', () => {
  test('a proposed pose with its tags, its adjustment, a revision of tags', async ({ page, site, shoot }) => {
    seedExamples(site);
    const { contributionApi, tagApi, catalogApi } = site;
    const id = (name: string) => tagApi.tagNamed(name).id;
    contributionApi.addPending({
      name: 'Fallen Leaf',
      baseDifficulty: 'beginner',
      flyerDifficulty: 'discovery',
      canStartFlow: true,
      canEndFlow: true,
      tagIds: [id('lunaire'), id('inversion')],
      contributorEmail: alice,
    });
    const throne = catalogApi.poseNamed('Throne');
    const { name, baseDifficulty, flyerDifficulty, canStartFlow, canEndFlow } = throne;
    contributionApi.addRevision(
      {
        poseId: throne.id,
        before: { name, baseDifficulty, flyerDifficulty, canStartFlow, canEndFlow, tagIds: [] },
        changes: { tagIds: [id('lunaire')] },
        message: null,
        contributorEmail: alice,
      },
      false,
    );
    await signIn(page, site, bruno, 'validator');
    await page.goto('/propositions-a-valider');
    await expect(page.getByRole('article', { name: 'Fallen Leaf' })).toBeVisible();
    await shoot('queue-tags');

    const card = page.getByRole('article', { name: 'Fallen Leaf' });
    await card.getByRole('button', { name: 'Ajuster avant de publier' }).click();
    await card.getByRole('checkbox', { name: 'inversion', exact: true }).uncheck();
    await shoot('queue-adjusting-tags');
    await card.getByRole('button', { name: 'Vérifier les ajustements' }).click();
    await shoot('queue-adjustments-summary');
  });
});
