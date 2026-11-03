# Champ mot de passe

Variante du champ de formulaire (`champ.md`) avec un bouton pour afficher ou masquer la saisie.

## Structure

```
Mot de passe
┌─────────────────────────┬──────────────┐
│ ••••••••••••            │ (oeil) Afficher │  <- groupe de 48 px
└─────────────────────────┴──────────────┘
Ton mot de passe doit contenir au moins 10 caractères.                     <- aide (inscription)
(!) Le mot de passe doit contenir au moins 10 caractères.
```

- Le champ et le bouton forment un **groupe** visuel : même hauteur `sizes.control`, bordure commune `border`, rayon `radius.md` aux angles extérieurs, séparateur vertical `borderWidth` `border` entre les deux.
- Le bouton est **hors du champ** dans le DOM (frère suivant), donc atteignable au clavier après le champ ; ce n'est pas une icône superposée.
- Bouton : variante secondaire sans bordure propre, fond `background`, icône œil (`sizes.icon`) + texte visible « Afficher », `size.md` `semibold`, padding horizontal `spacing.md`, largeur ≥ `sizes.touchTarget`.
- Quand la saisie est visible : icône œil barré + « Masquer ».
- **Nom accessible** : « Afficher le mot de passe » / « Masquer le mot de passe » (contient le texte visible, critère 2.5.3). Le libellé change à chaque bascule ; pas de `aria-pressed` en plus, pour éviter une double information.
- En mobile très étroit (< 360 px), le texte « Afficher » reste visible : le champ garde au moins 180 px.
- Inscription : l'aide « Ton mot de passe doit contenir au moins 10 caractères. » est affichée dès l'arrivée sur la page, avant la saisie. Connexion : pas d'aide.

## États

| Élément | États |
|---|---|
| Champ | ceux de `champ.md` ; en erreur, la bordure 2 px `danger` entoure tout le groupe |
| Bouton | survol fond `surfaceHover` ; pressé fond `divider` ; focus anneau `focus` autour du bouton seul (décalé de 2 px, il déborde du groupe, c'est voulu) |
| Groupe au focus du champ | l'anneau `focus` entoure le groupe entier (`:focus-within` sur le conteneur, appliqué seulement quand le champ a le focus) |

La bascule ne déplace pas le focus et ne vide pas la saisie (comportement, pour mémoire).
