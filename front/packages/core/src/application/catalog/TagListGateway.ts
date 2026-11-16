import type { NamedTag, Tag, TagCarrier, ValidTagContent } from '../../domain/catalog/tag';
import type { Result } from '../../domain/common/result';

/** Why the API refused, whatever the tag: a visitor or an expired session, a role without « gérer les étiquettes »… */
export type TagAccessFailure =
  | { readonly kind: 'unauthenticated' }
  | { readonly kind: 'forbidden' }
  | { readonly kind: 'unreachable' }
  /** A refusal or an answer the site does not know: it must be reloaded. */
  | { readonly kind: 'outdated' };

export type TagListFailure = { readonly kind: 'unreachable' } | { readonly kind: 'outdated' };

export type TagChangeFailure =
  TagAccessFailure | { readonly kind: 'name-taken' } | { readonly kind: 'not-found' };

export type TagRemovalFailure =
  | TagAccessFailure
  | { readonly kind: 'not-found' }
  /** Published transitions or pending proposals carry it (L10). */
  | {
      readonly kind: 'carried';
      readonly transitions: readonly TagCarrier[];
      readonly pendingProposals: readonly TagCarrier[];
    }
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
