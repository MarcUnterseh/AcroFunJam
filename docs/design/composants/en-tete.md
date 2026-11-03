# En-tête du site

Élément `<header>` commun à toutes les pages : la marque (lien vers le catalogue) et la zone de compte (`<nav aria-label="Compte">`). Trois états : **en attente**, **visiteur**, **connecté**.

## Tokens communs

- Fond `surface`, ligne basse `borderWidth` `divider` (décorative).
- Padding horizontal `spacing.md` (mobile), `spacing.lg` (≥ `breakpoints.md`) ; contenu centré sur `sizes.contentMaxWidth`.
- Marque « AcroFunJam » : `size.lg`, `weight.bold`, `text`, lien sans soulignement (exception justifiée : c'est un logo textuel), zone cliquable ≥ 44 px ; survol soulignement ; focus anneau `focus`, rayon `radius.sm`.
- Boutons : `bouton.md`, hauteur `sizes.touchTarget` (44) dans l'en-tête pour rester compact, écart `spacing.sm`.

## Disposition

**Mobile (< 640 px)** : deux rangées, pour que les libellés complets tiennent dès 320 px.

```
┌────────────────────────────────────┐
│ AcroFunJam                         │  rangée 1 : marque, 44 px
│               [Se connecter] [S'inscrire] │  rangée 2 : zone de compte, 44 px, alignée à droite
└────────────────────────────────────┘
```

Padding vertical `spacing.sm`, écart entre rangées `spacing.xs`.

**Grand écran (≥ 640 px)** : une rangée, marque à gauche, zone de compte à droite ; padding vertical `spacing.sm`, soit 60 px de haut (8 + 44 + 8).

```
┌──────────────────────────────────────────────────────────────────┐
│ AcroFunJam                            [Se connecter] [S'inscrire] │
└──────────────────────────────────────────────────────────────────┘
```

## États de la zone de compte

| État | Contenu | Variantes |
|---|---|---|
| **En attente** (vérification de la session) | vide ; `aria-busy="true"` sur la `nav` | — |
| **Visiteur** | « Se connecter » puis « S'inscrire » (liens vers les pages dédiées) | secondaire, puis **primaire** (l'inscription est l'invitation principale) |
| **Connecté** | adresse e-mail puis « Se déconnecter » | adresse : `size.sm`, `textMuted` ; bouton secondaire |

### Pas de clignotement

- La zone de compte a une **hauteur fixe** (`sizes.touchTarget`) dans les trois états : rien ne bouge en dessous quand l'état change.
- En attente, on n'affiche **ni** les boutons visiteur **ni** un squelette animé : la zone reste vide (fond `surface`), ce qui évite d'afficher « Se connecter » une fraction de seconde à une personne connectée.
- Si la vérification dépasse 1 seconde (à confirmer par l'`ux-expert`), un texte statique « Vérification de la session… » en `size.sm` `textMuted` apparaît, sans animation.

### Adresse longue

- L'adresse occupe l'espace libre (`flex: 1`, `min-width: 0`), alignée à droite près du bouton, sur une ligne, **tronquée par une ellipse** (`text-overflow: ellipsis`).
- L'adresse complète reste accessible : attribut `title` pour la souris et texte complet dans le DOM (la troncature est purement visuelle, le lecteur d'écran lit tout).
- Texte masqué visuellement devant l'adresse : « Compte connecté : » (tournure épicène, décision 4 de `principes.md`), pour que l'adresse ne soit pas lue hors contexte.
- Le bouton « Se déconnecter » ne se réduit jamais (`flex-shrink: 0`).

```
Mobile, connecté :
│ AcroFunJam                         │
│ alice.dupont-longnom@exa… [Se déconnecter] │

Grand écran, connecté :
│ AcroFunJam          alice.dupont-longnom@example.org [Se déconnecter] │
```

En grand écran, l'adresse est limitée à `sizes.accountLabelMaxWidth` (320 px) avant troncature.

### Pendant la déconnexion

Bouton « Se déconnecter » à l'état « en cours » (« Déconnexion… »), puis passage direct à l'état visiteur.
