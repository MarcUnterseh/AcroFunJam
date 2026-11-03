# 0019. Côté site : capacités plutôt que rôle, saisie conservée dans l'onglet

- Statut : accepté
- Date : 2026-11-03
- Complète : [0008](0008-identite-et-roles.md), [0013](0013-expiration-et-onglets.md)

## Contexte
Le formulaire « Proposer une pose » annonce à un validateur ou un administrateur que sa pose sera publiée directement. Une session expirée pendant la saisie ne doit pas faire perdre ce qui a été saisi.

## Décision
**Capacités**
- `/me` reste inchangé (`{ email, role, capabilities }`). Le site raisonne sur la capacité `validate-proposals`, jamais sur le nom du rôle (`publishesDirectly(capabilities)`), comme les policies de l'API (ADR 0008).
- Ce n'est qu'une prédiction d'affichage : la confirmation s'appuie sur le `status` renvoyé par l'API, qui fait foi.
- L'adaptateur `auth-gateway` ignore les codes de capacité inconnus.
- `canPropose(session)` (cœur, Identity) décide de l'accès au formulaire et du lien du catalogue. Une personne connectée sans `propose` est aujourd'hui redirigée vers le catalogue (aucun rôle n'en manque ; la renvoyer vers « Se connecter » bouclerait). Le jour où un tel rôle apparaîtra, elle verra le message « Ton compte ne permet pas de proposer de pose. », et le 403 `identity.capability-required` aura sa propre traduction (aujourd'hui traité comme une session expirée, TODO dans `contribution-gateway.ts`).

**Session**
- Une API injoignable n'est pas une déconnexion : `loadSession` garde la session connue (connectée, ou expirée) quand `/me` ne répond pas.
- Le bandeau global « session expirée » est masqué sur les pages qui disent l'expiration elles-mêmes : « Se connecter », « S'inscrire » et « Proposer une pose » (alerte dans le formulaire). Elles le déclarent par le `handle` de leur route (`routes.tsx`), pour qu'Identity ne connaisse pas les pages des autres contextes ; de même, la ligne de contexte de « Se connecter » vient d'une table fournie par `routes.tsx`.

**Saisie conservée**
- Port `ProposalInputStore` (`load`, `save`, `clear`) dans `core/application`, implémenté par le site sur **`sessionStorage`** plutôt que `localStorage` : la saisie reste propre à l'onglet et disparaît à sa fermeture.
- Elle est **propre à la personne** : enregistrée avec son propriétaire (l'adresse de la session), elle n'est rendue qu'à cette adresse ; sinon, elle est effacée.
- Elle est conservée sur une session expirée, une API injoignable et un site à mettre à jour (refus de code inconnu), et suit chaque frappe tant que l'alerte correspondante est affichée.
- Elle est effacée quand la proposition est reçue et à la déconnexion (appareil partagé), y compris quand la session passe de connectée à visiteur sans notice « expirée » (déconnexion dans un autre onglet). Identity efface ce que les autres contextes lui confient (`ForgottenOnSignOut`, injecté par la *composition root*), sans les connaître. Ce n'est pas une proposition : le mot « brouillon » reste interdit (glossaire).

## Conséquences
- Implémentation aux étapes B et C (front) ; l'API n'est pas concernée.
