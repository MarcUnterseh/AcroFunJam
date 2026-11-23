# Case de confirmation (case des droits)

Story 10 (R9, décision 2). Une **seule** case, **jamais cochée par défaut**, au long libellé : « Je confirme que l'auteur de la photo a autorisé sa publication sur AcroFunJam, que chaque personne photographiée l'a acceptée, et qu'aucune personne mineure n'y est reconnaissable. ». Variante d'une tuile (`groupe-tuiles-radio.md`) pour une case seule : toute la tuile est cliquable, la phrase se lit d'un bloc. Aucun nouveau token.

## Structure

```
┌──────────────────────────────────┐   <- tuile : surface, contour border, radius.md
│ ☐  Je confirme que l'auteur de la│   <- case 20 px alignée sur la 1re ligne
│    photo a autorisé sa           │      libellé size.md, regular, text
│    publication sur AcroFunJam,   │
│    que chaque personne photogra- │
│    phiée l'a acceptée, et qu'au- │
│    cune personne mineure n'y est │
│    reconnaissable.               │
└──────────────────────────────────┘
AcroFunJam garde ta confirmation avec la photo (ton compte et la date).   <- aide, size.sm, textMuted
(!) Confirme tes droits sur la photo et l'accord des personnes photographiées.   <- erreur
```

| Élément | Tokens |
|---|---|
| Tuile (`label.confirm-box`) | `display: flex`, `align-items: flex-start`, écart `spacing.sm` ; padding `spacing.sm spacing.md` ; `min-block-size: sizes.control` ; fond `surface`, contour `borderWidth` `border`, rayon `radius.md` ; curseur `pointer` |
| Case | `input type="checkbox"`, `sizes.icon` (20), `accent-color: selected`, marge haute pour s'aligner sur la première ligne (`(1lh - 20px) / 2`, soit 2 px à `size.md`) |
| Libellé | `size.md`, `regular`, `text`, `overflow-wrap: anywhere` ; **pas de semi-gras une fois cochée** (une phrase de trois lignes en gras pèse trop) |
| Aide | `size.sm`, `textMuted`, `spacing.xs` sous la tuile ; liée par `aria-describedby` |
| Erreur | `champ.md` (icône erreur, `danger`, `semibold`), sous l'aide |

## États

| État | Rendu |
|---|---|
| Repos | contour 1 px `border` |
| Survol (pointeur fin) | fond `surfaceHover`, contour `text` |
| Focus (`:focus-visible` de la case) | anneau `focus` 3 px décalé de 2 px **autour de la tuile** (`:has(input:focus-visible)`) |
| Cochée | coche native + fond `selectedSurface` + contour **2 px `selected`** (padding compensé) ; jamais à l'ouverture |
| Invalide | contour **2 px `danger`** + message d'erreur ; cochée ensuite : le style « cochée » remplace l'erreur dès que le message disparaît |

## Contrastes

`text` sur `surface` / `selectedSurface` : 16,2 / 13,2:1 (aube), 14,4 / 11,8:1 (nuit) ; `border` sur `surface` 3,4:1 ; `selected` sur `selectedSurface` 7,8 / 8,6:1 ; `danger` sur `surface` 6,6 / ≥ 7,9:1.

## Couleurs forcées

Contour `CanvasText` ; cochée : contour `Highlight` (comme `groupe-cases-pastilles.md`).
