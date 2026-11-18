import { describe, expect, it } from 'vitest';
import {
  impliedTagNote,
  proposedTagsLabel,
  tagNamesSentence,
  tagsNoLongerInListLabel,
  transitionTagLabels,
} from './transition-tag-labels';

// Story 8 « Étiquettes »: the texts of the tags of a transition, shared by the Catalog and Contribution
// (docs/design/ecrans/8-etiquettes.md, groupe-cases-pastilles.md, repli-descriptions-etiquettes.md).

const tag = (name: string) => ({ id: `tag-${name}`, name });

describe('transitionTagLabels', () => {
  it('should name the group, the line and the folds as the design does', () => {
    expect(transitionTagLabels).toMatchObject({
      legend: 'Étiquettes (facultatives)',
      help: 'Choisis celles qui décrivent le passage.',
      line: 'Étiquettes',
      listMeanings: 'Ce que veulent dire les étiquettes',
      transitionMeanings: 'Ce que veulent dire ces étiquettes',
    });
  });
});

describe('tagNamesSentence', () => {
  it('should join the names in the order received', () => {
    expect(tagNamesSentence([tag('dynamique'), tag('pop')])).toBe('dynamique, pop');
  });

  it('should say « aucune » when there is no tag', () => {
    expect(tagNamesSentence([])).toBe('aucune');
  });
});

describe('proposedTagsLabel', () => {
  it('should remind the proposed tags in the adjustment zone', () => {
    expect(proposedTagsLabel([tag('dynamique'), tag('pop')])).toBe('Proposées : dynamique, pop');
    expect(proposedTagsLabel([])).toBe('Proposées : aucune');
  });
});

describe('impliedTagNote', () => {
  it('should explain which tags add the implied one', () => {
    expect(impliedTagNote('dynamique', ['icarien', 'pop', 'whip'])).toBe(
      "« dynamique » est ajoutée : « icarien », « pop » et « whip » l'ajoutent toujours.",
    );
  });

  it('should say it of a single tag adding it', () => {
    expect(impliedTagNote('dynamique', ['pop'])).toBe(
      "« dynamique » est ajoutée : « pop » l'ajoute toujours.",
    );
  });
});

describe('tagsNoLongerInListLabel', () => {
  it('should name a tag removed from the list while typing', () => {
    expect(tagsNoLongerInListLabel([tag('vrille')])).toBe(
      "L'étiquette « vrille » ne fait plus partie de la liste des étiquettes. Vérifie tes étiquettes, puis envoie de nouveau ta transition.",
    );
  });

  it('should name several tags removed from the list', () => {
    expect(tagsNoLongerInListLabel([tag('vrille'), tag('whip')])).toBe(
      'Les étiquettes « vrille » et « whip » ne font plus partie de la liste des étiquettes. Vérifie tes étiquettes, puis envoie de nouveau ta transition.',
    );
  });
});
