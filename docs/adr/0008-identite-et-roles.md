# 0008. Identité : comptes ASP.NET Core Identity et rôles cumulatifs

- Statut : accepté
- Date : 2026-11-02

## Contexte
Quatre profils sont définis (`docs/domain/decouverte.md`, « Rôles ») : visiteur (non authentifié, consultation seule), utilisateur (propose), validateur (valide les propositions), administrateur (tous les droits, attribue les rôles). Le site web et l'application mobile doivent s'authentifier auprès de la même API. L'identité est un sous-domaine **générique** : on ne la code pas, on intègre une solution existante.

## Options envisagées
1. **ASP.NET Core Identity dans l'API** (`AddIdentityApiEndpoints`, `MapIdentityApi`) : inscription, connexion, jetons porteurs (bearer) et rafraîchissement, rôles stockés dans PostgreSQL via EF Core. Aucun service externe ; convient au web et au mobile. Inconvénients : connexion sociale, réinitialisation de mot de passe par e-mail et MFA à brancher soi-même.
2. **Fournisseur OIDC externe** (Auth0, Entra ID, Keycloak) : fonctionnalités complètes, mais un service et un compte de plus, une configuration par environnement et des tests d'acceptation plus lourds.
3. **Jeton statique de validateur** : trop pauvre dès que des utilisateurs proposent du contenu.

## Décision
Option 1.
- Les comptes et les rôles vivent dans un contexte **Identity** implémenté dans l'Infrastructure (tables dans un schéma `identity`) et exposé par l'Api. Le domaine et l'application des autres contextes ne voient que des identifiants typés (`UserId`, `ContributorId`, `ValidatorId`) et des rôles, jamais les types ASP.NET Identity (relation *conformist*, cf. context map).
- Rôles **cumulatifs** : `User` ⊂ `Validator` ⊂ `Administrator`. Les autorisations de l'Api sont des *policies* nommées par capacité (ex. `CanPropose`, `CanValidate`, `CanManageRoles`), pas des tests de rôle dispersés.
- **Un seul rôle ordonné par compte** (`User` < `Validator` < `Administrator`) ; les capacités en découlent.
- **Stockage** : une colonne `role` sur le compte (`ApplicationUser : IdentityUser<Guid>`, contexte `IdentityUserContext<ApplicationUser, Guid>`), sans les tables de rôles d’Identity (qui autorisent plusieurs rôles par compte). Les règles de rôle sont portées par l’agrégat `Account` du domaine, reconstitué par un repository d’Infrastructure.
- **Concurrence** : les changements de rôle s’exécutent dans une transaction `Serializable` PostgreSQL ; un conflit (dernier administrateur rétrogradé deux fois en parallèle) renvoie 409 `identity.concurrent-role-change`.
- **Effet immédiat** d’un changement de rôle : l’Api relit le rôle courant du compte chaque fois qu’une capacité est exigée (handler d’autorisation des policies), au lieu de se fier au rôle figé dans le jeton jusqu’à son renouvellement.
- Ce que propose un validateur ou un administrateur est publié sans validation (règle métier de Contribution, pas de l'Identité).
- Le **premier administrateur** est désigné par configuration (`Identity:InitialAdministratorEmail`) et promu **au démarrage uniquement**, tant qu’aucun administrateur n’existe ; aucun secret ni compte dans le dépôt. La promotion à l’inscription a été retirée après revue : sans confirmation d’e-mail, quiconque s’inscrirait avec l’adresse désignée (souvent publique) deviendrait administrateur. Procédure : la personne désignée s’inscrit, vérifie qu’elle se connecte, puis l’API est redéployée ; une usurpation se voit avant la promotion (son inscription serait refusée).
- D'abord l'API seule ; les écrans de connexion du site et du mobile viennent avec la story « Proposer une pose ».

## Conséquences
- Remplacer plus tard par un fournisseur OIDC ne touchera que l'Infrastructure et la configuration de l'Api.
- Les specs `@api` s'authentifient via les vrais endpoints d'Identity (inscription et connexion) dans `WebApplicationFactory`, ou via un schéma d'authentification de test explicitement documenté.
- À faire avec l’envoi d’e-mails : n’amorcer qu’un compte dont l’adresse est confirmée (`EmailConfirmed`).
- À surveiller : réinitialisation du mot de passe et confirmation d'e-mail (nécessitent un adaptateur d'envoi d'e-mails), suppression de compte (RGPD).
