# Écrans de la story 12 « Vidéos des transitions »

**Statut : proposition du 2026-11-26**, à valider par le porteur du produit. Direction « Soleil et Lune » ([ADR 0031](../../adr/0031-direction-visuelle-soleil-et-lune.md), `../principes.md`, « Les vidéos des transitions »). Carte : `docs/domain/decouverte.md`, « Story 12 » (V1 à V23, décisions de validation 5 à 15) ; scénarios `@web` (`@wip`) : `specs/features/catalogue/consulter-les-videos-des-transitions.feature`, `ajouter-des-videos-a-une-transition.feature`. Maquette statique (clair / sombre, 320 px et grand écran) : `../maquettes/12-videos-des-transitions.html`.

Composants : `rangee-videos.md`, `lecteur-video.md`, `bloc-preparation-video.md`, `champ-video.md` (nouveaux) ; `element-transition.md`, `barre-progression.md` (complétés). Libellés notés « proposé » : absents de la carte, à confirmer par l'`ux-expert`.

## Choix visuels structurants

1. **Une vidéo est une photo qui bouge** : contenue sur le passe-partout `photoMat`, jamais recadrée, sans effet. Aucune couleur nouvelle.
2. **Rangée en grille, pas en ruban** (UX-50 (b)) : cellules 3:4 d'au moins 120 px qui passent à la ligne (2 colonnes à 320 px, 3 sur grand écran). Aucune vidéo cachée hors champ, aucun défilement horizontal.
3. **« Lire » est écrit** : pastille en bas à gauche de l'affiche, sœur de la pastille loupe des photos ; la durée « 0:12 » en haut à droite.
4. **La vidéo lancée s'agrandit à sa place**, sur toute la rangée, à ses proportions (≤ 480 px de haut), avec les contrôles du navigateur ; les autres restent compactes, dans l'ordre. Une seule à la fois.
5. **Le rappel de sécurité est une phrase, pas un encadré** : icône spot `sunStrong`, texte `size.sm`, avant les vidéos ; la note de sécurité encadrée de la page reste unique.
6. **La préparation se lit au mot et au contour** : tireté pour « En préparation », 2 px `danger` pour « Impossible à préparer », sans animation.
7. **La page d'ajout est la page photo** : même colonne, mêmes champs et mêmes états ; l'aperçu est une vidéo muette.

## Tokens (nouveaux)

| Token | Valeur | Rôle |
|---|---|---|
| `sizes.videoPoster` | 120 | largeur minimale d'une affiche compacte dans la rangée (`repeat(auto-fill, minmax(…, 1fr))`) |
| `sizes.videoMaxHeight` | 480 | hauteur maximale d'une vidéo lancée et de l'aperçu (vidéo + contrôles + légende tiennent dans une fenêtre d'ordinateur portable) |
| `sizes.centeredMessageMaxWidth` | `'30ch'` (web) | mesure d'un message court centré sur un cadre (échec de lecture) ; ajouté à la revue visuelle du 2026-11-27 |

Variables CSS produites sans changement de code : `--afj-size-video-poster`, `--afj-size-video-max-height`, `--afj-size-centered-message-max-width`. Paire à ajouter à `contrast.test.ts` (contrôles, 3:1) : `danger` / `photoMat` (5,3 / 7,2:1).

## 1. Page d'une pose : élément de transition (visiteur)

Ordre des sections de la page inchangé ; les vidéos n'apparaissent que dans les éléments de transition des sections « Transitions depuis … » et « Transitions vers … » (une washing machine les montre dans les deux).

### 320 px, Pop to Bird, 3 vidéos (portrait, portrait, paysage)

```
Transitions depuis Throne                         h2
┌──────────────────────────────────┐             élément (surface, divider, radius.md, padding md)
│ Pop to Bird                      │             h3
│ Vers Bird                        │
│ [Base] ◑ Intermédiaire           │
│ [Flyer] ◑ Intermédiaire          │
│ Étiquettes (dynamique) (pop)     │
│ Depuis Throne, la base pousse…   │             description de la transition
│ Vidéos                           │             h4, sm, semibold, textMuted (proposé)
│ (!) Une vidéo montre une façon   │             rappel : spot sunStrong + sm text
│     de faire ; elle ne remplace  │
│     ni un cours ni un spotter.   │
│ ┌────────────┐ ┌────────────┐    │             2 colonnes de 124 px
│ │▒┌──────┐(0:12)│▒┌──────┐(0:20)│
│ │▒│ 9:16 │▒│ │▒│ 9:16 │▒│      │
│ │(▶ Lire)▒▒│ │(▶ Lire)▒▒│      │
│ └────────────┘ └────────────┘    │
│ Pop to Bird,   Pop to Bird,      │
│ démonstration  tutoriel          │
│ de face        Vidéo : Hugo      │
│ Vidéo : Léa    Bernard           │
│ Martin         Description de ⌄  │
│                la vidéo          │
│ ┌────────────┐                   │
│ │▒▒▒▒▒▒▒▒▒(0:09)                 │             paysage 16:9 contenu dans la cellule 3:4
│ │[  16:9    ]│                   │
│ │(▶ Lire)▒▒▒▒│                   │
│ └────────────┘                   │
│ Pop to Bird,                     │
│ vue de côté                      │
│ Vidéo : Collectif AcroLyon       │
│ ▸ Ce que veulent dire ces        │             repli des étiquettes
│   étiquettes                     │
└──────────────────────────────────┘
```

Une seule vidéo : une seule cellule de 124 px, à gauche. Une transition sans vidéo : ni titre « Vidéos », ni rappel.

### Lecture en cours (la 2e vidéo lancée)

La cellule 2 prend toute la rangée (256 px) ; la vidéo portrait fait 256 × 455 px ; la 1re reste seule sur sa ligne, la 3e reprend après. Sous la vidéo : légende, crédit, repli, « Fermer la vidéo » (proposé).

### Échec de lecture

La scène garde la taille de la vidéo ; au centre, sur le passe-partout : icône erreur `danger`, « La vidéo n'a pas pu être lue. Vérifie ta connexion Internet, puis réessaie. » (proposé), « Réessayer » (secondaire, fond `surface`).

### Grand écran (≥ 64em)

Les deux sections de transitions côte à côte (colonnes de 480 px, élément de 448 px de contenu) : les 3 affiches tiennent sur **une rangée** (144 px chacune). Lancée, une vidéo portrait est plafonnée à 480 px de haut (270 px de large, passe-partout autour) ; une vidéo paysage fait 448 × 252 px. Entre 40 et 64em (une colonne), la grille a 4 ou 5 colonnes : les vidéos restent compactes, à gauche.

## 2. Validateur et administrateur

### 320 px, 2 vidéos dont une en préparation

```
│ Vidéos                           │
│ (!) Une vidéo montre…            │
│ ┌────────────┐ ┌ ─ ─ ─ ─ ─ ─┐    │
│ │ affiche    │      (◷)          │             « En préparation » : tireté border, horloge textMuted
│ │(▶ Lire)    │ │ En         │    │
│ └────────────┘   préparation     │
│                └ ─ ─ ─ ─ ─ ─┘    │
│ Pop to Bird,   Pop to Bird,      │
│ démonstration  vue de côté       │
│ de face        Vidéo : Léa       │
│ Vidéo : Léa    Martin            │
│ Martin         ┄┄┄┄┄┄┄┄┄┄┄       │
│ ┄┄┄┄┄┄┄┄┄┄┄    [ Modifier ]      │
│ [ Modifier ]   [ Retirer  ]      │
│ [ Retirer  ]                     │
│ ▸ Ce que veulent dire ces…       │
│ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │             pied de gestion
│ [ Étiqueter ]                    │
│ [ + Ajouter une vidéo ] 2 vidéos │
│                         sur 3    │
└──────────────────────────────────┘
```

### Impossible à préparer

La cellule : contour 2 px `danger`, icône erreur `danger`, « Impossible à préparer ». Sous la grille, l'alerte (fond `dangerSurface`, barre `danger`, texte `size.sm`) : « La vidéo « Pop to Bird, vue de côté » n'a pas pu être préparée. Retire-la, puis envoie-la de nouveau ou choisis-en une autre. » « Retirer » reste sous la cellule.

### Pied de gestion

| Vidéos | Pied |
|---|---|
| 0 | « Étiqueter », « Ajouter une vidéo » (sans repère, proposé) |
| 1 ou 2 | « Étiqueter », « Ajouter une vidéo » + « 1 vidéo sur 3 » / « 2 vidéos sur 3 » |
| 3 (préparation comprise) | « Étiqueter », puis « Pop to Bird a déjà 3 vidéos, le maximum. Retire une vidéo pour en ajouter une autre. » (`textMuted`, sans bouton) |

Grand écran : « Étiqueter », « Ajouter une vidéo » et le repère sur une ligne.

### Après l'ajout

Retour sur l'élément de la transition (ancre, `scroll-margin-block-start: spacing.lg`), annonce « Vidéo ajoutée à Pop to Bird. Elle sera présentée dès qu'elle sera prête. » (`annonce-statut.md`) ; la nouvelle vidéo est « En préparation » ; aucun bandeau.

## 3. Page « Ajouter une vidéo à Pop to Bird » (route proposée `/poses/:poseId/transitions/:transitionId/ajouter-une-video`)

Mise en page de « Ajouter une photo » : colonne `formWideMaxWidth` (640), sur le fond à 320 px, panneau `surface` (`divider`, `radius.lg`, padding `xl`) à partir de 40em ; écart entre blocs `spacing.lg`.

```
‹ Throne                                    lien retour (proposé : la pose d'où l'on vient)
Ajouter une vidéo à Pop to Bird             h1
Tous les champs sont obligatoires, sauf     introduction (proposée), textMuted
la description de la vidéo.
Vidéo
MP4, MOV ou WebM, de 2 à 30 secondes, 100 Mo…    aide
[ (▷) Choisir une vidéo ]                   → aperçu muet ≤ 480 px de haut, résumé, « Changer de vidéo »
Légende                         0 / 100
Crédit                          0 / 100
Description de la vidéo (facultative)
                                0 / 300
☐ Je confirme que l'auteur de la vidéo a autorisé sa publication sur AcroFunJam, que chaque
  personne filmée l'a acceptée, et qu'aucune personne mineure n'y est reconnaissable.
AcroFunJam garde ta confirmation avec la vidéo (ton compte et la date).
[      Ajouter la vidéo      ]              primaire, pleine largeur < 40em
[          Annuler           ]
```

| État | Rendu |
|---|---|
| Repos | ci-dessus |
| Aperçu | `<video>` muet sur le passe-partout, contrôles du navigateur, puis « pop-to-bird-cote.mp4 · 18,4 Mo · 12 secondes · 1080 × 1920 pixels » |
| Aperçu indisponible (HEVC) | bande `.photo-field__unavailable` de la page photo (`photoMat`, icône vidéo en tête de ligne), « Pas d'aperçu : ton navigateur ne sait pas lire cette vidéo. AcroFunJam la préparera après l'envoi. » (seulement pour une vidéo acceptée) ; résumé tiré de l'en-tête |
| Erreur de durée | aperçu entouré de 2 px `danger`, résumé « … · 31 secondes · … », message validé sous « Changer de vidéo » |
| Envoi | barre « Envoi de la vidéo » 42 % au-dessus des actions ; « Envoi de la vidéo… » (`aria-disabled`), « Annuler l'envoi » ; annulé : « Envoi annulé. Ta saisie est gardée : tu peux renvoyer la vidéo. » |
| Vérification | barre indéterminée « Vérification de la vidéo… » qui va et vient (hachurée et immobile en mouvement réduit) ; bouton primaire « Vérification de la vidéo… », sans « Annuler l'envoi » |
| Abandon | « Abandonner cette vidéo ? Ta saisie sera perdue. », « Abandonner » / « Continuer l'ajout » (deux secondaires) |

Grand écran : panneau de 640 px centré, actions en ligne ; un aperçu portrait est plafonné à 480 px (270 px de large, centré sur le passe-partout).

## Accessibilité visuelle

| Couple | Aube | Nuit |
|---|---|---|
| `text` sur `surface` (pastilles « Lire » et de durée, légende, rappel) | 16,2:1 | 14,4:1 |
| `textMuted` sur `surface` (crédit, titre « Vidéos », repère, maximum) | 7,0:1 | 7,3:1 |
| `sunStrong` (icône du rappel) sur `surface` | 5,2:1 | 10,4:1 |
| `border` (contour de la pastille « Lire », boutons) sur `surface` | 3,4:1 | 3,4:1 |
| `primary` (repli « Description ») sur `surface` | 7,1:1 | 8,1:1 |
| `text` / `textMuted` sur `photoMat` (repères, aperçu indisponible, échec) | 13,2 / 5,7:1 | 12,0 / 6,1:1 |
| `danger` (icône et contour d'échec) sur `photoMat` | 5,3:1 | 7,2:1 |
| `focus` (anneau autour d'une affiche) sur `surface` | 5,7:1 | 9,1:1 |

Rien ne repose sur la couleur seule : « Lire » écrit, durée écrite, « En préparation » / « Impossible à préparer » écrits (et contour tireté / plein), nombre de vidéos écrit, erreurs avec icône + texte + contour 2 px.

## Check-list pour l'implémentation

- Classes proposées : `.transition-videos` (+ `__title`, `__reminder`, `__list`, `__alert`) ; `.video` (+ `--active`, `--editing`), `.video__figure`, `.video__play`, `.video__poster`, `.video__play-pill`, `.video__duration`, `.video__caption`, `.video__legend`, `.video__credit`, `.video__description`, `.video__stage`, `.video__error`, `.video__frame--pending`, `.video__frame--failed`, `.video__actions` ; `.transition__videos-manage`, `.transition__videos-count` ; `.video-field` (+ `__choose`, `__preview`, `__summary`, `__unavailable`, `__change`).
- `img` et `video` : `width` / `height` de l'API, `object-fit: contain`, fond `photoMat`. Jamais `cover`.
- Seules les affiches sont chargées (`preload="none"`, la vidéo n'est insérée qu'au clic) ; `loading="lazy"` sur les affiches.
- 320 px et zoom 400 % : 2 colonnes puis 1 (une cellule de 120 px minimum), aucun défilement horizontal.
- Icônes nouvelles (`Icon.tsx`) : `play` (triangle), `video` (cadre et triangle). Existantes : `spot`, `clock`, `error`, `close`, `plus`, `chevronDown`.
- Aucune animation.

## Questions

1. **Grille plutôt que ruban** : la rangée passe à la ligne (2 + 1 à 320 px) au lieu de défiler horizontalement. Recommandé (rien de caché, focus non rogné, pas de conflit de geste).
2. **Cellule 3:4 pour tous** : une vidéo paysage y paraît petite (124 × 70 px à 320 px) tant qu'elle n'est pas lancée. Recommandé : garder une forme unique (rangées alignées, la plupart des vidéos sont en portrait) ; alternative : cellule paysage sur deux colonnes.
3. **Agrandissement à sa place** (avec une cellule vide possible sur la ligne précédente) plutôt qu'une « scène » unique au-dessus de la rangée. Recommandé : l'ordre et le lien légende ↔ vidéo restent évidents.
4. **« Fermer la vidéo »** pour revenir à l'affiche compacte : proposé ; sinon la vidéo reste grande jusqu'à ce qu'on en lance une autre.
5. **Libellés proposés** (`ux-expert`) : titre « Vidéos » ; nom du bouton « Lire Pop to Bird, tutoriel (20 secondes) » ; message d'échec de lecture et « Réessayer » ; aide du champ Vidéo ; aides de la légende, du crédit et de la description ; « (facultative) » ; introduction ; aperçu indisponible ; « Modifier la vidéo », « Enregistrer la vidéo » ; repère absent à 0 vidéo ; route de la page.
