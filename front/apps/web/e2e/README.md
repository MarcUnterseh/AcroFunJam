# E2E web (playwright-bdd)

Les scénarios viennent de `specs/features/**` (tag `@web`, hors `@wip`).

- `fixtures.ts` : fixtures Playwright (page objects) et `Given/When/Then` en français (`Soit`, `Quand`, `Alors`).
- `steps/` : une classe ou un fichier de steps par concept métier, qui s'appuie sur `pages/`.
- `pages/` : page objects (sélecteurs par rôle et libellé accessible).

```bash
npx playwright install chromium   # une fois
npm run e2e                        # bddgen + playwright test
```
