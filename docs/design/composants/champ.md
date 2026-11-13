# Champ de formulaire

> **Direction « Soleil et Lune »** ([ADR 0031](../../adr/0031-direction-visuelle-soleil-et-lune.md)) : Champs : fond `surface`, contour `border`, rayon `md` (16 px). Formulaire « Proposer une transition » : la **carte de trajet** regroupe « Pose de départ », la trajectoire en pointillés (`sunStrong`, décorative) et « Pose d'arrivée » (empilés sur téléphone, côte à côte en grand), fond `background`, contour `divider`, rayon `lg`. Ce qui suit reste valable pour la structure, les libellés et l'accessibilité ; les valeurs visuelles sont celles de `principes.md`.

Champ texte avec libellé, aide facultative et message d'erreur. Base du champ mot de passe (`champ-mot-de-passe.md`).

## Structure (de haut en bas)

```
Adresse e-mail                    <- libellé (label for=…)
┌──────────────────────────────┐
│ alice@example.org            │  <- champ, 48 px
└──────────────────────────────┘
Ton mot de passe doit contenir au moins 10 caractères.           <- aide (facultative)
(!) Saisis une adresse e-mail      <- erreur (seulement si invalide)
    valide, par exemple nom@example.org.
```

| Élément | Typo | Couleur | Espacement |
|---|---|---|---|
| Libellé | `size.md`, `weight.semibold` | `text` | `spacing.sm` au-dessus du champ |
| Champ | `size.md` (16 px, évite le zoom iOS), `regular` | texte `text`, fond `background` | hauteur `sizes.control`, padding horizontal `spacing.md`, rayon `radius.md`, bordure `borderWidth` `border` |
| Aide | `size.sm` | `textMuted` | `spacing.xs` sous le champ |
| Erreur | `size.sm`, `weight.semibold` | `danger` | `spacing.xs` sous l'aide (ou le champ) ; icône erreur `sizes.icon` à gauche, écart `spacing.xs`, alignée sur la première ligne |
| Compteur (facultatif, story 3) | `size.sm`, chiffres à chasse fixe (`tabular-nums`) ; au-delà de la limite `semibold` + icône erreur | `textMuted` ; au-delà de la limite `danger` | `spacing.xs` sous l'aide, aligné à droite ; affiché seulement près de la limite (nom de pose : à partir de 50 / 60 ; motif de refus et message d'ajustement : à partir de 450 / 500, story 4) |

- Champs successifs séparés de `spacing.md` (bloc libellé → erreur) ; `spacing.lg` dans un formulaire qui contient des groupes de tuiles (`ecrans/3-proposer-une-pose.md`).
- Ordre sous le champ : aide, compteur, erreur.
- Pas de texte indicatif (*placeholder*) en guise de libellé ; s'il y en a un, il est en `textMuted`.
- Aucun astérisque : tous les champs des stories 2b et 3 sont obligatoires ; l'introduction du formulaire le dit (« Tous les champs sont obligatoires. », story 3).
- Champ **facultatif** (story 4, « Message pour le contributeur ») : le mot « (facultatif) » fait partie du libellé, même graisse ; pas d'autre marque visuelle. Story 7 : on marque les champs facultatifs (« (facultatif) », « (facultative) »), jamais les obligatoires ; l'introduction du formulaire nomme les facultatifs.

## Variante liste déroulante (story 7)

`select` natif pour choisir une valeur dans une liste longue (pose de départ, pose d'arrivée). Natif pour l'accessibilité et la saisie au clavier (lettres tapées), sans bibliothèque.

```
Pose d'arrivée
┌──────────────────────────────┐
│ Choisis une pose           ⌄ │   <- 48 px, chevron aria-hidden
└──────────────────────────────┘
```

| Élément | Rendu |
|---|---|
| Contrôle | mêmes dimensions, bordure, rayon, fond, typo et états que le champ texte ; `appearance: none` ; padding droit `spacing.md` + `sizes.icon` + `spacing.sm` (place du chevron) ; largeur 100 % de la colonne ; `text-overflow: ellipsis` sur la valeur affichée (la liste ouverte montre les noms en entier) |
| Chevron | icône **chevron bas** (nouvelle, trait 2 px, grille de 20, `currentColor`), `sizes.icon`, `text`, `aria-hidden` ; dans un conteneur `position: relative`, à `spacing.md` du bord droit, centré verticalement, `pointer-events: none` |
| Option vide | « Choisis une pose », valeur vide, sélectionnée par défaut ; pas de `disabled` (on doit pouvoir y revenir) ; rendu natif |
| Liste ouverte | rendu natif du système (non stylée) ; `color-scheme` de la page pour un rendu cohérent en thème sombre |
| Invalide | bordure 2 px `danger` (`aria-invalid="true"`), padding compensé ; erreur sous le champ comme le champ texte |

Mode contraste élevé : bordure et chevron en `CanvasText` (via `currentColor`).

## Variante zone de texte (story 4)

`textarea` pour un texte libre de plusieurs phrases : motif de refus, message d'ajustement (500 caractères).

| Élément | Rendu |
|---|---|
| Hauteur | `rows="4"` : 4 lignes de `size.md` × `lineHeight.normal` + padding ; hauteur minimale jamais sous `sizes.control` |
| Padding | `spacing.sm` vertical, `spacing.md` horizontal |
| Redimensionnement | vertical seulement (`resize: vertical`) ; pas d'agrandissement automatique (pas de saut de mise en page à la frappe) |
| Retour à la ligne | `overflow-wrap: anywhere` |
| Bordures, états, erreur, compteur | identiques au champ texte (tableau ci-dessus et « États ») |

Le compteur apparaît à **450** caractères, sous l'aide, sans décaler l'aide ; au-delà de 500 : `danger`, `semibold`, icône erreur.

## Liaisons accessibles (rappel, comportement porté par le code)

- `<label for>` lié au champ ;
- `aria-describedby` = id de l'aide + id de l'erreur (quand elle existe) ;
- `aria-invalid="true"` quand le champ est en erreur ; le style d'erreur s'appuie sur ce même attribut (`[aria-invalid="true"]`), pour que le visuel et l'accessibilité ne divergent jamais.

## États

| État | Rendu |
|---|---|
| Repos | bordure 1 px `border` |
| Survol | bordure 1 px `text` |
| Focus (`:focus-visible` et `:focus`, un champ texte reçoit toujours le focus visible) | bordure inchangée + anneau `focus` 3 px décalé de 2 px |
| Invalide (`aria-invalid="true"`) | bordure **2 px** `danger` (épaisseur compensée par le padding pour ne pas décaler le texte) + message d'erreur avec icône |
| Invalide + focus | bordure 2 px `danger` + anneau `focus` |
| Désactivé (non utilisé en 2b) | fond `disabledSurface`, texte `textMuted`, bordure `divider` |

L'erreur ne repose jamais sur la couleur : icône + texte + épaisseur de bordure.

## Mobile (React Native)

`TextInput` aux mêmes dimensions ; erreur liée via `accessibilityHint` ou texte adjacent ; pas d'anneau de focus (focus clavier rare), la bordure passe à 2 px `focus` à la saisie.
