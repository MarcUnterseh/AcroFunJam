# E2E mobile (Maestro)

Maestro ne lit pas le Gherkin : chaque scénario `@mobile` de `specs/features/**` a un flow YAML ici,
**nommé d'après le titre du scénario** (ADR 0003, skill `gherkin`).

## Installation

- macOS / Linux : `curl -fsSL "https://get.maestro.mobile.dev" | bash`
- Windows : via WSL2 (même commande), avec un émulateur Android accessible depuis WSL.
- Prérequis : Java 17+, un émulateur Android ou un simulateur iOS (macOS) démarré.

## Exécution

```bash
npx expo run:android            # ou run:ios / un build EAS "development" installé sur l'appareil
maestro test e2e/               # tous les flows
maestro test e2e/<flow>.yaml    # un seul flow
```

Les flows utilisent `appId: com.acrofunjam.app` et des sélecteurs par texte ou `testID`.
