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

**Saisie conservée**
- Port `ProposalInputStore` (`load`, `save`, `clear`) dans `core/application`, implémenté par le site sur **`sessionStorage`** plutôt que `localStorage` : la saisie reste propre à l'onglet et disparaît à sa fermeture.
- Elle est effacée quand la proposition est reçue et à la déconnexion (appareil partagé). Ce n'est pas une proposition : le mot « brouillon » reste interdit (glossaire).

## Conséquences
- Implémentation aux étapes B et C (front) ; l'API n'est pas concernée.
