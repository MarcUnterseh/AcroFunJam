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
