# Flows d'une version release

Ces flows rouvrent l'application hors ligne. Une version de développement recharge son code depuis Metro à chaque
ouverture : hors ligne, elle ne démarre pas. Ils demandent une version release, qui embarque son code :

```bash
npx expo run:android --variant release
node e2e/run.mjs --dir release
```
