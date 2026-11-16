# Pastille de rôle

Direction « Soleil et Lune » ([ADR 0031](../../adr/0031-direction-visuelle-soleil-et-lune.md), `principes.md`). Composant `RolePill` (`front/apps/web/src/catalog/PoseList.tsx`).

## Rôle

Dire la difficulté d'une pose ou d'une transition **pour un rôle** : la base en couleur de terre, le flyer en couleur de ciel. Utilisée sur les cartes du catalogue, la page d'une pose (sur le ciel), les transitions, les cartes de la file de validation et de « Mes propositions ».

## Anatomie

`[Base] ◐ Intermédiaire` : une pilule (`radius.pill`) en `baseSurface` / `flyerSurface` ; le **mot de la pastille** « Base » / « Flyer » (12 px, gras, texte `surface` sur `base` / `flyer`) ; la phase de lune (18 px, couleur du rôle, décorative) ; le niveau en toutes lettres en `text` (14 px, semi-gras).

## Accessibilité

- Sémantique inchangée : un couple terme / valeur d'une liste de description (`<div><dt>Base</dt><dd>Intermédiaire</dd></div>` dans le `<dl>`), lu « Base : Intermédiaire ».
- La phase est `aria-hidden` ; le mot du rôle et le niveau sont toujours écrits : la couleur n'est jamais seule.
- Couleurs forcées : la pilule garde un contour `CanvasText`.
- Contrastes : `base` / `baseSurface` 5,4:1, `flyer` / `flyerSurface` 4,7:1 (aube) ; `text` sur les surfaces ≥ 13:1.

## Vocabulaire

« Mot de la pastille » (Q161, story 8) : le mot « étiquette » est réservé au sens métier (étiquettes des transitions). La pastille de rôle ne se confond pas avec la pilule d'étiquette (`pilule-etiquette.md`) : couleur du rôle et mot de la pastille sur fond plein d'un côté, pilule neutre « pierre » sans mot de la pastille ni phase de l'autre. Le code garde provisoirement `role-pill__tag` (à renommer, par exemple `role-pill__word`, à l'implémentation).

## Disposition

Deux pilules côte à côte, qui passent à la ligne quand la place manque (320 px). Sur le ciel de la page d'une pose, les pilules restent opaques (contraste garanti quel que soit le ciel).
