# Groupe de tuiles radio

Choix unique parmi peu d'options, toutes visibles : « Difficulté base », « Difficulté flyer » (4 niveaux), « Peut-on commencer un flow sur cette pose ? », « Peut-on terminer un flow sur cette pose ? » (Oui / Non). **Radios natifs** dans un `fieldset`, présentés en tuiles ; aucune option présélectionnée.

## Structure

```
Difficulté base                                   <- legend
(!) Choisis la difficulté base.                   <- erreur (seulement si invalide)
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ ○ Découverte     │ │ ◉ Débutant       │ │ ○ Intermédiaire  │ │ ○ Avancé         │   48 px
└──────────────────┘ └━━━━━━━━━━━━━━━━━━┘ └──────────────────┘ └──────────────────┘
                       coché : bordure 2 px, radio plein, libellé en gras, fond teinté
```

Balisage : `fieldset` > `legend` + erreur (`p`) + conteneur des tuiles ; chaque tuile est un `label` qui **englobe** son `input type="radio"` et son texte (toute la tuile est cliquable). Les radios d'un groupe partagent le même `name` ; flèches pour changer de choix, Tab pour quitter le groupe (comportement natif).

| Élément | Tokens |
|---|---|
| `fieldset` | bordure, marge et padding remis à zéro ; `min-inline-size: 0` (sinon il refuse de rétrécir) |
| `legend` | comme un libellé de champ : `size.md`, `weight.semibold`, `text` ; padding nul ; marge basse `spacing.sm` |
| Erreur | comme `champ.md` : `size.sm`, `weight.semibold`, `danger`, icône erreur `sizes.icon` ; **entre la legend et les tuiles**, marge basse `spacing.sm` |
| Conteneur des tuiles | grille, écart `spacing.sm` dans les deux sens ; requête de conteneur (`container-type: inline-size`) pour le nombre de colonnes (ci-dessous) |
| Tuile (`label`) | `display: flex`, `align-items: center`, écart `spacing.sm` ; hauteur minimale `sizes.control` (48) ; largeur minimale `sizes.tileMinWidth` ; padding horizontal `spacing.sm`, vertical `spacing.xs` ; fond `background` ; bordure `borderWidth` `border` ; rayon `radius.md` ; curseur `pointer` |
| Radio | natif, `sizes.icon` × `sizes.icon` (20), `accent-color: selected` ; marge nulle ; jamais masqué (il porte l'état coché en plus de la bordure) |
| Libellé | `size.md`, `regular`, `text` ; peut passer à la ligne (`overflow-wrap: anywhere`) plutôt que déborder |

## Colonnes (requêtes de conteneur, en `em` pour suivre la taille du texte)

| Largeur du conteneur | 4 niveaux | Oui / Non |
|---|---|---|
| < 2 × `tileMinWidth` + `spacing.sm` (312 px, **19,5em**) | 1 colonne, 4 tuiles empilées | 1 colonne |
| ≥ 19,5em | **2 × 2** | 2 tuiles côte à côte |
| ≥ 4 × `tileMinWidth` + 3 × `spacing.sm` (632 px, **39,5em**) | **4 sur une ligne** | 2 tuiles sur les 2 premières colonnes de 4 (même largeur que les tuiles de niveau, alignées à gauche) |

- En pratique : 1 colonne sur un écran de 320 px ou en zoom 200 % ; 2 × 2 à partir d'environ 360 px ; 4 sur une ligne dans la carte du formulaire en grand écran (colonne `sizes.formWideMaxWidth`, 640 px).
- Comme pour la media query de 40em, CSS ne peut pas lire un token dans une requête de conteneur : écrire `19.5em` et `39.5em` avec un commentaire qui renvoie à ce calcul.

## États (par tuile)

| État | Rendu |
|---|---|
| Repos | fond `background`, bordure 1 px `border` (3,3:1 sur `background`, 3,2:1 sur `surface`), libellé `regular` |
| Survol (pointeur fin) | fond `surfaceHover`, bordure 1 px `text` |
| Focus clavier (`label:has(input:focus-visible)`) | anneau `focus` `focusRingWidth` autour de **la tuile entière**, décalé `focusRingOffset`, rayon `radius.md` ; l'anneau natif du radio est retiré seulement parce que celui de la tuile le remplace |
| **Coché** (`label:has(input:checked)`) | bordure **`borderWidthStrong` (2 px) `selected`** (7,3:1 sur `background`), padding réduit de 1 px pour que le texte ne bouge pas ; fond `selectedSurface` (texte 14,2:1) ; radio plein `selected` ; libellé **`weight.bold`** |
| Coché + survol | inchangé (fond `selectedSurface`) |
| Coché + focus | état coché + anneau `focus` |
| Groupe invalide | tuiles en bordure **2 px `danger`** (5,5:1), comme un champ invalide ; message d'erreur avec icône sous la legend |
| Désactivé | non utilisé (pendant l'envoi, seul le bouton passe en `aria-disabled`) |

L'état coché se lit sans la couleur : **radio plein**, **bordure doublée**, **libellé en gras**. L'erreur se lit sans la couleur : icône + texte + bordure 2 px.

`selected` est un brun terre cuite plus sombre que `primary` : il reste dans l'identité, mais sa clarté et sa teinte le séparent de `danger`, qui peut s'afficher dans le même `fieldset`.

**Mode contraste élevé** (`forced-colors: active`) : bordure des tuiles `CanvasText`, tuile cochée en bordure 2 px `Highlight` ; le radio natif suit le thème système.

Animation : aucune ; si une transition de fond est ajoutée, 150 ms au plus, supprimée sous `prefers-reduced-motion: reduce`.

## Liaisons accessibles (rappel, comportement porté par le code)

- La `legend` nomme le groupe ; le message d'erreur est relié au `fieldset` par `aria-describedby` (lu à l'entrée dans le groupe).
- Le style « groupe invalide » s'appuie sur le même état que l'affichage du message (par exemple une classe `tile-group--invalid` posée en même temps), pour que visuel et message ne divergent jamais. `aria-invalid` n'est pas pris en charge sur `fieldset` ; s'il est mis sur les radios, le style peut s'y accrocher.
- Pas d'`aria-pressed`, pas de rôle ajouté : les radios natifs suffisent.

## Bloc d'indicateurs de flow

Les deux groupes Oui / Non sont réunis dans un bloc qui porte une **aide commune** :

```
Ce que signifient ces questions :                         <- aide, size.sm, textMuted
Commencer : le duo s'installe dans la pose directement depuis le sol.
Terminer : le flyer redescend au sol directement et sans danger.

Peut-on commencer un flow sur cette pose ?
[○ Oui] [○ Non]

Peut-on terminer un flow sur cette pose ?
[○ Oui] [○ Non]
```

- Aide : `size.sm`, `textMuted`, marge basse `spacing.md` ; reliée aux deux `fieldset` par `aria-describedby` (avec l'erreur éventuelle). Texte définitif : `ux-expert`.
- Écart entre les deux groupes : `spacing.md` ; le bloc entier est séparé des autres groupes du formulaire par `spacing.lg`.
- Pas de cadre autour du bloc (la carte du formulaire en est déjà un).

## Mobile (React Native)

Pas de radio natif : `Pressable` avec `accessibilityRole="radio"` et `accessibilityState={{ checked }}`, dans une `View` `accessibilityRole="radiogroup"` étiquetée par la legend ; mêmes tuiles, même rendu coché (bordure 2 px `selected`, cercle plein dessiné, libellé en gras) ; 2 colonnes, 1 en dessous de 312 px de large.
