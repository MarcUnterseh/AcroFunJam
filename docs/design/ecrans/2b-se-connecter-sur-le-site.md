# Écrans de la story 2b « S'inscrire et se connecter sur le site »

Composants : `../composants/`. Principes et tokens : `../principes.md`. Scénarios : `specs/features/identite/se-connecter-sur-le-site.feature`. Textes entre guillemets : proposés, à confirmer par l'`ux-expert` (ton : voir les questions).

## Gabarit commun

```
<header>  en-tête (composants/en-tete.md)
[bandeau d'information, si session expirée]
<main>    contenu, un seul h1
[annonce de statut, masquée visuellement]
```

- `main` : padding `spacing.lg` en mobile ; `spacing.xl` au-dessus et `spacing.lg` sur les côtés à partir de `breakpoints.md` ; contenu centré sur `sizes.contentMaxWidth`.
- `h1` : `size.xl`, `bold`, interligne `tight`, marge basse `spacing.lg`.
- Un lien d'évitement « Aller au contenu » en premier élément focalisable (visible seulement au focus, en haut à gauche, style bouton secondaire sur `background`) ; recommandé dès qu'il y a un en-tête, à confirmer par l'`ux-expert`.

## Page « Se connecter »

**Mobile (320–639 px)**

```
┌────────────────────────────────┐
│ AcroFunJam                     │
│     [Se connecter] [S'inscrire]│  en-tête, état visiteur
├────────────────────────────────┤
│                                │  spacing.lg
│ Se connecter                   │  h1
│                                │  spacing.lg
│ ┃(!) L'adresse e-mail ou le    │  zone d'alerte (après un envoi refusé)
│ ┃    mot de passe est incorrect│
│                                │  spacing.lg
│ Adresse e-mail                 │
│ ┌────────────────────────────┐ │
│ │                            │ │
│ └────────────────────────────┘ │
│                                │  spacing.md
│ Mot de passe                   │
│ ┌──────────────────┐ ┌───────┐ │
│ │                  │ │Affich.│ │  champ et bouton séparés (spacing.sm)
│ └──────────────────┘ └───────┘ │
│                                │  spacing.lg
│ ┌────────────────────────────┐ │
│ │        Se connecter        │ │  bouton primaire, pleine largeur
│ └────────────────────────────┘ │
│                                │  spacing.lg
│ Pas encore de compte ?         │  size.md, text
│ S'inscrire                     │  lien (vers S'inscrire, en gardant la page d'origine)
└────────────────────────────────┘
```

- Pas de carte en mobile : le formulaire est posé sur `background`, toute la largeur utile.
- Ordre de tabulation = ordre visuel : marque, Se connecter, S'inscrire (en-tête), alerte (si focus programmatique), adresse, mot de passe, Afficher, bouton, lien.
- Le lien « Se connecter » de l'en-tête, sur cette page, porte `aria-current="page"` ; rendu : soulignement 2 px sous le libellé (pas seulement une couleur).

**Grand écran (≥ 640 px)**

```
┌──────────────────────────────────────────────────────────────────────┐
│ AcroFunJam                                 [Se connecter] [S'inscrire]│
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│                   ┌──────────────────────────────┐                   │
│                   │ Se connecter                 │  h1 dans la carte │
│                   │                              │                   │
│                   │ Adresse e-mail               │                   │
│                   │ [                          ] │                   │
│                   │ Mot de passe                 │                   │
│                   │ [               ] [Afficher] │                   │
│                   │                              │                   │
│                   │ [        Se connecter      ] │                   │
│                   │                              │                   │
│                   │ Pas encore de compte ? S'inscrire                │
│                   └──────────────────────────────┘                   │
└──────────────────────────────────────────────────────────────────────┘
```

- Carte centrée : largeur `sizes.formMaxWidth` (400) + padding `spacing.xl` ; fond `surface`, contour `borderWidth` `divider`, rayon `radius.lg`. Pas d'ombre.
- Sur `surface`, les champs gardent un fond `background` (contraste de leur bordure : 3,2:1).
- « Pas encore de compte ? S'inscrire » sur une ligne.

## Page « S'inscrire »

Même gabarit que « Se connecter ».

**Mobile**

```
│ S'inscrire                     │  h1
│                                │  pas de résumé des erreurs : le focus va
│                                │  au premier champ en erreur
│ Adresse e-mail                 │
│ ┌────────────────────────────┐ │
│ │ alice@example.org          │ │
│ └────────────────────────────┘ │
│                                │
│ Mot de passe                   │
│ ┏━━━━━━━━━━━━━━━━━━┓ ┌───────┐ │  bordure 2 px danger sur le champ seul
│ ┃ ••••••           ┃ │Affich.│ │
│ ┗━━━━━━━━━━━━━━━━━━┛ └───────┘ │
│ Ton mot de passe doit contenir au moins 10 caractères.        │  aide, textMuted, visible dès l'arrivée
│ (!) Le mot de passe doit       │  erreur, danger + icône
│     contenir au moins 10       │
│     caractères.                │
│                                │
│ ┌────────────────────────────┐ │
│ │      Créer mon compte      │ │  primaire ; en cours : « Création du compte… »
│ └────────────────────────────┘ │
│                                │
│ Déjà un compte ?               │
│ Se connecter                   │  lien
```

- Adresse déjà utilisée : zone d'alerte en refus global (« Cette adresse e-mail sert déjà à un compte. ») ; le lien « Se connecter » sous le formulaire suffit pour l'instant (lien « Connecte-toi » dans l'alerte : reporté).
- Mise à jour après implémentation : pas de résumé des erreurs de saisie, bouton « Afficher » séparé du champ (`alerte-formulaire.md`, `champ-mot-de-passe.md`).
- **Grand écran** : carte identique à « Se connecter ».

## En-tête du catalogue

Page d'accueil, `h1` « Catalogue des poses » (aligné à gauche, sur `sizes.contentMaxWidth`), puis la liste existante.

**Mobile, visiteur**

```
┌────────────────────────────────┐
│ AcroFunJam                     │
│     [Se connecter] [S'inscrire]│
├────────────────────────────────┤
│ Catalogue des poses            │  h1
│ ...liste des poses...          │
```

**Mobile, session expirée** (la personne reste sur le catalogue)

```
┌────────────────────────────────┐
│ AcroFunJam                     │
│     [Se connecter] [S'inscrire]│  état visiteur
├────────────────────────────────┤
│ ┃(i) Ta session a expiré. [x]│  bandeau d'information, marge spacing.md
│ ┃    Se connecter              │
│                                │
│ Catalogue des poses            │
```

**Mobile, connecté**

```
┌────────────────────────────────┐
│ AcroFunJam                     │
│ alice.dupont@exa… [Se déconnecter]│
├────────────────────────────────┤
│ Catalogue des poses            │
```

**Mobile, en attente**

```
┌────────────────────────────────┐
│ AcroFunJam                     │
│                                │  zone de compte vide, 44 px réservés
├────────────────────────────────┤
│ Catalogue des poses            │  le contenu s'affiche sans attendre la session
```

**Grand écran, connecté**

```
┌──────────────────────────────────────────────────────────────────────┐
│ AcroFunJam                  alice.dupont@example.org [Se déconnecter] │
├──────────────────────────────────────────────────────────────────────┤
│ Catalogue des poses                                                  │
│ ...                                                                  │
```

## Check-list visuelle pour l'implémentation

- Aucune valeur en dur : couleurs, tailles, espacements via les variables issues de `ui-tokens`.
- `:focus-visible` défini sur liens, boutons, champs, zone d'alerte focalisée ; jamais `outline: none` seul.
- Erreurs : icône + texte + bordure 2 px ; style piloté par `[aria-invalid="true"]`.
- Cibles ≥ 44 × 44 px, y compris liens sous formulaire et bouton « Fermer » du bandeau.
- Zoom 200 % et largeur 320 px : aucun défilement horizontal (critère 1.4.10), l'adresse se tronque, les libellés passent à la ligne.
- Hauteur de l'en-tête identique dans les trois états.
