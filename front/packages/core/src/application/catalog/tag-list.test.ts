import { describe, expect, it } from 'vitest';
import { fail, ok } from '../../domain/common/result';
import type { Tag, ValidTagContent } from '../../domain/catalog/tag';
import { addTag, changeTag, listTags, removeTag } from './tag-list';
import type { TagChangeFailure, TagListGateway, TagRemovalFailure } from './TagListGateway';

const pop: Tag = {
  id: 'tag-pop',
  name: 'pop',
  description: 'La base propulse le flyer.',
  scope: 'transitions',
  impliedTagId: 'tag-dynamique',
  poseCount: 0,
  transitionCount: 0,
};

/** Records what is sent and answers as told. */
class FakeTagListGateway implements TagListGateway {
  readonly added: ValidTagContent[] = [];
  readonly changed: Array<{ id: string; content: ValidTagContent }> = [];
  readonly removed: string[] = [];
  changeAnswer: Awaited<ReturnType<TagListGateway['changeTag']>> = ok(pop);
  removalAnswer: Awaited<ReturnType<TagListGateway['removeTag']>> = ok(undefined);

  listTags = async () => ok([pop]);

  addTag = async (content: ValidTagContent) => {
    this.added.push(content);
    return this.changeAnswer;
  };

  changeTag = async (id: string, content: ValidTagContent) => {
    this.changed.push({ id, content });
    return this.changeAnswer;
  };

  removeTag = async (id: string) => {
    this.removed.push(id);
    return this.removalAnswer;
  };
}

describe('listTags', () => {
  it('should give the tags of the list when the gateway answers', async () => {
    expect(await listTags(new FakeTagListGateway())).toEqual(ok([pop]));
  });
});

describe('addTag', () => {
  it('should send the normalised content when the input is valid', async () => {
    const gateway = new FakeTagListGateway();

    const result = await addTag(gateway, {
      name: '  pop ',
      description: ' La base   propulse le flyer. ',
      scope: 'transitions',
    });

    expect(result).toEqual(ok(pop));
    expect(gateway.added).toEqual([
      { name: 'pop', description: 'La base propulse le flyer.', scope: 'transitions' },
    ]);
  });

  it('should send nothing and report the fields in error when the input is invalid', async () => {
    const gateway = new FakeTagListGateway();

    const result = await addTag(gateway, { name: '---', description: '', scope: 'transitions' });

    expect(result).toEqual(
      fail({
        kind: 'invalid-input',
        errors: [
          { field: 'name', code: 'tag.name-without-letter-or-digit' },
          { field: 'description', code: 'tag.description-required' },
        ],
      }),
    );
    expect(gateway.added).toEqual([]);
  });

  it.each<[TagChangeFailure, string]>([
    [{ kind: 'unauthenticated' }, 'session-expired'],
    [{ kind: 'forbidden' }, 'role-withdrawn'],
    [{ kind: 'unreachable' }, 'unreachable'],
    [{ kind: 'outdated' }, 'outdated'],
    [{ kind: 'name-taken' }, 'name-taken'],
  ])('should tell the person what happened when the API refuses with %j', async (failure, kind) => {
    const gateway = new FakeTagListGateway();
    gateway.changeAnswer = fail(failure);

    expect(await addTag(gateway, { name: 'pop', description: 'D.', scope: 'transitions' })).toEqual(
      fail({ kind }),
    );
  });
});

describe('changeTag', () => {
  it('should send the normalised content of the tag when the input is valid', async () => {
    const gateway = new FakeTagListGateway();

    await changeTag(gateway, 'tag-pop', {
      name: 'Pop ',
      description: 'La base propulse le flyer.',
      scope: 'transitions',
    });

    expect(gateway.changed).toEqual([
      {
        id: 'tag-pop',
        content: { name: 'Pop', description: 'La base propulse le flyer.', scope: 'transitions' },
      },
    ]);
  });

  it('should report a tag no longer in the list when the API does not find it', async () => {
    const gateway = new FakeTagListGateway();
    gateway.changeAnswer = fail({ kind: 'not-found' });

    expect(
      await changeTag(gateway, 'tag-pop', { name: 'pop', description: 'D.', scope: 'transitions' }),
    ).toEqual(fail({ kind: 'not-found' }));
  });

  // Story 9a: what it no longer applies to still carries it (A4).
  it('should give the poses carrying the tag when they forbid narrowing what it applies to', async () => {
    const gateway = new FakeTagListGateway();
    const carried = {
      kind: 'carried',
      poses: [{ id: 'p-leaf', name: 'Folded Leaf' }],
      transitions: [],
      pendingProposals: [],
      pendingPoses: [],
    } as const;
    gateway.changeAnswer = fail(carried);

    expect(
      await changeTag(gateway, 'tag-lunaire', { name: 'lunaire', description: 'D.', scope: 'transitions' }),
    ).toEqual(fail(carried));
  });

  it('should send nothing when the input is invalid', async () => {
    const gateway = new FakeTagListGateway();

    const result = await changeTag(gateway, 'tag-pop', {
      name: 'v'.repeat(31),
      description: 'D.',
      scope: 'transitions',
    });

    expect(result).toEqual(
      fail({ kind: 'invalid-input', errors: [{ field: 'name', code: 'tag.name-too-long' }] }),
    );
    expect(gateway.changed).toEqual([]);
  });
});

describe('removeTag', () => {
  it('should remove the tag when the API accepts', async () => {
    const gateway = new FakeTagListGateway();

    expect(await removeTag(gateway, 'tag-vrille')).toEqual(ok(undefined));
    expect(gateway.removed).toEqual(['tag-vrille']);
  });

  it('should give the carriers of the tag when transitions or proposals carry it', async () => {
    const carried: TagRemovalFailure = {
      kind: 'carried',
      transitions: [
        {
          id: 't-1',
          fromPose: { id: 'p-bird', name: 'Bird' },
          toPose: { id: 'p-leaf', name: 'Folded Leaf' },
          name: null,
        },
      ],
      pendingProposals: [],
      poses: [],
      pendingPoses: [],
    };
    const gateway = new FakeTagListGateway();
    gateway.removalAnswer = fail(carried);

    expect(await removeTag(gateway, 'tag-lunaire')).toEqual(fail(carried));
  });

  it('should give the tags implying it when a tag of the list adds it', async () => {
    const gateway = new FakeTagListGateway();
    gateway.removalAnswer = fail({ kind: 'implied', impliedBy: [{ id: 'tag-pop', name: 'pop' }] });

    expect(await removeTag(gateway, 'tag-dynamique')).toEqual(
      fail({ kind: 'implied', impliedBy: [{ id: 'tag-pop', name: 'pop' }] }),
    );
  });

  it('should tell an expired session when the API answers unauthenticated', async () => {
    const gateway = new FakeTagListGateway();
    gateway.removalAnswer = fail({ kind: 'unauthenticated' });

    expect(await removeTag(gateway, 'tag-vrille')).toEqual(fail({ kind: 'session-expired' }));
  });
});
