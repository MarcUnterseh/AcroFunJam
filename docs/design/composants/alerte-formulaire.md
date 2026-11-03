# Zone d'alerte de formulaire

Bloc en haut du formulaire, sous le `h1` (et l'introduction), qui explique pourquoi un envoi **n'a pas abouti pour une raison globale**, sans lien avec un champ précis : adresse ou mot de passe incorrect, compte verrouillé, adresse déjà utilisée, AcroFunJam injoignable (2b) ; injoignable et session expirée pendant une proposition (story 3). Réutilisée hors formulaire pour l'échec de chargement du catalogue.

**Pas de résumé des erreurs de saisie** (décision de la 2b, mise en œuvre) : un champ vide ou invalide n'apparaît pas ici. Son message est affiché sous le champ (ou sous la `legend` d'un groupe de tuiles) et le focus est placé sur le premier élément en erreur. Les formulaires d'AcroFunJam ont deux à cinq questions : la liste en tête doublerait les messages sans aider à les retrouver.

## Structure

```
┃ (!) L'adresse e-mail ou le mot de passe est incorrect.

┃ (!) AcroFunJam est injoignable pour le moment. Ta saisie est conservée.
┃     [ Réessayer ]

┃ (i) Ta session a expiré. Ta saisie est conservée.
┃     Se connecter
```

Icône, puis un message (`p`) et, si besoin, une action (bouton ou lien) sous le message.

## Variantes

| Variante | Fond | Barre gauche (`sizes.accentBar`) | Icône | Usage |
|---|---|---|---|---|
| **Erreur** | `dangerSurface` | `danger` | erreur, `danger` (5,1:1) | refus, injoignable |
| **Information** | `infoSurface` | `info` | info, `info` (5,5:1) | session expirée pendant une saisie conservée (story 3) |

| Élément | Tokens |
|---|---|
| Conteneur | rayon `radius.md`, padding `spacing.md` (`spacing.lg` à gauche du contenu) ; écart icône–contenu `spacing.sm` |
| Icône | `sizes.icon`, alignée sur la première ligne, `aria-hidden` |
| Message | `size.md`, `regular`, `text` (14,4:1 sur `dangerSurface`, 13,9:1 sur `infoSurface`) |
| Action bouton (« Réessayer ») | bouton secondaire, largeur du contenu, marge haute `spacing.sm` ; bordure `border` 3,1:1 sur `dangerSurface` |
| Action lien (« Se connecter ») | `text` souligné, `weight.semibold` ; pas de `primary` sur une surface colorée ; zone cliquable ≥ 44 px de haut |
| Marge | `spacing.lg` sous la zone, avant le premier champ |

Le message est en `text` (et non en `danger` ou `info`) : lisibilité maximale ; la nature du message est portée par l'icône et la barre.

**Reporté (2b)** : un titre `h2` (« La connexion a échoué ») au-dessus du message. Si on l'ajoute : `size.md`, `weight.bold`, `text`, aligné sur l'icône.

## États

- Absente tant qu'aucun envoi n'a échoué (aucun espace réservé : elle apparaît à l'envoi).
- Mise en œuvre : `role="alert"`, le focus reste où il est (sur le bouton d'envoi). Si le focus y est un jour déplacé (`tabindex="-1"`), anneau `focus` autour du conteneur, décalé de 2 px.
- Un refus identique au précédent est rendu à nouveau, pour être annoncé de nouveau.
- Actions : survol et focus selon `bouton.md` ; lien : survol soulignement 2 px, focus anneau `focus`, rayon `radius.sm`.
