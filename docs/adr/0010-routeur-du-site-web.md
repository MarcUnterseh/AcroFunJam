# 0010. Routeur du site web et pages dédiées

- Statut : accepté
- Date : 2026-11-03

## Contexte
Jusqu'ici le site n'avait qu'une page (le catalogue). La story 2b introduit les pages « Se connecter » et « S'inscrire ». L'UX recommande des pages dédiées plutôt qu'une fenêtre modale : bouton Retour fonctionnel, lien partageable, retour à la page d'origine, focus et clavier virtuel plus simples sur mobile, un titre de document par page.

## Options envisagées
1. **React Router** (mode bibliothèque, `createBrowserRouter`) : standard de fait, routes déclaratives, testable avec `MemoryRouter`.
2. TanStack Router : typage fort des routes, mais un outillage de plus (génération de routes).
3. Routeur maison sur `history` : léger mais à maintenir.

## Décision
Option 1, en mode bibliothèque (sans le mode « framework »/SSR). Les routes vivent dans `apps/web` (présentation) ; `core` et `api-client` n'en dépendent pas. Le retour après connexion passe par un paramètre de requête n'acceptant que des chemins internes (pas de redirection ouverte). Le serveur de développement et l'hébergement doivent renvoyer `index.html` pour toute route du site.

## Conséquences
- L'app mobile garde Expo Router ; les deux routeurs ne partagent que les libellés et les cas d'usage de `core`.
- Les e2e naviguent par les liens et les noms accessibles, jamais par les URL (page objects).
