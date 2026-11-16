# Zone « Étiqueter » (page d'une pose, validateurs et administrateurs)

Story 8. Dans l'élément d'une transition publiée (`element-transition.md`), le validateur choisit directement les étiquettes de la transition, sans quitter la page. Présente **même quand la transition n'a aucune étiquette**. Absente du DOM pour un visiteur ou un utilisateur. Écran : `../ecrans/8-etiquettes.md`. Aucun nouveau token.

## Fermée : le bouton « Étiqueter »

```
│ Étiquettes (dynamique) (pop)                 │
│ ▸ Ce que veulent dire ces étiquettes         │
│ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │  <- filet pointillé divider : début de la partie « gestion »
│ [ Étiqueter ]                                │  <- bouton secondaire, 44 px, largeur du contenu
```

| Élément | Tokens |
|---|---|
| Pied de gestion | bordure haute `borderWidth` **pointillée** `divider` (même code que la zone de décision des cartes de proposition : « ce qui suit est une action de validateur ») ; padding haut `spacing.sm` |
| Bouton « Étiqueter » | `bouton.md`, **secondaire**, hauteur `sizes.touchTarget` (44), padding horizontal `spacing.md`, largeur du contenu (même à 320 px) ; nom accessible complété en texte masqué : « Étiqueter Pop to Bird » / « Étiqueter de Bird vers Folded Leaf » (libellé : `ux-expert`) |

Ordre dans l'élément : titre, autre pose, difficultés, ligne « Étiquettes », description, repli, **pied de gestion**. Le bouton reste en bas, au même endroit dans toutes les transitions.

## Ouverte

Le bouton est **remplacé** par la zone (pas de doublon « Étiqueter » + « Annuler »).

```
│ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │
│ ┌──────────────────────────────────────────┐ │  <- zone : fond background, radius.sm, padding md
│ │ Étiquettes de la transition              │ │  <- legend (proposée)
│ │ (☑ dynamique) (☐ icarien) (☐ inversion)  │ │  <- groupe-cases-pastilles.md, cochées = actuelles
│ │ (☐ lunaire) (☑ pop) (☐ vrille) (☐ whip)  │ │
│ │ ┃(i) « dynamique » est ajoutée : …       │ │
│ │ ▸ Ce que veulent dire les étiquettes     │ │
│ │ [Enregistrer les étiquettes] [Annuler]   │ │  <- primaire + secondaire
│ └──────────────────────────────────────────┘ │
```

| Élément | Tokens |
|---|---|
| Zone (`form`) | fond **`background`** (la détache de la `surface` de l'élément ; les pastilles `surface` y ressortent) ; rayon `radius.sm` ; padding `spacing.md` ; `display: grid`, écart `spacing.md` |
| Groupe | `groupe-cases-pastilles.md`, legend « Étiquettes de la transition » (proposée), cases cochées = étiquettes actuelles ; aucune aide (le contexte suffit) |
| Repli | `repli-descriptions-etiquettes.md`, « Ce que veulent dire les étiquettes » (toute la liste) |
| Alerte | `alerte-formulaire.md` (injoignable, session expirée, étiquette retirée entre-temps), en tête de zone |
| Actions | « Enregistrer les étiquettes » **primaire** (un primaire par zone ouverte, règle de `bouton.md`), « Annuler » secondaire ; empilées pleine largeur sous `breakpoints.md` (conteneur), en ligne au-delà, écart `spacing.sm` ; en cours : « Enregistrement… » (proposé), `aria-disabled` |

Tout décocher est permis (P2) : le bouton reste actif, aucun message d'erreur.

## Après l'enregistrement

La zone se referme, le bouton « Étiqueter » revient, la ligne « Étiquettes » et le repli sont à jour (ou disparaissent s'il n'y en a plus) ; une washing machine est mise à jour dans les deux sections. Retour : annonce de statut (`annonce-statut.md`) « Étiquettes enregistrées. » (proposé) ; **aucun** bandeau ni couleur de succès dans l'élément (la ligne mise à jour est la preuve). Focus : `ux-expert` (recommandé : sur le bouton « Étiqueter »).

## Contraste élevé, mouvement

Zone avec contour `CanvasText` ; pied pointillé en `CanvasText` inutile (décoratif). Aucune animation d'ouverture.

## Mobile (React Native)

Hors périmètre de la story 8.
