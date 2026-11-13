# Écrans de la story 7 « Proposer une transition »

**Statut : proposition du 2026-11-13, à valider.** Composants : `../composants/` (nouveaux : `element-transition.md`, `carte-transition.md`, `lien-retour.md` ; mis à jour : `carte-pose.md` (carte cliquable), `champ.md` (liste déroulante, champs facultatifs), `panneau-succes.md` (variante transition), `legende-echelle.md` (variante page d'une pose)). Principes et tokens : `../principes.md`. Scénarios : `specs/features/catalogue/consulter-les-transitions.feature` et `specs/features/contribution/proposer-une-transition.feature` (`@web`). Décisions : `docs/domain/decouverte.md`, story 7 ; parcours, états et libellés : recommandations de l'`ux-expert` validées le 2026-11-13. Maquette statique (clair / sombre, 320 px et grand écran) : `../maquettes/7-page-pose-et-transition.html`.

Gabarit commun (en-tête, bandeau, `main`, annonce de statut) : `2b-se-connecter-sur-le-site.md`. **Aucun nouveau token.** Deux nouvelles icônes : chevron gauche (lien de retour), chevron bas (liste déroulante). Les libellés notés « proposé » ne figurent pas dans les recommandations de l'`ux-expert` : ils servent la maquette et restent à valider.

## Catalogue (`/`) : carte cliquable

Détail : `../composants/carte-pose.md`, « Carte cliquable du catalogue ». Le nom (`h2 > a`, `text`, souligné) mène à `/poses/:id`, zone cliquable étendue à la carte ; contour `border` ; survol `surfaceHover` ; focus : anneau autour de la carte ; « Proposer une modification » reste au-dessus. Rien d'autre ne change dans la page.

## Page d'une pose (`/poses/:id`)

### Colonne

**Même colonne que les écrans 4 et 5** : alignée à gauche du `main`, largeur maximale `sizes.formWideMaxWidth` + 2 × `spacing.lg` + 2 × `sizes.borderWidth` (≈ 690 px). Une page de lecture (descriptions jusqu'à 500 caractères) : ~75 caractères par ligne au plus. Pas de carte englobante. Aucune nouvelle largeur.

### Ordre du contenu

1. lien de retour « Catalogue » (`lien-retour.md`) ;
2. `h1` : nom de la pose (`overflow-wrap: anywhere`) ;
3. actions (personne connectée seulement, absentes du DOM sinon, sans vide réservé) : « Proposer une transition depuis Throne » (**lien-bouton primaire**, icône plus), « Proposer une modification » (lien-bouton secondaire, sans icône) ;
4. panneau des caractéristiques : la `dl` de `carte-pose.md` sans changement, dans un panneau `surface` ;
5. légende de l'échelle et avertissement (`legende-echelle.md`, « Variante page d'une pose ») ;
6. section « Transitions depuis Throne » (`h2`) : liste (`element-transition.md`) ou phrase vide ;
7. section « Transitions vers Throne » (`h2`) : idem.

### Mobile (< 640 px), personne connectée

```
┌────────────────────────────────┐
│ AcroFunJam                     │
│ alice@exa…   [Se déconnecter]  │
├────────────────────────────────┤
│                                │  spacing.lg (padding du main)
│ ‹ Catalogue                    │  lien-retour.md, 44 px
│                                │  spacing.xs
│ Star                           │  h1
│                                │  spacing.md
│ ┌────────────────────────────┐ │
│ │ (+) Proposer une transition│ │  lien-bouton primaire, pleine largeur,
│ │     depuis Star            │ │  deux lignes à 320 px
│ └────────────────────────────┘ │
│                                │  spacing.sm
│ [ Proposer une modification  ] │  lien-bouton secondaire
│                                │  spacing.lg
│ ┌────────────────────────────┐ │  panneau : surface, divider, radius.md, padding md
│ │ Base   Intermédiaire ●●●○  │ │  dl de carte-pose.md
│ │ Flyer  Intermédiaire ●●●○  │ │
│ │ ────────────────────────── │ │
│ │ Peut commencer un flow     │ │
│ │                     – Non  │ │
│ │ Peut terminer un flow      │ │
│ │                     – Non  │ │
│ └────────────────────────────┘ │
│                                │  spacing.lg
│ Niveaux de difficulté, du plus │  légende, size.sm
│ accessible au plus exigeant :  │
│ ●○○○ Découverte ●●○○ Débutant  │
│ ●●●○ Intermédiaire ●●●● Avancé │
│ Tu restes juge de tes limites… │  avertissement + phrase sur les transitions
│ Les chutes arrivent surtout    │
│ pendant les transitions : …    │
│                                │  spacing.xl
│ Transitions depuis Star        │  h2, size.lg, bold
│                                │  spacing.sm
│ ────────────────────────────── │  element-transition.md
│ Star → Bird                    │  h3 (sans nom)
│ Vers Bird                      │
│ Base   Intermédiaire ●●●○      │
│ Flyer  Intermédiaire ●●●○      │
│ Passe par Throne sans          │  description
│ s'arrêter.                     │
│ ────────────────────────────── │
│ Star → Star                    │  washing machine sans nom
│ Vers Star (même pose)          │
│ …                              │
│ ────────────────────────────── │
│ Ninja Star                     │
│ Vers Star (même pose)          │
│ …                              │
│ ────────────────────────────── │
│                                │  spacing.xl
│ Transitions vers Star          │  h2
│ ────────────────────────────── │
│ …                              │
└────────────────────────────────┘
```

### Grand écran (≥ 640 px)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ AcroFunJam                 [Propositions à valider ③]  bruno@… [Se déconnecter]│
├──────────────────────────────────────────────────────────────────────────────┤
│ ‹ Catalogue                                                                  │
│ Star                                                                         │
│ [(+) Proposer une transition depuis Star] [Proposer une modification]        │
│ ┌──────────────────────────────────────────────────────────┐                 │
│ │ Base        Intermédiaire ●●●○                            │                │
│ │ …                                                        │                 │
│ └──────────────────────────────────────────────────────────┘                 │
│ Niveaux de difficulté… ●○○○ Découverte ●●○○ Débutant …                       │
│ Tu restes juge de tes limites… Les chutes arrivent surtout…                  │
│                                                                              │
│ Transitions depuis Star                                                      │
│ ──────────────────────────────────────────────────────────                   │
│ Star → Bird                                                                  │
│ Vers Bird                                                                    │
│ Base       Intermédiaire ●●●○      Flyer       Intermédiaire ●●●○            │
│ Passe par Throne sans s'arrêter.                                             │
│ ──────────────────────────────────────────────────────────                   │
```

| Élément | Tokens |
|---|---|
| Lien de retour | `lien-retour.md` ; marge basse `spacing.xs` |
| `h1` | `size.xl`, `bold`, `tight` ; marge basse `spacing.md` |
| Actions | mobile : empilées, pleine largeur, écart `spacing.sm` ; ≥ `breakpoints.md` : en ligne, largeur du contenu, alignées à gauche, écart `spacing.md`, `flex-wrap: wrap` ; marge basse `spacing.lg` |
| Panneau des caractéristiques | fond `surface`, contour `borderWidth` `divider` (décoratif), rayon `radius.md`, padding `spacing.md` (`spacing.lg` ≥ `breakpoints.md`) ; pas de titre (le `h1` le nomme) |
| Légende et avertissement | `legende-echelle.md` ; marge haute `spacing.lg` |
| Section | marge haute `spacing.xl` |
| `h2` de section | `size.lg`, `bold`, `tight`, `text` ; marge basse `spacing.sm` ; « Transitions depuis Star » / « Transitions vers Star » (nom actuel) |

- **Hiérarchie** : `h1` (pose) > `h2` (sections) > `h3` (transitions). Les actions et le panneau appartiennent au `h1`.
- **Un seul primaire** : « Proposer une transition depuis Star », l'action propre à cette page ; « Proposer une modification » est secondaire.
- Visiteur : ni actions ni vide ; le panneau suit le `h1` avec la marge `spacing.md`.

### États de la page

| État | Contenu de `main` (le lien de retour est toujours là) |
|---|---|
| Chargement | `p role="status"` « Chargement de la pose… » (proposé), `size.md`, `textMuted` ; pas de `h1` visible tant que le nom n'est pas connu (titre de document : ux-expert) ; pas de squelette animé |
| Erreur | `alerte-formulaire.md`, variante erreur, hors formulaire (comme le catalogue) : « Impossible de charger la pose. Vérifie ta connexion Internet, puis réessaie. » (proposé) + bouton secondaire « Réessayer » (en cours « Chargement… ») |
| Section vide | phrase de `element-transition.md`, « Section vide » ; l'autre section reste normale |
| Introuvable | `h1` « Pose introuvable », `p` « Cette pose n'est pas dans le catalogue. » (proposé), lien-bouton secondaire « Voir le catalogue » (marge haute `spacing.md`) |

## Formulaire « Proposer une transition » (`/poses/:id/proposer-une-transition`)

Même gabarit que « Proposer une modification » (`6-proposer-une-modification.md`) : colonne `sizes.formWideMaxWidth`, carte `surface` en grand écran (contour `divider`, rayon `radius.lg`, padding `spacing.xl`, marge haute `spacing.xl`), pleine largeur en mobile ; `spacing.lg` entre champs et groupes ; actions « Proposer la transition » (primaire) + « Annuler » (lien-bouton secondaire, retour à la page de la pose).

### Ordre du contenu

1. `h1` « Proposer une transition » (marge basse `spacing.sm`) ;
2. encadré « publication directe » (validateur, administrateur) : « Ton rôle te permet de publier directement : la transition apparaîtra dans le catalogue dès l'envoi. » (tokens de l'encadré de la story 3) ;
3. introduction : « Le nom et la description sont facultatifs ; les autres champs sont obligatoires. » (proposé), `textMuted`, marge basse `spacing.lg` ;
4. alerte globale éventuelle (injoignable, session expirée) ;
5. « Pose de départ » : liste déroulante (`champ.md`), préremplie avec la pose consultée ;
6. « Pose d'arrivée » : liste déroulante, option vide « Choisis une pose » ;
7. « Nom de la transition (facultatif) » : champ texte, aide « Son nom d'usage, par exemple Ninja Star. Sans nom, elle se présentera par ses poses : Throne → Bird. 60 caractères au maximum. » (proposé), compteur dès 50 / 60 ; L'exemple de l'aide reprend les poses choisies (« Star → Bird »), « Throne → Bird » tant qu'une pose n'est pas choisie (validé après revue, 2026-11-13).
8. aide commune des difficultés, **avant** les deux groupes, comme l'aide des indicateurs de flow (story 3) : « La difficulté mesure le passage seul : les deux poses sont supposées maîtrisées. » ; reliée aux deux `fieldset` (`aria-describedby`) ; `size.sm`, `textMuted` ; écart `spacing.md` avec le premier groupe ;
9. « Difficulté base », « Difficulté flyer » : `groupe-tuiles-radio.md`, aucune tuile cochée au départ ;
10. « Description (facultative) » : zone de texte, 4 lignes, aide « Décris le passage : position de passage, appuis, lien vers une vidéo… Elle sera publiée avec la transition. 500 caractères au maximum. » (proposé), compteur dès 450 / 500 ;
11. actions.

```
Mobile :
│ Proposer une transition        │  h1
│ ┃ (i) Ton rôle te permet de    │  encadré (validateur seulement)
│ ┃     publier directement : …  │
│ Le nom et la description sont  │  introduction
│ facultatifs ; les autres…      │
│                                │  spacing.lg
│ Pose de départ                 │
│ [Throne                     ⌄] │  select natif, 48 px
│                                │  spacing.lg
│ Pose d'arrivée                 │
│ [Choisis une pose           ⌄] │
│                                │  spacing.lg
│ Nom de la transition           │
│ (facultatif)                   │
│ [                            ] │
│ Son nom d'usage, par exemple…  │  aide
│                                │  spacing.lg
│ La difficulté mesure le        │  aide commune
│ passage seul : …               │
│                                │  spacing.md
│ Difficulté base                │
│ [○ Découverte ][○ Débutant   ] │
│ [○ Intermédiaire][○ Avancé   ] │
│                                │  spacing.lg
│ Difficulté flyer               │
│ …                              │
│                                │  spacing.lg
│ Description (facultative)      │
│ [                            ] │  4 lignes
│ Décris le passage : …          │
│                                │  spacing.lg
│ [   Proposer la transition   ] │  primaire ; en cours « Envoi de la transition… »
│ [          Annuler           ] │  lien-bouton secondaire → page de la pose
```

### Erreurs sous les champs (`champ.md`, `groupe-tuiles-radio.md`)

| Champ | Message (proposé, sauf mention) |
|---|---|
| Pose d'arrivée non choisie | « Choisis la pose d'arrivée. » |
| Difficulté manquante | « Choisis la difficulté base. » / « Choisis la difficulté flyer. » (story 3) |
| Nom déjà pris entre ces poses | « Une transition de ce nom va déjà de Star vers Star dans le catalogue. Choisis un autre nom. » (en attente : « … va déjà de Star vers Star et attend d'être validée. Choisis un autre nom. ») |
| Transition sans nom déjà présente | sous le **nom** : « Une transition sans nom va déjà de Throne vers Bird. Donne un nom à la tienne pour la distinguer. » (en attente : « … va déjà de Throne vers Bird et attend d'être validée. … ») |
| Nom trop long, description trop longue | règles des stories 3 et 6 |

Le champ nom en erreur garde son libellé « (facultatif) » : l'erreur dit ce qu'il faut faire, pas que le champ est devenu obligatoire. Pose de départ introuvable à l'ouverture : bloc information de la story 6 (« Cette pose n'est plus dans le catalogue. ») à la place des champs, puis « Voir le catalogue ».

### Succès

Le formulaire, l'introduction et l'encadré sont remplacés par le panneau de succès (`panneau-succes.md`, « Variante transition »), `h1` conservé. Toutes les actions en liens-boutons secondaires.

## File de validation et « Mes propositions »

Pages des écrans 4 et 5 inchangées ; cartes : `../composants/carte-transition.md`. Introduction de la file (proposée) : « Vérifie chaque proposition de pose, de modification ou de transition : accepte-la, ajuste-la avant de l'accepter ou refuse-la. » ; introduction de « Mes propositions » (proposée) : « Retrouve les poses, les modifications et les transitions que tu as proposées, et ce qu'elles sont devenues. ». État vide de « Mes propositions » (révision de la story 5) : même bloc, titre « Tu n'as encore rien proposé. », texte « Les poses, les modifications et les transitions que tu proposes apparaissent ici, avec ce qu'elles deviennent. », lien primaire « Proposer une pose » inchangé.

## Accessibilité visuelle

| Couple | Ratio |
|---|---|
| `text` (nom souligné de la carte) sur `surface` / `surfaceHover` | 14,6:1 / 13,9:1 |
| `textMuted` sur `surfaceHover` (carte survolée) | 5,5:1 |
| `primary` (lien « Proposer une modification ») sur `surfaceHover` | 4,65:1 |
| `border` (contour de la carte cliquable) sur `background` | 3,3:1 |
| `primary` / `primaryHover` / `primaryActive` (liens de l'autre pose, lien de retour) sur `background` | 5,2:1 / 7,3:1 / 9,4:1 |
| `textMuted` (« Vers », « (même pose) », flèche, phrase vide, légende) sur `background` | 6,1:1 |
| `text` (titres, valeurs, description) sur `background` / `surface` | 15,4:1 / 14,6:1 |
| `primaryContrast` sur `primary` (« Proposer une transition depuis … ») | 5,2:1 |
| `border` (liste déroulante) sur `background` / `surface` | 3,3:1 / 3,2:1 |
| `focus` sur `background` / `surface` | 6,1:1 / 5,8:1 |

Rien ne repose sur la couleur seule : carte cliquable = soulignement + contour ; washing machine = mot « (même pose) » ; transition sans nom = flèche décorative + nom accessible « de Throne vers Bird » ; type de proposition = texte du titre ; champ facultatif = mot « (facultatif) ».

## Check-list visuelle pour l'implémentation

- Aucune valeur en dur, **aucune nouvelle variable CSS** ; deux icônes à ajouter à `Icon.tsx` (`chevronLeft`, `chevronDown`).
- Carte : `position: relative`, `::after` sur le lien du nom, `z-index: 1` sur le lien de modification, anneau via `:has(a:focus-visible)`, survol neutralisé par `:has(.pose-card__revision-link:hover)`.
- Page : colonne ≈ 690 px alignée à gauche ; difficultés d'une transition sur deux colonnes à partir de 40em (requête de conteneur).
- Description : `white-space: pre-line`, `overflow-wrap: anywhere`, texte brut.
- Liste déroulante : `appearance: none` + chevron positionné, `color-scheme` hérité.
- 320 px et zoom 400 % : action primaire sur deux lignes, titres et descriptions coupés n'importe où, valeurs de la `dl` sous leur terme ; zoom 200 % : aucun défilement horizontal (1.4.10).
- `forced-colors: active` : contour de carte `CanvasText`, nom et liens `LinkText`, chevrons en `currentColor`.
- Aucune animation.

## Questions

1. **Actions après l'envoi** : toutes en secondaire (recommandé, ordre validé conservé) ou « Proposer une autre transition depuis Throne » en primaire, comme « Proposer une autre pose » (story 3) ? Si l'on veut enchaîner les transitions depuis une pose, le primaire aide ; il faudrait alors le placer en premier.
2. **Nom de la carte en `text` souligné** plutôt qu'en terre cuite (recommandé) : à valider, c'est le premier titre-lien du site.
3. **Thème sombre** : la maquette en propose un (valeurs dans la maquette seulement, pas dans les tokens). Voir `../principes.md`, « Story 7 ».
