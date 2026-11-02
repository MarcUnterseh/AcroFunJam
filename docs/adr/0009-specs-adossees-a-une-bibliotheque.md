# 0009. Specs d'acceptation adossées à une bibliothèque : vraie base PostgreSQL

- Statut : accepté
- Date : 2026-11-02
- Amende : [0006](0006-donnees-des-scenarios-d-acceptation.md)

## Contexte
L'ADR 0006 remplace nos propres ports par des faux dans les specs `@api`. Pour l'identité, le comportement vient d'ASP.NET Core Identity (inscription, connexion, unicité de l'adresse) et de son stockage EF Core : un faux de `IUserStore` testerait le faux, pas la bibliothèque. EF InMemory ignore les transactions et les migrations ; SQLite ne rejoue pas les migrations Npgsql ni le schéma `identity`.

## Décision
- Les features qui reposent sur une bibliothèque d'infrastructure (ici `specs/features/identite/`) sont taguées `@Integration` : Reqnroll les traduit en trait `Category=Integration`, exclu de la boucle rapide et exécuté en CI (Docker disponible).
- Elles tournent sur **un conteneur PostgreSQL Testcontainers par exécution** (`[BeforeTestRun]`), migrations appliquées une fois, base remise à zéro avant chaque scénario par **Respawn**.
- En environnement `Testing`, le coût du hachage des mots de passe est réduit (`PasswordHasherOptions.IterationCount = 1`).
- Les états de départ (« Soit Paul est administrateur ») passent par l'inscription réelle puis par la commande `AssignRole` résolue depuis le conteneur de services, sans la policy ; tant que la commande n'existe pas, un helper de test écrit le rôle.
- Pour nos propres ports, la règle de l'ADR 0006 (faux aux ports) reste la norme.

## Conséquences
- Les specs Identité sont plus lentes (démarrage du conteneur une fois, quelques dizaines de ms par scénario) mais vérifient la vraie bibliothèque et la vraie base.
- Le hook de fin de tour (tests rapides) ne les exécute pas : lancer `dotnet test --solution api/AcroFunJam.slnx` avant de livrer.
