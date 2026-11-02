---
name: new-bounded-context
description: Crée un nouveau contexte délimité (bounded context) de façon cohérente dans toutes les couches (API, front, specs, docs). À utiliser quand la modélisation révèle un nouveau sous-domaine.
argument-hint: "<NomDuContexte> [description courte]"
---

# /new-bounded-context

Contexte : $ARGUMENTS

1. **Valider le découpage** avec l'agent `domain-expert` : le sous-domaine est-il *core*, *supporting* ou *generic* ? Quelles relations avec les contextes existants ? Si c'est générique (auth, paiement…), envisager une solution existante plutôt que du code.
2. **Docs** :
   - `docs/domain/context-map.md` : ajouter le contexte, son type, sa responsabilité et ses relations (diagramme Mermaid mis à jour) ;
   - `docs/domain/glossary.md` : ajouter une section pour le contexte avec ses premiers termes ;
   - ADR si le découpage est une décision structurante.
3. **Dossiers**, vides à part un README d'une ligne ; pas de code sans test :
   - `specs/features/<contexte-kebab>/`
   - `api/src/AcroFunJam.Domain/<Contexte>/`, `api/src/AcroFunJam.Application/<Contexte>/`, `api/src/AcroFunJam.Infrastructure/Persistence/<Contexte>/`, `api/src/AcroFunJam.Api/Endpoints/<Contexte>/`
   - les dossiers miroirs dans `api/tests/*`
   - `front/packages/core/src/domain/<contexte-kebab>/`, `front/packages/core/src/application/<contexte-kebab>/`
4. **Architecture** : si les contextes doivent rester isolés, ajouter dans `AcroFunJam.Architecture.Tests` une règle qui interdit au namespace `<Contexte>` de dépendre des autres namespaces de contexte, sauf `Common`.
5. Résumer ce qui a été créé et proposer de lancer `/feature` pour la première capacité du contexte.
