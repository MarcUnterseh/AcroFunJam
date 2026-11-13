# 0031. Direction visuelle « Soleil et Lune », thème sombre tokenisé, polices hébergées

- Statut : accepté
- Date : 2026-11-13

## Contexte
L'identité livrée jusqu'à la story 7 (terre cuite, police système, rayons de 8 px) est jugée trop générique (« Bootstrap ») par le porteur du produit. Une maquette, `docs/design/maquettes/soleil-lune/`, propose une direction propre à l'acroyoga : une pratique **solaire** (acrobatique) et une pratique **lunaire** (thérapeutique) ; les rôles codés par la couleur (base = terre, flyer = ciel) ; la difficulté en phases de lune ; un seul moment spectaculaire (l'en-tête de la page d'une pose). Le thème sombre n'était qu'une proposition non tokenisée (`principes.md`, story 7). Deux polices de caractère (Unbounded, Figtree) sont nécessaires, sans requête vers un tiers (RGPD).

Contraintes : ne changer que l'apparence (libellés, comportements et tests d'accessibilité validés intacts) ; tokens seule source des valeurs (ADR 0012) ; contrastes WCAG 2.2 AA vérifiés.

## Options envisagées
1. **Garder l'identité actuelle** et l'affiner : sans risque, mais ne répond pas au besoin d'une identité propre.
2. **Adopter « Soleil et Lune » sans thème sombre** : moins de travail, mais l'aube et la nuit sont le cœur de l'idée.
3. **Adopter « Soleil et Lune » avec un thème sombre tokenisé qui suit le système, polices auto-hébergées** : l'idée entière ; double palette à vérifier.
4. Polices via Google Fonts : simple, mais requête vers un tiers (adresse IP transmise) : écarté.

## Décision
Option 3 :
- **Tokens** (`@acrofunjam/ui-tokens`) : nouvelles valeurs de `colors` (aube), nouveaux rôles `base`, `baseSurface`, `flyer`, `flyerSurface`, `sun` (décoratif seulement), `sunStrong`, `sunSurface`, `skyText` ; `colorsDark` (nuit) avec les mêmes clés ; `sky` / `skyDark` (dégradé du ciel, astre, halo, grain : chaînes CSS, seules couleurs écrites hors palette) ; `radius` 10 / 16 / 26 / pilule ; `typography` avec une famille d'affichage et une famille de texte (piles web avec repli, noms de familles mobiles).
- **Thème** : il suit `prefers-color-scheme` (web) et `useColorScheme` (mobile). Pas de bascule Soleil / Lune dans le produit. `toCssVariables()` redéfinit les couleurs et le ciel sous `@media (prefers-color-scheme: dark)`.
- **Contrastes** : un test unitaire (`contrast.test.ts`) recalcule les ratios des couples documentés dans les deux thèmes (4,5:1 texte, 3:1 contrôles et icônes porteuses de sens) ; `sun` clair (2,2:1) en est exclu car purement décoratif.
- **Polices** : Unbounded (titres, noms de poses) et Figtree (texte), licence OFL, **embarquées** : `@fontsource/*` sur le web (servies par le site), `@expo-google-fonts/*` + `expo-font` sur le mobile (fichiers dans le paquet de l'app, aucun téléchargement à l'exécution).

## Conséquences
- Tout le site change d'ambiance sans changer de structure : les composants gardent leurs classes, rôles et noms accessibles.
- Deux palettes à maintenir ; le test de contraste empêche une régression silencieuse. Les captures (`npm run screenshots`) sont prises en clair et en sombre.
- Les polices ajoutent ~100 ko (woff2, sous-ensembles chargés à la demande via `unicode-range`) ; le texte s'affiche d'abord dans la police de repli (`font-display: swap`).
- Les glyphes des poses ne sont pas livrés : un emplacement est réservé sur la carte (`composants/carte-pose.md`).
- `principes.md` est réécrit ; les décisions « police système » et « terre cuite » du 2026-11-03 sont remplacées.
