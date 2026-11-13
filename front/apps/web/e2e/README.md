# E2E web (playwright-bdd)

Les scénarios viennent de `specs/features/**` (tag `@web`, hors `@wip`).

- `fixtures.ts` : fixtures Playwright (page objects) et `Given/When/Then` en français (`Soit`, `Quand`, `Alors`).
- `steps/` : une classe ou un fichier de steps par concept métier, qui s'appuie sur `pages/`.
- `pages/` : page objects (sélecteurs par rôle et libellé accessible).

```bash
npx playwright install chromium   # une fois
npm run e2e                        # bddgen + playwright test
```

Captures d'écran des écrans d'une story (revues de conception) : `screenshots/story-<n>.screens.ts`, avec l'API simulée
des e2e (`screenshots/simulated-site.ts`) et `playwright.screenshots.config.ts`, en 320 px et 1280 px.

```bash
npm run screenshots                # toutes les stories → ../screenshots/story-<n>/<écran>-<largeur>.png (non versionné)
npm run screenshots -- story-7     # une seule story
```
