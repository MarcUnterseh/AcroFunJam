# 0012. Design tokens exposés au web en variables CSS

- Statut : accepté
- Date : 2026-11-03

## Contexte
`@acrofunjam/ui-tokens` est la seule source des valeurs visuelles (ADR 0001, `docs/design/principes.md`). Le mobile les consomme en objets JavaScript (`StyleSheet`). Côté web, des styles en ligne perdraient `:focus-visible`, `:hover`, les media queries et la cascade.

## Décision
- `ui-tokens` fournit une fonction pure `toCssVariables(): string` qui produit les déclarations `--afj-<groupe>-<nom>` (ex. `--afj-color-primary`, `--afj-spacing-md`), testée par Vitest.
- Le site web génère au build une feuille `tokens.css` (`:root { … }`) à partir de cette fonction et l'importe avant ses styles ; le CSS du site n'utilise que ces variables.
- Une règle de lint (stylelint) interdit les couleurs et longueurs écrites en dur dans le CSS du site.
- Le mobile continue d'importer les objets.

## Conséquences
- Changer un token met à jour le web et le mobile sans toucher aux écrans.
- Une dépendance de développement de plus (stylelint) dans le front.
