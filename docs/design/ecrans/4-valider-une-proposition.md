# Écrans de la story 4 « Valider une proposition »

Composants : `../composants/` (nouveaux : `pastille-compteur.md`, `carte-proposition.md`, `recapitulatif-ajustements.md`, `compte-rendu-decision.md` ; mis à jour : `en-tete.md`, `champ.md` (zone de texte), `groupe-tuiles-radio.md` (aide), `bouton.md` (poids égal), `alerte-formulaire.md`, `carte-pose.md`, `panneau-succes.md`). Principes et tokens : `../principes.md`. Scénarios : `specs/features/contribution/valider-une-proposition.feature` (`@web`). Structure, textes et comportements : recommandations de l'`ux-expert` retenues par le porteur du produit le 2026-11-04 et décision Q17 (`docs/domain/decouverte.md`, story 4, R18) ; textes marqués « proposé » à confirmer.

Gabarit commun (en-tête, bandeau, `main`, annonce de statut) : `2b-se-connecter-sur-le-site.md`.

## En-tête : « Propositions à valider »

Détail : `../composants/en-tete.md`, « Navigation de contribution », et `../composants/pastille-compteur.md`. En résumé :

- nouvelle `nav` « Contribution » entre la marque et « Compte », **validateurs et administrateurs seulement**, sur toutes les pages ;
- lien au style bouton secondaire de 44 px, suivi d'une pastille sombre avec le nombre (absente à 0 et tant que le nombre est inconnu, « 99+ » au-delà de 99) ;
- libellé visible « À valider » sous 1024 px, « Propositions à valider » au-delà ; nom accessible toujours complet : « Propositions à valider (3 en attente) » ;
- mobile : dans la rangée 1, à droite de la marque ; la hauteur de l'en-tête ne change pas ;
- `aria-current="page"` sur `/propositions-a-valider` : libellé souligné 2 px.

```
Mobile, validateur :                     Grand écran (≥ 1024 px), validateur :
┌────────────────────────────────────┐   ┌───────────────────────────────────────────────────────────────────┐
│ AcroFunJam          [À valider (3)]│   │ AcroFunJam  [Propositions à valider (3)]  bruno@example.org [Se déconnecter] │
│ bruno@exa…        [Se déconnecter] │   └───────────────────────────────────────────────────────────────────┘
└────────────────────────────────────┘
```

## Page « Propositions à valider » (`/propositions-a-valider`)

### Ordre du contenu

1. `h1` « Propositions à valider » ;
2. introduction (texte : `ux-expert`) ;
3. nombre : « 3 propositions en attente, de la plus ancienne à la plus récente » (proposé ; singulier « 1 proposition en attente ») ;
4. liste des cartes (`ul` > `li` > `carte-proposition.md`), **une colonne**.

### Colonne

- Tout le contenu de la page (titre, introduction, nombre, liste) tient dans une colonne **alignée à gauche** du `main` (même bord gauche que la marque et que le `h1` du catalogue), de largeur maximale **`sizes.formWideMaxWidth` + 2 × `spacing.lg` + 2 × `sizes.borderWidth`** (≈ 690 px) : ainsi le **contenu** d'une carte en grand écran fait 640 px et les tuiles de la zone d'ajustement tiennent sur une ligne (`groupe-tuiles-radio.md`, seuil 39,5em).
- Pas de carte englobante (contrairement au formulaire « Proposer une pose ») : chaque proposition est déjà une carte.
- Une seule colonne même sur grand écran : les zones de décision dépliées ont besoin de la largeur, et la lecture d'une file se fait de haut en bas, dans l'ordre d'ancienneté.

### Mobile (< 640 px)

```
┌────────────────────────────────┐
│ AcroFunJam      [À valider (3)]│
│ bruno@exa…   [Se déconnecter]  │
├────────────────────────────────┤
│                                │  spacing.lg
│ Propositions à valider         │  h1
│                                │  spacing.sm
│ Vérifie chaque proposition,    │  introduction, size.md, textMuted (proposé)
│ puis publie-la, ajuste-la      │
│ avant de la publier ou         │
│ refuse-la.                     │
│                                │  spacing.sm
│ 3 propositions en attente, de  │  nombre, size.md, textMuted
│ la plus ancienne à la plus     │
│ récente                        │
│                                │  spacing.lg
│ ┌────────────────────────────┐ │
│ │ Star                       │ │  h2
│ │ Proposée par               │ │  size.sm, textMuted
│ │ chloe@example.org le       │ │  adresse semibold, text
│ │ 1 novembre 2026            │ │
│ │                            │ │  spacing.md
│ │ Base  Intermédiaire ●●●○   │ │  dl (carte-pose.md)
│ │ Flyer Intermédiaire ●●●○   │ │
│ │ ────────────────────────── │ │
│ │ Peut commencer un flow     │ │
│ │                     ✓ Oui  │ │
│ │ Peut terminer un flow      │ │
│ │                     ✓ Oui  │ │
│ │ ────────────────────────── │ │  zone de décision
│ │ ┌────────────────────────┐ │ │
│ │ │  Accepter et publier   │ │ │  secondaire, pleine largeur
│ │ └────────────────────────┘ │ │  spacing.md
│ │ ┌────────────────────────┐ │ │
│ │ │Ajuster avant de publier│ │ │  secondaire
│ │ └────────────────────────┘ │ │  spacing.md
│ │ ┌────────────────────────┐ │ │
│ │ │        Refuser         │ │ │  secondaire
│ │ └────────────────────────┘ │ │
│ └────────────────────────────┘ │
│                                │  spacing.md
│ ┌────────────────────────────┐ │
│ │ Bird                       │ │
│ │ …                          │ │
```

### Grand écran (≥ 640 px)

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│ AcroFunJam  [Propositions à valider (3)]          bruno@example.org [Se déconnecter] │
├───────────────────────────────────────────────────────────────────────────────────┤
│ Propositions à valider                                                            │
│ Vérifie chaque proposition, puis publie-la, ajuste-la avant de la publier ou      │
│ refuse-la.                                                                        │
│ 3 propositions en attente, de la plus ancienne à la plus récente                  │
│                                                                                   │
│ ┌──────────────────────────────────────────────────────────────┐                  │
│ │ Star                                                         │                  │
│ │ Proposée par chloe@example.org le 1 novembre 2026            │                  │
│ │                                                              │                  │
│ │ Base                                      Intermédiaire ●●●○ │                  │
│ │ Flyer                                     Intermédiaire ●●●○ │                  │
│ │ ──────────────────────────────────────────────────────────── │                  │
│ │ Peut commencer un flow                                ✓ Oui  │                  │
│ │ Peut terminer un flow                                 ✓ Oui  │                  │
│ │ ──────────────────────────────────────────────────────────── │                  │
│ │ [Accepter et publier] [Ajuster avant de publier] [Refuser]   │                  │
│ └──────────────────────────────────────────────────────────────┘                  │
│                                                                    spacing.lg     │
│ ┌──────────────────────────────────────────────────────────────┐                  │
│ │ Bird  …                                                      │                  │
```

(Termes abrégés sur la maquette ASCII seulement : ils sont toujours écrits en entier.)

| Zone | Mobile | ≥ `breakpoints.md` (640) |
|---|---|---|
| `h1` | marge basse `spacing.sm` | idem |
| Introduction | `size.md`, `regular`, `textMuted` (6,1:1) ; marge basse `spacing.sm` | idem |
| Nombre | `size.md`, `textMuted` ; marge basse `spacing.lg` | idem |
| Liste (`ul`, puces et marges retirées) | 1 colonne, écart **`spacing.md`** | 1 colonne, écart **`spacing.lg`** |
| Carte | padding `spacing.md` | padding `spacing.lg` |
| Boutons de décision | empilés, pleine largeur, écart `spacing.md` | en ligne, largeur du contenu, écart `spacing.md`, `flex-wrap` |

Media query `40em` (= `breakpoints.md` / 16), comme le catalogue. Pas de règle propre à `breakpoints.lg` sur cette page (seul l'en-tête change de libellé).

### Proposition du validateur lui-même

« Proposée par **toi** le 3 novembre 2026 » : même rendu que l'adresse (`semibold`, `text`). Pas de badge ni de couleur « ta proposition » : le mot suffit.

## Décider d'une proposition

Toutes les zones se déplient **dans la carte** (`carte-proposition.md`) ; aucune modale ; plusieurs cartes peuvent être ouvertes en même temps.

### Accepter telle quelle

« Accepter et publier » envoie directement (pas de confirmation, Q17). Pendant l'envoi : « Publication… » (`bouton.md`, en cours). Succès : compte rendu.

### Refuser

```
│ │ ────────────────────────── │ │
│ │ Motif du refus             │ │  libellé
│ │ ┌────────────────────────┐ │ │
│ │ │ Doublon de Bird, déjà  │ │ │  zone de texte, 4 lignes
│ │ │ au catalogue.          │ │ │
│ │ │                        │ │ │
│ │ └────────────────────────┘ │ │
│ │ Le contributeur verra ce   │ │  aide (proposé)
│ │ motif. 500 caractères au   │ │
│ │ maximum.                   │ │
│ │                            │ │  spacing.md
│ │ [   Confirmer le refus   ] │ │  primaire
│ │ [        Annuler         ] │ │  secondaire
```

- « Accepter et publier » et « Ajuster avant de publier » disparaissent pendant la saisie.
- Compteur à partir de 450 / 500 (`champ.md`, zone de texte).
- Motif vide à l'envoi : erreur du champ (bordure 2 px `danger`, icône, « Saisis le motif du refus. », texte proposé), focus sur le champ.

### Ajuster avant de publier, puis récapitulatif (Q17)

Étape 1, formulaire prérempli (le nom, les deux difficultés, les deux indicateurs), à la place de la `dl` et des actions :

```
Grand écran, dans la carte (contenu 640 px) :
│ Thron                                                         │
│ Proposée par alice@example.org le 3 novembre 2026             │
│ ───────────────────────────────────────────────────────────── │
│ Ajuster avant de publier                                      │  h3
│ Les valeurs proposées sont préremplies.                       │
│                                                               │
│ Nom de la pose                                                │
│ [Throne                                                     ] │
│ Proposé : Thron                                               │
│                                                               │
│ Difficulté base                                               │
│ Proposée : Débutant                                           │
│ [○ Découverte][◉ Débutant][○ Intermédiaire][○ Avancé]         │
│ Difficulté flyer                                              │
│ Proposée : Intermédiaire                                      │
│ [◉ Découverte][○ Débutant][○ Intermédiaire][○ Avancé]         │
│                                                               │
│ Commencer : … Terminer : …                                    │
│ Peut-on commencer un flow sur cette pose ?   Proposé : Oui    │
│ [◉ Oui       ][○ Non       ]                                  │
│ Peut-on terminer un flow sur cette pose ?    Proposé : Oui    │
│ [○ Oui       ][◉ Non       ]                                  │
│                                                               │
│ [Vérifier les ajustements] [Annuler]                          │
```

(Sur la maquette, « Proposé : Oui » est à droite de la question pour gagner de la place ; en réalité il est sous la `legend`, comme pour les niveaux.)

Étape 2, récapitulatif (`recapitulatif-ajustements.md`), message facultatif et envoi :

```
Mobile, dans la carte :
│ │ Vérifie tes ajustements    │ │  h3
│ │ Valeur proposée → valeur   │ │  clé de lecture, size.sm, textMuted
│ │ retenue                    │ │
│ │ ┌────────────────────────┐ │ │  fond background, contour divider
│ │ │ Difficulté flyer       │ │ │  dt, size.sm, semibold
│ │ │ I̶n̶t̶e̶r̶m̶é̶d̶i̶a̶i̶r̶e̶            │ │ │  proposée : barrée, textMuted
│ │ │ → Découverte           │ │ │  retenue : semibold, text
│ │ │ ────────────────────── │ │ │
│ │ │ Peut terminer un flow  │ │ │
│ │ │ O̶u̶i̶ → Non              │ │ │
│ │ └────────────────────────┘ │ │
│ │ Les autres valeurs restent │ │  size.sm, textMuted
│ │ celles proposées.          │ │
│ │                            │ │  spacing.lg
│ │ Message pour le            │ │  libellé
│ │ contributeur (facultatif)  │ │
│ │ [                        ] │ │  zone de texte, 4 lignes
│ │ Il le verra avec tes       │ │  aide (proposé)
│ │ ajustements. 500 caract.…  │ │
│ │                            │ │  spacing.lg
│ │ [Publier avec ces ajustem.]│ │  primaire ; en cours « Publication… »
│ │ [Modifier les ajustements] │ │  secondaire
│ │ [        Annuler         ] │ │  secondaire
```

- Les erreurs de saisie (nom vide, nom trop long) s'affichent à « Vérifier les ajustements », dans le formulaire (`champ.md`) ; un nom refusé par l'API à l'envoi (« Une pose de ce nom existe déjà dans le catalogue. ») rouvre le formulaire avec l'erreur sur le champ nom (`carte-proposition.md`, « Alertes dans la carte »).
- Le message n'est proposé qu'à l'étape 2, quand il existe au moins un ajustement.

## États de la page

**Chargement** : sous le `h1`, un paragraphe `role="status"` « Chargement des propositions… » (proposé), `size.md`, `textMuted`. Pas de squelette, pas d'introduction ni de nombre tant que la file n'est pas reçue.

**Erreur de chargement** : `alerte-formulaire.md`, variante erreur, hors formulaire, avec « Réessayer » (secondaire ; en cours « Chargement… »), comme le catalogue. Ni nombre ni liste. Site à mettre à jour (refus inconnu) : même alerte, « Impossible de charger les propositions : le site doit être mis à jour. Recharge la page. » avec « Recharger la page » au lieu de « Réessayer ». Session expirée au chargement : la session se termine côté site, puis la page renvoie vers « Se connecter » (retour ici ensuite).

**Après chaque décision** : la ligne « N propositions en attente » baisse (sans région live : le compte rendu prend le focus) ; à 0, les comptes rendus restent et la ligne dit « Toutes les propositions de la liste sont traitées. ». Une saisie conservée pour une proposition traitée entre-temps est signalée à la restauration (« Une proposition sur laquelle tu avais commencé une décision a été traitée entre-temps. »).

**Vide** :

```
│ Propositions à valider         │  h1
│                                │  spacing.lg
│ ┌────────────────────────────┐ │
│ │ Aucune proposition n'est   │ │  size.md, weight.semibold, text
│ │ en attente de validation.  │ │
│ │                            │ │  spacing.xs
│ │ Tu es à jour.              │ │  size.md, regular, textMuted
│ │                            │ │  spacing.md
│ │ [    Voir le catalogue   ] │ │  lien-bouton secondaire
│ └────────────────────────────┘ │
```

- Bloc identique à l'état vide du catalogue : fond `surface`, contour `borderWidth` `divider`, rayon `radius.md`, padding `spacing.lg` ; lien pleine largeur en mobile, largeur du contenu ensuite.
- Lien-bouton **secondaire** : la page n'a pas d'action principale à pousser ; rien d'autre n'est attendu du validateur.
- Ni introduction ni nombre (« 0 proposition ») : le bloc dit tout.
- Quand la dernière carte de la liste vient d'être traitée, la liste garde ses comptes rendus (pas de passage automatique à l'état vide avant le prochain chargement ; comportement à confirmer par l'`ux-expert`).

**Compte rendu d'une décision** : la carte est remplacée dans son `li` par `compte-rendu-decision.md` (succès pour une publication, avec ou sans ajustements ; information pour un refus), focus sur son titre. Les autres cartes ne bougent pas, sauf la remontée due à la hauteur plus faible du compte rendu.

```
│ ┃(✓) La pose « Star » est      │  successSurface, barre success
│ ┃    publiée dans le catalogue.│
│ ┃    Voir le catalogue         │
│                                │  spacing.md (écart de la liste)
│ ┌────────────────────────────┐ │
│ │ Bird                       │ │  carte suivante, inchangée
```

**Erreurs et incidents d'une décision** : dans la carte concernée (`carte-proposition.md`, « Alertes dans la carte ») : injoignable (erreur + « Réessayer » ; « Ta saisie est conservée » seulement quand une zone était ouverte), session expirée (information + « Se connecter », même règle pour la saisie ; le bandeau global n'apparaît pas en plus ; l'alerte disparaît quand la session revient), site à mettre à jour (erreur + « Recharger la page »), plus en attente (information « Cette proposition n'est plus en attente de validation. », actions retirées), nom déjà pris (erreur), déjà traitée (information, actions retirées), rôle retiré (information « Tu ne peux plus accepter ni refuser de proposition : ton rôle a changé. » + lien « Revenir au catalogue », actions retirées).

**Visiteur** : redirection vers « Se connecter » ; pendant la vérification de session, `main` n'affiche que le `h1`. **Utilisateur** : ramené au catalogue, la page n'apparaît jamais.

## Accessibilité visuelle

| Couple | Ratio |
|---|---|
| `text` sur `surface` (nom, valeurs, adresse) | 14,6:1 |
| `textMuted` sur `surface` (ligne du contributeur, termes, « Proposé : … ») | 5,8:1 |
| `textMuted` sur `background` (introduction, nombre, valeur proposée barrée) | 6,1:1 |
| `text` sur `background` (valeur retenue) | 15,4:1 |
| `badgeContrast` sur `badge` (pastille) | 11,5:1 |
| `badge` sur `surface` / `surfaceHover` / `divider` (forme de la pastille) | 10,9:1 / 10,4:1 / 8,8:1 |
| `border` sur `surface` (boutons secondaires, tuiles, champs dans la carte) | 3,2:1 |
| `border` sur `background` (champs sur fond blanc) | 3,3:1 |
| `text` sur `successSurface` / `infoSurface` / `dangerSurface` (comptes rendus, alertes) | 14,4:1 / 13,9:1 / 14,4:1 |
| `success` / `info` / `danger` (icônes) sur leur surface | 5,7:1 / 5,5:1 / 5,1:1 |
| `focus` sur `surface` / `background` | 5,8:1 / 6,1:1 |

Focus : anneau `focus` 3 px décalé de 2 px sur les boutons, liens, champs, tuiles (tuile entière), lien de l'en-tête (pastille comprise) et sur les titres qui reçoivent le focus programmatique (compte rendu, récapitulatif), rayon `radius.sm` pour ces titres. Le focus reste distinct du survol (fond `surfaceHover`) et de la page courante (soulignement).

Rien ne repose sur la couleur seule : pastille = chiffre ; Oui / Non = mot + coche / tiret ; proposé / retenu = ordre + flèche + barré + graisse ; compte rendu = icône + titre explicite ; erreurs = icône + texte + bordure 2 px.

## Check-list visuelle pour l'implémentation

- Aucune valeur en dur ; nouvelles variables : `--afj-color-badge`, `--afj-color-badge-contrast`, `--afj-radius-pill`, `--afj-size-badge`.
- Seuils en `em` : `40em` (page, en-tête), **`64em`** (= `breakpoints.lg` / 16, libellé long de l'en-tête), requêtes de conteneur `19.5em` / `39.5em` (tuiles), commentés avec le token d'origine.
- En-tête mobile : grille à deux colonnes en rangée 1 ; vérifier à 320 px, avec « 99+ » et une adresse longue, qu'il n'y a ni chevauchement ni défilement horizontal ; hauteur de l'en-tête identique pour un utilisateur et un validateur.
- Libellé court : `aria-hidden` sur « À valider », libellé long masqué visuellement (pas `display: none`) sous 64em ; aucun `aria-label` sur le lien.
- Boutons de décision : même variante secondaire, sans icône ; « Refuser » jamais en `danger`.
- Récapitulatif : texte masqué « Proposé : » / « , retenu : », flèche SVG `aria-hidden`, pas de « → » dans le texte.
- Cibles ≥ 44 px partout (boutons 48, lien de l'en-tête 44, tuiles 48, liens des alertes et comptes rendus 44 de haut).
- 320 px et zoom 400 % : boutons empilés, tuiles en une colonne, récapitulatif sur deux lignes par ajustement ; zoom 200 % : aucun défilement horizontal (1.4.10).
- `forced-colors: active` : pastille avec bordure transparente, tuiles cochées, barré du récapitulatif.
- Aucune animation (dépliement, compte rendu, pastille).
