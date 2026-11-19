# Fil du flow (pose de départ, étapes, poses d'arrivée)

Story 9. Présente un flow généré : la **pose de départ**, puis la **liste ordonnée des étapes** ; une étape est une transition et sa pose d'arrivée. Écran : `../ecrans/9-generer-un-flow.md`. Maquette : `../maquettes/9-generer-un-flow.html`. Aucun nouveau token ; une nouvelle icône, `station`.

## Idée

Les **poses sont des stations** posées sur un **rail** pointillé (la trajectoire de la direction « Soleil et Lune », mise à la verticale) ; les **transitions sont des cartes** entre deux stations, comme un vol entre deux appuis. Le départ est un **lever de soleil**, l'arrivée finale un **coucher** : les icônes des bornes de flow (« peut commencer », « peut terminer »), déjà connues du catalogue. Les poses intermédiaires sont une **station** neutre.

## Structure

```
⤒ Départ : Throne                      <- station de départ (icône rise)
┊ [Base]◑ Débutant [Flyer]◔ Découverte  <- pastilles de rôle de la pose
┊ Étiquettes (lunaire)                  <- si la pose en porte
┊ ┌──────────────────────────────────┐
┊ │ Étape 1 · Pop to Bird            │  <- h2 de l'étape
┊ │ [Base]◕ Interm. [Flyer]◕ Interm. │  <- difficultés de la transition
┊ │ Étiquettes (dynamique) (pop)     │
┊ │ ▸ Description                    │  <- repli fermé (UX-8)
┊ └──────────────────────────────────┘
○ Vers Bird                             <- station intermédiaire (icône station)
┊ [Base]◑ Débutant [Flyer]◔ Découverte
┊ ┌──────────────────────────────────┐
┊ │ Étape 2 · Ninja Star             │
┊ │ ⟲ washing machine                │  <- boucle sunStrong + mot
┊ │ …                                │
┊ └──────────────────────────────────┘
○ Vers Bird (même pose)
┊ …
⤓ Vers Folded Leaf                      <- station de la dernière étape (icône set) : le rail s'arrête
  [Base]◕ … (inversion) (lunaire)
```

Balisage :

```html
<div class="flow-route">
  <div class="flow-station flow-station--start">…Départ : <a>Throne</a>… dl des difficultés, ligne Étiquettes</div>
  <ol class="flow-path" role="list">
    <li class="flow-step">
      <section class="flow-step__card" aria-labelledby="…"><h2 class="flow-step__title">…</h2> …</section>
      <div class="flow-station">…Vers <a>Bird</a>…</div>
    </li>
  </ol>
</div>
```

Chaque bloc (station, carte) est une grille de deux colonnes : **rail** (`sizes.icon`, 20 px) et contenu (`minmax(0, 1fr)`), écart `spacing.sm`.

| Élément | Tokens, rendu |
|---|---|
| Fil (`.flow-route`) | `display: grid`, écart de rangées **0** (le rail doit être continu) |
| Rail | pseudo-élément `::before` de chaque bloc, dans la colonne 1 : `border-inline-start: sizes.borderWidthStrong dotted sunStrong`, centré (`inset-inline-start: calc(sizes.icon / 2 − sizes.borderWidth)`), toute la hauteur du bloc. **Décoratif** (`aria-hidden` de fait : pseudo-élément sans contenu) |
| Rail du départ / de la fin | départ : commence au centre de l'icône (`top: calc(sizes.touchTarget / 2)`) ; dernière station : s'arrête au centre de l'icône (`block-size: calc(sizes.touchTarget / 2)`) |
| Station : ligne de tête | `min-block-size: sizes.touchTarget`, `align-items: center` ; icône `sizes.icon` en `sunStrong` (4,7:1 / 11,3:1 sur `background`), fond `background` derrière l'icône (masque le rail), `aria-hidden` |
| Icônes | départ : **rise** ; pose intermédiaire : **station** (cercle de 20, trait 2, point central) ; dernière arrivée : **set** |
| « Départ : » / « Vers » | `size.sm`, `weight.semibold`, `textMuted` (6,3:1) |
| Nom de la pose | lien vers sa page : Unbounded `weight.semibold` `size.md`, `primary`, souligné `borderWidth` ; états de `element-transition.md` (lien de l'autre pose) ; cible ≥ 44 × 44 |
| « (même pose) » | après le lien, hors du lien, `size.sm`, `textMuted` |
| Détails d'une station | colonne 2 : `dl.pose-card__details` (pastilles de rôle, `pastille-role.md`) puis ligne « Étiquettes » de la pose (`pilule-etiquette.md`, groupe du `dl`) ; écart `spacing.sm` ; padding bas `spacing.md` (l'espace avant la carte suivante, rail continu) |
| Carte d'étape (`.flow-step__card`) | colonne 2 ; `surface`, contour `borderWidth` `divider`, `radius.md`, padding `spacing.md`, `display: grid`, écart `spacing.sm` ; marge basse `spacing.md` |
| Titre (`h2`) | une seule chaîne lue « Étape 1 · Pop to Bird » ; « Étape 1 · » en Figtree `weight.semibold` `size.sm` `textMuted`, le nom en Unbounded `weight.medium` `size.md` `text` ; `overflow-wrap: anywhere` |
| Transition sans nom | « Bird », trajectoire (`sizes.trajectoryWidth` × `trajectoryHeight`, `sunStrong`), « Folded Leaf » dans un `span aria-hidden`, précédé d'un texte masqué (nom accessible, cf. question de l'écran) |
| Washing machine | ligne `.flow-step__washing-machine` sous le titre : icône **loop** (46 × 20, `sunStrong`) + « washing machine » `size.sm` `weight.semibold` `textMuted`. **Pas de pilule** : ce n'est pas une étiquette (glossaire) ; la pierre reste réservée aux étiquettes. Washing machine sans nom : le titre dessine déjà la boucle (« Star ⟲ Star ») ; la ligne reste, pour le mot |
| Difficultés de la transition | `dl.pose-card__details` + pastilles de rôle |
| Étiquettes de la transition | ligne « Étiquettes » (`pilule-etiquette.md`), absente sans étiquette |
| Description | `details.flow-step__description`, **fermé** (UX-8) : résumé comme `repli-descriptions-etiquettes.md` (`size.sm`, semi-gras, `primary`, chevron, 44 px), libellé *proposé* « Description » ; contenu `p` `size.md` `text`, `white-space: pre-line`, `overflow-wrap: anywhere`, marge haute `spacing.xs`. Absent sans description |

Les étiquettes de la transition sont **dans la carte**, celles de la pose **sur la station** : la place les distingue, jamais le style (`principes.md`, story 9a).

## Grand écran

Même fil, dans la colonne de droite (2fr) de `.flow-result`. Les pastilles de rôle et la ligne « Étiquettes » d'une station passent sur une ligne quand la place le permet (`flex-wrap`). Les cartes gardent la largeur de la colonne.

## États

Aucun état propre. Liens de pose : repos `primary` souligné 1 px, survol `primaryHover` + soulignement 2 px, focus anneau `focus` (rayon `radius.sm`), pressé `primaryActive`. Résumé de la description : états de `repli-descriptions-etiquettes.md`.

## Longueurs

- 10 étapes : 10 cartes et 11 stations ; rien n'est replié en dehors des descriptions.
- Nom de 60 caractères : le titre passe sur plusieurs lignes ; à 320 px, la colonne de contenu fait 260 px.

## Contraste élevé

Cartes : contour `CanvasText` ; rail : `CanvasText` (pointillé conservé) ; icônes : `CanvasText` ; liens `LinkText`.

## Mobile (React Native)

Hors périmètre (story dédiée). Le jour venu : mêmes tokens, rail dessiné par une `View` de bordure pointillée, `accessibilityRole="list"` pour les étapes.
