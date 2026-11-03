# Champ de formulaire

Champ texte avec libellé, aide facultative et message d'erreur. Base du champ mot de passe (`champ-mot-de-passe.md`).

## Structure (de haut en bas)

```
Adresse e-mail                    <- libellé (label for=…)
┌──────────────────────────────┐
│ alice@example.org            │  <- champ, 48 px
└──────────────────────────────┘
Ton mot de passe doit contenir au moins 10 caractères.           <- aide (facultative)
(!) Saisis une adresse e-mail      <- erreur (seulement si invalide)
    valide, par exemple nom@example.org.
```

| Élément | Typo | Couleur | Espacement |
|---|---|---|---|
| Libellé | `size.md`, `weight.semibold` | `text` | `spacing.sm` au-dessus du champ |
| Champ | `size.md` (16 px, évite le zoom iOS), `regular` | texte `text`, fond `background` | hauteur `sizes.control`, padding horizontal `spacing.md`, rayon `radius.md`, bordure `borderWidth` `border` |
| Aide | `size.sm` | `textMuted` | `spacing.xs` sous le champ |
| Erreur | `size.sm`, `weight.semibold` | `danger` | `spacing.xs` sous l'aide (ou le champ) ; icône erreur `sizes.icon` à gauche, écart `spacing.xs`, alignée sur la première ligne |

- Champs successifs séparés de `spacing.md` (bloc libellé → erreur).
- Pas de texte indicatif (*placeholder*) en guise de libellé ; s'il y en a un, il est en `textMuted`.
- Aucun astérisque : tous les champs de la story 2b sont obligatoires, ce que dit l'introduction du formulaire si besoin (question au `ux-expert`).

## Liaisons accessibles (rappel, comportement porté par le code)

- `<label for>` lié au champ ;
- `aria-describedby` = id de l'aide + id de l'erreur (quand elle existe) ;
- `aria-invalid="true"` quand le champ est en erreur ; le style d'erreur s'appuie sur ce même attribut (`[aria-invalid="true"]`), pour que le visuel et l'accessibilité ne divergent jamais.

## États

| État | Rendu |
|---|---|
| Repos | bordure 1 px `border` |
| Survol | bordure 1 px `text` |
| Focus (`:focus-visible` et `:focus`, un champ texte reçoit toujours le focus visible) | bordure inchangée + anneau `focus` 3 px décalé de 2 px |
| Invalide (`aria-invalid="true"`) | bordure **2 px** `danger` (épaisseur compensée par le padding pour ne pas décaler le texte) + message d'erreur avec icône |
| Invalide + focus | bordure 2 px `danger` + anneau `focus` |
| Désactivé (non utilisé en 2b) | fond `disabledSurface`, texte `textMuted`, bordure `divider` |

L'erreur ne repose jamais sur la couleur : icône + texte + épaisseur de bordure.

## Mobile (React Native)

`TextInput` aux mêmes dimensions ; erreur liée via `accessibilityHint` ou texte adjacent ; pas d'anneau de focus (focus clavier rare), la bordure passe à 2 px `focus` à la saisie.
