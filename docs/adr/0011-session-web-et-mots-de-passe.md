# 0011. Session du site en cookies et règle de mot de passe

- Statut : accepté
- Date : 2026-11-03
- Complète : [0008](0008-identite-et-roles.md)

## Contexte
Le site doit conserver la session entre les rechargements, la renouveler sans intervention et la partager entre onglets. Sur mobile, les navigateurs ferment souvent les onglets en arrière-plan. Les jetons porteurs d'ASP.NET Identity conviennent à l'app mobile, mais les stocker côté navigateur les expose au JavaScript (XSS).

## Options envisagées
1. Jeton d'accès en mémoire + jeton de rafraîchissement en `sessionStorage` : pas de changement d'API, mais session perdue à la fermeture de l'onglet et non partagée entre onglets.
2. Jetons en `localStorage` : session durable, mais jetons lisibles par tout script injecté.
3. **Cookies d'authentification d'ASP.NET Identity** (`/identity/login?useCookies=true`) : HttpOnly, `Secure`, `SameSite=Strict`, renouvellement glissant par le serveur, partagés entre onglets.

## Décision
- **Site web : option 3.** Le site et l'API sont servis depuis la même origine (proxy Vite en développement, même domaine en production), d'où `SameSite=Strict`, qui protège contre la falsification de requêtes intersites sans jeton CSRF supplémentaire tant qu'aucune page d'un autre site n'est de la même origine. Pas de case « rester connecté ». La déconnexion appelle un endpoint qui supprime le cookie.
- **App mobile : jetons porteurs** (inchangé), stockés dans le stockage sécurisé du téléphone (story 2e).
- L'Api accepte les deux schémas (cookie et porteur) ; les policies par capacité s'appliquent à l'un comme à l'autre.
- **Règle de mot de passe** : au moins **10 caractères**, sans exigence de composition (`RequireDigit`, `RequireLowercase`, `RequireUppercase`, `RequireNonAlphanumeric` désactivés), conformément aux recommandations actuelles (NIST SP 800-63B) qui privilégient la longueur et les phrases de passe. La même règle est exposée au front par `@acrofunjam/core` pour la vérification avant envoi ; l'API reste la source de vérité.
- **Verrouillage** après plusieurs échecs de connexion : réglages par défaut d'ASP.NET Identity conservés, avec un message dédié côté site.

## Précisions (modélisation de la story 2b, 2026-11-03)
- Cookie `__Host-afj-session` : HttpOnly, `Secure` toujours, `SameSite=Strict`, **persistant 14 jours avec expiration glissante** (renouvelé à mi-vie). Les réponses non authentifiées sont des **401/403**, jamais des redirections (événements `OnRedirectToLogin` / `OnRedirectToAccessDenied` surchargés).
- Le site appelle l’API sur la même origine : `credentials: 'same-origin'` (défaut de fetch), plus strict que `include`.
- **Déconnexion** : `POST /identity/logout`, anonyme, idempotent, répond toujours 204.
- **Règle d’adresse e-mail côté site** : la même que l’API (`EmailAddressAttribute` : un seul « @ », ni au début ni à la fin), jamais plus stricte.
- **Verrouillage** : réglages fixés explicitement (5 échecs, 5 minutes) pour qu’une mise à jour de la bibliothèque ne les change pas. Son message révèle qu’un compte existe : risque **accepté**, car l’inscription le révèle déjà (« adresse déjà utilisée ») ; un refus générique laisserait la personne verrouillée sans explication.

## Conséquences
- Le front n'a jamais accès au jeton : les requêtes partent avec les cookies de la même origine (`credentials: 'same-origin'`, défaut de fetch).
- Un futur domaine séparé pour l'API remettrait en cause `SameSite=Strict` et imposerait un jeton anti-CSRF.
- La règle de mot de passe est dupliquée (API `AccountRules`, `core` `passwordPolicy`, faux des e2e) et n'est vérifiée que par convention : un scénario `@api` et un scénario `@web` portent chacun sur 10 caractères. Exposer la valeur dans l'OpenAPI permettrait de vérifier leur cohérence automatiquement.
