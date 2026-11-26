import { fail, ok } from '@acrofunjam/core';
import { describe, expect, it } from 'vitest';
import { createApiClient } from '../client';
import { createPosePageGateway } from './pose-page-gateway';

const starId = '5f0e2f43-7d4a-4a77-8f0a-5f3bd7b4b0a1';
const birdId = '9a1f0b9c-1c0e-4b0b-b6a0-27a2a1f7c3d2';

const ninjaStar = {
  id: 't-1',
  otherPose: { id: starId, name: 'Star' },
  name: 'Ninja Star',
  baseDifficulty: 'advanced',
  flyerDifficulty: 'advanced',
  description: 'Rotation complète, retour en Star.',
  tags: [{ id: 'tag-inversion', name: 'inversion', description: 'Le flyer passe tête en bas.' }],
};

const starToBird = {
  id: 't-2',
  otherPose: { id: birdId, name: 'Bird' },
  name: null,
  baseDifficulty: 'intermediate',
  flyerDifficulty: 'intermediate',
  description: null,
  tags: [],
};

const star = {
  id: starId,
  name: 'Star',
  baseDifficulty: 'intermediate',
  flyerDifficulty: 'intermediate',
  canStartFlow: false,
  canEndFlow: false,
  version: 2,
  transitionsFrom: [starToBird, ninjaStar],
  transitionsTo: [ninjaStar],
  tags: [{ id: 'tag-inversion', name: 'inversion', description: 'La tête du flyer est plus basse.' }],
  pendingRevision: true,
  photos: [
    {
      id: 'photo-1',
      altText: 'Star vue de profil',
      credit: 'Léa Martin',
      width: 1600,
      height: 1200,
      sources: { thumbnail: '/catalog/photos/photo-1/thumbnail', page: '/catalog/photos/photo-1/page', enlarged: '/catalog/photos/photo-1/enlarged' },
    },
  ],
};

const apiAnswering = (status: number, body?: unknown, requests: Request[] = []) =>
  createApiClient({
    baseUrl: 'http://api.test',
    fetch: async (request) => {
      requests.push(request);
      return new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: { 'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json' },
      });
    },
  });

const networkDown = () =>
  createApiClient({
    baseUrl: 'http://api.test',
    fetch: async () => {
      throw new TypeError('Failed to fetch');
    },
  });

describe('createPosePageGateway', () => {
  it('should read the pose and its transitions from and to it from GET /catalog/poses/{id}, in the order received', async () => {
    const requests: Request[] = [];
    const gateway = createPosePageGateway(apiAnswering(200, star, requests));

    const result = await gateway.getPosePage(starId);

    expect(result).toEqual(
      ok({
        id: starId,
        name: 'Star',
        baseDifficulty: 'intermediate',
        flyerDifficulty: 'intermediate',
        canStartFlow: false,
        canEndFlow: false,
        transitionsFrom: [starToBird, ninjaStar],
        transitionsTo: [ninjaStar],
        tags: [{ id: 'tag-inversion', name: 'inversion', description: 'La tête du flyer est plus basse.' }],
        pendingRevision: true,
        photos: star.photos,
      }),
    );
    expect(new URL(requests[0]!.url).pathname).toBe(`/catalog/poses/${starId}`);
  });

  it.each([null, undefined])('should read a photo without alternative text (%s) as such', async (altText) => {
    const [photo] = star.photos;
    const gateway = createPosePageGateway(apiAnswering(200, { ...star, photos: [{ ...photo, altText }] }));

    const result = await gateway.getPosePage(starId);

    expect(result.ok && result.value.photos).toEqual([{ ...photo, altText: null }]);
  });

  it('should report photos it cannot read as an outdated site', async () => {
    const gateway = createPosePageGateway(apiAnswering(200, { ...star, photos: [{ id: 'photo-1' }] }));

    expect(await gateway.getPosePage(starId)).toEqual(fail({ kind: 'outdated' }));
  });

  it('should report an unknown pose as not found', async () => {
    const gateway = createPosePageGateway(
      apiAnswering(404, { title: 'catalog.pose-not-found', status: 404 }),
    );

    expect(await gateway.getPosePage(starId)).toEqual(fail({ kind: 'not-found' }));
  });

  it('should report a server error or a network failure as unreachable', async () => {
    expect(await createPosePageGateway(apiAnswering(503)).getPosePage(starId)).toEqual(
      fail({ kind: 'unreachable' }),
    );
    expect(await createPosePageGateway(networkDown()).getPosePage(starId)).toEqual(
      fail({ kind: 'unreachable' }),
    );
  });

  it('should report another refusal as an outdated site', async () => {
    const gateway = createPosePageGateway(apiAnswering(400, { title: 'something.new', status: 400 }));

    expect(await gateway.getPosePage(starId)).toEqual(fail({ kind: 'outdated' }));
  });

  it.each([
    [
      'an unknown difficulty of a transition',
      { transitionsFrom: [{ ...starToBird, baseDifficulty: 'expert' }] },
    ],
    ['a transition without its other pose', { transitionsTo: [{ ...ninjaStar, otherPose: null }] }],
    ['a description that is not a text', { transitionsTo: [{ ...ninjaStar, description: 42 }] }],
    ['no list of transitions', { transitionsFrom: undefined }],
    [
      'a tag without its description',
      { transitionsTo: [{ ...ninjaStar, tags: [{ id: 'tag-pop', name: 'pop' }] }] },
    ],
    ['no list of tags', { transitionsTo: [{ ...ninjaStar, tags: undefined }] }],
    ['no list of tags of the pose', { tags: undefined }],
    ['a tag of the pose without its description', { tags: [{ id: 'tag-pop', name: 'pop' }] }],
    ['no pending revision', { pendingRevision: undefined }],
  ])('should report an answer it cannot read (%s) as an outdated site', async (_case, change) => {
    const gateway = createPosePageGateway(apiAnswering(200, { ...star, ...change }));

    expect(await gateway.getPosePage(starId)).toEqual(fail({ kind: 'outdated' }));
  });
});
