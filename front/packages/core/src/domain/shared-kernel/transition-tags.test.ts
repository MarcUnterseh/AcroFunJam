import { describe, expect, it } from 'vitest';
import { sameTags, tagsImplying, withImpliedTags, type ChoosableTag } from './transition-tags';

// Story 8 « Étiquettes »: choosing the tags of a transition among the list, as the API does (ADR 0032).

const tag = (id: string, impliedTagId: string | null = null): ChoosableTag => ({
  id,
  name: id,
  description: `${id} …`,
  impliedTagId,
});

const list: readonly ChoosableTag[] = [
  tag('dynamique'),
  tag('icarien', 'dynamique'),
  tag('inversion'),
  tag('lunaire'),
  tag('pop', 'dynamique'),
  tag('vrille'),
  tag('whip', 'dynamique'),
];

describe('withImpliedTags', () => {
  it('should give the chosen tags in the order of the list when none adds another', () => {
    expect(withImpliedTags(list, ['lunaire', 'inversion'])).toEqual([
      { id: 'inversion', name: 'inversion' },
      { id: 'lunaire', name: 'lunaire' },
    ]);
  });

  it('should add the implied tag when a chosen tag adds it', () => {
    expect(withImpliedTags(list, ['pop']).map((t) => t.id)).toEqual(['dynamique', 'pop']);
  });

  it('should keep the implied tag when the person unchecks it while the tag adding it stays chosen', () => {
    expect(withImpliedTags(list, ['pop', 'whip']).map((t) => t.id)).toEqual(['dynamique', 'pop', 'whip']);
  });

  it('should leave out the tags no longer in the list', () => {
    expect(withImpliedTags(list, ['gone', 'vrille']).map((t) => t.id)).toEqual(['vrille']);
  });

  it('should give no tag when none is chosen', () => {
    expect(withImpliedTags(list, [])).toEqual([]);
  });
});

describe('tagsImplying', () => {
  it('should give the tags of the list adding a tag, in the order of the list', () => {
    expect(tagsImplying(list, 'dynamique').map((t) => t.name)).toEqual(['icarien', 'pop', 'whip']);
  });

  it('should give none for a tag no other adds', () => {
    expect(tagsImplying(list, 'pop')).toEqual([]);
  });
});

describe('sameTags', () => {
  it('should hold the same set of tags as equal whatever their order', () => {
    expect(sameTags([tag('pop'), tag('dynamique')], [tag('dynamique'), tag('pop')])).toBe(true);
  });

  it('should hold sets differing by one tag as different', () => {
    expect(sameTags([tag('pop'), tag('dynamique')], [tag('dynamique')])).toBe(false);
  });
});
