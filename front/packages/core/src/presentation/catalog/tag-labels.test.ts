import { describe, expect, it } from 'vitest';
import {
  carriedByLabel,
  carriedRefusalLabel,
  impliedRefusalLabel,
  pendingPoseCarrierLabel,
  scopeCarriedRefusalLabel,
  scopeNeededRefusalLabel,
  tagScopeChoiceLabel,
  tagScopeLabel,
  tagAnnouncements,
  tagCarrierLabel,
  tagCounterLabel,
  tagFieldErrorMessage,
  tagLabels,
} from './tag-labels';

// Story 8 « Étiquettes »: the texts of the page « Étiquettes » (docs/design/ecrans/8-etiquettes.md, element-etiquette.md).

describe('tagLabels', () => {
  it('should name the page and its entries as the screen states them', () => {
    expect(tagLabels.title).toBe('Étiquettes');
    expect(tagLabels.catalogLink).toBe('Étiquettes');
    expect(tagLabels.validationLink).toBe('Gérer les étiquettes');
    expect(tagLabels.addTitle).toBe('Ajouter une étiquette');
    expect(tagLabels.add).toBe("Ajouter l'étiquette");
  });
});

describe('carriedByLabel', () => {
  it.each([
    [0, 'Portée par aucune transition'],
    [1, 'Portée par 1 transition'],
    [2, 'Portée par 2 transitions'],
  ])('should tell how many published transitions carry the tag when they are %i', (count, label) => {
    expect(carriedByLabel({ scope: 'transitions', poseCount: 0, transitionCount: count })).toBe(label);
  });

  // Story 9a (A7): the counter follows what the tag applies to.
  it.each([
    [0, 'Portée par aucune pose'],
    [1, 'Portée par 1 pose'],
    [3, 'Portée par 3 poses'],
  ])('should tell how many published poses carry a tag of the poses when they are %i', (count, label) => {
    expect(carriedByLabel({ scope: 'poses', poseCount: count, transitionCount: 0 })).toBe(label);
  });

  it.each([
    [1, 2, 'Portée par 1 pose et 2 transitions'],
    [0, 0, 'Portée par aucune pose ni aucune transition'],
    [0, 1, 'Portée par aucune pose et 1 transition'],
    [2, 0, 'Portée par 2 poses et aucune transition'],
  ])(
    'should count the poses and the transitions of a tag of both when %i poses and %i transitions carry it',
    (poses, transitions, label) => {
      expect(
        carriedByLabel({ scope: 'poses-and-transitions', poseCount: poses, transitionCount: transitions }),
      ).toBe(label);
    },
  );
});

describe('what a tag applies to', () => {
  it.each([
    ['poses', "S'applique aux poses", 'Aux poses'],
    ['transitions', "S'applique aux transitions", 'Aux transitions'],
    ['poses-and-transitions', "S'applique aux poses et aux transitions", 'Aux poses et aux transitions'],
  ] as const)('should state and offer what a tag applying to %s applies to', (scope, statement, choice) => {
    expect(tagScopeLabel(scope)).toBe(statement);
    expect(tagScopeChoiceLabel(scope)).toBe(choice);
  });

  it('should ask to choose what a tag applies to when none is chosen', () => {
    expect(tagFieldErrorMessage('tag.scope-required')).toBe("Choisis à quoi s'applique l'étiquette.");
  });
});

describe('refusals of story 9a', () => {
  it('should refuse the removal of a tag carried by any element', () => {
    expect(carriedRefusalLabel('lunaire')).toBe(
      '« lunaire » ne peut pas être retirée : ces éléments la portent.',
    );
  });

  it.each([
    ['poses', "« lunaire » ne peut pas cesser de s'appliquer aux poses : ces éléments la portent."],
    [
      'transitions',
      "« lunaire » ne peut pas cesser de s'appliquer aux transitions : ces éléments la portent.",
    ],
  ] as const)('should refuse a tag ceasing to apply to %s that they carry', (target, label) => {
    expect(scopeCarriedRefusalLabel('lunaire', target)).toBe(label);
  });

  it('should name the tags that still need what it applies to', () => {
    expect(scopeNeededRefusalLabel('dynamique', [{ id: 't', name: 'pop' }])).toBe(
      "« dynamique » doit garder ce champ d'application tant que « pop » l'ajoute.",
    );
  });

  it.each([
    ['pose-proposal', 'Proposition de la pose Candlestick'],
    ['pose-revision', 'Modification de la pose Candlestick'],
  ] as const)('should designate a pending %s carrying a tag', (kind, label) => {
    expect(pendingPoseCarrierLabel({ id: 'x', kind, name: 'Candlestick' })).toBe(label);
  });
});

describe('tagCounterLabel', () => {
  it('should always show the length and the limit when under it', () => {
    expect(tagCounterLabel(7, 30)).toBe('7 / 30');
  });

  it('should tell how many characters are too many when over the limit', () => {
    expect(tagCounterLabel(31, 30)).toBe('31 / 30 : 1 de trop');
  });
});

describe('tagCarrierLabel', () => {
  const bird = { id: 'p-bird', name: 'Bird' };
  const leaf = { id: 'p-leaf', name: 'Folded Leaf' };

  it('should designate an unnamed transition by its poses', () => {
    expect(tagCarrierLabel({ id: 't', fromPose: bird, toPose: leaf, name: null })).toBe(
      'de Bird vers Folded Leaf',
    );
  });

  it('should designate a named transition by its name, then its poses', () => {
    expect(tagCarrierLabel({ id: 't', fromPose: leaf, toPose: bird, name: 'Lunar Roll' })).toBe(
      'Lunar Roll, de Folded Leaf vers Bird',
    );
  });
});

describe('impliedRefusalLabel', () => {
  it('should name the tags that add it when a tag cannot be removed because of them', () => {
    expect(
      impliedRefusalLabel('dynamique', [
        { id: '1', name: 'icarien' },
        { id: '2', name: 'pop' },
        { id: '3', name: 'whip' },
      ]),
    ).toBe("« dynamique » ne peut pas être retirée tant que « icarien », « pop » et « whip » l'ajoutent.");
  });

  it('should use the singular when a single tag adds it', () => {
    expect(impliedRefusalLabel('dynamique', [{ id: '2', name: 'pop' }])).toBe(
      "« dynamique » ne peut pas être retirée tant que « pop » l'ajoute.",
    );
  });
});

describe('tagAnnouncements', () => {
  it('should announce what was done to the tag', () => {
    expect(tagAnnouncements.added('vrille')).toBe('Étiquette « vrille » ajoutée.');
    expect(tagAnnouncements.saved('lunaire')).toBe('Étiquette « lunaire » enregistrée.');
    expect(tagAnnouncements.removed('vrille')).toBe('Étiquette « vrille » retirée.');
  });
});

describe('tagFieldErrorMessage', () => {
  it.each([
    ['tag.name-required', "Le nom de l'étiquette est obligatoire."],
    ['tag.name-without-letter-or-digit', "Le nom de l'étiquette doit contenir une lettre ou un chiffre."],
    ['tag.name-too-long', "Le nom de l'étiquette ne doit pas dépasser 30 caractères."],
    ['tag.description-required', "La description de l'étiquette est obligatoire."],
    ['tag.description-too-long', "La description de l'étiquette ne doit pas dépasser 200 caractères."],
  ] as const)('should explain the rule %s', (code, message) => {
    expect(tagFieldErrorMessage(code)).toBe(message);
  });
});
