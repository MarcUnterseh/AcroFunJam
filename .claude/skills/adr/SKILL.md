---
name: adr
description: Rédige un Architecture Decision Record dans docs/adr/ (numérotation automatique, format MADR court). À utiliser pour toute décision structurante (choix de techno, découpage de contextes, pattern transverse, entorse à une règle).
argument-hint: "<titre de la décision>"
---

# /adr

Décision : $ARGUMENTS

1. Liste `docs/adr/` et prends le numéro suivant, sur 4 chiffres.
2. Crée `docs/adr/NNNN-titre-en-kebab-case.md` :

```markdown
# NNNN. <Titre>

- Statut : proposé | accepté | remplacé par [NNNN](NNNN-xxx.md)
- Date : AAAA-MM-JJ

## Contexte
<forces en présence, contraintes, problème>

## Options envisagées
1. <option> : avantages / inconvénients
2. ...

## Décision
<option retenue et pourquoi>

## Conséquences
<positives, négatives, ce qu'il faudra surveiller>
```
3. Si la décision remplace un ADR, passe l'ancien au statut « remplacé par ».
4. Ajoute une ligne dans l'index `docs/adr/README.md`.
5. Statut « proposé » tant que l'utilisateur n'a pas validé.
