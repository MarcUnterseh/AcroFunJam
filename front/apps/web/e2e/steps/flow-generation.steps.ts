import { expect } from '@playwright/test';
import type { DataTable } from 'playwright-bdd';
import { Given, Then, When } from '../fixtures';
import type { FlowCriteriaInput, FlowGenerator } from '../pages/flow-generator';
import { setAcroFunJamReachable } from '../support/reachability';

// Story 9 « Générer un flow »: the scenarios @web of generer-un-flow.feature and criteres-de-generation.feature. Unless a
// step says otherwise, a visitor « génère un flow de N transitions » restricting neither the difficulty (« avancé » at
// most) nor the tags.

const quotedNames = (text: string) => [...text.matchAll(/"([^"]+)"/g)].map(([, name]) => name ?? '');
const guillemets = (text: string) => [...text.matchAll(/« ([^»]+) »/g)].map(([, name]) => name ?? '');

/** « , de difficulté base "débutant" au plus et de difficulté flyer "débutant" au plus, avec l'une des étiquettes "lunaire" … ». */
const criteriaOf = (length: number, rest: string): FlowCriteriaInput => {
  const ceilings = /de difficulté base "([^"]+)" au plus et de difficulté flyer "([^"]+)" au plus/.exec(rest);
  const requested = /avec l'une des étiquettes ((?:"[^"]+"(?: ou )?)+)/.exec(rest);
  const excluded = /sans l'étiquette "([^"]+)"/.exec(rest);
  return {
    length,
    base: ceilings?.[1] ?? 'avancé',
    flyer: ceilings?.[2] ?? 'avancé',
    requested: requested ? quotedNames(requested[1] ?? '') : [],
    excluded: excluded ? [excluded[1] ?? ''] : [],
  };
};

const generateOnTheSite = async (flowGenerator: FlowGenerator, criteria: FlowCriteriaInput, open = true) => {
  if (open) await flowGenerator.open();
  await flowGenerator.choose(criteria);
  await flowGenerator.generate();
};

// --- Set-up -----------------------------------------------------------------------------------------

Given(
  /^les poses publiées (".+") dans le catalogue, qui peuvent commencer et terminer un flow$/,
  async ({ catalogApi }, names: string) => {
    for (const name of quotedNames(names))
      catalogApi.publish({ name, baseDifficulty: 'beginner', flyerDifficulty: 'beginner' });
  },
);

Given(
  'la transition {string} a pour description {string}',
  async ({ catalogApi }, name: string, description: string) => {
    const transition = catalogApi.transitions.find((published) => published.name === name);
    if (!transition) throw new Error(`Aucune transition publiée de nom ${name}`);
    transition.description = description;
  },
);

Given("la liste des étiquettes n'a pas pu être chargée sur le site", async ({ tagApi }) => {
  tagApi.listUnreachable = true;
});

Given('un visiteur a ouvert le générateur de flow', async ({ flowGenerator }) => {
  await flowGenerator.open();
});

Given(
  /^un visiteur a (demandé|exclu) l'étiquette "([^"]+)" dans le générateur de flow$/,
  async ({ flowGenerator }, choice: string, name: string) => {
    await flowGenerator.open();
    await flowGenerator.openTags();
    await flowGenerator
      .tagBox(choice === 'demandé' ? 'requested' : 'excluded', name)
      .getByRole('checkbox')
      .check();
  },
);

Given(
  /^un visiteur a généré un flow de (\d+) transitions? sur le site(.*)$/,
  async ({ flowGenerator }, length: string, rest: string) => {
    await generateOnTheSite(flowGenerator, criteriaOf(Number(length), rest));
    await expect(flowGenerator.title).toBeVisible();
  },
);

Given(
  /^un visiteur a généré sur le site le flow « (.+) » de (\d+) transitions?$/,
  async ({ flowGenerator }, path: string, length: string) => {
    await generateOnTheSite(flowGenerator, criteriaOf(Number(length), ''));
    expect(await flowGenerator.path()).toBe(path);
  },
);

Given(
  /^la génération d'un flow de (\d+) transitions? a échoué car AcroFunJam était injoignable$/,
  async ({ flowGenerator, identityApi, catalogApi, contributionApi }, length: string) => {
    await flowGenerator.open();
    setAcroFunJamReachable({ identityApi, catalogApi, contributionApi }, false);
    await flowGenerator.choose(criteriaOf(Number(length), ''));
    await flowGenerator.generate();
    await expect(flowGenerator.alert).toBeVisible();
  },
);

Given(
  /^le visiteur a ouvert la pose d'arrivée "([^"]+)" depuis l'étape (\d+) du flow$/,
  async ({ flowGenerator }, pose: string, step: string) => {
    await flowGenerator.step(Number(step)).getByRole('link', { name: pose }).click();
  },
);

// --- Generating -----------------------------------------------------------------------------------

When(
  /^un visiteur génère un flow de (\d+) transitions? sur le site(.*)$/,
  async ({ flowGenerator }, length: string, rest: string) => {
    await generateOnTheSite(flowGenerator, criteriaOf(Number(length), rest));
  },
);

When(
  /^le visiteur génère un flow de (\d+) transitions? sur le site(.*)$/,
  async ({ flowGenerator }, length: string, rest: string) => {
    await generateOnTheSite(flowGenerator, criteriaOf(Number(length), rest), false);
  },
);

When('le visiteur génère un autre flow', async ({ page }) => {
  await page.getByRole('button', { name: 'Générer un autre flow' }).click();
});

When('le visiteur modifie les critères', async ({ page }) => {
  await page.getByRole('button', { name: 'Modifier les critères' }).click();
});

When('le visiteur réessaie de générer le flow', async ({ page }) => {
  await page.getByRole('button', { name: 'Réessayer' }).click();
});

When('le visiteur ouvre le générateur de flow', async ({ page }) => {
  await page.getByRole('link', { name: 'Générer un flow' }).click();
});

When('un visiteur ouvre le générateur de flow', async ({ flowGenerator }) => {
  await flowGenerator.open();
});

When('un visiteur ouvre les étiquettes du générateur de flow', async ({ flowGenerator }) => {
  await flowGenerator.open();
  await flowGenerator.openTags();
});

When(
  /^le visiteur veut (demander|exclure) l'étiquette "([^"]+)"$/,
  async ({ flowGenerator }, action: string, name: string) => {
    // The box is disabled: the step only looks at it, a click would be refused by the browser.
    await flowGenerator
      .tagBox(action === 'demander' ? 'requested' : 'excluded', name)
      .scrollIntoViewIfNeeded();
  },
);

When(/^le visiteur déplie la description de l'étape (\d+)$/, async ({ flowGenerator }, step: string) => {
  await flowGenerator.step(Number(step)).getByText('Description').click();
});

When(
  /^le visiteur ouvre la pose d'arrivée "([^"]+)" depuis l'étape (\d+) du flow$/,
  async ({ flowGenerator }, pose: string, step: string) => {
    await flowGenerator.step(Number(step)).getByRole('link', { name: pose }).click();
  },
);

When('le visiteur revient au flow', async ({ page }) => {
  await page.goBack();
});

When('le visiteur choisit de voir le catalogue', async ({ page }) => {
  await page.getByRole('link', { name: 'Voir le catalogue' }).click();
});

// --- The flow -------------------------------------------------------------------------------------

Then(
  /^le site présente le flow qui part de "([^"]+)", avec les étapes suivantes :$/,
  async ({ flowGenerator }, start: string, rows: DataTable) => {
    await expect(flowGenerator.start.locator('.transition__other-pose-link')).toHaveText(start);
    const expected = rows.hashes();
    await expect(flowGenerator.steps).toHaveCount(expected.length);
    for (const [index, row] of expected.entries()) {
      const step = flowGenerator.step(index + 1);
      await expect(step.locator('.flow-step__number')).toHaveText(`Étape ${row['étape']}`);
      expect(await flowGenerator.transitionOf(step)).toBe(row['transition']);
      expect(await flowGenerator.arrivalOf(step)).toBe(row["pose d'arrivée"]);
    }
  },
);

Then(/^le site résume le flow « (.+) »$/, async ({ flowGenerator }, summary: string) => {
  await expect(flowGenerator.summary).toHaveText(summary);
});

Then('le site présente le flow ainsi :', async ({ flowGenerator }, rows: DataTable) => {
  const level = (text: string | null) => (text ?? '').trim().toLocaleLowerCase('fr-FR');
  for (const row of rows.hashes()) {
    const element = row['élément'] ?? '';
    const step = /étape (\d+), (transition|pose d'arrivée)/.exec(element);
    const block = !step
      ? flowGenerator.start
      : step[2] === 'transition'
        ? flowGenerator.step(Number(step[1])).locator('.flow-step__card')
        : flowGenerator.step(Number(step[1])).locator('.flow-station');
    const name =
      !step || step[2] !== 'transition'
        ? ((await block.locator('.transition__other-pose-link').textContent()) ?? '')
        : await flowGenerator.transitionOf(flowGenerator.step(Number(step[1])));
    expect(name).toBe(row['nom']);
    const levels = await block.locator('.role-pill__level, .pose-card__level').allTextContents();
    if (levels.length >= 2)
      expect(levels.slice(0, 2).map(level)).toEqual([row['difficulté base'], row['difficulté flyer']]);
    else
      await expect(block).toContainText(
        new RegExp(`${row['difficulté base']}.*${row['difficulté flyer']}`, 'is'),
      );
    const tags = await block.locator('.tag-pill').allTextContents();
    expect(tags.join(', ')).toBe(row['étiquettes'] ?? '');
  }
});

Then(/^le site présente la description « (.+) »$/, async ({ page }, description: string) => {
  await expect(page.getByText(description, { exact: true })).toBeVisible();
});

Then(
  /^l'étape (\d+) du flow présente la transition "([^"]+)", marquée « washing machine », vers la même pose$/,
  async ({ flowGenerator }, number: string, name: string) => {
    const step = flowGenerator.step(Number(number));
    expect(await flowGenerator.transitionOf(step)).toBe(name);
    await expect(step.locator('.flow-step__washing-machine')).toHaveText('washing machine');
    await expect(step.locator('.flow-station__same')).toHaveText('(même pose)');
  },
);

Then(/^le site présente de nouveau le flow « (.+) »$/, async ({ flowGenerator }, path: string) => {
  await expect(flowGenerator.title).toHaveText('Ton flow');
  expect(await flowGenerator.path()).toBe(path);
});

Then(
  /^le site présente avec le flow le rappel « (.+) »$/,
  async ({ page, flowGenerator }, reminder: string) => {
    await expect(flowGenerator.title).toHaveText('Ton flow');
    await expect(page.locator('.flow-result .safety-note')).toHaveText(reminder);
  },
);

const recapRow: Record<string, string> = {
  'nombre de transitions': 'Nombre de transitions',
  'difficulté base, au plus': 'Difficulté base, au plus',
  'difficulté flyer, au plus': 'Difficulté flyer, au plus',
};

Then(
  'le site présente un flow généré avec les critères suivants :',
  async ({ flowGenerator }, rows: DataTable) => {
    await expect(flowGenerator.title).toHaveText('Ton flow');
    for (const [criterion, value] of rows.raw()) {
      const row = flowGenerator.recap.locator('dl > div').filter({ hasText: recapRow[criterion ?? ''] ?? '' });
      await expect(row.locator('dd')).toHaveText(new RegExp(`^${value}$`, 'i'));
    }
  },
);

// --- No flow, failures ------------------------------------------------------------------------------

Then(/^le site propose, pour élargir le choix, les pistes (.+)$/, async ({ page }, hints: string) => {
  const items = await page.locator('.no-flow__tips li').allTextContents();
  expect(items.map((item) => item.replace(/ ?[;.]$/, ''))).toEqual(guillemets(hints));
});

Then('le site présente le générateur de flow', async ({ flowGenerator }) => {
  await expect(flowGenerator.title).toHaveText('Générer un flow');
  await expect(flowGenerator.length).toBeVisible();
});

Then('le générateur de flow présente les critères suivants :', async ({ flowGenerator }, rows: DataTable) => {
  for (const [criterion, value] of rows.raw()) {
    switch (criterion) {
      case 'nombre de transitions':
        await expect(flowGenerator.length).toHaveValue(value ?? '');
        break;
      case 'difficulté base, au plus':
      case 'difficulté flyer, au plus': {
        const group = flowGenerator.ceiling(criterion.startsWith('difficulté base') ? 'base' : 'flyer');
        await expect(group.getByRole('radio', { checked: true })).toHaveAccessibleName(
          new RegExp(`^${value}$`, 'i'),
        );
        break;
      }
      case 'étiquettes demandées':
      case 'étiquettes exclues': {
        await flowGenerator.openTags();
        const group = flowGenerator.group(criterion === 'étiquettes demandées' ? 'requested' : 'excluded');
        await expect(group.getByRole('checkbox', { checked: true })).toHaveCount(value === 'aucune' ? 0 : 1);
        break;
      }
      default:
        throw new Error(`Critère inconnu : ${criterion}`);
    }
  }
});

Then(
  /^le site propose (de demander|d'exclure) les étiquettes (.+)$/,
  async ({ flowGenerator }, action: string, names: string) => {
    const group = flowGenerator.group(action === 'de demander' ? 'requested' : 'excluded');
    const boxes = await group.locator('.tag-choice__box').allTextContents();
    expect(boxes.map((box) => box.trim())).toEqual(quotedNames(names));
  },
);

Then(
  /^le site explique pour le groupe « (.+) » : « (.+) »$/,
  async ({ page }, legend: string, help: string) => {
    await expect(page.getByRole('group', { name: legend })).toHaveAccessibleDescription(help);
  },
);

Then(
  /^le site ne permet pas (?:de |d')(demander|exclure) l'étiquette "([^"]+)", qu'il marque « \((.+)\) »$/,
  async ({ flowGenerator }, action: string, name: string, state: string) => {
    const box = flowGenerator.tagBox(action === 'demander' ? 'requested' : 'excluded', name);
    await expect(box.getByRole('checkbox')).toBeDisabled();
    await expect(box.getByRole('checkbox')).toHaveAccessibleName(`${name} (${state})`);
  },
);

Then(
  /^les critères saisis par le visiteur sont conservés, sans l'étiquette « (.+) »$/,
  async ({ flowGenerator }, removed: string) => {
    await expect(flowGenerator.length).toHaveValue('1');
    await expect(flowGenerator.tagBox('requested', 'lunaire').getByRole('checkbox')).toBeChecked();
    await expect(flowGenerator.tagBox('requested', removed)).toHaveCount(0);
  },
);
