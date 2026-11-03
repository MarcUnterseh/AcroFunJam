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
| Nom (de pose) | `PoseName` (noyau partagé Catalogue / Contribution) | Catalogue, Contribution | Nom usuel de la pose dans la communauté (ex. « Folded Leaf »). Il est conservé tel que saisi, sans les espaces superflus (début, fin, espaces consécutifs), et compte au plus 60 caractères. Il est **unique** parmi les poses du catalogue et les propositions en attente de validation, au sens de sa **clé de comparaison**. Alias et synonymes : hors périmètre. | titre |
| Clé de comparaison (du nom) | `PoseNameKey` (noyau partagé) | Catalogue, Contribution | Forme du nom qui sert à l'unicité et à l'ordre alphabétique du catalogue : sans tenir compte de la casse ni des accents, tout caractère qui n'est ni une lettre ni un chiffre (trait d'union, apostrophe, parenthèses, mais aussi `&`, `+`, `/`…) comptant comme un espace, espaces superflus retirés. Un nom dont la clé est vide (uniquement de la ponctuation) est irrecevable, comme un nom absent. « Etoile » = « Étoile », « high-bird » = « High Bird », « Hand-to-Hand (L-base) » = « hand to hand l base ». Deux noms de même clé sont classés selon leur orthographe exacte. Jamais affichée. | nom normalisé, slug |
| Description | `Description` | Catalogue | Texte libre qui explique une pose ou une transition (placement, prises, passages non tenables pour une transition). | |
| Indicateurs de flow | `FlowBoundaries` (noyau partagé : `CanStartFlow` + `CanEndFlow`) | Catalogue, Contribution, Génération de flow | Couple des deux indicateurs obligatoires d'une pose : peut commencer un flow, peut terminer un flow. Une pose peut n'avoir aucun des deux. | pose d'entrée / de sortie |
| Peut commencer un flow | `CanStartFlow` | Catalogue, Contribution, Génération de flow | Indicateur obligatoire d'une pose, sans valeur par défaut : le duo s'installe dans cette pose **directement depuis le sol**. Un flow peut démarrer sur cette pose. | pose d'entrée ; « montée » est toléré dans les textes d'aide uniquement |
| Peut terminer un flow | `CanEndFlow` | Catalogue, Contribution, Génération de flow | Indicateur obligatoire d'une pose, sans valeur par défaut : le flyer **redescend au sol directement et sans danger** depuis cette pose. Un flow peut s'achever sur cette pose. | pose de sortie ; « descente » est toléré dans les textes d'aide uniquement |
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
| Niveau de difficulté | `DifficultyLevel` (noyau partagé ; codes `discovery`, `beginner`, `intermediate`, `advanced`) | Catalogue, Contribution, Génération de flow | Échelle ordonnée : **découverte** (`Discovery`) < **débutant** (`Beginner`) < **intermédiaire** (`Intermediate`) < **avancé** (`Advanced`). | note, cotation, grade |
| Difficulté base | `BaseDifficulty` | Catalogue, Génération de flow | Niveau de difficulté d'une pose ou d'une transition pour la base. | |
| Difficulté flyer | `FlyerDifficulty` | Catalogue, Génération de flow | Niveau de difficulté d'une pose ou d'une transition pour le flyer. | |
| Difficulté | `Difficulty` (value object du noyau partagé : difficulté base + difficulté flyer) | Catalogue, Contribution, Génération de flow | Couple (difficulté base, difficulté flyer) porté par chaque pose et chaque transition. Jamais un niveau unique. | niveau (seul) |
| Avertissement de responsabilité | `Disclaimer` | (présentation) | Message général : chacun évalue ce qu'il est capable de faire et s'il a besoin d'un spotter. Il figure sur le catalogue, sous la légende de l'échelle de difficulté (2026-11-03) ; ses autres emplacements ne sont pas tranchés. | mention de sécurité |

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
| Compte supprimé | `identity.account-deleted` (refus 401), `contribution.unknown-contributor` | Identité, Contribution | Compte qui n'existe plus alors que la session de la personne est encore valide. Toute action réservée à un rôle est refusée comme pour une session expirée : la personne doit se reconnecter. | compte désactivé |
| Compte | `Account` (côté Infrastructure : utilisateur ASP.NET Core Identity) | Identité | Moyen d'authentification d'une personne, identifié par son adresse e-mail (unique). La personne titulaire d'un compte est un utilisateur. | profil, login |
| S'inscrire | `Register` | Identité | Créer un compte avec une adresse e-mail et un mot de passe. Le compte obtient le rôle utilisateur. | créer un utilisateur, s'enregistrer |
| Se connecter | `LogIn` | Identité | S'authentifier avec l'adresse e-mail et le mot de passe de son compte ; la personne cesse d'être un visiteur. | s'identifier, login |
| Se déconnecter | `LogOut` | Identité (présentation) | Mettre fin à sa session sur le site ou l'application ; la personne redevient un visiteur. | se délogger, logout |
| Session | `Session` (site : cookies sécurisés gérés par l'API ; mobile : jetons ; jamais nommés dans les scénarios) | Identité (présentation) | Période pendant laquelle une personne reste connectée sur un appareil sans redonner son mot de passe. Elle est **renouvelée** sans intervention de la personne tant qu'elle n'a pas **expiré** ; une session expirée fait redevenir visiteur. Sur le site, une déconnexion vaut pour tous les onglets ; pas de « rester connecté ». | jeton, token, connexion (pour la durée) |
| Mot de passe | `Password` | Identité | Secret choisi à l'inscription : **au moins 10 caractères**, sans exigence de composition (une phrase de passe est acceptée). | code, PIN |
| Verrouillage | `Lockout` | Identité | Blocage temporaire des connexions à un compte après 5 tentatives échouées (5 minutes, réglages par défaut d'ASP.NET Core Identity), même avec le bon mot de passe. | blocage, bannissement, suspension (réservé à une future story) |
| En-tête | (présentation) | Présentation | Zone du site qui indique à tout moment si la personne est un visiteur (propose de se connecter et de s'inscrire) ou connectée (son adresse e-mail et « Se déconnecter »). | bandeau (réservé aux messages), header |
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
| Proposition | `Proposal` | Contribution | Demande soumise par un contributeur : ajout d'une pose ou d'une transition, modification d'un élément, ou ajout de photos. Celle d'un utilisateur reste **en attente de validation** et rien n'est publié avant son acceptation ; celle d'un validateur ou d'un administrateur est **publiée directement**. | suggestion, ticket, demande de modification (seule) |
| Proposition de pose | `PoseProposal` (agrégat) / `PoseProposalId` | Contribution | Proposition d'ajout d'une pose. Elle porte la pose proposée, son contributeur, sa date de soumission et son statut. Chaque type de proposition (transition, modification, photos) sera un agrégat distinct. | |
| Pose proposée | `ProposedPose` (value object : nom, difficulté, indicateurs de flow) | Contribution | Contenu d'une proposition de pose, tel qu'il sera publié s'il est accepté. | brouillon |
| Statut (d'une proposition) | `ProposalStatus` : `Pending`, `Accepted` (puis `Rejected`) ; codes `pending`, `accepted` | Contribution | En attente de validation, acceptée, puis refusée (story « Valider une proposition »). | état, étape |
| Proposer (une pose) | `ProposePose` → événement `PoseProposed` | Contribution | Soumettre une nouvelle pose (nom, difficulté base, difficulté flyer, indicateurs de début et de fin de flow). Réservé aux personnes connectées. | suggérer, soumettre (seul), créer une pose |
| En attente de validation | `Pending` (statut d'une `PoseProposal`) | Contribution | État d'une proposition recevable d'un utilisateur, ni acceptée ni refusée. Son contenu n'apparaît pas dans le catalogue, pas même pour son contributeur. | soumise, en cours, brouillon, en modération |
| Publication directe | (pas de type : une `PoseProposal` acceptée aussitôt, événements `PoseProposed` puis `PoseProposalAccepted`) | Contribution → Catalogue | Une pose proposée par un validateur ou un administrateur est publiée dans le catalogue sans passer par l'attente de validation. Elle crée une proposition acceptée aussitôt (traçabilité), dans la même transaction que la publication. | auto-validation, bypass |
| Irrecevable (proposition) | (pas de type : erreur `Result` de la soumission) | Contribution | Proposition qui ne respecte pas une règle (personne non connectée, nom absent ou trop long, nom déjà pris dans le catalogue ou par une proposition en attente, difficulté ou indicateur manquant). Elle n'est pas enregistrée. À ne pas confondre avec **refuser** une proposition, décision d'un validateur. Terme du domaine : le site affiche le motif, jamais ce mot. | refusée, rejetée, invalide (pour une proposition) |
| Contribution | `Contribution` (nom du contexte) | Contribution | Activité de proposer du contenu au catalogue. Désigne le processus, pas l'objet (l'objet est une proposition). | |
| Contributeur | `Contributor` (value object : `ContributorId` + `IsValidator`) / `ContributorId` | Contribution | Utilisateur qui soumet une proposition (l’utilisateur dans le rôle d’auteur de la proposition). Contribution sait seulement s'il a la capacité « accepter ou refuser une proposition » (validateur ou administrateur), lue au moment de la proposition. | auteur, rédacteur |
| Disponibilité du nom | `NameAvailability` : `Available`, `TakenByPublishedPose`, `TakenByPendingProposal` | Contribution | Ce que le cas d'usage constate sur le nom d'une pose proposée, avant la soumission : libre, pris par une pose du catalogue, ou pris par une proposition en attente de validation. Si les deux sont vrais, le catalogue l'emporte. C'est la proposition qui décide de ce que la disponibilité implique. | |
| Accepter (une proposition) | `Accept` → événement `PoseProposalAccepted` (pour une proposition de pose) | Contribution | Décision d'un validateur qui entraîne la publication du contenu proposé dans le catalogue. Une publication directe est une acceptation par le contributeur lui-même. | approuver, valider (verbe ambigu) |
| Saisie conservée (d'une proposition) | `ProposalInputStore` (port du front), `sessionStorage` sur le site | (présentation) | Ce que la personne a saisi dans le formulaire « Proposer une pose », gardé dans l'onglet pour être retrouvé après une session expirée ou un incident. Propre à la personne : enregistrée avec l'adresse de la session, elle n'est rendue qu'à cette adresse (sinon effacée). Effacée après une proposition reçue et à la déconnexion (y compris dans un autre onglet). Ce n'est **pas** une proposition. | brouillon (réservé : interdit pour une proposition) |
| Refuser (une proposition) | `Reject` → événement `ProposalRejected` | Contribution | Décision d'un validateur de ne pas publier le contenu proposé. | décliner, supprimer |
| Proposition d'origine | `SourceProposalId` | Catalogue | Référence de la proposition dont une pose publiée est issue, gardée pour la traçabilité. Vide pour une pose publiée hors proposition. Le Catalogue n'en sait rien de plus. | |
| Publier | `Publish` (commande `PublishPose`, agrégat `Pose`) → événements `PosePublished`, `TransitionPublished`… | Catalogue | Rendre visible dans le catalogue un contenu accepté, ou un contenu proposé par un validateur ou un administrateur (publication directe). Une publication refusée par le catalogue (nom en doublon, information manquante…) ne publie rien. | mettre en ligne, valider |
