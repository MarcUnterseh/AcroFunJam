import type { BrowserContext } from '@playwright/test';
import type { components } from '@acrofunjam/api-client/schema';
import type { CatalogApi, DifficultyCode, PublishedTransition, StoredPose } from './catalog-api';

type GenerateFlowRequest = components['schemas']['GenerateFlowRequest'];
type GeneratedFlowResponse = components['schemas']['GeneratedFlowResponse'];
type FlowPoseResponse = components['schemas']['FlowPoseResponse'];

const scale: readonly DifficultyCode[] = ['discovery', 'beginner', 'intermediate', 'advanced'];
const rank = (level: string | null | undefined) => scale.indexOf(level as DifficultyCode);

/**
 * Simulated generation of flows (story 9, ADR 0037): POST /flow-generation/flows answered from the simulated catalog,
 * with the rules of the API (tags of the list, catalog insufficient, ceilings, tags requested per step and excluded, a
 * transition at most once). Deterministic: the first flow found, poses and transitions in the order of publication.
 */
export class FlowGenerationApi {
  /** The tags of the list, by identifier: set by the fixtures from the simulated list. */
  tagsOfTheList: () => readonly string[] = () => [];

  constructor(
    private readonly context: BrowserContext,
    private readonly catalogApi: CatalogApi,
  ) {}

  async start(): Promise<void> {
    await this.context.route('**/flow-generation/flows', async (route) => {
      if (this.catalogApi.isUnreachable) return route.abort('connectionrefused');
      const request = route.request().postDataJSON() as GenerateFlowRequest;
      const requested = request.requestedTagIds ?? [];
      const excluded = request.excludedTagIds ?? [];
      const list = this.tagsOfTheList();
      const notInList = [...requested, ...excluded].filter((id) => !list.includes(id));
      if (notInList.length > 0)
        return route.fulfill({
          status: 409,
          json: { title: 'flow-generation.tag-not-in-list', tagIds: notInList },
        });
      if (!this.anyFlow())
        return route.fulfill({ status: 422, json: { title: 'flow-generation.catalog-insufficient' } });
      const flow = this.search(request, requested, excluded);
      return flow
        ? route.fulfill({ json: flow })
        : route.fulfill({ status: 422, json: { title: 'flow-generation.criteria-too-restrictive' } });
    });
  }

  private pose(id: string): StoredPose {
    return this.catalogApi.poseWithId(id)!;
  }

  /** A flow of 1 to 10 transitions exists, whatever the criteria. */
  private anyFlow(): boolean {
    let reached = new Set(this.catalogApi.published.filter((p) => p.canStartFlow).map((p) => p.id));
    for (let length = 1; length <= 10 && reached.size > 0; length++) {
      reached = new Set(
        this.catalogApi.transitions.filter((t) => reached.has(t.fromPoseId)).map((t) => t.toPoseId),
      );
      if ([...reached].some((id) => this.pose(id).canEndFlow)) return true;
    }
    return false;
  }

  private search(
    request: GenerateFlowRequest,
    requested: string[],
    excluded: string[],
  ): GeneratedFlowResponse | null {
    const within = (element: { baseDifficulty: string; flyerDifficulty: string; tagIds?: string[] }) =>
      rank(element.baseDifficulty) <= rank(request.baseDifficultyCeiling) &&
      rank(element.flyerDifficulty) <= rank(request.flyerDifficultyCeiling) &&
      !(element.tagIds ?? []).some((id) => excluded.includes(id));
    const stepAllowed = (transition: PublishedTransition) => {
      const arrival = this.pose(transition.toPoseId);
      return (
        within(transition) &&
        within(arrival) &&
        (requested.length === 0 ||
          requested.some((id) => (transition.tagIds ?? []).includes(id) || arrival.tagIds.includes(id)))
      );
    };
    const length = Number(request.length);
    const path: PublishedTransition[] = [];
    const explore = (poseId: string, left: number): boolean => {
      if (left === 0) return this.pose(poseId).canEndFlow;
      for (const transition of this.catalogApi.transitions) {
        if (transition.fromPoseId !== poseId || path.includes(transition) || !stepAllowed(transition))
          continue;
        path.push(transition);
        if (explore(transition.toPoseId, left - 1)) return true;
        path.pop();
      }
      return false;
    };
    const start = this.catalogApi.published.find(
      (pose) => pose.canStartFlow && within(pose) && explore(pose.id, length),
    );
    return start ? this.present(start, path) : null;
  }

  private present(start: StoredPose, path: readonly PublishedTransition[]): GeneratedFlowResponse {
    const tags = (ids: readonly string[] = []) =>
      this.catalogApi.tags.describe(ids).map(({ id, name }) => ({ id, name }));
    const pose = (stored: StoredPose): FlowPoseResponse => ({
      id: stored.id,
      name: stored.name,
      baseDifficulty: stored.baseDifficulty,
      flyerDifficulty: stored.flyerDifficulty,
      tags: tags(stored.tagIds),
    });
    return {
      start: pose(start),
      steps: path.map((transition, index) => ({
        number: index + 1,
        transition: {
          id: transition.id,
          name: transition.name,
          baseDifficulty: transition.baseDifficulty,
          flyerDifficulty: transition.flyerDifficulty,
          description: transition.description,
          tags: tags(transition.tagIds),
        },
        isWashingMachine: transition.fromPoseId === transition.toPoseId,
        arrival: pose(this.pose(transition.toPoseId)),
      })),
    };
  }
}
