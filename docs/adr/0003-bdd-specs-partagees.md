# 0003. Spécifications Gherkin partagées, en français

- Statut : accepté
- Date : 2026-11-02

## Contexte
Trois canaux (API, web, mobile) implémentent les mêmes comportements métier.

## Décision
- Une source unique : `specs/features/<contexte>/*.feature`, rédigée en français (`# language: fr`), en style déclaratif.
- Le tag choisit le runner : `@api` → Reqnroll, `@web` → playwright-bdd, `@mobile` → flows Maestro (correspondance par nom de scénario). `@wip` exclut le scénario de la CI.
- Code en anglais, avec la traduction des termes dans le glossaire.

## Conséquences
Les règles métier sont vérifiées une fois côté API ; les canaux front vérifient les parcours. Maestro ne lisant pas le Gherkin, la cohérence des flows mobiles est maintenue à la main.
