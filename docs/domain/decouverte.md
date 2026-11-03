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
  - Folded Leaf peut seulement terminer ;
  - Whale peut seulement commencer (convention d’enseignement) ;
  - Bow ne peut ni l’un ni l’autre ;
  - Hand-to-Hand (L-base) est intermédiaire en base, avancé en flyer.

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

### Découpage des stories suivantes (décidé le 2026-11-02)
1. **Comptes et rôles** (Identité) : s’inscrire, se connecter, un administrateur attribue ou retire un rôle.
2. **Proposer une pose** (Contribution) : reprend les règles de contenu de `specs/features/catalogue/publier-une-pose.feature` (brouillon) ; publication directe pour un validateur ou un administrateur.
3. **Valider une proposition** (Contribution → Catalogue) : accepter (publication) ou refuser.
4. **Proposer une modification** d’une pose publiée.

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
- Une transition doit-elle porter au moins une étiquette ?
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
- Une modification est-elle visible (par son auteur, par tous) avant validation ?
- Faut-il un historique des versions d'un élément ?
- ~~Qui devient validateur ? Faut-il distinguer validateur et administrateur ?~~ Tranché : un administrateur attribue les rôles ; validateur et administrateur sont distincts.
- ~~Un validateur peut-il accepter sa propre proposition ?~~ Tranché : sa proposition est publiée directement, sans validation (idem pour un administrateur).
- Peut-on proposer une transition vers une pose elle-même encore en attente de validation ? Faut-il des propositions groupées ?
- Refus : un motif est-il obligatoire ? L'auteur peut-il amender puis resoumettre ?
- Fusion de doublons : qui la fait et comment, avec quelles conséquences sur les transitions ?
- Photos : consentement des personnes photographiées, crédit de l'auteur, procédure de retrait, formats et taille.

### Identité et présentation
- Un compte est-il obligatoire pour générer un flow ? Et pour proposer ? (Consulter : non, cf. story 1.)
- Où afficher l'avertissement de responsabilité : à l'inscription, sur chaque flow, en pied de page ?
- Quelles langues pour les contenus : noms en anglais (usage communautaire), descriptions multilingues ?
