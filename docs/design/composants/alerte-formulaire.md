# Zone d'alerte de formulaire

Bloc en haut du formulaire, sous le `h1`, qui résume pourquoi l'envoi a échoué. Deux contenus :

- **erreurs de saisie** (champs vides, adresse mal formée, mot de passe trop court) : un titre et la liste des erreurs, chacune en lien vers son champ ; les mêmes messages figurent sous les champs ;
- **refus global** (adresse ou mot de passe incorrect, compte verrouillé, adresse déjà utilisée, API injoignable) : un titre et une phrase, sans liste.

## Structure

```
┃ (!) La connexion a échoué
┃     L'adresse e-mail ou le mot de passe est incorrect.

┃ (!) Le formulaire contient 2 erreurs
┃     • Adresse e-mail : saisis une adresse e-mail valide.
┃     • Mot de passe : saisis ton mot de passe.
```

| Élément | Tokens |
|---|---|
| Conteneur | fond `dangerSurface`, barre gauche `sizes.accentBar` (4 px) `danger`, rayon `radius.md`, padding `spacing.md` (`spacing.lg` à gauche du texte, après l'icône) |
| Icône erreur | `sizes.icon`, `danger`, alignée sur le titre, `aria-hidden` |
| Titre | `size.md`, `weight.bold`, `text` ; élément `h2` (un `h1` par page) |
| Texte / liste | `size.md`, `regular`, `text` ; puces, écart `spacing.xs` entre items |
| Liens vers les champs | `text` souligné (14,4:1 sur `dangerSurface`) ; pas de `primary` sur ce fond, pour ne pas mêler primaire et danger |
| Marge | `spacing.lg` sous la zone, avant le premier champ |

Le titre et le texte sont en `text` (et non en `danger`) : lisibilité maximale, la gravité est portée par l'icône, la barre et le titre.

## États

- Absente tant qu'aucun envoi n'a échoué (aucun espace réservé : elle apparaît à l'envoi, le décalage est attendu et le focus y est placé).
- Reçoit le focus programmatique (`tabindex="-1"`) : anneau `focus` visible autour du conteneur, décalé de 2 px.
- Liens : survol soulignement 2 px ; focus anneau `focus`, rayon `radius.sm`.

Rôle ARIA et gestion du focus : décision `ux-expert` (recommandation : focus déplacé sur la zone à l'envoi, sans `role="alert"` en plus pour éviter la double annonce).
