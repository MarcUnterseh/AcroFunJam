# Glossaire : langage omniprésent

Source de vérité du vocabulaire métier. Tout terme utilisé dans les scénarios Gherkin, le code (traduit en anglais) et l'UI doit y figurer.

Contextes : **Catalogue** (`Catalog`), **Contribution** (`Contribution`), **Répertoire** (`Repertoire`), **Génération de flow** (`FlowGeneration`), **Identité** (`Identity`). Voir `context-map.md`. Décisions de découverte : `decouverte.md`.

## Graphe des poses et transitions

| Terme (FR) | Identifiant code (EN) | Contexte | Définition | Synonymes interdits |
|---|---|---|---|---|
| Catalogue | `Catalog` | Catalogue | Ensemble des poses, transitions et étiquettes **publiées**, consultable par tous. Il forme un graphe orienté : les poses en sont les nœuds, les transitions les arêtes. | base de données, bibliothèque |
| Élément (du catalogue) | `CatalogItem` (terme générique, pas un type d'agrégat) | Catalogue, Contribution | Désigne indifféremment une pose ou une transition, par exemple dans « proposer une modification d'un élément ». | figure, posture |
| Pose | `Pose` | Catalogue, Génération de flow | Position **tenable** à deux (base et flyer) : Throne, Bird, Star, Folded Leaf… Une position de passage non tenable n'est pas une pose ; elle est décrite dans la transition qui la traverse. | figure, posture, position (seule), asana |
| Variante | (pas de type : c'est une `Pose`) | Catalogue | Pose qui ressemble à une autre mais en diffère par la prise, le placement de la base (L-basing, standing…), etc. Une variante **est une pose distincte** avec ses propres transitions (ex. Bird et High Bird). Lien éventuel vers une pose « principale » : non tranché. | sous-figure, déclinaison |
| Nom (de pose) | `PoseName` | Catalogue | Nom usuel de la pose dans la communauté (ex. « Folded Leaf »). | titre |
| Description | `Description` | Catalogue | Texte libre qui explique une pose ou une transition (placement, prises, passages non tenables pour une transition). | |
| Peut commencer un flow | `CanStartFlow` | Catalogue, Génération de flow | Indicateur d'une pose : un flow peut démarrer sur cette pose. | pose d'entrée, montée |
| Peut terminer un flow | `CanEndFlow` | Catalogue, Génération de flow | Indicateur d'une pose : un flow peut s'achever sur cette pose. | pose de sortie, descente |
| Transition | `Transition` | Catalogue, Génération de flow | Lien **orienté** qui permet de passer d'une pose de départ à une pose d'arrivée. Le sens inverse est une autre transition, à déclarer explicitement. Plusieurs transitions peuvent relier les mêmes poses dans le même sens (ex. de Throne à Bird : classique débutant, icarienne, en pop, « forbidden »). | passage, mouvement, enchaînement (réservé au flow) |
| Pose de départ | `FromPose` / `FromPoseId` | Catalogue, Génération de flow | Pose où commence une transition. | origine, source |
| Pose d'arrivée | `ToPose` / `ToPoseId` | Catalogue, Génération de flow | Pose où se termine une transition. | destination, cible |
| Washing machine | (pas de type : c'est une `Transition` dont `FromPose == ToPose`) | Catalogue | Terme d'usage de la communauté pour une transition qui revient sur sa pose de départ (ex. Ninja Star : Star → Star). Ce n'est pas un concept du modèle. | boucle (en dehors des discussions techniques) |
| Étiquette | `Tag` | Catalogue, Génération de flow | Qualificatif d'une transition (classique, icarien, whip, pop, lunaire…). Une transition peut en porter plusieurs. Les valeurs proviennent d'une liste fermée gérée par les validateurs. Sert de critère de génération. | catégorie, type, tag (en français) |
| Liste des étiquettes | `TagList` / `Tags` | Catalogue | Liste fermée des étiquettes autorisées, administrée par les validateurs. | référentiel des catégories |
| Photo | `Photo` | Catalogue, Contribution | Image illustrant une pose ou une transition. Un élément peut en avoir plusieurs. | image, illustration, média |

## Difficulté et rôles

| Terme (FR) | Identifiant code (EN) | Contexte | Définition | Synonymes interdits |
|---|---|---|---|---|
| Base | `Base` (rôle) | Tous | Pratiquant qui porte le flyer, généralement allongé au sol. | porteur, socle |
| Flyer | `Flyer` (rôle) | Tous | Pratiquant porté par la base. | voltigeur, volant |
| Spotter | `Spotter` | (hors modèle) | Personne qui assure la sécurité. Le modèle ne porte **aucune** information de spotting ou de risque ; seul l'avertissement de responsabilité en parle. | pareur, assureur |
| Niveau de difficulté | `DifficultyLevel` | Catalogue, Génération de flow | Échelle ordonnée : **découverte** (`Discovery`) < **débutant** (`Beginner`) < **intermédiaire** (`Intermediate`) < **avancé** (`Advanced`). | note, cotation, grade |
| Difficulté base | `BaseDifficulty` | Catalogue, Génération de flow | Niveau de difficulté d'une pose ou d'une transition pour la base. | |
| Difficulté flyer | `FlyerDifficulty` | Catalogue, Génération de flow | Niveau de difficulté d'une pose ou d'une transition pour le flyer. | |
| Difficulté | `Difficulty` (value object : difficulté base + difficulté flyer) | Catalogue, Génération de flow | Couple (difficulté base, difficulté flyer) porté par chaque pose et chaque transition. Jamais un niveau unique. | niveau (seul) |
| Avertissement de responsabilité | `Disclaimer` | (présentation) | Message général : chacun évalue ce qu'il est capable de faire et s'il a besoin d'un spotter. Emplacement non tranché. | mention de sécurité |

## Génération de flow

| Terme (FR) | Identifiant code (EN) | Contexte | Définition | Synonymes interdits |
|---|---|---|---|---|
| Flow | `Flow` | Génération de flow | Enchaînement **exécutable** : chemin dans le graphe qui part d'une pose « peut commencer », alterne pose → transition → pose et finit sur une pose « peut terminer ». | séquence, routine, chorégraphie, figure |
| Étape (de flow) | `FlowStep` | Génération de flow | Une transition du flow avec ses poses de départ et d'arrivée. | |
| Générateur de flow | `FlowGenerator` | Génération de flow | Service qui tire au hasard un flow satisfaisant les critères de génération. | randomiseur |
| Critères de génération | `FlowCriteria` | Génération de flow | Paramètres choisis par l'utilisateur : difficulté, longueur, étiquettes et, en option, un duo dont le répertoire restreint les éléments utilisables. | filtres, options |
| Longueur (de flow) | `FlowLength` | Génération de flow | Taille du flow demandée. Unité (nombre de transitions ou de poses) non tranchée. | durée |
| Critères trop restrictifs | `FlowGenerationErrors.CriteriaTooRestrictive` | Génération de flow | Résultat explicite quand aucun chemin du graphe ne satisfait les critères : « critères trop restrictifs, impossible de générer un flow ». | erreur, aucun résultat |

## Répertoire du pratiquant

| Terme (FR) | Identifiant code (EN) | Contexte | Définition | Synonymes interdits |
|---|---|---|---|---|
| Pratiquant | `Practitioner` / `PractitionerId` | Répertoire, Génération de flow | Utilisateur considéré en tant que personne qui pratique l'acroyoga, avec son répertoire. | membre, acrobate, joueur |
| Répertoire | `Repertoire` | Répertoire | Ensemble des poses et transitions qu'un pratiquant déclare maîtriser. | progression, favoris, collection |
| Maîtrise | `Mastery` | Répertoire, Génération de flow | Déclaration par un pratiquant qu'il sait exécuter une pose ou une transition. C'est une **auto-déclaration**, pas une certification. Savoir si elle se déclare par rôle (base ou flyer) n'est pas tranché. | compétence, acquis, validation (réservé à la contribution) |
| Déclarer maîtriser / retirer une maîtrise | `DeclareMastery` / `WithdrawMastery` → `MasteryDeclared` / `MasteryWithdrawn` | Répertoire | Cocher ou décocher un élément du catalogue dans son répertoire. | cocher (terme d'UI seulement), valider |
| Duo | `Duo` | Génération de flow | Couple de pratiquants pour lequel on génère un flow : l'un en base, l'autre en flyer. Composition (deux comptes ou un compte et un profil saisi) non tranchée. | binôme, paire, partenaires |
| Flow pour un duo | `FlowCriteria` avec restriction `Duo` | Génération de flow | Génération restreinte aux éléments maîtrisés par le duo. La règle exacte (maîtrisés par les deux, ou chacun dans son rôle) n'est pas tranchée. | flow personnalisé |

## Identité et rôles

Rôles décidés le 2026-11-02. Un rôle s’ajoute au précédent : un validateur est aussi un utilisateur, un administrateur peut tout faire.

| Terme (FR) | Identifiant code (EN) | Contexte | Définition | Synonymes interdits |
|---|---|---|---|---|
| Visiteur | `Visitor` | Tous | Personne non authentifiée : elle consulte uniquement le catalogue. | invité, anonyme |
| Utilisateur | `User` (rôle) / `UserId` | Identité, Contribution | Personne authentifiée : elle peut proposer des poses ou des modifications. | membre, compte (pour la personne) |
| Validateur | `Validator` (rôle) / `ValidatorId` | Identité, Contribution | Utilisateur qui peut aussi accepter ou refuser les propositions, et gérer la liste des étiquettes. | modérateur |
| Administrateur | `Administrator` (rôle) | Identité, tous | Utilisateur qui peut tout faire et attribue les rôles aux autres utilisateurs. | admin (dans les documents), superviseur |
| Rôle | `Role` | Identité | Habilitation attribuée à un utilisateur : utilisateur, validateur, administrateur. | droit, permission (seul) |
| Compte | `Account` (côté Infrastructure : utilisateur ASP.NET Core Identity) | Identité | Moyen d'authentification d'une personne, identifié par son adresse e-mail (unique). La personne titulaire d'un compte est un utilisateur. | profil, login |
| S'inscrire | `Register` | Identité | Créer un compte avec une adresse e-mail et un mot de passe. Le compte obtient le rôle utilisateur. | créer un utilisateur, s'enregistrer |
| Se connecter | `LogIn` | Identité | S'authentifier avec l'adresse e-mail et le mot de passe de son compte ; la personne cesse d'être un visiteur. | s'identifier, login |
| Capacité | `Capability` (policies `CanPropose`, `CanValidate`, `CanManageRoles`) | Identité, tous | Ce qu'un rôle permet de faire : **proposer**, **accepter ou refuser une proposition**, **gérer les rôles**. Les capacités d'un rôle s'ajoutent à celles du rôle précédent. | droit, permission (seul) |
| Attribuer / retirer un rôle | `AssignRole` / `RevokeRole` → `RoleAssigned` / `RoleRevoked` | Identité | Action d'un administrateur qui donne ou enlève le rôle validateur ou administrateur à un autre utilisateur. Le rôle utilisateur ne s'attribue ni ne se retire. | promouvoir (usage oral seulement), nommer |
| Premier administrateur | `InitialAdministrator` (configuration : adresse e-mail) | Identité | Personne désignée par son adresse e-mail dans la configuration du déploiement, promue administrateur pour amorcer les rôles. Jamais en dur dans le code. | super-admin, root |
| Adresse e-mail | `EmailAddress` | Identité | Adresse qui identifie un compte. Deux adresses qui ne diffèrent que par la casse désignent le même compte. | login, identifiant (pour l'adresse) |
| Rétrograder | (pas de type : `AssignRole` vers un rôle inférieur) | Identité | Attribuer à un administrateur le rôle validateur. Ce n'est pas un retrait : retirer un rôle ramène toujours au rôle utilisateur. | dégrader, déclasser |
| Amorçage des rôles | `BootstrapInitialAdministrator` | Identité | Promotion du premier administrateur, au démarrage ou à son inscription, tant qu'aucun administrateur n'existe. Sans effet dès qu'un administrateur existe. | initialisation, setup |
| Mon compte | `GetMyAccount` (`GET /me`) | Identité | Ce qu'un utilisateur connecté voit de son compte : son adresse e-mail, son rôle et ses capacités. | profil |
| Codes des capacités | `propose`, `validate-proposals`, `manage-roles` | Identité (langage publié) | Codes stables exposés par l'API pour « proposer », « accepter ou refuser une proposition » et « gérer les rôles ». Les libellés français sont produits côté front. | |

## Contribution et validation

| Terme (FR) | Identifiant code (EN) | Contexte | Définition | Synonymes interdits |
|---|---|---|---|---|
| Proposition | `Proposal` | Contribution | Demande soumise par un contributeur : ajout d'une pose ou d'une transition, modification d'un élément, ou ajout de photos. Rien n'est publié avant validation. | suggestion, ticket, demande de modification (seule) |
| Contribution | `Contribution` (nom du contexte) | Contribution | Activité de proposer du contenu au catalogue. Désigne le processus, pas l'objet (l'objet est une proposition). | |
| Contributeur | `Contributor` / `ContributorId` | Contribution | Utilisateur qui soumet une proposition (l’utilisateur dans le rôle d’auteur de la proposition). | auteur, rédacteur |
| Accepter (une proposition) | `Accept` → événement `ProposalAccepted` | Contribution | Décision d'un validateur qui entraîne la publication du contenu proposé dans le catalogue. | approuver, valider (verbe ambigu) |
| Refuser (une proposition) | `Reject` → événement `ProposalRejected` | Contribution | Décision d'un validateur de ne pas publier le contenu proposé. | décliner, supprimer |
| Publier | `Publish` → événements `PosePublished`, `TransitionPublished`… | Catalogue | Rendre visible dans le catalogue un contenu accepté, ou un contenu saisi directement par un validateur tant que la contribution n'existe pas. Une publication refusée par le catalogue (nom en doublon, information manquante…) ne publie rien. | mettre en ligne, valider |
