import { describe, expect, it } from 'vitest';
import { fail, ok } from '../common/result';
import type { PoseName } from '../shared-kernel/pose-name';
import type { PoseContent } from './pose-proposal';
import {
  changedFields,
  rebaseRevisionInput,
  retainedRevisionChangesNothing,
  revisedPose,
  validatePoseRevision,
  type PoseValueChange,
} from './pose-revision';

const throne: PoseContent = {
  name: 'Throne' as PoseName,
  baseDifficulty: 'beginner',
  flyerDifficulty: 'intermediate',
  canStartFlow: true,
  canEndFlow: true,
};

describe('revisedPose', () => {
  it('should give the pose with the values a revision changes, the others kept', () => {
    const changes: PoseValueChange[] = [
      { field: 'flyerDifficulty', before: 'intermediate', after: 'discovery' },
      { field: 'canEndFlow', before: true, after: false },
    ];

    expect(revisedPose(throne, changes)).toEqual({
      ...throne,
      flyerDifficulty: 'discovery',
      canEndFlow: false,
    });
  });

  it('should give the pose unchanged when there is no change', () => {
    expect(revisedPose(throne, [])).toEqual(throne);
  });
});

describe('changedFields', () => {
  it('should tell the fields whose typed value differs from the current one, in the order of the form', () => {
    expect(changedFields(throne, { ...throne, flyerDifficulty: 'discovery', canStartFlow: false })).toEqual([
      'flyerDifficulty',
      'canStartFlow',
    ]);
  });

  it('should compare the name once normalised: superfluous spaces change nothing, the case does', () => {
    expect(changedFields(throne, { ...throne, name: '  Throne ' })).toEqual([]);
    expect(changedFields(throne, { ...throne, name: 'throne' })).toEqual(['name']);
  });
});

describe('validatePoseRevision', () => {
  const pose = { ...throne, id: 'pose-throne', version: 3 };

  it('should give the changed fields only, current → new, the version read and the normalised message', () => {
    const revision = validatePoseRevision(pose, {
      values: { ...throne, name: ' High  Throne ', flyerDifficulty: 'discovery' },
      message: '  Throne se découvre  dès la première séance. ',
    });

    expect(revision).toEqual(
      ok({
        poseId: 'pose-throne',
        poseVersion: 3,
        changes: [
          { field: 'name', before: 'Throne', after: 'High Throne' },
          { field: 'flyerDifficulty', before: 'intermediate', after: 'discovery' },
        ],
        message: 'Throne se découvre dès la première séance.',
      }),
    );
  });

  it('should refuse a revision that changes nothing, once normalised', () => {
    expect(validatePoseRevision(pose, { values: { ...throne, name: 'Throne  ' }, message: '' })).toEqual(
      fail({ kind: 'changes-nothing' }),
    );
  });

  it('should report the field errors and the message too long together', () => {
    expect(validatePoseRevision(pose, { values: { ...throne, name: '' }, message: 'x'.repeat(501) })).toEqual(
      fail({
        kind: 'invalid-input',
        errors: [{ field: 'name', code: 'pose.name-required' }],
        message: 'contribution.revision-message-too-long',
      }),
    );
  });

  it('should report a message too long alone, without field error', () => {
    expect(
      validatePoseRevision(pose, { values: { ...throne, canEndFlow: false }, message: 'x'.repeat(501) }),
    ).toEqual(fail({ kind: 'invalid-input', errors: [], message: 'contribution.revision-message-too-long' }));
  });
});

describe('rebaseRevisionInput', () => {
  it('should follow the new current values for the fields left as they were, and keep the typed ones (R10)', () => {
    const after: PoseContent = { ...throne, baseDifficulty: 'intermediate', canEndFlow: false };
    const input = {
      values: { ...throne, name: ' Throne ', flyerDifficulty: 'discovery' as const },
      message: 'Plus facile.',
    };

    expect(rebaseRevisionInput(input, throne, after)).toEqual({
      values: { ...after, name: 'Throne', flyerDifficulty: 'discovery' },
      message: 'Plus facile.',
    });
  });

  it('should keep a typed name when the pose was renamed meanwhile', () => {
    const input = { values: { ...throne, name: 'High Throne' }, message: '' };

    expect(rebaseRevisionInput(input, throne, { ...throne, name: 'Thrône' as PoseName }).values.name).toBe(
      'High Throne',
    );
  });
});

describe('retainedRevisionChangesNothing', () => {
  const changes: PoseValueChange[] = [
    { field: 'flyerDifficulty', before: 'intermediate', after: 'discovery' },
  ];

  it('should tell the retained revision leaves the pose as it is when the adjustments undo every change (R15)', () => {
    expect(
      retainedRevisionChangesNothing(throne, changes, [
        { field: 'flyerDifficulty', proposed: 'discovery', retained: 'intermediate' },
      ]),
    ).toBe(true);
  });

  it('should tell the retained revision still changes the pose otherwise', () => {
    expect(retainedRevisionChangesNothing(throne, changes, [])).toBe(false);
    expect(
      retainedRevisionChangesNothing(throne, changes, [
        { field: 'flyerDifficulty', proposed: 'discovery', retained: 'beginner' },
      ]),
    ).toBe(false);
  });
});
