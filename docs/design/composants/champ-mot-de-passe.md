# Champ mot de passe

Variante du champ de formulaire (`champ.md`) avec un bouton pour afficher ou masquer la saisie.

## Structure (mise en œuvre en 2b)

```
Mot de passe
┌──────────────────────────────┐ ┌──────────┐
│ ••••••••••••                 │ │ Afficher │   <- champ et bouton séparés, 48 px
└──────────────────────────────┘ └──────────┘
Ton mot de passe doit contenir au moins 10 caractères.              <- aide (inscription)
(!) Le mot de passe doit contenir au moins 10 caractères.
```

- Le champ et le bouton sont **deux contrôles distincts** posés côte à côte (`display: flex`), séparés par un écart `spacing.sm` ; chacun a sa bordure, son rayon `radius.md` et son anneau de focus. Ce n'est ni un groupe à bordure commune ni une icône superposée au champ.
- Le bouton suit le champ dans le DOM (frère suivant) : atteignable au clavier juste après lui.
- Bouton : variante secondaire de `bouton.md` : fond transparent, bordure `borderWidth` `border`, texte « Afficher » / « Masquer », `size.md` `semibold`, `text` ; hauteur `sizes.control` ; padding horizontal `spacing.md` ; largeur ≥ `sizes.touchTarget`. Pas d'icône œil (texte seul, plus explicite).
- Le champ prend la place restante (`flex: 1`, `min-width: 0`) ; en mobile très étroit (320 px) il garde au moins 180 px.
- **Nom accessible** : « Afficher le mot de passe » / « Masquer le mot de passe » (contient le texte visible, critère 2.5.3). Le libellé change à chaque bascule ; pas d'`aria-pressed` en plus.
- Inscription : l'aide « Ton mot de passe doit contenir au moins 10 caractères. » est affichée dès l'arrivée sur la page. Connexion : pas d'aide.

Pourquoi séparés : chaque contrôle a un contour et un focus qui lui sont propres, sans `:focus-within` ni séparateur à gérer ; l'erreur ne colore que le champ, seul en faute.

## États

| Élément | États |
|---|---|
| Champ | ceux de `champ.md` ; en erreur, la bordure 2 px `danger` entoure **le champ seul** |
| Bouton | survol fond `surfaceHover` ; pressé fond `divider` ; focus anneau `focus` autour du bouton, décalé de 2 px |

La bascule ne déplace pas le focus et ne vide pas la saisie (comportement, pour mémoire). Reporté : remasquer le mot de passe à l'envoi.
