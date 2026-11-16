import { describe, expect, it } from 'vitest';
import {
  carriedByLabel,
  impliedRefusalLabel,
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
    expect(carriedByLabel(count)).toBe(label);
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
