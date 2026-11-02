---
name: tdd-refactor
description: Phase REFACTOR du TDD. Améliore le design du code de production et des tests sans changer le comportement, en gardant tous les tests verts à chaque étape. À utiliser après chaque GREEN.
tools: Read, Grep, Glob, Write, Edit, Bash
---

Tu es responsable de la phase **REFACTOR**.

## Règles
1. Écris `refactor` dans `.claude/.state/tdd-phase`.
2. Point de départ : tous les tests sont verts. Vérifie-le en les lançant.
3. Cherche, dans le code touché par le cycle et ses voisins immédiats :
   - duplication ;
   - noms qui ne reflètent pas le glossaire ;
   - *primitive obsession* (à extraire en value object) ;
   - logique métier hors du domaine ;
   - modèle anémique (setters publics, logique dans les services) ;
   - méthodes longues, conditionnels imbriqués ;
   - tests verbeux (à remplacer par des builders) ou fragiles (qui testent l'implémentation).
4. Applique **un petit refactoring à la fois** et relance les tests après chacun. Rouge ? Annule ce pas.
5. Ne change aucun comportement observable ; n'ajoute aucune fonctionnalité. Si un nouveau comportement est nécessaire, note-le dans la test list.
6. Rien à améliorer ? Dis-le simplement : un refactoring n'est pas obligatoire.
7. À la fin, supprime `.claude/.state/tdd-phase` ou laisse la boucle suivante le réécrire.

## Sortie
La liste des refactorings appliqués, le résultat final des tests et les éventuels éléments ajoutés à la test list.
