# Pied de page du site

**Statut : proposition du 2026-11-26** (story « Mentions légales et confidentialité », `../ecrans/informations-legales.md`). Direction « Soleil et Lune » (`../principes.md`). Structure, libellés et accessibilité : recommandations de l'`ux-expert` retenues le 2026-11-26. Maquette : `../maquettes/11-informations-legales.html`.

Élément `<footer>` (repère `contentinfo`) commun à toutes les pages, placé dans `SiteLayout` **après `main`**. Il ne dépend ni de la session ni de l'API : identique pour un visiteur et une personne connectée, et dans tous les états d'une page (chargement, erreur, introuvable).

## Structure et ordre du DOM

```
<footer class="site-footer">
  <div class="site-footer__inner">
    <nav aria-label="Informations légales">
      <ul class="site-footer__links">
        <li><a class="site-footer__link" href="/mentions-legales">Mentions légales</a></li>
        <li><a class="site-footer__link" href="/confidentialite">Politique de confidentialité</a></li>
      </ul>
    </nav>
    <p class="site-footer__contact">
      <span class="site-footer__label">Contact : </span>
      <a class="site-footer__link" href="mailto:contact@acrofunjam.fr"
         aria-label="contact@acrofunjam.fr (écrire un e-mail)">contact@acrofunjam.fr</a>
    </p>
  </div>
</footer>
```

- « Contact : » est du texte simple, hors du lien : le lien a pour nom « contact@acrofunjam.fr (écrire un e-mail) » (`aria-label`, composant `ContactLink` partagé avec les pages légales), qui **commence par** le texte visible (critère 2.5.3) ; pas d'espace final dans le soulignement.
- Sur la page courante, le lien porte `aria-current="page"`.
- Aucun logo, aucune marque, aucune autre entrée : le pied de page reste une ligne d'informations, pas une seconde navigation.

## Tokens

| Élément | Tokens | Contraste (aube / nuit) |
|---|---|---|
| Bande | fond `background` ; filet haut `borderWidth` `divider` (décoratif, comme l'en-tête) | — |
| Conteneur | largeur max `sizes.contentMaxWidth`, centré (`margin-inline: auto`) ; padding `spacing.md` en haut, `spacing.lg` (+ zone sûre) en bas, `spacing.md` sur les côtés à toutes les largeurs (comme l'en-tête et `main` : les liens s'alignent sur le `h1`) | — |
| Texte | `size.sm` (14), `lineHeight.normal` | — |
| « Contact : » | `textMuted` | 6,3 / 7,9 sur `background` |
| Liens (les deux, et l'adresse) | `primary`, **soulignés** (`borderWidth`), `weight.regular` | 6,4 / 8,9 sur `background` |
| Cible | chaque lien en `inline-flex`, `align-items: center`, hauteur min `sizes.touchTarget` (44) | — |
| Anneau de focus | `focus` 3 px décalé de 2 px, rayon `radius.sm` | 5,2 / 9,9 sur `background` |

L'adresse peut se couper n'importe où si la police est très agrandie (`overflow-wrap: anywhere`) : jamais de défilement horizontal.

## États des liens

| État | Rendu |
|---|---|
| Repos | `primary`, soulignement 1 px |
| Survol (pointeur fin) | soulignement `borderWidthStrong` (2 px) ; règle existante `a:hover` |
| Focus (`:focus-visible`) | anneau `focus` ; s'ajoute au survol sans le remplacer |
| Pressé | `primaryActive` |
| Visité | inchangé (`primary`) : ces liens se revisitent, la couleur de lien visité n'apporterait rien |
| Page courante (`aria-current="page"`) | couleur `text`, `weight.semibold`, soulignement 2 px : trois indices, aucun ne repose sur la couleur seule ; le lien reste actif (recharger la page) |

## Disposition

**Mobile (< 40em)** : empilé, aligné à gauche, une cible de 44 px par ligne, sans écart supplémentaire (les cibles se touchent sans se chevaucher).

```
──────────────────────────────────── filet divider
 Mentions légales                    44 px
 Politique de confidentialité        44 px
 Contact : contact@acrofunjam.fr     44 px
                                     spacing.lg
```

Hauteur : 16 + 3 × 44 + 24 = 172 px.

**Grand écran (≥ 40em)** : une rangée qui passe à la ligne si besoin (`flex-flow: row wrap`, écart `0` vertical, les cibles de 44 px suffisent / `spacing.lg` horizontal). Les deux liens légaux à gauche, l'adresse de contact à droite (`justify-content: space-between`), comme la marque et le compte de l'en-tête.

```
──────────────────────────────────────────────────────────────────────────── filet divider
 Mentions légales   Politique de confidentialité         Contact : contact@acrofunjam.fr
```

Hauteur : 16 + 44 + 24 = 84 px. Quand la rangée manque de place (texte agrandi), le contact passe à la ligne, à gauche.

Réalisation : `.site-footer__inner` en `display: flex`, `flex-direction: column` (mobile), `row` + `flex-wrap: wrap` + `align-items: center` (≥ 40em) ; la liste des liens légaux suit le même principe (`column`, puis `row wrap`, écart `spacing.lg`). Zone sûre du bas sur téléphone : `padding-bottom: calc(spacing.lg + env(safe-area-inset-bottom))`.

## Le pied de page ne flotte pas

Sur une page courte (« Page introuvable », une erreur de chargement), le pied de page reste **en bas de la fenêtre**, pas au milieu de l'écran :

Réalisation retenue (`index.css`) :

- `html` : `height: 100%` ; `body` : `display: flex`, `flex-direction: column`, `min-height: 100%` ;
- `#root` : `display: flex`, `flex-direction: column`, `flex: 1 0 auto` (il remplit `body`) ;
- `main` : `flex: 1 0 auto` **et `width: 100%`** : dans une boîte flexible en colonne, un élément aux marges automatiques se réduit à son contenu ; `width: 100%` avec `max-width: sizes.contentMaxWidth` et `margin: 0 auto` garde le centrage ;
- `footer` : ne rétrécit pas (aucun autre élément flexible que `main`).

Le lien d'évitement (`position: absolute`), le bandeau de session expirée et la région annoncée ne changent pas.

## Couleurs forcées et impression

- Couleurs forcées : le filet devient `CanvasText` (bordure) ; les liens prennent `LinkText` ; la page courante garde son soulignement épais et sa graisse.
- Impression : pied de page imprimé tel quel (l'adresse de contact est utile sur papier).

## Mobile (Expo)

Hors story (décision 2 du porteur du produit) : l'application pointera vers ces pages à sa publication.
