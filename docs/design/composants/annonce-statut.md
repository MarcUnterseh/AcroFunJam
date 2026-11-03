# Annonce de statut

Région vivante (`role="status"`, `aria-live="polite"`) présente dès le chargement de l'application, **invisible à l'écran**, qui annonce aux lecteurs d'écran les changements sans déplacement du focus :

- « Connexion réussie avec l'adresse alice@example.org. » (après connexion ou inscription) ;
- « Déconnexion effectuée. » ;
- « Ta session a expiré. Reconnecte-toi. » (en même temps que le bandeau).

Textes définitifs : `ux-expert` (accord en genre : voir les questions).

## Rendu

Classe utilitaire « masqué visuellement » (et non `display: none`, qui la retirerait de l'arbre d'accessibilité) :

```css
.visually-hidden {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; border: 0;
}
```

Aucun token : c'est la seule exception, structurelle, aux valeurs issues de `ui-tokens`.

Le retour visuel équivalent est porté par l'en-tête (passage de l'état visiteur à l'état connecté) et par le bandeau d'information ; pas de toast en 2b.

## Mobile

`AccessibilityInfo.announceForAccessibility(...)`, mêmes textes.
