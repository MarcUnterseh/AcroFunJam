import type { NamedTag, Tag, TagCarriers, ValidTagContent } from '../../domain/catalog/tag';
import type { Result } from '../../domain/common/result';

/** Why the API refused, whatever the tag: a visitor or an expired session, a role without « gérer les étiquettes »… */
export type TagAccessFailure =
  | { readonly kind: 'unauthenticated' }
  | { readonly kind: 'forbidden' }
  | { readonly kind: 'unreachable' }
  /** A refusal or an answer the site does not know: it must be reloaded. */
  | { readonly kind: 'outdated' };

export type TagListFailure = { readonly kind: 'unreachable' } | { readonly kind: 'outdated' };

/** Published poses or transitions, or pending proposals, carry the tag (L10, story 9a A4, A6). */
export type TagCarriedFailure = { readonly kind: 'carried' } & TagCarriers;

export type TagChangeFailure =
  | TagAccessFailure
  | { readonly kind: 'name-taken' }
  | { readonly kind: 'not-found' }
  /** Story 9a: what it no longer applies to still carries it. */
  | TagCarriedFailure
  /** Story 9a: the tag it adds does not apply to everything it would apply to. */
  | { readonly kind: 'scope-exceeds-implied' }
  /** Story 9a: tags adding it still apply where it would no longer apply. */
  | { readonly kind: 'scope-needed-by-impliers'; readonly impliedBy: readonly NamedTag[] };

export type TagRemovalFailure =
  | TagAccessFailure
  | { readonly kind: 'not-found' }
  /** Published poses or transitions, or pending proposals, carry it (L10, story 9a A6). */
  | TagCarriedFailure
  /** A tag of the list adds it (« dynamique » while « pop » is there, ADR 0032). */
  | {
      readonly kind: 'implied';
      readonly impliedBy: readonly NamedTag[];
    };

/** Port: the list of tags of the catalog (story 8, ADR 0034). Implemented by @acrofunjam/api-client. */
export interface TagListGateway {
  /** The tags of the list, in catalog order (guaranteed by the API). */
  listTags(): Promise<Result<readonly Tag[], TagListFailure>>;
  addTag(content: ValidTagContent): Promise<Result<Tag, TagChangeFailure>>;
  changeTag(id: string, content: ValidTagContent): Promise<Result<Tag, TagChangeFailure>>;
  removeTag(id: string): Promise<Result<void, TagRemovalFailure>>;
}
