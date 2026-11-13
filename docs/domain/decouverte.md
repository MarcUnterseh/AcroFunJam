# Découverte du domaine : synthèse

**Date : 2026-11-02**. Décisions prises par l'expert métier (porteur du produit) après un challenge par un pratiquant expérimenté d'acroyoga. Elles font foi jusqu'à ce qu'une story ou un ADR les révise. Vocabulaire : `glossary.md`. Découpage : `context-map.md`.

## Vision produit
AcroFunJam est un catalogue collaboratif de poses et de transitions d'acroyoga. Il propose aussi un générateur de flow qui tire au hasard des enchaînements exécutables.

## Décisions

### Modèle : un graphe
1. Le modèle métier est un **graphe orienté** : les nœuds sont des **poses** et les arêtes des **transitions**.
2. **Pose** = position **tenable** uniquement (Throne, Bird, Star, Folded Leaf…). Les positions de passage non tenables ne sont pas modélisées. Elles vivent dans la description et les photos de la transition.
3. Chaque **variante** (prise différente, L-basing ou standing…) est une **pose distincte** (ex. Bird et High Bird, aux transitions totalement différentes).
4. Une pose porte deux indicateurs : **peut commencer un flow** et **peut terminer un flow**. Il n'y a ni position « au sol » ni montée ou descente modélisées.
5. Une pose a une **difficulté base** et une **difficulté flyer**.
6. Une **transition** est un lien **orienté** d'une pose de départ vers une pose d'arrivée. Le sens inverse doit être déclaré explicitement comme une autre transition, avec des difficultés potentiellement différentes.
7. **Plusieurs transitions** peuvent relier les deux mêmes poses dans le même sens (ex. de Throne à Bird : icarienne, « forbidden » (whip en arrière), en pop, classique débutant).
8. Une transition a une **difficulté base**, une **difficulté flyer** et **plusieurs étiquettes** (classique, icarien, whip, pop, lunaire…) issues d'une **liste fermée gérée par les validateurs**.
9. **Washing machine** : il n'y a pas de concept dédié. C'est une transition dont la pose de départ est aussi la pose d'arrivée (ex. Ninja Star : Star → Star).
10. Les flows nommés de la communauté sont **hors périmètre** pour l'instant.

### Difficulté et sécurité
11. Échelle de difficulté : **découverte < débutant < intermédiaire < avancé**.
12. Aucune notion de spotting ou de risque dans le modèle. Un **avertissement de responsabilité** général précise que chacun sait ce qu'il peut faire et s'il a besoin d'un spotter.

### Contributions
13. Tout le monde peut **proposer** l'ajout d'une pose ou d'une transition, la modification d'un élément ou l'ajout de photos.
14. Toute proposition est **validée par un validateur** avant publication.

### Générateur de flow
15. Le générateur produit un flow **exécutable** : un chemin dans le graphe qui part d'une pose « peut commencer », finit sur une pose « peut terminer » et alterne pose → transition → pose.
16. Les critères configurables sont la **difficulté**, la **longueur** et les **étiquettes** (ce que la description initiale appelait « catégorie »).
17. Si aucun chemin ne satisfait les critères, le générateur répond explicitement : « critères trop restrictifs, impossible de générer un flow ».

### Répertoire et flow pour un duo (ajout de l'expert métier, même jour)
18. Un utilisateur peut consulter la liste des poses et des transitions et **cocher celles qu'il maîtrise**. C'est une **maîtrise** déclarative, et l'ensemble de ses maîtrises forme son **répertoire**.
19. On peut générer un flow **pour un duo** : un pratiquant en base et un autre en flyer. La génération se restreint alors aux éléments que le duo a déclaré maîtriser.

### Story 1 « Consulter les poses du catalogue » (validé le 2026-11-02)
- Un **visiteur** (non connecté) consulte librement le catalogue : aucun compte n’est requis pour consulter.
- La liste présente le nom, la difficulté base et la difficulté flyer de chaque pose publiée.
- Ordre **alphabétique, provisoire**, insensible à la casse et aux traits d’union ; un tri par difficulté ou par famille pourra suivre.
- Catalogue vide : message « Le catalogue ne contient encore aucune pose. »
- Les indicateurs « peut commencer / terminer un flow » et l’avertissement de responsabilité ne sont pas affichés sur la liste.
- Hors périmètre : pagination, vignette photo (candidate pour la story suivante), légende des niveaux.

#### Livraison de la story 1 (2026-11-02)
- Les quatre règles sont livrées et vérifiées : R1 à R3 sur l’API et le web, R4 (ordre) sur l’API seule, car c’est une règle garantie par l’API (ADR 0007). Le web affiche l’ordre reçu.
- La liste est affichée sur la page d’accueil du site, sans routeur pour l’instant.
- Points de la revue d’architecture reportés à la story « publier une pose » :
  - une factory `PoseName.Create` qui renvoie un `Result` (nom vide, espaces…) ;
  - un value object `Difficulty` (couple base + flyer), aujourd’hui aplati en deux `DifficultyLevel` dans le modèle de lecture ;
  - une contrainte CHECK en base sur les codes de difficulté ;
  - une correspondance commune Error → statut HTTP 4xx dans l’Api ;
  - un seeder de démo en Development (ADR 0006).

### Rôles (décidés le 2026-11-02, avant la story 2)
- **Visiteur** (non authentifié) : consulte les poses, rien d’autre.
- **Utilisateur** (authentifié) : propose des poses ou des modifications.
- **Validateur** (authentifié) : valide les propositions des utilisateurs.
- **Administrateur** (authentifié) : peut tout faire et attribue les rôles aux autres utilisateurs.
- Les rôles se **cumulent** : un validateur est aussi un utilisateur, un administrateur a tous les droits.
- Ce que propose un **validateur** ou un **administrateur** est **publié directement**, sans validation.
- Le **premier administrateur** est désigné par configuration au déploiement (adresse e-mail), jamais en dur dans le code.
- Authentification : comptes gérés par l’API (ADR 0008), exposés d’abord par l’API seule ; les écrans du site viendront avec « Proposer une pose ».

### Story « Comptes et rôles » (validé le 2026-11-02)
- Un **seul rôle ordonné** par compte : utilisateur < validateur < administrateur ; les capacités se cumulent (proposer ; + valider ; + gérer les rôles).
- **Retirer** un rôle ramène le compte au rôle utilisateur ; rétrograder un administrateur = lui attribuer le rôle validateur ; retirer « validateur » à un administrateur est refusé.
- Attribuer un rôle déjà détenu : accepté, sans effet. Le rôle utilisateur ne s’attribue ni ne se retire (suspension / suppression de compte : story à part).
- Il reste toujours **au moins un administrateur** ; un administrateur peut retirer son propre rôle s’il en reste un autre.
- Configuration du premier administrateur : **amorçage seulement**, tant qu’aucun administrateur n’existe, et **uniquement au déploiement** (option B après la revue de sécurité) : s’inscrire avec l’adresse désignée ne donne aucun rôle ; la personne s’inscrit, vérifie qu’elle se connecte, puis AcroFunJam est redéployé. Exiger une adresse confirmée viendra avec l’envoi d’e-mails.
- L’administrateur désigne un utilisateur par son **adresse e-mail** ; adresse insensible à la casse.
- Le retrait d’un rôle prend effet **dès l’action suivante**.
- Refus de connexion générique ; l’inscription peut indiquer qu’une adresse est déjà utilisée ; pas de confirmation d’e-mail pour l’instant.
- Capacités observables via « mon compte » (adresse, rôle, capacités). La gestion des étiquettes sera une capacité distincte.
- Événements `RoleAssigned` / `RoleRevoked`, sans historique consultable.
- Refusés également : rétrograder le dernier administrateur (lui attribuer « validateur ») ; retirer « validateur » à un utilisateur qui ne l’a pas ; attribuer le rôle utilisateur.

#### Livraison de « Comptes et rôles » (2026-11-02)
- 27 scénarios livrés (`specs/features/identite/comptes-et-roles.feature`, @Integration, vrai PostgreSQL).
- Revue d’architecture : promotion du premier administrateur à l’inscription retirée (risque d’usurpation, option B) ; adresse e-mail validée (`identity.invalid-email`) ; index unique sur l’adresse ; auteur des changements de rôle dans les événements et journal d’audit.
- Reportés : message de `/me` pour un compte supprimé (aujourd’hui « aucun compte n’a cette adresse ») ; démarrage de l’API impossible si la base est indisponible et qu’un premier administrateur est désigné (à documenter ou à rendre tolérant) ; publication des événements de domaine (aucun abonné pour l’instant) ; confirmation d’e-mail avant l’amorçage.

### Story 2b « S’inscrire et se connecter sur le site » (validé le 2026-11-03)
- L’inscription **connecte aussitôt** ; après connexion ou inscription, retour à la **page d’origine** (pages du site uniquement).
- En-tête : visiteur → « Se connecter », « S’inscrire » ; connecté → son adresse et « Se déconnecter », sans le rôle (il ira dans « Mon compte »).
- **Pages dédiées** « Se connecter » / « S’inscrire » avec un routeur minimal (ADR).
- Session portée par des **cookies sécurisés gérés par l’API** (HttpOnly, SameSite=Strict), sans case « rester connecté » (ADR) ; une déconnexion vaut pour tous les onglets ; l’app mobile garde des jetons.
- **Règle de mot de passe** : au moins **10 caractères**, sans exigence de composition (phrases de passe). Exigence affichée avant la saisie, vérifiée par le site avant l’envoi avec la même règle que l’API.
- Session expirée : bandeau discret, la personne reste sur sa page et peut se reconnecter.
- **Verrouillage** après plusieurs échecs de connexion conservé (réglages par défaut d’ASP.NET Identity), avec un message dédié.
- Bouton d’inscription : « Créer mon compte ».
- Identité visuelle (`docs/design/principes.md`) : couleur principale terre cuite, police système, **tutoiement**, tournures épicènes, logo textuel.
- Scénarios ajoutés : API injoignable, champs vides ou adresse mal formée.
- Hors 2b : « mot de passe oublié » (story suivante, nécessite l’envoi d’e-mails) ; confirmation de l’adresse e-mail.

#### Livraison de la story 2b (2026-11-03)
- 22 scénarios @web (« se-connecter-sur-le-site.feature ») et 4 scénarios @api (mot de passe, verrouillage) livrés ; le renouvellement de session est vérifié côté API seulement (`SessionCookieTests`, horloge simulée).
- Décisions prises en route : en-tête « visiteur » quand l’API est injoignable au chargement ; l’indice de session n’est effacé qu’à la fermeture du bandeau « session expirée » (robuste aux lectures concurrentes) ; une personne connectée qui ouvre « Se connecter » ou « S’inscrire » est renvoyée à sa page d’origine ; jamais de retour vers une page d’identité.
- Revues (architecture, UX, visuel) : points bloquants et importants corrigés.
- Reportés : libellés d’interface de `core/domain` vers un module de présentation et `AuthFailure` vers le port ; `Session.email` typé `EmailAddress` ; exposer la longueur minimale du mot de passe dans l’OpenAPI pour vérifier la cohérence API ↔ site ; titre `h2` et icône d’attente dans les zones d’alerte et boutons occupés ; lien « Connecte-toi » sur « adresse déjà utilisée » ; remasquer le mot de passe à l’envoi ; libellé « Fermer le message » ; mettre à jour `docs/design/` (bouton du mot de passe séparé du champ, pas de résumé des erreurs) ; story « mot de passe oublié ».

### Story 3 « Proposer une pose » (validé le 2026-11-03)
- La proposition d’un **utilisateur** est **en attente de validation**. Elle n’apparaît pas dans le catalogue, même pour son contributeur.
- La proposition d’un **validateur** ou d’un **administrateur** est **publiée directement**. Dans le modèle, c’est une proposition acceptée aussitôt, ce qui garde la trace du contributeur.
- **Visiteur** : aucun lien « Proposer une pose ». S’il ouvre directement `/proposer-une-pose`, il est redirigé vers « Se connecter », puis ramené au formulaire. Une personne connectée trouve le lien sur le catalogue et dans l’état vide, pas dans l’en-tête.
- **Contenu** :
  - les champs : nom, difficulté base, difficulté flyer, « peut commencer un flow », « peut terminer un flow » ;
  - tous sont obligatoires, sans valeur par défaut, et les indicateurs se renseignent par oui ou non sans présélection ;
  - hors périmètre : description, photos, alias, poses à plus de deux personnes.
- **Nom** :
  - les espaces en début et en fin sont supprimés et les espaces intérieurs réduits à un seul ; le reste est conservé tel que saisi ; 60 caractères au plus ;
  - **clé de comparaison**, commune à l’unicité et à l’ordre alphabétique : sans tenir compte de la casse ni des accents, la ponctuation (trait d’union, apostrophe, parenthèses) comptant comme un espace. Cette clé **révise la règle d’ordre de la story 1** ;
  - décisions du porteur du produit (2026-11-03) : tout caractère qui n’est ni une lettre ni un chiffre compte comme un espace dans la clé, `&`, `+` et `/` compris ; un nom fait uniquement de ponctuation ou de symboles (clé vide, ex. « --- ») est irrecevable, comme un nom absent ;
  - un nom déjà pris par une pose publiée **ou par une proposition en attente** est irrecevable pour tous, validateurs compris.
- **Indicateurs** :
  - « peut commencer » : le duo s’installe dans la pose directement depuis le sol ;
  - « peut terminer » : le flyer redescend au sol directement et sans danger.
  - « Montée » et « descente » ne sont tolérés que dans les textes d’aide.
- **Échelle de difficulté** : elle reste fermée à 4 niveaux. Une définition concrète de chaque niveau sera rédigée avec l’expert, puis validée par le porteur du produit.
- **Le site connaît le rôle** (`/me`) : à un validateur, l’introduction du formulaire annonce une publication directe.
- **Compte supprimé** entre la connexion et l’envoi (décision du 2026-11-03) : la proposition est refusée avec un 401, que le site traite comme une session expirée, sans nouveau cas d’erreur.
- **Après l’envoi** : un message de confirmation, avec « Proposer une autre pose » et « Voir le catalogue ». « Mes propositions » est programmée avec ou juste après « Valider une proposition ».
- **Session expirée** pendant la saisie : la saisie est conservée dans l’onglet et retrouvée après la reconnexion ; sur cette page, l’alerte du formulaire remplace le bandeau global.
- **Refonte de la liste du catalogue** (révise la story 1) :
  - des cartes plutôt qu’un tableau ;
  - les difficultés base et flyer, et les **indicateurs** affichés en oui ou non explicites ;
  - le nombre de poses ;
  - une légende de l’échelle, avec l’avertissement de responsabilité juste en dessous ;
  - un état vide avec une invitation à proposer, réservée aux personnes connectées ;
  - un message maîtrisé et le bouton « Réessayer » quand le catalogue ne peut pas être chargé.
- **Hors story 3** :
  - la vignette photo ;
  - la recherche et les filtres : story dédiée vers 30 poses publiées ;
  - les alias et les autres noms.
- Exemples corrigés par l’expert acroyoga :
  - Throne, Star et Bird peuvent commencer et terminer un flow ;
  - ~~Folded Leaf peut seulement terminer~~ ; ~~Whale peut seulement commencer (convention d’enseignement)~~ : **révisé le 2026-11-04**, Folded Leaf peut aussi commencer, Whale peut aussi terminer selon les écoles. Ces exemples sont retirés des scénarios ; remplacés par Free Bird (termine seulement) et Candlestick (commence seulement, exemple discutable et non une référence), dans `proposer-une-pose.feature` et `consulter-les-poses.feature` (story 4, Q18) ;
  - Bow ne peut ni l’un ni l’autre ;
  - Hand-to-Hand (L-base) ne peut ni l’un ni l’autre ; ~~intermédiaire en base, avancé en flyer~~ : **révisé le 2026-11-04**, avancé / avancé.

#### Livraison de la story 3 (2026-11-03)
- **Trois étapes**, commitées séparément :
  - A : l'API, avec le contexte Contribution, le noyau partagé et la publication directe (ADR 0014 à 0020) ;
  - B : la refonte du catalogue web, avec la couche de présentation partagée (ADR 0021) ;
  - C : le formulaire web.
- Tous les scénarios @api et @web de la story sont livrés ; il ne reste plus aucun `@wip` dans le dépôt.
- **Décisions prises en route**, sur recommandation des revues :
  - un compte supprimé reçoit 401 `identity.account-deleted` de toute policy de capacité ;
  - le lien « Proposer une pose » du catalogue n'apparaît qu'une fois les poses reçues : en tête de page s'il y en a, dans le bloc vide sinon ;
  - page « Page introuvable » en repli du routeur ;
  - un code d'erreur inconnu de l'API affiche « Ta proposition n'a pas pu être envoyée : le site doit être mis à jour. Recharge la page, puis réessaie. Ta saisie est conservée. », avec un bouton « Recharger la page » ;
  - une réponse 201 au statut illisible affiche le succès neutre « Ta proposition est envoyée. » ;
  - la saisie conservée est propre à la personne, et effacée à la déconnexion, y compris dans un autre onglet ;
  - le bandeau global « session expirée » est masqué sur les pages qui ont leur propre alerte (connexion, inscription, proposition) ;
  - une personne connectée sans la capacité de proposer est redirigée vers le catalogue. Aucun rôle n'est concerné aujourd'hui.
- **E2e** : en CI, ils tournent sur un build (`vite preview`). En local, sur le serveur de dev, avec un préchauffage des dépendances.
- **Reportés** :
  - déplacer `identity-labels` vers `core/presentation` ;
  - icône d'attente des boutons occupés (sur tout le site) ;
  - définitions concrètes des niveaux de difficulté, à rédiger avec l'expert acroyoga ;
  - « Mes propositions », avec « Valider une proposition » ;
  - recherche dans le catalogue, vers 30 poses ;
  - autres noms (alias) ;
  - limite de taille du corps des requêtes, non testable avec TestServer.

### Story 4 « Valider une proposition » (validé le 2026-11-04)
Carte d'example mapping du 2026-11-04, **révisée le même jour** avec les décisions du porteur du produit et les retours de l'expert acroyoga et de l'ux-expert. Scénarios (tous `@wip`) : `specs/features/contribution/valider-une-proposition.feature`.

**Story** : en tant que validateur ou administrateur, je consulte les propositions de pose en attente de validation, puis j'accepte chacune, au besoin après l'avoir ajustée (elle est publiée dans le catalogue), ou je la refuse, afin que seules des poses vérifiées entrent dans le catalogue.

**Décisions du porteur du produit (2026-11-04)**
- **Ajustements avant acceptation** :
  - le validateur peut corriger le nom (orthographe, casse), les deux difficultés et les deux indicateurs de flow avant d'accepter ;
  - la pose publiée porte les valeurs retenues ; la proposition garde les valeurs proposées **et** les valeurs retenues, et elle est marquée « acceptée avec ajustements » (le contributeur le verra dans « Suivre mes propositions ») ;
  - accepter sans rien changer reste possible ;
  - les règles de contenu de la story 3 s'appliquent aux valeurs retenues : nom normalisé, 60 caractères au plus, clé non vide, difficultés de l'échelle, indicateurs obligatoires ;
  - un nom corrigé reste unique face au catalogue **et** aux autres propositions en attente, mais pas face à la proposition elle-même (corriger « throne » en « Throne » est permis) ;
  - le refus reste réservé au fond : doublon ou alias, position non tenable, hors champ, contenu inapproprié ;
  - (Q15) valeurs proposées et retenues comparées après normalisation : une correction identique, ou qui ne diffère que par des espaces superflus, n'est pas un ajustement ; une correction de casse en est un ;
  - (Q14) un **message facultatif** peut accompagner une acceptation **avec ajustements**, et seulement elle : 500 caractères au plus, espaces superflus retirés, un message fait seulement d'espaces vaut absence de message. Il est enregistré dès la story 4 ; un message joint à une acceptation sans ajustement rend l'acceptation impossible ;
  - (Q17) règle d'interface : pas de confirmation pour une acceptation telle quelle ; un récapitulatif « proposé → retenu » (avec le message facultatif) avant d'envoyer une acceptation avec ajustements.
- **Rôle retiré pendant la consultation** (Q16) : l'API refuse la décision comme pour un utilisateur (403, distinct du 401 d'une session expirée ou d'un compte supprimé). Le site affiche « Tu ne peux plus accepter ni refuser de proposition : ton rôle a changé. », avec un lien vers le catalogue.
- **Événement de refus** : `PoseProposalRejected`, aligné sur `PoseProposalAccepted`.
- **Motif de refus** : texte libre obligatoire, 500 caractères au plus, espaces superflus retirés, sans catégories.
- **« Mes propositions »** devient la story 5 « Suivre mes propositions », livrée dans la même mise en production.
- **Contributeur** : il est présenté aux validateurs et aux administrateurs par son adresse e-mail. Pour sa propre proposition, le site dit « toi ».
- **Recommandations retenues** :
  - la file présente la proposition la plus ancienne d'abord ;
  - le catalogue ne crédite pas publiquement le contributeur ;
  - une décision est irréversible, et toute seconde décision est impossible (« déjà traitée ») ;
  - pas d'amendement après un refus : le contributeur fait une nouvelle proposition ;
  - un validateur peut décider d'une proposition qu'il a faite avant d'être promu ;
  - le contributeur ne voit pas quel validateur a décidé.
- **Expert acroyoga** :
  - Folded Leaf peut aussi commencer un flow ; Whale peut aussi terminer selon les écoles ;
  - les exemples nets sont donc Bird, Throne et Star (commencer et terminer) et Hand-to-Hand (L-base), avancé / avancé (ni l'un ni l'autre) ;
  - exemple de doublon incontesté : « Front Bird », refusée avec le motif « Doublon de Bird, déjà au catalogue. » ;
  - en acroyoga, « valider une figure » veut dire la réussir : à l'écran, on dit « Propositions à valider ».
- **UX** :
  - entrée par le lien « Propositions à valider » de l'en-tête, réservé aux validateurs et aux administrateurs, avec le nombre de propositions en attente (masqué à 0) ;
  - une proposition traitée est remplacée sur place par un compte rendu jusqu'au prochain chargement ;
  - « déjà traitée » ne dit pas « par un autre validateur » ;
  - le motif saisi est conservé si AcroFunJam est injoignable ou si la session expire ;
  - la longueur maximale du motif est vérifiée par un test unitaire côté site.

**Existant** (story 3) : l'agrégat `PoseProposal` (statuts `Pending` et `Accepted`), la publication directe (acceptation par le contributeur lui-même, dans la même transaction que `PublishPose`), la proposition d'origine (`SourceProposalId`) gardée par la pose publiée, l'index unique partiel sur le nom des propositions en attente, la capacité `CanValidate` (policy) et l'index sur le contributeur, prévu pour « Mes propositions ».

**Règles et exemples**
- **R1. Seul un validateur ou un administrateur consulte la file de validation.**
  - Bruno (validateur) et Paul (administrateur) voient la proposition « Throne » d'Alice.
  - Alice (utilisatrice) : consultation refusée.
  - Un visiteur : il faut être connecté.
  - Bruno, dont le compte a été supprimé depuis sa connexion : refus traité comme une session expirée (décision de la story 3).
- **R2. Seul un validateur ou un administrateur accepte ou refuse une proposition.**
  - Alice tente d'accepter, puis de refuser, la proposition « Throne » de Chloé : décision refusée, et la proposition reste dans la file.
  - Un visiteur : il faut être connecté. Un compte supprimé : comme en R1.
  - Bruno, à qui Paul a retiré le rôle validateur pendant qu'il était connecté : décision refusée comme pour un utilisateur (403), pas comme une session expirée (401).
- **R3. La file présente chaque proposition en attente avec la pose proposée, l'adresse e-mail de son contributeur et sa date de soumission.**
  - « Hand-to-Hand (L-base) », avancé / avancé, ne peut ni commencer ni terminer, alice@example.org, soumise le 2026-11-03.
  - Ni les propositions acceptées (y compris les publications directes de Bruno) ni les refusées n'y figurent.
  - File vide : message « aucune proposition n'est en attente de validation ».
- **R4. La file présente d'abord la proposition la plus ancienne** ; à date égale, l'ordre du catalogue sur le nom départage.
  - Star (1er novembre), Bird (2 novembre), Throne (3 novembre).
- **R5. Un validateur ou un administrateur connaît le nombre de propositions en attente** (pour l'en-tête du site).
  - Trois propositions, dont une acceptée : 2. Un utilisateur ne peut pas consulter ce nombre.
- **R6. Accepter sans ajustement publie la pose telle que proposée** (nom tel que saisi, difficultés, indicateurs).
  - « Throne » acceptée apparaît à côté de « Bird » pour un visiteur.
  - Bird (commencer et terminer) et Hand-to-Hand (L-base) (ni l'un ni l'autre) gardent leurs indicateurs.
  - « Hand-to-Hand (L-base) » est publiée avec cette orthographe exacte, avancé / avancé.
- **R7. Une proposition acceptée garde la trace de son contributeur, du validateur et de la date**, puis quitte la file.
  - La proposition « Throne » d'Alice est acceptée sans ajustement par Bruno le 2026-11-05. La pose publiée garde la référence de sa proposition d'origine.
- **R8. Une acceptation avec ajustements publie la pose avec les valeurs retenues.**
  - « Throne » proposée débutant / intermédiaire, corrigée en difficulté flyer « découverte » : publiée débutant / découverte.
  - « Hand-to-Hand (L-base) » proposée comme pouvant terminer un flow, corrigée en « ne peut pas terminer un flow » : publiée comme ne pouvant ni commencer ni terminer. C'est un enjeu de sécurité : « peut terminer » signifie que le flyer redescend au sol sans danger.
  - « throne » corrigée en « Throne » : publiée « Throne ». Même clé de comparaison que la proposition elle-même, donc pas de conflit.
- **R9. La proposition acceptée avec ajustements garde les valeurs proposées et les valeurs retenues**, et elle est marquée « acceptée avec ajustements ».
  - Difficulté flyer proposée « intermédiaire », retenue « découverte ».
- **R9 bis. Seule une valeur retenue différente de la valeur proposée est un ajustement** (comparaison après normalisation).
  - Difficulté flyer « découverte » corrigée en « découverte » : acceptée sans ajustement.
  - Nom « Throne » corrigé en « Throne » entouré d'espaces : acceptée sans ajustement.
  - Nom « throne » corrigé en « Throne » : acceptée avec ajustements.
- **R9 ter. Un message facultatif peut accompagner une acceptation avec ajustements, et seulement elle.**
  - « Le flyer ne redescend pas sans danger depuis cette pose. », avec l'indicateur de Hand-to-Hand (L-base) corrigé : message conservé.
  - Espaces superflus retirés ; un message fait seulement d'espaces vaut absence de message.
  - 500 caractères : acceptée. 501 : acceptation impossible, la proposition reste en attente.
  - « Belle proposition. » sur une acceptation sans ajustement : acceptation impossible.
- **R10. Les valeurs retenues respectent les règles de contenu d'une pose.** Sinon, l'acceptation est impossible et la proposition reste en attente.
  - Nom corrigé vide ou « --- » : obligatoire. Nom de 61 caractères : trop long. Difficulté « expert » : n'existe pas.
- **R11. Un nom corrigé ne peut pas être celui d'une pose du catalogue ni d'une autre proposition en attente.** L'acceptation est alors impossible et la proposition reste en attente.
  - « Thron » corrigée en « Throne » alors que « Throne » est publiée : une pose de ce nom existe déjà dans le catalogue.
  - « Starr » d'Alice corrigée en « Star » alors que « Star » de Chloé est en attente : déjà en attente de validation.
- **R12. Une proposition dont le nom est pris entre-temps dans le catalogue ne peut pas être acceptée.** Le catalogue revérifie l'unicité ; rien n'est publié et la proposition reste en attente.
  - « Throne » d'Alice est en attente, puis « throne » est publiée hors proposition (amorçage de données, et demain une modification de pose) : l'acceptation est impossible.
- **R13. Refuser ne publie rien et garde le motif.** La proposition quitte la file.
  - « Front Bird » refusée avec le motif « Doublon de Bird, déjà au catalogue. » : le catalogue ne présente que « Bird ».
- **R14. Le motif de refus est obligatoire et compte au plus 500 caractères**, espaces superflus retirés.
  - Sans motif, ou fait seulement d'espaces : refus impossible.
  - « Doublon   de Bird. » entouré d'espaces est enregistré « Doublon de Bird. ».
  - 500 caractères : accepté. 501 : refus impossible.
  - Quand le refus est impossible, la proposition reste en attente.
- **R15. Le nom d'une proposition refusée peut de nouveau être proposé** (pas d'amendement).
  - Après le refus de « Throne » d'Alice, Chloé propose « Throne » : sa proposition est en attente de validation.
- **R16. Une proposition déjà traitée ne peut plus être ni acceptée ni refusée** : la décision est impossible, car la proposition a déjà été traitée.
  - Les quatre combinaisons sont couvertes (déjà acceptée ou refusée, puis tentative d'accepter ou de refuser), y compris Bruno qui accepte deux fois.
  - Bruno et Paul acceptent au même moment : la pose n'est publiée qu'une fois.
  - Une proposition inconnue : introuvable.
- **R17. Un validateur peut décider d'une proposition qu'il a faite avant d'être promu.**
  - Alice propose « Throne » en tant qu'utilisatrice, devient validateur, puis accepte sa propre proposition.
- **R18. Sur le site** :
  - **accès** : l'en-tête invite les validateurs et les administrateurs à consulter les « Propositions à valider », avec le nombre (2, puis 1 après une décision ; aucun nombre à 0). Un visiteur qui ouvre directement la page doit se connecter, puis il y arrive ; un utilisateur est ramené au catalogue ;
  - **présentation** : le contributeur est présenté par son adresse e-mail, « toi » pour sa propre proposition ;
  - **décision** : le site rend compte de chaque décision, y compris avec ajustements, sans plus proposer de décider de la proposition traitée ; elle disparaît à la consultation suivante ;
  - **erreurs** : le site signale un motif manquant ou un nom corrigé vide avant l'envoi, et relaie « déjà traitée » et « Une pose de ce nom existe déjà dans le catalogue. » ;
  - **incidents** : le motif saisi est conservé si AcroFunJam est injoignable ou si la session expire, puis retrouvé après la reconnexion ;
  - **rôle retiré** pendant la consultation : « Tu ne peux plus accepter ni refuser de proposition : ton rôle a changé. », avec un lien vers le catalogue (côté API : Bruno, rétrogradé utilisateur, voit sa décision refusée comme un utilisateur) ;
  - **interface** (sans scénario dédié) : pas de confirmation pour une acceptation telle quelle ; un récapitulatif « proposé → retenu », avec le message facultatif, avant d'envoyer une acceptation avec ajustements.
- **R19. Ce que voit le contributeur** : sa pose publiée apparaît dans le catalogue. Le statut, les ajustements et les messages sont présentés dans « Suivre mes propositions » (story 5).

**Pour la story 5 « Suivre mes propositions »** (décisions du 2026-11-04) : le contributeur voit le **détail des ajustements champ par champ** (valeur proposée → valeur retenue), le message facultatif qui les accompagne, et le motif d'un refus. Il ne voit pas quel validateur a décidé.

**Questions encore ouvertes (recommandation de l'analyse entre parenthèses)**
- ~~**Q11** Que deviennent les propositions en attente d'un compte supprimé ?~~ **Tranchée le 2026-11-12 (story 6), par alignement** : une proposition en attente, de pose comme de modification, dont le contributeur a supprimé son compte reste dans la file de validation (contributeur sans adresse) ; un validateur la refuse. Aucun retrait automatique.
- **Q18 (tranchée le 2026-11-04, expert acroyoga)** « Termine seulement » : **Free Bird** (débutant / débutant), on y arrive depuis Bird et on en sort comme de Bird. « Commence seulement » : aucune pose incontestée en L-basing ; **Candlestick** (débutant / intermédiaire) est retenue comme exemple, signalé comme tel dans les scénarios. Appliqué à `proposer-une-pose.feature` et `consulter-les-poses.feature`.

Tranchées le 2026-11-04 : Q13 (détail des ajustements, story 5), Q14 (message facultatif réservé aux acceptations avec ajustements), Q15 (comparaison après normalisation), Q16 (message dédié et lien vers le catalogue), Q17 (récapitulatif seulement pour une acceptation avec ajustements).

**Livraison prévue, en trois étapes commitées séparément**
- **A, API** : file de validation, nombre de propositions en attente, acceptation telle quelle, droits, refus, une seule décision, contributeur promu.
- **B, API** : ajustements (valeurs retenues, règles de contenu, unicité du nom corrigé, comparaison après normalisation) et message facultatif.
- **C, site** : tous les scénarios @web.

**Termes ajoutés ou révisés dans le glossaire** :
- ajoutés : file de validation, nombre de propositions à valider, motif de refus, proposition traitée, ajustement, pose retenue, acceptée avec ajustements, message d'ajustement, Propositions à valider (libellé), alias / nom d'usage (non modélisé) ;
- révisés : statut `Rejected` (code `rejected`), accepter, refuser (événement `PoseProposalRejected`).

#### Livraison de la story 4 (2026-11-09)
- **Trois étapes**, commitées séparément : A (API, d87da5d), B (API, ajustements, c307b42), C (site).
- Tous les scénarios @api et @web sont livrés. Un seul reste `@wip` : « Quand deux validateurs décident au même moment », couvert par les tests d'intégration `PoseProposalDecisionTransactionTests`.
- **Décisions prises en route**, sur recommandation des revues :
  - la décision est revendiquée (mise à jour conditionnelle sur le statut) avant la publication, et la proposition est relue dans la réservation du nom : le perdant de deux acceptations simultanées reçoit « déjà traitée » (ADR 0022) ;
  - la règle « un message n'accompagne qu'une acceptation avec ajustements » est portée par l'acceptation elle-même et par une contrainte en base ;
  - côté site, le refus par l'API d'une règle de contenu que le site vérifie déjà (400/422) signifie « site à mettre à jour », pour la story 3 comme pour la story 4 (ADR 0019, révision du 2026-11-06) ;
  - la ligne « N propositions en attente » baisse après chaque décision et devient « Toutes les propositions de la liste sont traitées. » ; une saisie conservée pour une proposition traitée entre-temps est signalée ;
  - « Cette proposition n'est plus en attente de validation. » pour une proposition introuvable, traitée comme déjà traitée.
- **Reportés** :
  - story 5 « Suivre mes propositions » (même mise en production) ;
  - Q11, propositions d'un compte supprimé (tranchée le 2026-11-12, story 6 : elles restent dans la file, un validateur les refuse) ;
  - contrôle manuel à 320 px avec un texte agrandi à 200 % : le formulaire d'ajustement déborde (au-delà de WCAG 1.4.10, le test automatique à 320 px passe) ;
  - test direct du hook `useProposalDecision` (couvert par les tests de la carte) ;
  - vérifier la sécurité d'un indicateur avant publication relève d'une charte de validation, à rédiger avec l'expert acroyoga ;
  - écran mobile (Expo).

### Story 5 « Suivre mes propositions » (livrée)
Carte d'example mapping du 2026-11-09, **révisée le même jour** avec les décisions du porteur du produit (Q19 à Q27) et l'avis de l'ux-expert. Scénarios : `specs/features/contribution/suivre-mes-propositions.feature`. Les scénarios @api sont livrés (étape A, ADR 0023) ; les scénarios @web sont livrés (étape B, site) : plus aucun `@wip`. Écart retenu à l'implémentation : une session expirée au chargement de « Mes propositions » (ou déjà expirée à l'ouverture de la page) laisse la personne sur la page, qui le signale elle-même par un bloc durable sous le titre (« Ta session a expiré. », « Connecte-toi de nouveau pour retrouver tes propositions. », lien-bouton « Se connecter » qui ramène ici après la connexion), sans le bandeau du site, plutôt qu'une redirection vers « Se connecter », pour que le site l'en informe (scénario « La page signale une session expirée pendant la consultation »).

**Story** : en tant que contributeur connecté, je consulte la liste de mes propositions de pose et le statut de chacune (en attente de validation, acceptée, acceptée avec ajustements, refusée), avec, selon le cas, le détail des ajustements champ par champ (valeur proposée → valeur retenue), le message d'ajustement et le motif de refus, afin de savoir ce que sont devenues les poses que j'ai proposées. Livrée dans la même mise en production que la story 4.

**Déjà décidé** (2026-11-04, story 4) : détail des ajustements champ par champ (Q13) ; message d'ajustement facultatif, réservé aux acceptations avec ajustements (Q14) ; comparaison après normalisation, la casse du nom compte (Q15) ; le contributeur ne voit pas quel validateur a décidé (Q12) ; pas d'amendement après un refus, on fait une nouvelle proposition (Q7).

**Existant** :
- API : l'agrégat `PoseProposal` porte la pose proposée, le contributeur, la date de soumission et la décision (`Acceptance` avec `RetainedPose`, `HasAdjustments` et `AdjustmentNote` ; `Rejection` avec `RejectionReason`) ; la table `contribution.pose_proposals` garde toutes ces valeurs (colonnes `retained_*`, `adjustment_note`, `rejection_reason`, `decided_at`, `decided_by`) et l'index `ix_pose_proposals_contributor_id`, prévu pour cette story. `decided_by` ne doit pas sortir de l'API pour le contributeur.
- Site : le message de confirmation de « Proposer une pose » annonce l'attente de validation (« Elle apparaîtra dans le catalogue quand un validateur l'aura acceptée. ») avec « Proposer une autre pose » et « Voir le catalogue » ; la navigation « Contribution » de l'en-tête (`en-tete.md`) a été prévue pour accueillir « Suivre mes propositions », mais elle n'existe aujourd'hui que pour les validateurs et les administrateurs ; le récapitulatif « proposé → retenu » (`recapitulatif-ajustements.md`) est prévu pour être réutilisé.

**Règles et exemples**
- **R1. Une personne connectée consulte ses propositions, quel que soit son rôle** (toute personne qui a la capacité de proposer).
  - Alice (utilisatrice), Bruno (validateur), Paul (administrateur) consultent chacun leurs propositions.
  - Un visiteur : il faut être connecté.
  - Alice, dont le compte a été supprimé depuis sa connexion : refus traité comme une session expirée (décision de la story 3).
- **R2. Le contributeur ne voit que ses propres propositions.**
  - Alice a proposé « Throne », Chloé « Star » : Alice ne voit que « Throne ».
  - Alice n'a rien proposé, Chloé si : Alice est informée qu'elle n'a encore proposé aucune pose.
- **R3. Chaque proposition présente sa pose, sa date de soumission et son statut** (décision du 2026-11-09) :
  - une proposition **acceptée**, avec ou sans ajustements, présente la **pose retenue**, celle du catalogue, nom retenu compris (titre de la carte) ;
  - une proposition **en attente**, **refusée** ou **publiée directement** présente la **pose proposée** ;
  - exemples : « Hand-to-Hand (L-base) » en attente, avancé / avancé, ne peut ni commencer ni terminer, soumise le 2026-11-03 ; « throne » débutant / intermédiaire acceptée en « Throne » débutant / découverte : la carte présente « Throne », débutant / découverte ;
  - statuts : Throne en attente de validation, Star acceptée, Bird acceptée avec ajustements, Front Bird refusée ;
  - (Q21) une proposition acceptée ou refusée présente sa date de décision, au jour près : Throne soumise le 2026-11-03, acceptée le 2026-11-05.
- **R4. (Q19) Une pose publiée directement figure parmi les propositions de son contributeur**, avec le statut « publiée directement » et **sans date de décision**.
  - Bruno (validateur) propose « Throne » : elle figure dans ses propositions, publiée directement.
  - Question technique tranchée par l'[ADR 0023](../adr/0023-publication-directe-enregistree-et-mes-propositions.md) : la publication directe est un fait enregistré au moment de la soumission (`Acceptance.IsDirectPublication`, colonne `published_directly`), et non déduit des horodatages ; l'acceptation par son contributeur devenu validateur (story 4, R17) reste « acceptée ».
- **R5. Une proposition acceptée avec ajustements présente le récapitulatif « proposé → retenu » des seuls champs ajustés.**
  - « throne » débutant / intermédiaire, acceptée en « Throne » débutant / découverte : nom throne → Throne, difficulté flyer intermédiaire → découverte ; la difficulté base n'apparaît pas.
  - « Hand-to-Hand (L-base) » : peut terminer un flow, peut → ne peut pas.
  - « Throne » acceptée sans ajustement : aucun ajustement présenté.
- **R6. Une proposition acceptée avec ajustements présente le message d'ajustement, s'il y en a un.**
  - « Le flyer ne redescend pas sans danger depuis cette pose. » est présenté.
  - Ajustements sans message : aucun message présenté.
- **R7. Une proposition refusée présente le motif de refus.**
  - « Front Bird » : « Doublon de Bird, déjà au catalogue. »
- **R8. Rien ne désigne au contributeur le validateur qui a décidé** : ni adresse, ni « toi », pour une acceptée, une acceptée avec ajustements ou une refusée.
- **R9. (Q20) Les propositions sont présentées de la plus récemment soumise à la plus ancienne** ; à date égale, l'ordre du catalogue sur le nom départage.
  - Star (1er novembre), Bird (2 novembre), Throne (3 novembre) : Throne, Bird, Star.
- **R10. Sur le site** :
  - **accès** (Q23) : **pas d'en-tête dans cette story**. Le catalogue présente un lien « Mes propositions » à côté de « Proposer une pose », à toute personne connectée (utilisatrice ou validateur), jamais à un visiteur. La page reste accessible par son adresse : un visiteur doit se connecter, puis il y arrive ;
  - **après une proposition** (Q23) : le message de confirmation présente « Voir mes propositions » pour une proposition en attente **et** pour un statut illisible (« received »), mais pas pour une publication directe (« Voir le catalogue » suffit) ; Alice y retrouve « Throne » en attente de validation ;
  - **statuts affichés** (Q22) : « En attente de validation », « Acceptée », « Acceptée avec ajustements », « Refusée », « Publiée directement ». « Refusée » est présenté en style information, jamais en rouge. Date de décision dans le statut : « Acceptée le 5 novembre 2026 » ; date de soumission : « Proposée le 3 novembre 2026 » ;
  - **phrases de conséquence** (ux-expert) : en attente, « Elle apparaîtra dans le catalogue une fois acceptée. » ; acceptée ou publiée directement, « Elle est publiée dans le catalogue. » ; acceptée avec ajustements, « Elle est publiée dans le catalogue avec ces ajustements. » ;
  - **présentation** : récapitulatif « proposé → retenu » (`recapitulatif-ajustements.md`) et « Message d'ajustement » pour une acceptée avec ajustements ; « Motif du refus » pour une refusée ; jamais d'adresse de validateur ni de « toi » ;
  - **état vide** : « Tu n'as encore proposé aucune pose. », avec l'invitation « Proposer une pose » ;
  - **statut inconnu** (API plus récente que le site) : la carte affiche « Statut indisponible. Recharge la page. » ;
  - **incidents** : AcroFunJam injoignable (message maîtrisé, « Réessayer », jamais une liste vide) ; session expirée (signalée par la page elle-même, sans le bandeau du site) ; après une déconnexion, les propositions ne sont plus présentées ;
  - **vérifiés en tests unitaires, sans scénario** : site à mettre à jour, « Réessayer » qui réussit, absence d'adresse et de « toi » à l'écran, statut inconnu, lien de confirmation pour un statut illisible, style information du refus, format des dates.

**Questions tranchées le 2026-11-09 par le porteur du produit** (après l'avis de l'ux-expert)
- **Q19** Les publications directes figurent dans la liste, statut « Publiée directement », sans date de décision. La façon de les reconnaître (voir R4) est tranchée par l'ADR 0023.
- **Q20** La plus récemment soumise d'abord, puis l'ordre du catalogue sur le nom (recommandation retenue).
- **Q21** « Proposée le 3 novembre 2026 » ; date de décision dans le statut (« Acceptée le 5 novembre 2026 »), au jour près, sans heure.
- **Q22** Statuts « En attente de validation », « Acceptée », « Acceptée avec ajustements », « Refusée » (pas « Non retenue »), « Publiée directement » ; refus en style information ; phrases de conséquence de l'ux-expert ; libellés « Message d'ajustement » (pas « équipe de validation ») et « Motif du refus ». Une proposition acceptée présente la pose retenue (R3).
- **Q23** Pas d'entrée dans l'en-tête : lien « Mes propositions » sur le catalogue, à côté de « Proposer une pose » ; « Voir mes propositions » dans la confirmation d'une proposition en attente ou au statut illisible, pas d'une publication directe ; page accessible par son adresse, avec retour après connexion.
- **Q24** Non : pas de lien vers la pose publiée.
- **Q25** Non : pas de formulaire prérempli pour reproposer une pose refusée.
- **Q26** Non : pas de notification d'une décision.
- **Q27** Non : pas de pagination.
- Rappel **Q11** : sans effet ici (un compte supprimé ne consulte plus rien).

**Reporté** : refonte de l'en-tête (menu repliable sous 640 px), à concevoir avant la prochaine entrée de navigation.

**Ordre d'implémentation conseillé**
1. API : R1 (un utilisateur consulte, visiteur, compte supprimé) et R2 (seulement ses propositions, liste vide) ;
2. API : R3 (pose proposée ou retenue, statuts, dates), R7 (motif), R5 et R6 (ajustements et message), R8 (aucun validateur désigné) ;
3. API : R9 (ordre), R4 (publication directe) ;
4. Site : accès (catalogue, accès direct, confirmation), présentation par statut, état vide, incidents.

**Termes ajoutés ou révisés dans le glossaire** : Mes propositions (ajouté puis révisé), Publication directe (statut affiché « Publiée directement »).

### Story 6 « Proposer une modification d'une pose publiée » (validée le 2026-11-12)
Carte d'example mapping du 2026-11-12, **révisée le même jour** avec les décisions du porteur du produit et les avis de l'ux-expert. Scénarios (tous `@wip`) : `specs/features/contribution/proposer-une-modification.feature`. Contexte Contribution → Catalogue, cibles @api et @web (pas de mobile, comme les stories 3 à 5).

**Story** : en tant que contributeur connecté, je propose une modification d'une pose publiée ; un validateur ou un administrateur l'accepte, au besoin avec ajustements, ou la refuse, comme une proposition de pose, afin que le catalogue reste juste.

**Vocabulaire** (glossaire à mettre à jour par le domain-expert) : **proposition de modification** (la demande, agrégat distinct de la proposition de pose) ; **modification proposée** / **modification retenue** (le contenu, avant et après les ajustements) ; **valeur d'avant** (figée au moment de la proposition) et **valeur actuelle** (lue au moment de la consultation) ; **message de modification** ; **réviser une pose** (commande du Catalogue ; sur le site, on dit « modifiée »). À l'écran et dans les scénarios : « l'indicateur « peut terminer un flow » », jamais « l'indicateur de fin de flow ».

**Décisions du porteur du produit (2026-11-12)**
1. **Champs modifiables** (Q28) : les cinq champs d'une pose, nom compris (Q43, Q44, Q54).
2. **Forme** (Q29) : seuls les champs changés sont proposés, au moins un ; les autres gardent leur valeur.
3. **Modification identique** (Q30) : irrecevable, comparaison après normalisation (les espaces superflus ne comptent pas, la casse du nom compte), comme Q15.
4. **Nom** (Q33) : unique avec la même clé de comparaison, face au catalogue (la pose elle-même mise à part), aux propositions de pose en attente et aux autres modifications en attente ; réservé tant que la modification attend ; l'ancien nom est libéré après un renommage accepté.
5. **Charte de validation** (A) : tant que les alias n'existent pas, un renommage vers un autre nom en usage, ou une modification qui transforme la pose en une autre (« Bird » → « High Bird »), est **refusé avec un motif**. C'est une décision du validateur, pas une règle du modèle.
6. **Message de modification** (B ; Q35, Q45, Q67) : facultatif, 500 caractères au plus, mêmes règles de normalisation que le message d'ajustement.
7. **Publication directe** (C ; Q34, Q47, Q63) : un validateur ou un administrateur publie directement sa modification, renommage et changement d'indicateur vers « peut » compris. Sur le site, il voit un récapitulatif « actuellement → nouveau » avant de publier ; pas de récapitulatif pour un utilisateur (Q62).
8. **Une seule modification en attente par pose, pour tous** (D ; Q31, Q48, Q60, Q61), validateurs compris. Règle simple, **à revoir peut-être plus tard**. Le site le signale dès l'ouverture du formulaire, en distinguant « la tienne » (lien « Voir mes propositions ») ; l'API refuse aussi à l'envoi. Retirer une modification en attente : hors périmètre.
9. **Contrôle de version** (D) : si la pose a changé entre l'ouverture du formulaire et l'envoi, la modification est irrecevable ; le site affiche les nouvelles valeurs actuelles en gardant la saisie.
10. **Ajustements** (Q36, Q53) : le validateur peut ajuster tout champ, règles de la story 4 ; une modification retenue qui ne change rien à la pose rend l'acceptation impossible (il faut refuser).
11. **Nom pris entre-temps** (Q32) : l'acceptation est impossible, la modification reste en attente.
12. **File de validation** (Q38, Q69, Q70) : même file, même ordre, même nombre que les propositions de pose ; carte « Modification de <nom> » présentant « valeur actuelle → valeur proposée » des seuls champs modifiés, le message de modification, puis la pose après acceptation ; boutons « Accepter la modification », « Ajuster avant d'accepter », « Refuser ».
13. **Compte supprimé** (Q50) : la modification reste dans la file ; le validateur la refuse. **Q11 tranchée par alignement (2026-11-12)** : il en va de même pour une proposition de pose ; toute proposition (de pose comme de modification) dont le contributeur a supprimé son compte reste dans la file de validation, et un validateur la refuse.
14. **« Mes propositions »** (Q37, Q51, Q64, Q65, Q66) : liste unique avec les propositions de pose ; titre = nom de la pose au moment de la proposition ; valeur d'avant figée (« avant → proposé ») ; une modification acceptée avec ajustements présente deux blocs, « Ce qui change dans la pose » (avant → retenu) et « Ajustements apportés » (proposé → retenu).
    - **Précision (2026-11-12)** : quand le validateur ajuste un champ que la modification ne changeait pas, ce champ figure dans **les deux blocs** : dans « Ce qui change dans la pose » (valeur d'avant → valeur retenue) **et** dans « Ajustements apportés » (valeur proposée, c'est-à-dire la valeur d'avant → valeur retenue). Exemple : Throne débutant / avancé, Alice propose la difficulté flyer intermédiaire, Bruno accepte en corrigeant la difficulté base en découverte : « Ce qui change » présente base débutant → découverte et flyer avancé → intermédiaire ; « Ajustements apportés » présente base débutant → découverte.
15. **Site** (Q39, Q68, Q71) : lien « Proposer une modification » sur chaque carte du catalogue (nom accessible « Proposer une modification de <nom> »), réservé aux personnes connectées ; page dédiée `/poses/:id/proposer-une-modification`, préremplie avec « Actuellement : … », chaque champ changé marqué « Modifiée ».
16. **Visibilité avant validation** (Q41) : aucune ; la pose publiée reste inchangée, même pour son contributeur.
17. **Historique des versions** (Q40) : pas d'historique consultable ; la proposition garde la valeur d'avant pour la traçabilité. Pas de mention « modifiée le » dans le catalogue (Q42).
18. Hors périmètre : Q46, Q49 ; définitions concrètes des niveaux de difficulté (Q52, non bloquant, reste ouverte).

**Libellés du site** (ux-expert, tutoiement) : « Tu n'as rien modifié. Change au moins une valeur pour proposer une modification. » ; « Une modification de cette pose est déjà en attente de validation. Tu pourras en proposer une autre une fois qu'elle aura été traitée. » ; « Tu as déjà proposé une modification de cette pose. Elle est en attente de validation. » ; « Cette pose n'est plus dans le catalogue. » ; « Cette pose a changé pendant que tu la modifiais. Ses nouvelles valeurs sont affichées : vérifie ta modification, puis envoie-la de nouveau. » ; « Merci, ta modification est envoyée. » ; « La pose « Throne » est modifiée dans le catalogue. ». Un nom déjà pris est signalé sous le champ du nom.

**Règles et exemples**
- **R1. La modification d'un utilisateur est en attente de validation et ne change pas la pose publiée.**
  - Alice propose de passer la difficulté flyer de Throne d'intermédiaire à découverte : la proposition est en attente, et le catalogue présente toujours intermédiaire, même à Alice.
- **R2. La modification d'un validateur ou d'un administrateur est publiée directement.**
  - Bruno, puis Paul : le catalogue présente aussitôt découverte.
- **R3. Seule une personne connectée propose une modification.**
  - Un visiteur : il faut être connecté. Un compte supprimé : comme une session expirée.
- **R4. Seule une pose publiée peut être modifiée.**
  - Une pose inconnue : introuvable.
- **R5. Une modification change au moins un champ ; les autres gardent leur valeur.**
  - « Hand-to-Hnad (L-base) » → « Hand-to-Hand (L-base) », difficulté base, indicateur « peut terminer un flow » : seul ce champ change.
  - Une valeur identique, ou « Throne » entouré d'espaces : la modification ne change rien. « throne » → « Throne » est une modification.
- **R6. Les valeurs proposées respectent les règles de contenu d'une pose.**
  - Nom vide, « --- », 61 caractères, difficulté « expert » : irrecevable.
- **R7. Un nom modifié ne peut pas être celui d'une autre pose du catalogue ni d'une proposition en attente.**
  - « Thron » → « throne » alors que Throne est publiée ; « Thron » → « Throne » alors que Chloé a proposé « Throne ».
- **R8. Le nom proposé par une modification en attente est réservé ; l'ancien nom est libéré après un renommage accepté.**
  - Chloé ne peut pas proposer « Throne » ; après l'acceptation, elle peut proposer « Thron ».
- **R9. Une seule modification en attente par pose, pour tous.**
  - Chloé, puis Bruno, après Alice : irrecevable. Après le refus de celle d'Alice, Chloé peut en proposer une.
- **R10. Une modification commencée sur une pose qui a changé entre-temps est irrecevable.**
  - Alice commence, Bruno publie directement une modification de la difficulté base, Alice envoie : irrecevable.
- **R11. Message de modification facultatif** : conservé, espaces superflus retirés, fait seulement d'espaces = aucun message, 500 caractères acceptés, 501 irrecevable.
- **R12. La file de validation présente chaque modification avec « valeur actuelle → valeur proposée » des seuls champs modifiés**, le contributeur, la date et le message ; mêlée aux propositions de pose, la plus ancienne d'abord (Star le 10, Throne le 12) ; comptée dans le nombre en attente (2) ; maintenue pour un compte supprimé.
- **R13. Seul un validateur ou un administrateur décide** (story 4).
- **R14. Accepter révise la pose publiée** : Thron renommée Throne, le catalogue présente Bird et Throne ; la proposition garde la valeur d'avant, le contributeur, le validateur et la date.
- **R15. Acceptation avec ajustements** : flyer proposée intermédiaire, retenue découverte ; ajuster un champ non modifié est permis ; une modification retenue identique à la pose (flyer ramenée à avancé) rend l'acceptation impossible.
- **R16. Un nom pris entre-temps dans le catalogue empêche l'acceptation.**
- **R17. Refuser laisse la pose inchangée et garde le motif obligatoire.**
  - « Bird » → « High Bird » refusée avec le motif « High Bird est une autre pose : propose-la comme nouvelle pose. » (charte de validation).
- **R18. Une modification déjà traitée ne peut plus être décidée** (story 4).
- **R19. « Mes propositions »** : valeur d'avant figée et valeur proposée ; nom au moment de la proposition (« Thron » après le renommage) ; deux blocs pour une acceptation avec ajustements (flyer avancé → découverte ; intermédiaire → découverte) ; motif d'un refus.
- **R20. Sur le site** :
  - **accès** : lien sur chaque carte pour une personne connectée, jamais pour un visiteur ; formulaire prérempli ; accès direct d'un visiteur → connexion, puis retour au formulaire de la même pose ; pose introuvable signalée ;
  - **déjà en attente** : signalé à l'ouverture, « la tienne » avec un lien vers « Mes propositions » ;
  - **après l'envoi** : « Merci, ta modification est envoyée. » ; un validateur voit d'abord le récapitulatif « actuellement → nouveau », puis « La pose « Throne » est modifiée dans le catalogue. » ;
  - **erreurs** : modification qui ne change rien signalée avant l'envoi ; nom déjà pris relayé sous le champ ; pose changée entre-temps (message, nouvelles valeurs, saisie gardée) ;
  - **incidents** : AcroFunJam injoignable, session expirée (saisie conservée, retrouvée après la reconnexion sur le formulaire de la même pose) ;
  - **validateur** : carte « Modification de <nom> » avec « actuel → proposé », acceptation annoncée « modifiée dans le catalogue » ;
  - **« Mes propositions »** : la modification en attente, « avant → proposé ».

**Ordre d'implémentation conseillé**
1. API : R1, R3, R4 (proposer, en attente, pose inchangée, visiteur, pose introuvable), puis R5 (au moins un champ, modification identique).
2. API : R6, R7, R8 (contenu, unicité et réservation du nom), R9 (une seule en attente), R10 (contrôle de version), R11 (message).
3. API : R12 (file, ordre, nombre, compte supprimé), R13, R14 (accepter : commande `RevisePose` du Catalogue), R17, R18 (refus, déjà traitée).
4. API : R2 (publication directe), R15, R16 (ajustements, nom pris entre-temps), R8 (ancien nom libéré).
5. API : R19 (« Mes propositions »).
6. Site : accès et formulaire prérempli, déjà en attente, envoi et récapitulatif du validateur, erreurs, pose changée, incidents, file de validation, « Mes propositions ».

**Livraison** : étape A (API, 51 scénarios @api) puis **étape B (site), livrée le 2026-11-13** : les 21 scénarios @web passent (catalogue, formulaire `/poses/:id/proposer-une-modification`, récapitulatif du validateur, file de validation, « Mes propositions »). Le site lit « Mes propositions » à `GET /contribution/my-proposals` ; l'ancien `GET /contribution/my-pose-proposals` est supprimé de l'API. « Déjà en attente » est lu à l'ouverture du formulaire par `GET /contribution/pose-revision-proposals/pending?poseId=…`. Libellés validés par l'ux-expert : `docs/design/ecrans/6-proposer-une-modification.md` et les fiches de composants citées.

**Points à revoir plus tard** : plusieurs modifications en attente d'une même pose ; retirer une modification en attente ; alias (qui rendraient la charte de validation sur les renommages obsolète).

### Story 7 « Proposer une transition » (validée le 2026-11-13)
Carte d'example mapping du 2026-11-13, **révisée le même jour** avec les décisions du porteur du produit et les avis de l'ux-expert et de l'expert acroyoga. Scénarios (tous `@wip`) : `specs/features/contribution/proposer-une-transition.feature` (proposer, valider, suivre) et `specs/features/catalogue/consulter-les-transitions.feature` (page d'une pose). Contexte Contribution → Catalogue, cibles @api et @web (pas de mobile, comme les stories 3 à 6).

**Story** : en tant que contributeur connecté, je propose une transition d'une pose publiée vers une pose publiée ; un validateur ou un administrateur l'accepte, au besoin avec ajustements, ou la refuse, comme une proposition de pose, afin que le catalogue relie les poses par les transitions pratiquées. Tout visiteur consulte, sur la page d'une pose, les transitions qui en partent et celles qui y arrivent.

**Déjà décidé** (découverte, « Modèle : un graphe ») : transition orientée (décision 6) ; plusieurs transitions entre les mêmes poses dans le même sens (décision 7) ; difficulté base et difficulté flyer (décision 8) ; washing machine sans concept dédié (décision 9) ; positions de passage non modélisées (décision 2).

**Vocabulaire** (glossaire à mettre à jour par le domain-expert) : **proposition de transition** (agrégat distinct, `kind` transition dans la file et dans « Mes propositions ») ; **transition sans nom** et son **libellé par défaut** « Throne → Bird » (lecteurs d'écran : « de Throne vers Bird ») ; **description** d'une transition (publique) ; **position de passage** (et non « pose intermédiaire ») ; **page d'une pose**.

**Décisions du porteur du produit (2026-11-13)**
1. **Nom facultatif** (Q72, Q88) : sans nom, la transition se présente par ses poses (« Throne → Bird »). Au plus **une transition sans nom** par pose de départ et pose d'arrivée, dans un sens donné, publiée ou en attente ; toute autre transition entre ces poses dans ce sens doit avoir un nom. Un nom donné suit les règles d'un nom de pose (espaces superflus retirés, 60 caractères au plus, clé de comparaison de la story 3) et est **unique pour la pose de départ et la pose d'arrivée** (publiée ou en attente), pas dans tout le catalogue (Q73). Les exemples « Classique », « Icarienne », « En pop » du brouillon, qui étaient des étiquettes déguisées, sont remplacés par des noms d'usage réels (« Ninja Star », de Star vers Star ; « Catherine's Wheel ») ou des transitions sans nom.
2. **Description facultative et publique** (Q75, Q82, Q93) : 500 caractères au plus ; elle décrit le passage (« Passe par Throne sans s'arrêter. », un lien vidéo en texte brut, sans aperçu). Publiée avec la transition, affichée sous elle dans le catalogue, lue par le validateur dans la file ; ajustable à l'acceptation, l'ajustement apparaît dans « Mes propositions ». Pas de second message privé au validateur.
3. **Difficultés** (Q76, Q90) : difficulté base et difficulté flyer obligatoires, mêmes niveaux que les poses, sans valeur par défaut. Elles mesurent **le passage seul**, les poses étant supposées maîtrisées (texte d'aide du formulaire). Aucune contrainte par rapport aux difficultés des poses.
4. **Washing machine et positions de passage** (Q78, Q91, Q92) : une transition peut aller d'une pose vers elle-même (Ninja Star, de Star vers Star). Un mouvement qui traverse une pose sans s'y arrêter peut être proposé comme une seule transition, la description le précise ; la **charte de validation** dira quand découper (hors scénario). On dit « position de passage », jamais « pose intermédiaire ».
5. **Accès** (Q86, Q100, Q103, Q104) : le nom d'une carte du catalogue devient un lien vers la **page de la pose** `/poses/:id` (zone cliquable étendue à la carte, le lien « Proposer une modification » reste utilisable). La page propose « Proposer une transition depuis Throne ». Formulaire, dans cet ordre : Pose de départ (préremplie, modifiable), Pose d'arrivée (liste déroulante des poses publiées, option vide « Choisis une pose »), Nom (facultatif), Difficulté base, Difficulté flyer, Description (facultative). Accès direct à l'adresse du formulaire : connexion demandée, puis retour au formulaire.
6. **Qui propose, ce que devient la proposition** (recommandations validées) : seul un utilisateur connecté propose ; la proposition d'un utilisateur est en attente et invisible dans le catalogue, même pour lui ; celle d'un validateur ou d'un administrateur est publiée directement, **sans récapitulatif**, le formulaire l'annonçant par l'encadré « Ton rôle te permet de publier directement : la transition apparaîtra dans le catalogue dès l'envoi. ».
7. **Poses et sens** : les deux poses doivent être publiées (inconnue ou en attente de validation : irrecevable ; pas de propositions groupées, Q79). Une proposition = un sens ; le sens inverse est une autre proposition ; pas d'indicateur « réversible » ni de raccourci « sens inverse » (Q77).
8. **Renommage des poses** (Q80) : une transition référence ses poses et présente leurs **noms actuels** (catalogue, file, « Mes propositions ») ; pas de contrôle de version des poses. Écart accepté : une modification de pose garde, elle, le nom de la pose au moment de la proposition.
9. **Validation** (Q81, Q83) : nouveau type dans la file, même ordre et même compteur que les autres propositions ; carte titrée « Transition **<Nom>** de **Throne** vers **Bird** », ou « Transition de Throne vers Bird » sans nom ; compte supprimé conservé comme pour les autres propositions (Q11). Seul un validateur ou un administrateur décide ; accepter publie (contributeur, validateur, date conservés). Ajustements : nom (le donner, le corriger ou le retirer), difficultés, description, **jamais les poses** ; un nom retenu reste unique pour ces poses et au plus une transition reste sans nom. Nom pris entre-temps, ou transition sans nom publiée entre-temps pour ces poses : acceptation impossible avec message. Refus avec motif, qui libère le nom (ou la place sans nom). Une transition qui arrive dans la mauvaise pose est **refusée avec un motif** (« Cette transition arrive en Bird, pas en Star : propose-la vers Bird. »). Déjà décidée : message de la story 4.
10. **« Mes propositions »** (Q84) : nouveau type, titre commun avec la file. **Révise la story 5** : état vide « Tu n'as encore rien proposé. » (au lieu de « Tu n'as encore proposé aucune pose. ») et introduction « Les poses, les modifications et les transitions que tu proposes apparaissent ici, avec ce qu'elles deviennent. ».
11. **Après l'envoi** : utilisateur, actions « Voir mes propositions », « Proposer une autre transition depuis Throne », « Revenir à Throne » ; validateur, « Voir la pose Throne » à la place de « Revenir à Throne », sans « Voir mes propositions » (comme la story 5, Q23). « Annuler » ramène à la page de la pose d'origine.
12. **Page d'une pose** (Q85 ; catalogue, visiteurs compris) : lien de retour « Catalogue » ; titre = nom de la pose ; actions « Proposer une transition depuis Throne » et « Proposer une modification » (personnes connectées) ; caractéristiques de la pose ; légende de l'échelle de difficulté avec un **avertissement de responsabilité** : les transitions sont le moment où les chutes arrivent, pratique avec un spotter ; sections « Transitions depuis Throne » et « Transitions vers Throne », listes plates sans compteur. Chaque transition présente l'autre pose (lien vers sa page), son nom s'il y en a un, ses deux difficultés et sa description ; ordre : l'autre pose, puis le nom (sans nom en premier) ; une washing machine figure dans les deux sections avec « (même pose) ». États : chargement ; erreur avec « Réessayer » ; section vide « Aucune transition ne part de Star pour l'instant. » / « Aucune transition n'arrive à Star pour l'instant. » ; pose introuvable (titre « Pose introuvable »). Les transitions en attente n'y figurent pas.

**Règles et exemples** (C = `consulter-les-transitions.feature`, sinon `proposer-une-transition.feature`)
- **R1. La transition d'un utilisateur est en attente de validation et n'apparaît pas dans le catalogue**, même pour lui. Alice propose « Ninja Star » de Star vers Star, avancé / avancé : en attente.
- **R2. La transition d'un validateur ou d'un administrateur est publiée directement.** Bruno, puis Paul : la transition sans nom de Throne vers Bird apparaît aussitôt.
- **R3. Seule une personne connectée propose.** Visiteur : il faut être connecté. Compte supprimé : comme une session expirée.
- **R4. Une transition relie une pose de départ et une pose d'arrivée publiées.** Pose absente : obligatoire ; inconnue : introuvable ; « High Bird » proposée par Chloé, encore en attente : introuvable.
- **R5. Une transition ne va que dans un sens ; le sens inverse est une autre transition.** Throne → Bird publiée n'apparaît pas depuis Bird ; Alice propose Bird → Throne sans nom : recevable.
- **R6. Une washing machine est une transition comme une autre.** Ninja Star, de Star vers Star.
- **R7. Un mouvement qui traverse une position de passage se propose comme une seule transition.** De Star vers Bird, « Passe par Throne sans s'arrêter. ».
- **R8. Le nom est facultatif ; donné, il est normalisé et compte au plus 60 caractères.** Aucun nom, ou un nom fait seulement d'espaces : transition sans nom ; « Ninja   Star » entouré d'espaces → « Ninja Star » ; 60 caractères acceptés ; 61 : trop long ; « --- » : irrecevable.
- **R9. Au plus une transition sans nom relie deux poses dans un sens donné.** Une seconde sans nom de Throne vers Bird, face à une publiée ou à une en attente : irrecevable. « Ninja Star » à côté d'une sans nom de Star vers Star, et l'inverse : recevable.
- **R10. Le nom est unique pour la pose de départ et la pose d'arrivée, pas dans tout le catalogue.** « ninja-star » face à « Ninja Star » publiée, « NINJA STAR » face à une en attente : irrecevable ; « Ninja Star » de Throne vers Star : recevable (la charte de validation juge du fond).
- **R11. Difficultés obligatoires, de l'échelle, indépendantes de celles des poses.** Sans difficulté base ou flyer : obligatoire ; « expert » : n'existe pas ; avancé / avancé de Front Plank (débutant / débutant) vers Bird : recevable.
- **R12. Description facultative et publique, 500 caractères au plus.** Lien vidéo en texte brut conservé ; faite d'espaces : aucune description ; 500 : acceptée ; 501 : trop longue.
- **R13. La file de validation présente chaque transition** avec ses poses (noms actuels), son nom, ses difficultés, sa description, son contributeur et sa date ; mêlée aux autres propositions, la plus ancienne d'abord ; comptée dans le nombre en attente ; maintenue pour un compte supprimé.
- **R14. Seul un validateur ou un administrateur décide.**
- **R15. Accepter publie la transition telle que proposée**, description comprise, et garde contributeur, validateur et date.
- **R16. Accepter avec ajustements publie les valeurs retenues** : « ninja star » → « Ninja Star », flyer intermédiaire → avancé, description corrigée ; une correction faite d'espaces superflus n'est pas un ajustement ; une description retenue de 501 caractères rend l'acceptation impossible.
- **R17. Le nom retenu reste unique pour ces poses, et au plus une reste sans nom.** Donner le nom « Ninja Star » à une transition proposée sans nom : ajustement ; nom corrigé déjà publié, ou nom retiré alors qu'une sans nom est publiée : acceptation impossible.
- **R18. Un nom, ou une place sans nom, pris entre-temps empêche l'acceptation** (amorçage de données).
- **R19. Refuser ne publie rien, garde le motif et libère le nom ou la place sans nom.** Throne → Star refusée (« Cette transition arrive en Bird, pas en Star : propose-la vers Bird. »), puis proposée de nouveau par Chloé.
- **R20. Une transition déjà traitée ne peut plus être décidée.**
- **R21. « Mes propositions »** : transition en attente (poses, nom, difficultés, description, statut, date) ; ajustement de la description ; motif d'un refus ; publiée directement ; noms actuels des poses après un renommage.
- **R22. Sur le site (contribution)** : invitation sur la page d'une pose réservée aux personnes connectées ; accès direct d'un visiteur → connexion, puis retour au formulaire de la même pose ; pose de départ introuvable signalée ; pose de départ préremplie et modifiable ; seules les poses publiées proposées comme pose d'arrivée ; texte d'aide des difficultés ; « Annuler » ramène à la pose ; encadré de publication directe pour un validateur ; confirmations et actions suivantes ; pose d'arrivée non choisie, nom pris, transition sans nom déjà présente, signalés sous le champ ; AcroFunJam injoignable, session expirée (saisie conservée et retrouvée) ; carte de la file (avec ou sans nom), acceptation annoncée, nom pris entre-temps ; « Mes propositions » (titres, introduction, état vide).
- **C1. La page d'une pose présente les transitions qui en partent** (pose d'arrivée, nom, difficultés, description) **et C2. celles qui y arrivent** (pose de départ, …).
- **C3. Ordre : l'autre pose, puis le nom, sans nom en premier** (@api). Depuis Star : Bird, Star (sans nom), Star « Ninja Star », Throne.
- **C4. Une washing machine figure dans les deux sections**, marquée « (même pose) » sur le site.
- **C5. Une transition sans nom se présente par ses poses** (« Throne → Bird »).
- **C6. Seules les transitions publiées sont présentées.**
- **C7. Une transition suit le renommage de ses poses** (Bird renommée Front Bird).
- **C8. Une section vide le signale** (« Aucune transition ne part de Star pour l'instant. », « Aucune transition n'arrive à Star pour l'instant. »).
- **C9. La page présente les caractéristiques de la pose, la légende de l'échelle et l'avertissement de responsabilité.**
- **C10. Seule une pose publiée se consulte** (« Pose introuvable »). **C11. Page impossible à charger** : message et « Réessayer ».
- **C12. Navigation** : du nom de la carte vers la page de la pose ; de la transition vers la page de l'autre pose ; retour au catalogue.

**Hors périmètre** : étiquettes ; photos et vidéos (un lien vidéo s'écrit dans la description) ; modifier ou retirer une transition publiée (Q87) ; proposer une transition « vers » une pose depuis sa page ; recherche ou liste filtrable des poses dans le formulaire ; afficher les transitions existantes dans le formulaire ; propositions groupées ; page propre à une transition ; générateur de flow ; écran mobile.

**À venir**
- Story **« Gérer la liste des étiquettes »**, avant le générateur de flow (Q74), puis l'étiquetage des transitions. Étiquettes jugées indispensables par l'expert acroyoga : contrôlé / fluide, dynamique, pop, whip, icarien, envol, inversion, lunaire, washing machine. Une transition est publiée sans étiquette d'ici là.
- Modifier ou retirer une transition publiée (symétrique de la story 6).
- **Charte de validation** des transitions, avec l'expert acroyoga : quand découper un mouvement en plusieurs transitions, quand refuser un nom en usage entre d'autres poses.

**Points mineurs à confirmer** (non bloquants, recommandation entre parenthèses)
- **Q105** Une description garde-t-elle ses retours à la ligne ? (oui : espaces retirés en début et en fin, une description faite seulement d'espaces vaut absence de description, mais les espaces intérieurs et les retours à la ligne sont conservés, contrairement au message de modification). Les scénarios ne vérifient que le début, la fin et le cas « seulement des espaces ».
- **Q106** (tranchée) Libellé de l'avertissement de la page d'une pose : vocabulaire du glossaire, **avertissement de responsabilité** et **spotter** ; libellé exact fixé par la conception visuelle.
- **Q107** Un nom fait uniquement de ponctuation (« --- ») : irrecevable (« le nom de la transition doit contenir une lettre ou un chiffre »), plutôt que transformé en transition sans nom, par cohérence avec la clé de comparaison non vide d'un nom de pose.

**Ordre d'implémentation conseillé**
1. API : R1, R3, R4 (proposer, en attente, visiteur, poses absentes, inconnues ou en attente), R6, R5.
2. API : R8 à R12 (nom facultatif, place sans nom, unicité par couple, difficultés, description).
3. API, catalogue : C1, C2, C6, C10 (lecture de la page d'une pose), puis R2 (publication directe), C3, C4, C7.
4. API : R13 à R20 (file, décisions, ajustements, unicité à l'acceptation, entre-temps, refus).
5. API : R21 (« Mes propositions »).
6. Site, catalogue : C12 (carte → page), C1, C2, C5, C8, C9, C10, C11, C4.
7. Site, contribution : R22 (accès et formulaire, envoi et confirmations, erreurs, incidents), puis file de validation et « Mes propositions » (avec la révision de l'état vide de la story 5).

### Découpage des stories suivantes (décidé le 2026-11-02)
1. **Comptes et rôles** (Identité) : s’inscrire, se connecter, un administrateur attribue ou retire un rôle.
2. **Proposer une pose** (Contribution) : reprend les règles de contenu de `specs/features/catalogue/publier-une-pose.feature` (brouillon) ; publication directe pour un validateur ou un administrateur.
3. **Valider une proposition** (Contribution → Catalogue) : accepter (publication), au besoin avec ajustements, ou refuser.
4. **Proposer une modification** d’une pose publiée.

Révision du 2026-11-04 : la story 5 **« Suivre mes propositions »** (Contribution) est livrée dans la **même mise en production** que « Valider une proposition ». Le contributeur y voit le statut de chacune de ses propositions (en attente, acceptée, acceptée avec ajustements, refusée), les ajustements et le motif de refus. Scénarios à écrire.

### Vocabulaire écarté
- « figure », « posture » : remplacés par **pose**, ou **élément** quand il s'agit d'une pose ou d'une transition ;
- « catégorie » : remplacé par **étiquette** ;
- « passage », « mouvement » : remplacés par **transition** ;
- « voltigeur », « porteur » : remplacés par **flyer** et **base**.

## Questions ouvertes

Le marqueur **[bloquant]** signale une question à trancher avant la story concernée.

### Catalogue
- **[bloquant : création d'une pose]** Le nom d'une pose est-il unique ? Faut-il une casse et une normalisation (« high bird » = « High Bird ») ? Peut-on avoir des alias de nom ?
- **[bloquant : création d'une pose]** Quels champs sont obligatoires : description, au moins une photo, les deux difficultés ?
- Convention de nommage des variantes (« Front Bird », « Hand-to-Hand (L-base) ») et orthographe canonique d’un nom : qui la fixe ?
- Ordre alphabétique : faut-il aussi ignorer les accents (« Étoile » avec les E) et les autres signes (parenthèses, apostrophes) ? En attendant, la règle retenue est la suivante : on retire les traits d'union, on compare sans tenir compte de la casse et sans culture, et le nom exact sert à départager deux noms équivalents.
- Lien variante → pose principale : faut-il le modéliser ? Est-ce utile pour la recherche ou l'affichage ?
- Que devient une pose retirée ou fusionnée qui a des transitions ? Peut-on retirer un élément publié ?
- Que devient une étiquette retirée de la liste alors que des transitions la portent ?
- Une transition doit-elle porter au moins une étiquette ? En attendant la story « Gérer la liste des étiquettes » (avant le générateur de flow), une transition est publiée sans étiquette (story 7, 2026-11-13).
- Les étiquettes s'appliquent-elles uniquement aux transitions, ou aussi aux poses ?

### Génération de flow
- **[bloquant : génération]** Que signifie le critère « difficulté » ? Un niveau maximal unique appliqué à la base et au flyer, ou deux niveaux maximaux distincts ? Les difficultés des poses comptent-elles, ou seulement celles des transitions ? S'agit-il d'un niveau maximal ou d'une plage ?
- **[bloquant : génération]** Quelle est l'unité de longueur : nombre de transitions ou nombre de poses ? Longueur exacte ou plage ?
- **[bloquant : génération]** Le filtrage par étiquettes fonctionne-t-il en « au moins une des étiquettes choisies » (OU) ou en « toutes » (ET) ? Toutes les transitions du flow doivent-elles satisfaire le filtre ?
- Quelle limite de répétition d'une washing machine, d'une transition ou d'une pose au sein d'un flow ?
- Peut-on sauvegarder, partager ou rejouer un flow généré ? Une graine aléatoire reproductible est-elle souhaitée ?
- Un flow de longueur zéro est-il possible (une seule pose qui peut à la fois commencer et terminer) ?

### Répertoire et duo
- **[bloquant : maîtrise]** La maîtrise se déclare-t-elle par rôle (« je maîtrise Bird en base mais pas en flyer ») ?
- **[bloquant : flow pour un duo]** La restriction porte-t-elle sur les éléments maîtrisés par les **deux** pratiquants, ou par chacun **dans son rôle** (la base maîtrise l'élément en base, le flyer en flyer) ?
- **[bloquant : flow pour un duo]** Le duo est-il composé de deux comptes de l'application, ce qui exigerait un accord ou une relation entre eux, ou d'un compte et d'un profil saisi localement ?
- Que devient une maîtrise si la pose ou la transition est modifiée, fusionnée ou retirée ?
- La maîtrise est-elle privée ou visible par d'autres (partenaires, public) ?
- Maîtriser une transition implique-t-il de maîtriser ses poses de départ et d'arrivée ? Un flow pour un duo exige-t-il que les poses aussi soient maîtrisées, ou seulement les transitions ?
- Peut-on générer un flow pour **un seul** pratiquant restreint à son répertoire, sans partenaire désigné ?

### Contribution et validation
- ~~Une modification est-elle visible (par son auteur, par tous) avant validation ?~~ Tranché (story 6, 2026-11-12) : non, la pose publiée reste inchangée jusqu'à l'acceptation, même pour son contributeur.
- ~~Faut-il un historique des versions d'un élément ?~~ Tranché (story 6, 2026-11-12) : pas d'historique consultable ; la proposition de modification garde la valeur d'avant pour la traçabilité.
- Plusieurs modifications en attente d'une même pose : une seule pour l'instant (story 6), règle à revoir peut-être plus tard.
- ~~Que deviennent les propositions en attente d'un compte supprimé (Q11) ?~~ Tranché (story 6, 2026-11-12) : elles restent dans la file de validation, de pose comme de modification ; un validateur les refuse.
- Définitions concrètes des niveaux de difficulté (Q52) : à rédiger avec l'expert acroyoga, non bloquant.
- ~~Qui devient validateur ? Faut-il distinguer validateur et administrateur ?~~ Tranché : un administrateur attribue les rôles ; validateur et administrateur sont distincts.
- ~~Un validateur peut-il accepter sa propre proposition ?~~ Tranché : sa proposition est publiée directement, sans validation (idem pour un administrateur).
- ~~Peut-on proposer une transition vers une pose elle-même encore en attente de validation ? Faut-il des propositions groupées ?~~ Tranché (story 7, 2026-11-13) : non, une transition relie deux poses publiées ; pas de propositions groupées.
- Modifier ou retirer une transition publiée : story ultérieure, symétrique de la story 6.
- Charte de validation des transitions (quand découper un mouvement qui traverse une position de passage, nom en usage entre d'autres poses) : à rédiger avec l'expert acroyoga, non bloquant.
- Refus : un motif est-il obligatoire ? L'auteur peut-il amender puis resoumettre ?
- Fusion de doublons : qui la fait et comment, avec quelles conséquences sur les transitions ?
- Photos : consentement des personnes photographiées, crédit de l'auteur, procédure de retrait, formats et taille.

### Identité et présentation
- Un compte est-il obligatoire pour générer un flow ? Et pour proposer ? (Consulter : non, cf. story 1.)
- Où afficher l'avertissement de responsabilité : à l'inscription, sur chaque flow, en pied de page ? Déjà sur le catalogue (story 3) et sur la page d'une pose, sous la légende, avec un rappel propre aux transitions (story 7).
- Quelles langues pour les contenus : noms en anglais (usage communautaire), descriptions multilingues ?
