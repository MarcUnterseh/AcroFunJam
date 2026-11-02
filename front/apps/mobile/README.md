# @acrofunjam/mobile

App Android + iOS (Expo, Expo Router). Routes dans `src/app/`, écrans dans `src/screens/`.

```bash
npm start          # serveur de dev Expo
npm test           # Jest + jest-expo + Testing Library React Native
npm run typecheck
```

Builds de stores : EAS (`eas.json`, profils `development`, `preview`, `production`) — `npx eas-cli build -p android|ios --profile <profil>`.
E2E : voir `e2e/README.md` (Maestro).
