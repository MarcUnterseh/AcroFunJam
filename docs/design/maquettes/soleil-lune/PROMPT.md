# Direction « Soleil et Lune » : prompt pour Claude Code

Contenu du dossier `docs/design/maquettes/soleil-lune/` :

- `maquette.html` : la maquette de référence (ouvrir dans un navigateur ; boutons Soleil / Lune en haut) ;
- `captures/` : chaque écran en thème clair et sombre (`0-systeme`, `1-catalogue`, `2-page-pose`, `3-formulaire`, `4-validation-succes`) ;
- ce fichier.

Mode d'emploi : dézipper à la racine du dépôt, lancer `claude` dans le dépôt, puis coller le prompt ci-dessous.

---

## Prompt à coller

Je veux adopter une nouvelle identité visuelle pour AcroFunJam, la direction « Soleil et Lune ». La référence est dans `docs/design/maquettes/soleil-lune/` : ouvre `maquette.html` (lis tout le CSS, c'est la source des valeurs) et regarde les captures dans `captures/`. Elle remplace le style actuel, que je trouve trop générique (« Bootstrap »). Je l'ai validée sur le principe.

### L'idée

- L'acroyoga a une pratique **solaire** (acrobatique) et une pratique **lunaire** (thérapeutique) : le thème clair est l'**aube**, le thème sombre la **nuit**.
- **Rôles codés par la couleur, partout** : la base en vert terre, le flyer en bleu ciel (pastilles « Base » / « Flyer » sur les cartes, les transitions, le formulaire). Le mot est toujours écrit : la couleur n'est jamais seule porteuse du sens.
- **Difficulté en phases de lune** à la place des 4 points : croissant = Découverte, demi-lune = Débutant, gibbeuse = Intermédiaire, pleine lune = Avancé. Les SVG sont dans le `<defs>` de la maquette (`#m1` à `#m4`). Dans le formulaire, on choisit en touchant la phase (tuiles radio, cochée = fond et bordure 2 px de la couleur du rôle).
- **Bornes de flow** : icônes lever (`#i-rise`) et coucher (`#i-set`) de soleil ; « non » = libellé barré en `textMuted`.
- **Transitions** : trajectoire en pointillés (`#i-arc`) au lieu de la flèche ; boucle (`#i-loop`) pour une washing machine.
- **Un seul moment spectaculaire** : l'en-tête de la page d'une pose, nom en très grand (Unbounded 700) sous un ciel en dégradé, astre (soleil le jour, lune la nuit) qui se lève au chargement, grain léger, horizon ondulé. Animation coupée sous `prefers-reduced-motion`. Le reste reste sobre, en particulier la file de validation.
- **Formes** : boutons en pilule, cartes à grand rayon (26 px), pastilles en pilule ; rayons différents selon la hiérarchie.
- **Typo** : Unbounded (titres, noms de poses) + Figtree (texte). À héberger nous-mêmes (`@fontsource/unbounded`, `@fontsource/figtree` côté web ; `expo-font` côté mobile), **pas** via Google Fonts (RGPD).
- **Logo** : demi-cercle terre qui porte un soleil (`#logo`).
- **Glyphes de pose** (`#g-bird`, `#g-throne`, `#g-star`) : esquisses de principe seulement, à ne pas livrer tels quels ; prévoir l'emplacement, on les fera dessiner.

### Valeurs (rôles existants → nouvelles valeurs)

Clair :
| Token | Valeur |
|---|---|
| background | `#F5F2FA` (brume) |
| surface | `#FFFFFF` (cartes) |
| surfaceHover | `#EDE8F7` |
| text | `#211C3B` (nuit) |
| textMuted | `#5B5577` |
| border | `#8F87A8` |
| divider | `#DCD5EA` |
| primary / primaryHover | `#5B3FC4` / `#47309F` (crépuscule) ; primaryActive à dériver |
| primaryContrast | `#FFFFFF` |
| focus / info | `#1D69AE` ; infoSurface `#DFEAFA` |
| danger / dangerSurface | `#B42318` / `#FDECEA` |
| success / successSurface | `#2C6A4C` / `#DCEFE3` |
| badge | `#211C3B` |

Nouveaux rôles : `base` `#2C6A4C`, `baseSurface` `#DCEFE3`, `flyer` `#1D69AE`, `flyerSurface` `#DFEAFA`, `sun` `#E8961E` (décoratif uniquement : astre, logo), `sunStrong` `#A15C00` (icônes soleil, trajectoires), `sunSurface` `#FFEBC4` (encadré de sécurité « spotter »). Plus le dégradé du ciel et l'astre (voir `--sky` et `--orb` dans la maquette).

Sombre (même rôles) : background `#110F24`, surface `#1A1733`, surfaceHover `#252148`, text `#ECE8F8`, textMuted `#ABA4C8`, divider `#322D57`, border `#6F6896`, primary `#B6A6FF`, primaryHover `#CDC2FF`, primaryContrast `#15122B`, sun et sunStrong `#F5C15A`, sunSurface `#3A2E14`, base `#82CDA2`, baseSurface `#163024`, flyer / focus / info `#8FC1F3`, flyerSurface / infoSurface `#13283F`, danger `#FF9C8F`, dangerSurface `#3A1714`, success `#82CDA2`, successSurface `#163024`.

Contrastes déjà calculés (WCAG) — à revérifier et à reporter dans `principes.md` :
- clair : text/background 14,7 ; textMuted/background 6,3, /surfaceHover 5,8 ; border/background 3,06 (limite, OK pour un contrôle) ; blanc/primary 7,1 ; primary/background 6,4 ; base/baseSurface 5,4 ; flyer/flyerSurface 4,7 ; blanc sur base 6,4, sur flyer 5,7 ; sunStrong/background 4,7 ; focus/background 5,2 ; danger/dangerSurface 5,8 ; text sur le ciel ≥ 6,3 sur toute la hauteur du dégradé.
- sombre : tous les couples ≥ 7, sauf border/surface 3,4 et textMuted/sunSurface 5,6.
- `sun` clair `#E8961E` échoue (2,2:1) : jamais pour du texte ni une icône porteuse de sens.

### Comment procéder

Respecte la méthode du dépôt (CLAUDE.md) et ses agents. Propose-moi d'abord un plan découpé en PR, puis attends mon accord. Ordre suggéré :

1. **ADR** (`/adr`) : nouvelle direction visuelle, thème sombre tokenisé (aujourd'hui « proposition non tokenisée » dans `principes.md`), polices hébergées.
2. **Tokens** — agent `ui-designer` : mettre à jour `front/packages/ui-tokens/src/index.ts` (valeurs, nouveaux rôles, `radius`, `typography` avec familles display et texte, `colorsDark`) ; puis en TDD, faire produire par `toCssVariables()` la redéfinition sombre sous `@media (prefers-color-scheme: dark)` (commence par un test qui échoue dans `css-variables.test.ts`). Réécrire `docs/design/principes.md` (intention, palette, contrastes). Cette PR change déjà l'ambiance de tout le site.
3. **Polices** : `@fontsource` côté web, `expo-font` côté mobile.
4. **Composants**, un par PR, avec l'`ux-expert` en revue (états, accessibilité, libellés) puis le `ui-designer` (spec dans `docs/design/composants/`) : `DifficultyDots` → échelle lunaire (et `legende-echelle.md`), pastille de rôle, carte de pose, tuiles radio en phases, bouton pilule, élément de transition avec trajectoire, en-tête de la page pose (ciel + astre).
5. **Écrans** : catalogue, page pose, formulaire de transition, file de validation et « Mes propositions », puis l'app mobile.
6. À chaque étape, `npm run screenshots --prefix front/apps/web` et compare avec `captures/`.

Garde intacts les comportements, les libellés validés et les tests d'accessibilité existants ; ne change que l'apparence, sauf accord de ma part.
