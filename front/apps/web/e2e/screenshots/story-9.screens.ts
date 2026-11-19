import { expect } from '@playwright/test';
import { FlowGenerator } from '../pages/flow-generator';
import { test, type SimulatedSite } from './simulated-site';

// Story 9 « Générer un flow » (docs/design/ecrans/9-generer-un-flow.md): the generator in its key states, at 320 px and
// 1280 px wide. Output: screenshots/story-9/.

/** The seeded list, four poses and a flow of 3 transitions with a washing machine. */
const seedExamples = ({ tagApi, catalogApi }: SimulatedSite) => {
  tagApi.seed();
  tagApi.add('contrepoids', "Base et flyer s'équilibrent en tirant l'un contre l'autre.", null, 'poses');
  catalogApi.publish({
    name: 'Throne',
    baseDifficulty: 'beginner',
    flyerDifficulty: 'discovery',
    canEndFlow: false,
  });
  catalogApi.publish({
    name: 'Star',
    baseDifficulty: 'intermediate',
    flyerDifficulty: 'intermediate',
    canStartFlow: false,
    canEndFlow: false,
  });
  catalogApi.publish({
    name: 'Folded Leaf',
    baseDifficulty: 'intermediate',
    flyerDifficulty: 'beginner',
    canStartFlow: false,
  });
  const id = (name: string) => tagApi.tagNamed(name).id;
  catalogApi.tagPose('Folded Leaf', [id('inversion'), id('lunaire')]);
  const pose = (name: string) => catalogApi.poseNamed(name).id;
  catalogApi.publishTransition({
    fromPoseId: pose('Throne'),
    toPoseId: pose('Star'),
    name: null,
    baseDifficulty: 'beginner',
    flyerDifficulty: 'beginner',
    description: null,
  });
  catalogApi.publishTransition({
    fromPoseId: pose('Star'),
    toPoseId: pose('Star'),
    name: 'Ninja Star',
    baseDifficulty: 'advanced',
    flyerDifficulty: 'advanced',
    description: 'Le flyer tourne sur lui-même au-dessus de la base, qui garde les mains tendues.',
  });
  catalogApi.publishTransition({
    fromPoseId: pose('Star'),
    toPoseId: pose('Folded Leaf'),
    name: null,
    baseDifficulty: 'intermediate',
    flyerDifficulty: 'beginner',
    description: null,
    tagIds: [id('lunaire')],
  });
};

test.describe('the generator of flows', () => {
  test('the form, then its tags', async ({ page, site, shoot }) => {
    seedExamples(site);
    const generator = new FlowGenerator(page);
    await generator.open();
    await shoot('form');
    await generator.openTags();
    await generator.tagBox('requested', 'lunaire').getByRole('checkbox').check();
    await shoot('form-tags');
  });

  test('a flow of 3 transitions with a washing machine, then the same flow again', async ({
    page,
    site,
    shoot,
  }) => {
    seedExamples(site);
    const generator = new FlowGenerator(page);
    await generator.open();
    await generator.choose({ length: 3, base: 'avancé', flyer: 'avancé' });
    await generator.generate();
    await expect(generator.title).toHaveText('Ton flow');
    await shoot('flow');
    await page.getByRole('button', { name: 'Générer un autre flow' }).click();
    await expect(page.getByText('Le même flow est ressorti', { exact: false }).first()).toBeVisible();
    await shoot('flow-same-again');
  });

  test('no flow: criteria too restrictive, catalog not ready yet', async ({ page, site, shoot }) => {
    seedExamples(site);
    const generator = new FlowGenerator(page);
    await generator.open();
    await generator.choose({ length: 2, excluded: ['vrille'] });
    await generator.generate();
    await expect(page.getByText('Critères trop restrictifs', { exact: false })).toBeVisible();
    await shoot('too-restrictive');
  });

  test('no flow: an empty catalog', async ({ page, site: _site, shoot }) => {
    const generator = new FlowGenerator(page);
    await generator.open();
    await generator.generate();
    await expect(page.getByText('Le catalogue ne permet pas encore', { exact: false })).toBeVisible();
    await shoot('catalog-insufficient');
  });
});
