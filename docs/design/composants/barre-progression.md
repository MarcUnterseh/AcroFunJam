# Barre de progression

Story 10 (R19, ADR 0039). Montre l'envoi d'une photo, puis sa préparation par AcroFunJam (traitement synchrone). Élément natif `<progress>`, stylé ; jamais seule : un libellé écrit dit ce qui se passe et le pourcentage est écrit. Token nouveau : `sizes.progress` (8).

## Structure

Envoi (déterminé) :

```
Envoi de la photo                       42 %     <- libellé (size.sm, semibold, text) + pourcentage (size.sm, tabular-nums)
████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      <- piste surfaceHover, remplissage primary, 8 px, pilule
```

Préparation (indéterminée) :

```
Préparation de la photo…
░░░░░░░░░██████████░░░░░░░░░░░░░░░░░░░░░░░░░      <- segment qui glisse ; immobile et hachuré en mouvement réduit
```

Balisage : `div.progress` > `label[for]` (libellé + pourcentage en `span`, `aria-hidden` sur le pourcentage : `<progress>` l'annonce déjà) + `progress[max=100][value=42]` ; indéterminée : `progress` sans `value`.

| Élément | Tokens |
|---|---|
| Bloc | `display: grid`, écart `spacing.xs` ; pleine largeur de la colonne du formulaire |
| Ligne du libellé | `display: flex`, `justify-content: space-between`, `align-items: baseline`, écart `spacing.sm` ; libellé `size.sm` `semibold` `text` ; pourcentage `size.sm` `semibold` `text`, `tabular-nums` |
| Piste | `appearance: none`, `inline-size: 100%`, `block-size: sizes.progress` (8), rayon `pill`, fond **`surfaceHover`**, aucune bordure ; `::-webkit-progress-bar` idem |
| Remplissage | `::-webkit-progress-value` et `::-moz-progress-bar` : fond **`primary`** (5,9:1 / 7,1:1 sur la piste), rayon `pill` |
| Indéterminée (`:indeterminate`) | segment `primary` de 30 % qui va et vient (`background` en dégradé sur la piste, animation 1,4 s, `linear`, infinie) |
| Mouvement réduit | `prefers-reduced-motion: reduce` : pas d'animation ; la piste entière est **hachurée** (`repeating-linear-gradient` 45° `primary` / `surfaceHover`, bandes de `spacing.xs`) ; le libellé « Préparation de la photo… » porte le sens |

## Contrastes

| Couple | Aube | Nuit |
|---|---|---|
| `primary` (remplissage) sur `surfaceHover` (piste), 3:1 | 5,9:1 | 7,1:1 |
| `text` (libellé) sur `surface` / `background` | 16,2 / 14,7:1 | 14,4 / 15,6:1 |

La piste contre le fond (`surfaceHover` sur `surface`, 1,2:1) est décorative : la progression se lit par le remplissage et le pourcentage écrit.

## Story 12 : envoi d'une vidéo

Même composant, sans changement visuel : « Envoi de la vidéo » + « 42 % » (déterminée), puis « Vérification de la vidéo… » (indéterminée, pendant les contrôles de l'envoi, UX-59) ; bouton primaire « Envoi de la vidéo… » (`aria-disabled`), « Annuler l'envoi » secondaire. La **préparation** qui suit (des dizaines de secondes, en différé) n'a **pas** de barre : elle se lit sur la page de la pose (« En préparation », `bloc-preparation-video.md`).

## Couleurs forcées

`forced-colors: active` : rendu natif du système (`appearance: auto`) ; contour `CanvasText` sur la piste.

## Mobile (React Native)

Hors périmètre de la story 10.
