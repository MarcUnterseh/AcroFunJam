# Encadré « En bref »

**Statut : proposition du 2026-11-26** (story « Mentions légales et confidentialité », UX-33). Utilisé en tête de la politique de confidentialité ; réutilisable pour tout texte long qui gagne à être résumé (conditions d'utilisation, story à venir). Maquette : `../maquettes/11-informations-legales.html`.

L'essentiel d'un texte long en 4 à 5 phrases courtes, avant le détail. Il **résume**, il n'alerte pas : ni couleur d'état (`info`, `success`, `danger`), ni barre d'accent (réservée aux alertes et bandeaux).

## Structure

```
<section class="summary-box" aria-labelledby="en-bref">
  <h2 id="en-bref"><svg class="icon" aria-hidden="true">soleil</svg>En bref</h2>
  <ul>
    <li>…</li>                 4 à 5 puces, une idée chacune, une à deux lignes
  </ul>
</section>
```

- Un vrai `h2` : l'encadré apparaît dans la liste des titres du lecteur d'écran, au même niveau que les rubriques ; il n'est **pas** repris dans le sommaire (il le précède).
- Les puces peuvent contenir un lien (adresse de contact, rubrique détaillée).

## Tokens

| Élément | Tokens | Contraste (aube / nuit) |
|---|---|---|
| Boîte | fond `surface`, bordure `borderWidth` `divider` (décorative), rayon `radius.md` (comme la note de sécurité) ; padding `spacing.md` (< 40em), `spacing.lg` (≥ 40em) ; marge basse `spacing.lg` | — |
| Titre « En bref » | style des `h2` de la page (Unbounded `weight.medium`, `size.lg`, `lineHeight.tight`), marge haute 0, basse `spacing.sm` ; `inline-flex`, écart `spacing.sm` | `text` / `surface` : 16,2 / 14,4 |
| Icône soleil | `sizes.icon` (20), couleur `sun`, **décorative** (`aria-hidden`) : le mot « En bref » porte le sens | (décoratif) |
| Liste | `size.md`, `lineHeight.normal`, `text` ; retrait `spacing.lg` ; écart entre puces `spacing.xs` ; puce native, couleur `textMuted` (`::marker`) | `text` / `surface` : 16,2 / 14,4 ; puce `textMuted` 7,0 / 7,3 |
| Lien dans une puce | `primary` souligné | 7,1 / 8,1 sur `surface` |

## États

Contenu statique : aucun état propre. Les liens qu'il contient suivent la règle commune (survol 2 px, anneau `focus`).

## Couleurs forcées

La bordure devient `CanvasText` : la boîte reste délimitée ; l'icône prend `CanvasText` (elle reste décorative).
