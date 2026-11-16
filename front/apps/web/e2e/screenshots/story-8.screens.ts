import { expect } from '@playwright/test';
import { TagsPage } from '../pages/tags-page';
import { signIn, test, type SimulatedSite } from './simulated-site';

// Story 8 « Étiquettes », part 1 (docs/design/ecrans/8-etiquettes.md): the page « Étiquettes » in its key states, at
// 320 px and 1280 px wide, light and dark themes. Output: screenshots/story-8/<screen>-<width>.png.

const alice = 'alice@example.org';
const bruno = 'bruno@example.org';

/** The seeded list, « lunaire » carried by two published transitions. */
const seedExamples = ({ tagApi, catalogApi }: SimulatedSite) => {
  tagApi.add(
    'dynamique',
    "Le passage se fait avec de l'élan : base et flyer se lancent dans le mouvement au lieu de le dérouler lentement.",
  );
  tagApi.add(
    'icarien',
    'Style où la base, le plus souvent en L-basing, lance, fait tourner et rattrape le flyer surtout avec les pieds.',
  );
  tagApi.add('inversion', 'Le flyer passe la tête en bas pendant la transition.');
  const lunaire = tagApi.add(
    'lunaire',
    'Pratique thérapeutique : le flyer, détendu et passif, se laisse porter, étirer ou retourner lentement par la base.',
  );
  tagApi.add(
    'pop',
    "La base propulse le flyer, qui quitte un instant tout contact avec elle avant d'être rattrapé.",
  );
  tagApi.add(
    'vrille',
    'Le flyer tourne sur lui-même autour de l’axe de son corps, par exemple du ventre vers le dos.',
  );
  catalogApi.publish({ name: 'Bird' });
  catalogApi.publish({ name: 'Folded Leaf' });
  catalogApi.publish({ name: 'Throne' });
  const id = (name: string) => catalogApi.poseNamed(name).id;
  const transition = (from: string, to: string, name: string | null) =>
    catalogApi.publishTransition({
      fromPoseId: id(from),
      toPoseId: id(to),
      name,
      baseDifficulty: 'beginner',
      flyerDifficulty: 'beginner',
      description: null,
      tagIds: [lunaire.id],
    });
  transition('Bird', 'Folded Leaf', null);
  transition('Folded Leaf', 'Throne', 'Lunar Roll');
};

test.describe('the page « Étiquettes »', () => {
  test('for a visitor: the glossary', async ({ page, site, shoot }) => {
    seedExamples(site);
    await new TagsPage(page).open();
    await shoot('tags-visitor');
  });

  test('for a user: the glossary, without management', async ({ page, site, shoot }) => {
    seedExamples(site);
    await signIn(page, site, alice);
    await new TagsPage(page).open();
    await shoot('tags-user');
  });

  test('empty list', async ({ page, shoot }) => {
    await new TagsPage(page).open();
    await shoot('tags-empty');
  });

  test('for a validator: at rest, name taken, change, removal', async ({ page, site, shoot }) => {
    seedExamples(site);
    await signIn(page, site, bruno, 'validator');
    const tags = new TagsPage(page);
    await tags.open();
    await shoot('tags-validator');

    await tags.add('POP', 'Le flyer décolle un instant.');
    await expect(tags.addPanel.getByText('Une étiquette de ce nom existe déjà dans la liste.')).toBeVisible();
    await shoot('tags-add-name-taken');

    await tags.addPanel.getByLabel('Nom').fill('');
    await tags.addPanel.getByLabel('Description').fill('');
    await tags.tag('lunaire').getByRole('button', { name: 'Modifier lunaire' }).click();
    await tags.tag('lunaire').getByLabel('Nom').fill('lunaire et lente');
    await shoot('tags-edit');
    await tags.tag('lunaire').getByRole('button', { name: 'Annuler' }).click();

    await tags.tag('vrille').getByRole('button', { name: 'Retirer vrille' }).click();
    await shoot('tags-remove-confirm');
    await tags.tag('vrille').getByRole('button', { name: 'Annuler' }).click();

    await tags.removeConfirming('lunaire');
    await expect(tags.tag('lunaire').getByRole('alert')).toBeVisible();
    await shoot('tags-remove-refused');
  });

  test('the entries: the catalog and the proposals to validate', async ({ page, site, shoot }) => {
    seedExamples(site);
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Étiquettes', exact: true })).toBeVisible();
    await shoot('catalog-visitor');
    await signIn(page, site, bruno, 'validator');
    await page.goto('/propositions-a-valider');
    await expect(page.getByRole('link', { name: 'Gérer les étiquettes' })).toBeVisible();
    await shoot('validation-entry');
  });
});
