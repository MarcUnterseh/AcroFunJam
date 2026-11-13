# Bouton

> **Direction « Soleil et Lune »** ([ADR 0031](../../adr/0031-direction-visuelle-soleil-et-lune.md)) : Boutons en **pilule** (`radius.pill`). Primaire : fond `primary`, texte `primaryContrast` (48 px pour une action principale). Secondaire : fond transparent, contour `border` 1 px, survol `surfaceHover` et contour `text`. Discret (en-tête) : la même classe secondaire, fond `surfaceHover` sans contour. Pas de variante danger (un refus n'est jamais rouge). Cibles 44 / 48 px inchangées. Ce qui suit reste valable pour la structure, les libellés et l'accessibilité ; les valeurs visuelles sont celles de `principes.md`.

Élément `<button>` (action) ou `<a>` stylé en bouton (navigation : « Se connecter », « S'inscrire » de l'en-tête ; « Proposer une pose », voir `lien-bouton.md`). Le rôle sémantique suit la nature de l'action, pas l'apparence.

## Structure

`[icône facultative] Libellé` — icône `sizes.icon` à gauche, écart `spacing.xs`. Libellé `size.md`, `weight.semibold`, sur une ligne.

- Hauteur minimale `sizes.control` (48), jamais moins de `sizes.touchTarget` (44) en largeur.
- Padding horizontal `spacing.md` ; rayon `radius.md`.
- Largeur : 100 % de la colonne dans un formulaire en mobile et en grand écran (colonne de `sizes.formMaxWidth`) ; largeur du contenu dans l'en-tête.

## Variantes

| Variante | Fond | Texte | Bordure | Usage |
|---|---|---|---|---|
| **Primaire** | `primary` | `primaryContrast` | aucune | une seule par formulaire : « Se connecter », « Créer mon compte » ; « S'inscrire » dans l'en-tête |
| **Secondaire** | transparent | `text` | `borderWidth` `border` | « Se connecter » et « Se déconnecter » dans l'en-tête, « Afficher » du champ mot de passe, « Réessayer » dans une alerte (largeur du contenu) |
| **Lien** | transparent | `primary`, souligné | aucune | « S'inscrire » / « Se connecter » sous un formulaire, lien du bandeau |

La variante lien garde une zone cliquable ≥ 44 × 44 px (padding vertical), même si son texte est en ligne.

### Choix de poids égal (story 4)

Quand une rangée présente des **décisions de même rang** entre lesquelles l'interface ne doit pas orienter (« Accepter et publier », « Ajuster avant de publier », « Refuser » dans `carte-proposition.md`), tous les boutons prennent la variante **secondaire**, sans icône, à la même hauteur ; écart `spacing.md` ; empilés pleine largeur sous `breakpoints.md`, en ligne (largeur du contenu, `flex-wrap`) au-delà. Le primaire réapparaît dans le petit formulaire ouvert par l'une d'elles (« Confirmer le refus », « Vérifier les ajustements », « Publier avec ces ajustements »). Une page peut donc compter plusieurs primaires, **un par carte ouverte**, jamais deux dans le même formulaire.

## États

| État | Primaire | Secondaire | Lien |
|---|---|---|---|
| Repos | voir ci-dessus | voir ci-dessus | voir ci-dessus |
| Survol (`:hover`, pointeur fin seulement) | fond `primaryHover` | fond `surfaceHover` | texte `primaryHover`, soulignement 2 px |
| Focus clavier (`:focus-visible`) | anneau `focus` `focusRingWidth` 3 px, décalé `focusRingOffset` 2 px, rayon suivant le bouton | idem | idem, rayon `radius.sm` |
| Pressé (`:active`) | fond `primaryActive` | fond `divider` | texte `primaryActive` |
| Désactivé | fond `disabledSurface`, texte `textMuted`, curseur par défaut | idem, bordure `divider` | texte `textMuted`, non souligné |
| **En cours** | voir ci-dessous | idem | — |

Le focus s'ajoute au survol s'ils coïncident ; jamais de `outline: none` sans remplacement.

### État « en cours »

Pendant l'envoi d'un formulaire :
- le libellé devient une action en cours : « Connexion… », « Création du compte… », « Déconnexion… » ; la largeur du bouton ne change pas (pleine largeur en formulaire) ;
- `aria-disabled="true"` (pas `disabled`, pour garder le focus sur le bouton) ; les clics supplémentaires sont ignorés (comportement : `ux-expert` / développeurs) ;
- apparence : couleurs de repos inchangées, opacité du libellé inchangée, curseur `progress` ; pas d'icône d'attente : le libellé de l'action en cours suffit.

On évite l'état désactivé sur les boutons d'envoi : un bouton grisé n'explique pas pourquoi on ne peut pas envoyer. Les erreurs s'affichent à l'envoi.

## Mobile (React Native)

`Pressable` avec `minHeight: sizes.control`, mêmes couleurs ; l'état pressé utilise `primaryActive` / `divider` ; pas de survol. `accessibilityState={{ busy: true, disabled: true }}` pendant l'envoi.
