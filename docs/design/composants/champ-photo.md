# Champ « Photo » (choix d'une photo, aperçu, résumé)

Story 10 (R19). Page « Ajouter une photo de Throne » (`/poses/:id/ajouter-une-photo`). Variante de `champ.md` pour un fichier : on choisit une photo depuis l'appareil photo ou la photothèque, on la voit en entier, on lit son nom, son poids et ses dimensions. Tokens : `photoMat`, `sizes.photoMaxHeight` (nouveaux), le reste existant. Écran : `../ecrans/10-photos-des-poses.md`, § 3.

## Structure

Avant le choix :

```
Photo                                        <- libellé (size.md, semibold, text)
JPEG, PNG, WebP ou HEIC, au moins 800 pixels <- aide (proposée), size.sm, textMuted
sur le plus petit côté.
[ (▣) Choisir une photo ]                    <- bouton secondaire 48 px, largeur du contenu
```

Après le choix :

```
Photo
JPEG, PNG, WebP ou HEIC, au moins 800 pixels…
┌────────────────────────────────┐
│▒▒▒▒▒▒▒▒▒┌──────────┐▒▒▒▒▒▒▒▒▒▒▒│           <- aperçu : passe-partout photoMat, radius.md,
│▒▒▒▒▒▒▒▒▒│ photo    │▒▒▒▒▒▒▒▒▒▒▒│              photo contenue, hauteur ≤ photoMaxHeight
│▒▒▒▒▒▒▒▒▒│ entière  │▒▒▒▒▒▒▒▒▒▒▒│
│▒▒▒▒▒▒▒▒▒└──────────┘▒▒▒▒▒▒▒▒▒▒▒│
└────────────────────────────────┘
throne-profil.jpg · 2,8 Mo · 2000 × 3000 pixels   <- résumé, size.sm, textMuted, tabular-nums
[ Changer de photo ]                         <- secondaire 44 px
```

Aperçu indisponible (HEIC que le navigateur ne sait pas lire) :

```
┌────────────────────────────────┐
│ (▣)                            │           <- photoMat, padding md, icône photo textMuted
│ Ton navigateur ne sait pas     │           <- size.sm, text (proposé)
│ afficher cette photo HEIC.     │
│ AcroFunJam la vérifiera après  │
│ l'envoi.                       │
└────────────────────────────────┘
img_2048.heic · 3,1 Mo                       <- pas de dimensions (illisibles)
[ Changer de photo ]
```

| Élément | Tokens |
|---|---|
| Libellé | `champ.md` : `size.md`, `semibold`, `text` ; c'est le `label` de l'`input type="file"` |
| Aide (proposée) | `size.sm`, `textMuted`, `spacing.xs` sous le libellé (avant le contrôle : on sait ce qu'on peut choisir avant de choisir) |
| `input type="file"` | **visuellement masqué** (`.visually-hidden`), jamais `display: none` (il garde le focus et l'étiquette) ; `accept="image/jpeg,image/png,image/webp,image/heic,image/heif"` |
| Bouton « Choisir une photo » | `bouton.md` **secondaire**, `min-block-size: sizes.control` (48), padding `0 spacing.lg`, largeur du contenu ; icône **photo** `sizes.icon` (cadre, soleil sur l'horizon) à gauche. Réalisé par un second `label` de l'input ou un `button` qui appelle `input.click()` (choix des développeurs) |
| Focus | l'anneau `focus` est dessiné **sur le bouton visible** quand l'input masqué a le focus (`.photo-field:has(input:focus-visible) .photo-field__choose`) |
| Aperçu (`.photo-field__preview`) | fond **`photoMat`**, rayon `radius.md`, `overflow: hidden` ; `img` `inline-size: 100%`, `block-size: auto`, `max-block-size: sizes.photoMaxHeight`, `object-fit: contain` ; `alt=""` (l'aperçu illustre le fichier choisi, la personne en écrit justement le texte alternatif) ; espace `spacing.sm` avant le résumé |
| Résumé | `size.sm`, `textMuted`, `font-variant-numeric: tabular-nums`, `overflow-wrap: anywhere` (nom de fichier long) ; séparateur « · » ; « 2,8 Mo », « 2000 × 3000 pixels » (formats : `ux-expert`) |
| « Changer de photo » | secondaire, `min-block-size: sizes.touchTarget` (44), largeur du contenu ; `spacing.sm` sous le résumé |
| Aperçu indisponible | même cadre `photoMat`, `display: flex`, `gap: spacing.sm`, padding `spacing.md` ; icône **photo** `sizes.iconLarge` en `textMuted` (5,7:1 / 6,1:1 sur `photoMat`) ; texte `size.sm` en `text` (13,2:1 / 12,0:1) |

## États

| État | Rendu |
|---|---|
| Vide | libellé, aide, bouton « Choisir une photo » |
| Photo choisie, lisible | aperçu, résumé, « Changer de photo » |
| Photo choisie, illisible par le navigateur | cadre « aperçu indisponible », résumé sans dimensions, « Changer de photo » |
| Erreur sans photo (« Choisis une photo. ») | bouton « Choisir une photo » avec contour **2 px `danger`** (padding compensé) + message d'erreur `champ.md` (icône erreur, `danger`, `semibold`) sous le bouton |
| Erreur avec photo (format, dimensions, poids) | aperçu (ou cadre indisponible) entouré de **2 px `danger`** (`outline`, sans décalage, rayon suivant) + message sous « Changer de photo » ; l'aperçu reste visible : on voit quelle photo est refusée |
| Réduction avant l'envoi (photo lourde lisible) | rien de visible au choix (décision 5) ; le résumé reste celui du fichier choisi |

L'input porte `aria-invalid="true"` et `aria-describedby` (aide + erreur) ; le style d'erreur s'appuie sur `.photo-field:has(input[aria-invalid="true"])`.

Ordre sous le contrôle : résumé, « Changer de photo », erreur.

## Texte alternatif et crédit (mêmes règles que `champ.md`)

| Champ | Contrôle | Sous le champ |
|---|---|---|
| Texte alternatif | zone de texte (`rows="4"`) | aide (validée, UX-21), puis **« Exemple : »** en `semibold` suivi de l'exemple, `size.sm`, `textMuted` ; compteur « 0 / 200 » **toujours affiché** (`tabular-nums`, aligné à droite) ; au-delà de 200 : `danger`, `semibold`, icône erreur |
| Crédit | champ texte 48 px | aide (validée) ; compteur « 0 / 100 » toujours affiché |

Les guillemets de l'exemple et de l'aide sont des chevrons français ; l'exemple n'est pas en italique (lisibilité).

## Couleurs forcées

Bouton et aperçu avec contour `CanvasText` (le passe-partout disparaît) ; contour d'erreur conservé (`outline` en `CanvasText` épaissi + icône et texte).

## Mobile (React Native)

Hors périmètre de la story 10.
