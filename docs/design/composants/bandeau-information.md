# Bandeau d'information

Message discret, non bloquant, sous l'en-tête et au-dessus du `h1`. Usage en 2b : **session expirée**. La personne reste sur sa page.

## Structure

```
┃ (i) Ta session a expiré. Se connecter                  [x]
```

Texte proposé : « Ta session a expiré. » + lien « Se connecter » (le lien ramène ensuite à la page en cours). Ton : voir les questions de `principes.md`.

| Élément | Tokens |
|---|---|
| Conteneur | fond `infoSurface`, barre gauche `sizes.accentBar` `info`, rayon `radius.md`, padding vertical `spacing.sm`, horizontal `spacing.md` ; largeur de la colonne de contenu (`sizes.contentMaxWidth`), marge `spacing.md` autour en mobile |
| Icône info | `sizes.icon`, `info`, `aria-hidden` |
| Texte | `size.md`, `regular`, `text` |
| Lien « Se connecter » | `text` souligné, `weight.semibold` (pas de primaire sur fond coloré) ; zone cliquable ≥ 44 px de haut |
| Bouton « Fermer » | icône croix + texte masqué visuellement « Fermer le message », carré `sizes.touchTarget` (44), fond transparent, survol `surfaceHover`, focus anneau `focus` |

Disposition : icône, texte et lien en flux (le lien suit la phrase et passe à la ligne si besoin), bouton Fermer aligné en haut à droite.

## États

- Apparaît une seule fois après la détection de l'expiration ; pas d'animation d'entrée.
- Disparaît à la fermeture ou à la connexion.
- Ne repose pas sur la couleur : icône « i » + texte explicite.

L'annonce aux lecteurs d'écran passe par l'annonce de statut (`annonce-statut.md`), pas par un déplacement du focus.
