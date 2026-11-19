import { describe, expect, it } from 'vitest';
import { fail, ok } from '../common/result';
import {
  checkTagContent,
  checkTagDescription,
  checkTagName,
  tagDescriptionLength,
  tagDescriptionPolicy,
  tagNameLength,
  tagNamePolicy,
} from './tag';

// Story 8 « Étiquettes »: the content rules of a tag, as the API checks them (ADR 0032).

describe('checkTagName', () => {
  it('should keep the name as typed without superfluous spaces when it is valid', () => {
    expect(checkTagName('  washing    machine ')).toEqual(ok('washing machine'));
  });

  it.each(['', '   '])('should require a name when it is empty or only spaces (%j)', (raw) => {
    expect(checkTagName(raw)).toEqual(fail('tag.name-required'));
  });

  it('should refuse a name without letter or digit when it is only punctuation', () => {
    expect(checkTagName('---')).toEqual(fail('tag.name-without-letter-or-digit'));
  });

  it('should accept 30 characters and refuse 31 when the name reaches the limit', () => {
    expect(tagNamePolicy.maxLength).toBe(30);
    expect(checkTagName('v'.repeat(30)).ok).toBe(true);
    expect(checkTagName('v'.repeat(31))).toEqual(fail('tag.name-too-long'));
  });

  it('should count the characters once normalised when measuring a name', () => {
    expect(tagNameLength('  pop  ')).toBe(3);
    expect(tagNameLength('vrillé')).toBe(6);
  });
});

describe('checkTagDescription', () => {
  it('should remove the superfluous spaces when the description has some', () => {
    expect(checkTagDescription('  Le flyer passe   la tête\nen bas. ')).toEqual(
      ok('Le flyer passe la tête en bas.'),
    );
  });

  it.each(['', '    '])('should require a description when it is empty or only spaces (%j)', (raw) => {
    expect(checkTagDescription(raw)).toEqual(fail('tag.description-required'));
  });

  it('should accept 200 characters and refuse 201 when the description reaches the limit', () => {
    expect(tagDescriptionPolicy.maxLength).toBe(200);
    expect(checkTagDescription('d'.repeat(200)).ok).toBe(true);
    expect(checkTagDescription('d'.repeat(201))).toEqual(fail('tag.description-too-long'));
  });

  it('should count the characters once normalised when measuring a description', () => {
    expect(tagDescriptionLength('  Le   flyer ')).toBe(8);
  });
});

describe('checkTagContent', () => {
  it('should give the normalised name and description when both are valid', () => {
    expect(
      checkTagContent({ name: ' vrille ', description: ' Le flyer tourne. ', scope: 'transitions' }),
    ).toEqual(ok({ name: 'vrille', description: 'Le flyer tourne.', scope: 'transitions' }));
  });

  it('should report every field in error, the name first, when both are invalid', () => {
    expect(checkTagContent({ name: '', description: 'd'.repeat(201), scope: 'poses' })).toEqual(
      fail([
        { field: 'name', code: 'tag.name-required' },
        { field: 'description', code: 'tag.description-too-long' },
      ]),
    );
  });

  // Story 9a (ADR 0035): what a tag applies to is chosen when it is added, never by default.
  it('should require what the tag applies to, after the description, when none is chosen', () => {
    expect(checkTagContent({ name: 'contrepoids', description: '', scope: null })).toEqual(
      fail([
        { field: 'description', code: 'tag.description-required' },
        { field: 'scope', code: 'tag.scope-required' },
      ]),
    );
  });
});
