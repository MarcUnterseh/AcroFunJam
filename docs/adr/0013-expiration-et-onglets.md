# 0013. Détection de l'expiration de session et synchronisation entre onglets

- Statut : accepté
- Date : 2026-11-03

## Contexte
Avec des cookies HttpOnly (ADR 0011), le site ne voit pas la session : au chargement, `GET /me` répond 401 aussi bien pour « jamais connecté » que pour « session expirée ». Or la story 2b distingue les deux (bandeau « Ta session a expiré »), et une déconnexion dans un onglet doit faire revenir les autres au statut de visiteur, **sans** bandeau d'expiration.

## Options envisagées
1. Relancer `/me` au focus de la fenêtre : ne distingue pas « expirée » de « déconnectée ailleurs ».
2. `BroadcastChannel` : synchronise les onglets ouverts, mais ne survit pas à un rechargement.
3. **Un indice non secret dans `localStorage`** (« une session a existé dans ce navigateur ») + l'événement `storage`.

## Décision
Option 3, via un port `SessionMemory` de `@acrofunjam/core` (`wasSignedIn`, `remember`, `forget`, `onChange`) implémenté par le site sur `localStorage`. L'indice ne contient ni jeton ni adresse. Règle : `/me` en 401 **avec** indice ⇒ session expirée (bandeau), puis l'indice est oublié ; **sans** indice ⇒ visiteur. Une déconnexion oublie l'indice, ce que les autres onglets reçoivent par l'événement `storage` : ils relisent la session et redeviennent visiteurs sans bandeau.

## Conséquences
- L'indice peut être absent (navigation privée, stockage bloqué) : on perd seulement le bandeau d'expiration, jamais la sécurité.
- Les e2e utilisent `context.route` pour que plusieurs onglets partagent l'API simulée, les cookies et le stockage (complément de l'ADR 0006).
