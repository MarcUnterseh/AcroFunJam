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
- Le bandeau global « session expirée » est masqué sur les pages qui disent l'expiration elles-mêmes : « Se connecter », « S'inscrire », « Proposer une pose » (alerte dans le formulaire) et « Propositions à valider » (alerte dans la carte concernée ; au chargement de la file, la session est terminée côté site puis la personne est envoyée vers « Se connecter », pour que cette page ne la renvoie pas aussitôt vers la file). Elles le déclarent par le `handle` de leur route (`routes.tsx`), pour qu'Identity ne connaisse pas les pages des autres contextes ; de même, la ligne de contexte de « Se connecter » vient d'une table fournie par `routes.tsx`.

**Saisie conservée**
- Port `ProposalInputStore` (`load`, `save`, `clear`) dans `core/application`, implémenté par le site sur **`sessionStorage`** plutôt que `localStorage` : la saisie reste propre à l'onglet et disparaît à sa fermeture.
- Elle est **propre à la personne** : enregistrée avec son propriétaire (l'adresse de la session), elle n'est rendue qu'à cette adresse ; sinon, elle est effacée.
- Elle est conservée sur une session expirée, une API injoignable et un site à mettre à jour (refus de code inconnu), et suit chaque frappe tant que l'alerte correspondante est affichée.
- Elle est effacée quand la proposition est reçue et à la déconnexion (appareil partagé), y compris quand la session passe de connectée à visiteur sans notice « expirée » (déconnexion dans un autre onglet). Identity efface ce que les autres contextes lui confient (`ForgottenOnSignOut`, injecté par la *composition root*), sans les connaître. Ce n'est pas une proposition : le mot « brouillon » reste interdit (glossaire).

## Complément du 2026-11-06 : décisions de validation et refus de contenu (story 4)

**Saisie des décisions**
- Port `DecisionInputStore` (`load`, `save`, `clear`), même principe que `ProposalInputStore` sur `sessionStorage` : **une saisie par proposition** (`KeptDecision` : le motif d'un refus, ou les valeurs retenues et le message d'une acceptation avec ajustements), enregistrées ensemble avec leur propriétaire (l'adresse de la session).
- Conservée sur une session expirée, une API injoignable et un site à mettre à jour (`keepsDecisionInput`, exporté par `core/application` et suivi par les apps), et seulement quand une zone de la carte est ouverte : sans saisie, l'alerte ne dit pas « Ta saisie est conservée ».
- Rendue une fois, à son propriétaire, à l'affichage de la file ; une saisie gardée pour une proposition qui n'est plus dans la file (traitée entre-temps) est signalée par une annonce, puis oubliée.
- Effacée pour une proposition quand sa décision est enregistrée (seulement si elle appartient à la même personne), et entièrement à la déconnexion (`ForgottenOnSignOut`).

**Rôle retiré**
- Pour la validation, un 403 (`identity.capability-required`, policy `CanValidate`) se traduit par `role-withdrawn`, **distinct de l'expiration** (Q16) : la personne reste connectée, on lui dit que son rôle a changé et on lui propose de revenir au catalogue, sans lien « Se connecter ».

**Refus d'une règle de contenu**
- Un refus d'une règle de contenu que le site vérifie avant l'envoi (400 `pose.*`, motif ou message trop long, 422 message sans ajustement) prouve que le site est périmé : il est traduit en `outdated` (site à mettre à jour), la saisie est conservée et le rechargement apporte les nouvelles règles. Seuls 401, 403, 404 et 409 avec un code connu sont des refus propres. La story 3 (« Proposer une pose ») suit la même règle : l'ancienne traduction en erreur de champ (`invalid-content`) est supprimée.

## Conséquences
- Implémentation aux étapes B et C (front) ; l'API n'est pas concernée.
