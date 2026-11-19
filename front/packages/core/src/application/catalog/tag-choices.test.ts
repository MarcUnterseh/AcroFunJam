import { describe, expect, it } from 'vitest';
import type { Tag } from '../../domain/catalog/tag';
import { poseTagChoices, transitionTagChoices } from './tag-choices';

// Story 9a (ADR 0035): the tags of the list offered to tag a pose or a transition, in the order of the list.

const tag = (name: string, scope: Tag['scope']): Tag => ({
  id: `tag-${name}`,
  name,
  description: `${name}…`,
  scope,
  impliedTagId: null,
  poseCount: 0,
  transitionCount: 0,
});

const list = [
  tag('contrepoids', 'poses'),
  tag('lunaire', 'poses-and-transitions'),
  tag('pop', 'transitions'),
];

describe('the tags offered to choose', () => {
  it('should offer only the tags that apply to poses, in the order of the list, when a pose is tagged', () => {
    expect(poseTagChoices(list).map((choice) => choice.name)).toEqual(['contrepoids', 'lunaire']);
  });

  it('should offer only the tags that apply to transitions, in the order of the list, when a transition is tagged', () => {
    expect(transitionTagChoices(list).map((choice) => choice.name)).toEqual(['lunaire', 'pop']);
  });

  it('should offer nothing when no tag of the list applies to poses', () => {
    expect(poseTagChoices([tag('pop', 'transitions')])).toEqual([]);
  });
});
