# Écrans de la story « Mentions légales et confidentialité »

**Statut : proposition du 2026-11-26.** Direction « Soleil et Lune » ([ADR 0031](../../adr/0031-direction-visuelle-soleil-et-lune.md), `../principes.md`). Scénarios `@web` (livrés) : `specs/features/informations-legales/mentions-legales-et-confidentialite.feature`. Décisions : `docs/domain/decouverte.md`, « Story « Mentions légales et confidentialité » » (R1 à R9, Q270 à Q284, décisions du 2026-11-26). Parcours, structure et libellés : recommandations de l'`ux-expert` retenues. Maquette statique (aube / nuit, 320 px et grand écran) : `../maquettes/11-informations-legales.html`.

Composants : `pied-de-page.md`, `encadre-en-bref.md` (nouveaux) ; le reste reprend l'existant (titres, liens, `identity-page__context`). Le texte juridique de la maquette est un **texte de remplissage plausible** : le texte définitif est rédigé à part, puis relu.

## Choix visuels structurants

1. **Une page de lecture, pas un formulaire.** Les pages légales n'ont ni carte ni panneau : le texte est posé sur le fond de page, en colonne de lecture (`sizes.readingMaxWidth`, 70 caractères), **alignée à gauche** dans `contentMaxWidth`, sous la marque de l'en-tête. Rien de spectaculaire : ce sont des écrans de travail.
2. **La hiérarchie par la typographie seule** : `h1` en Unbounded (inchangé), `h2` en Unbounded 500 `size.lg`, corps en Figtree `size.md` à interligne 1,5. Pas de filets entre rubriques : l'espace (`spacing.xl` avant chaque `h2`) suffit.
3. **Un seul encadré** : « En bref », sur `surface`, en tête de la politique. Le sommaire et le tableau restent sur le fond de page.
4. **Le pied de page est discret** : texte `sm`, liens soulignés `primary`, filet `divider`, même largeur et mêmes marges que l'en-tête ; il ferme toutes les pages, en bas de la fenêtre même sur une page courte.

## Tokens

| Token | Valeur | Rôle |
|---|---|---|
| `sizes.readingMaxWidth` (**nouveau**) | `'70ch'` (web seulement) | mesure d'un texte long à lire. En caractères pour suivre la taille de texte du navigateur ; écrit tel quel par `toCssVariables` (une chaîne n'est pas convertie en pixels). Environ 670 px à 16 px en Figtree. |

Aucune nouvelle couleur. Couples texte / fond utilisés, tous déjà vérifiés par `contrast.test.ts` :

| Texte | Fond | Aube | Nuit |
|---|---|---|---|
| `text` (corps, titres) | `background` / `surface` (encadré) | 14,7 / 16,2 | 15,6 / 14,4 |
| `textMuted` (date, « Contact : », en-têtes du tableau, détail d'une catégorie) | `background` / `surface` | 6,3 / 7,0 | 7,9 / 7,3 |
| `primary` (liens) | `background` / `surface` | 6,4 / 7,1 | 8,9 / 8,1 |
| `focus` (anneau, 3:1) | `background` / `surface` | 5,2 / 5,7 | 9,9 / 9,1 |

## Gabarit commun des deux pages légales

```
<div class="legal-page">                    max-width: readingMaxWidth ; aligné à gauche
  <h1 tabIndex="-1">Mentions légales</h1>
  <p class="legal-page__updated">Dernière mise à jour : <time datetime="2026-11-26">26 novembre 2026</time></p>
  [encadré « En bref » et sommaire : politique seulement]
  <section aria-labelledby="editeur"><h2 id="editeur">Éditeur du site</h2> … </section>   (composant LegalSection)
  …
</div>
```

| Élément | Tokens |
|---|---|
| `h1` | style global (Unbounded 600, `size.xl`, `lineHeight.tight`) ; marge basse ramenée à `spacing.sm` pour accrocher la date |
| Date de mise à jour | `size.sm`, `textMuted`, marge basse `spacing.lg` ; `<time datetime>` |
| `h2` | Unbounded `weight.medium`, `size.lg`, `lineHeight.tight`, interlettrage −0,01em, `overflow-wrap: anywhere` ; marge haute `spacing.xl`, basse `spacing.sm` ; `scroll-margin-top: spacing.lg` (l'en-tête n'est pas collant : la marge laisse respirer le titre atteint par une ancre) ; `id` en français sans accents, lisibles dans une adresse partagée (`hebergement-du-site`, `duree-de-conservation`, `tes-droits`… : listes ci-dessous) |
| `h3` (rare : coordonnées de l'hébergeur, droits) | Figtree `weight.bold`, `size.md`, marge haute `spacing.md`, basse `spacing.xs` |
| Paragraphes, listes | `size.md`, `lineHeight.normal`, `text` ; marge basse `spacing.md` ; listes à puces, retrait `spacing.lg`, écart `spacing.xs` entre éléments |
| Liens dans le texte | `primary`, soulignés ; adresse de contact en lien `mailto:` (composant `ContactLink`, partagé avec le pied de page : nom accessible « contact@acrofunjam.fr (écrire un e-mail) » par `aria-label`, qui commence par le texte visible) ; `overflow-wrap: anywhere` |
| Mise en relief d'un mot | `<strong>` en `weight.semibold`, jamais de couleur |

Grand écran : rien ne change, sauf l'encadré et le sommaire (ci-dessous). La colonne de lecture ne s'élargit pas au-delà de 70 caractères ; l'espace à droite reste vide (pas de sommaire latéral collant : sobriété, et un seul ordre de lecture).

## 1. Pied de page sur une page courte (« Page introuvable »)

Spécification : `../composants/pied-de-page.md`. La page introuvable (inchangée : `h1`, phrase, « Retour au catalogue ») montre que le pied de page reste en bas de la fenêtre.

```
320 px, 568 px de haut                  Grand écran
┌────────────────────────────┐          ┌──────────────────────────────────────────────────────────┐
│ ◒ AcroFunJam               │          │ ◒ AcroFunJam                    [Se connecter] [S'inscrire]│
│   [Se connecter][S'inscrire]│          ├──────────────────────────────────────────────────────────┤
├────────────────────────────┤          │ Page introuvable                                          │
│ Page introuvable           │          │ Cette page n'existe pas, ou plus.                         │
│ Cette page n'existe pas,   │          │ [Retour au catalogue]                                     │
│ ou plus.                   │          │                                                          │
│ [  Retour au catalogue   ] │          │                 (main : flex 1)                           │
│                            │          │                                                          │
│      (main : flex 1)       │          ├──────────────────────────────────────────────────────────┤
├────────────────────────────┤          │ Mentions légales  Politique de confidentialité   Contact : contact@acrofunjam.fr │
│ Mentions légales           │          └──────────────────────────────────────────────────────────┘
│ Politique de confidentialité│
│ Contact : contact@acrofu…  │  (en entier : 30 caractères à 14 px tiennent dans 288 px)
└────────────────────────────┘
```

## 2. Mentions légales (`/mentions-legales`)

Pas de sommaire (six rubriques courtes), pas d'encadré. Rubriques et ancres retenues (`LegalNoticePage.tsx`) : Éditeur du site (`editeur`) ; Contact (`contact`) ; Hébergement du site (`hebergement-du-site`) ; Photos et contenus (`photos-et-contenus`) ; Signaler un contenu ou demander un retrait (`demander-un-retrait`) ; Données personnelles (`donnees-personnelles`, renvoi à la politique). Lien « Mentions légales » du pied de page en `aria-current="page"`.

Hébergeur : dans un `<address>` en colonne (`display: flex`, `flex-direction: column`, `font-style: normal`), la raison sociale en `<strong>`, puis une ligne par élément d'adresse et le téléphone (« Téléphone : … »).

```
320 px
Mentions légales                          h1
Dernière mise à jour : 26 novembre 2026   sm, textMuted
                                          spacing.lg
Éditeur du site                           h2, lg
AcroFunJam est un site personnel non      md, 1,5
professionnel. …
                                          spacing.xl
Contact                                   h2
Pour toute question … écris à
contact@acrofunjam.fr.                    lien primary souligné
…
```

## 3. Politique de confidentialité (`/confidentialite`)

Ordre : `h1`, date, **encadré « En bref »** (`../composants/encadre-en-bref.md`), **sommaire**, rubriques. Le sommaire suit l'encadré : on lit l'essentiel, puis on choisit où aller.

### Sommaire

```
<nav class="legal-toc" aria-label="Sommaire">
  <p class="legal-toc__title" aria-hidden="true">Sommaire</p>
  <ul role="list"> <li><a href="#qui-traite-tes-donnees">Qui traite tes données</a></li> … </ul>
</nav>
```

| Élément | Tokens |
|---|---|
| Mot « Sommaire » visible | `size.sm`, `weight.semibold`, `textMuted` ; `aria-hidden` (le nom du repère le dit déjà) ; marge basse `spacing.xs` |
| Liste | sans puces (`list-style: none`, `padding: 0`, et `role="list"` pour Safari) |
| Lien | `primary` souligné, `size.md` ; `display: flex`, `align-items: center`, hauteur min `sizes.touchTarget` (44) ; `lineHeight.tight` pour qu'une entrée de deux lignes tienne en ~44 px |
| Bloc | filet bas `borderWidth` `divider`, padding bas `spacing.md`, marge basse `spacing.lg` (sépare la navigation du texte) |
| ≥ 40em | **deux colonnes** (`columns: 2`, `column-gap: spacing.lg`, `break-inside: avoid` sur chaque entrée) : 13 entrées sur 7 lignes au lieu de 13 |

Rubriques et ancres **retenues** (choix de l'`ux-expert`, réalisées dans `front/apps/web/src/legal/PrivacyPolicyPage.tsx` ; les `id` de la maquette sont périmés) :

| Intitulé | Ancre |
|---|---|
| Qui traite tes données | `qui-traite-tes-donnees` |
| Les données et leur usage | `tes-donnees` |
| Pourquoi AcroFunJam peut les utiliser | `bases-legales` |
| Durée de conservation | `duree-de-conservation` |
| Où sont hébergées tes données | `ou-sont-tes-donnees` |
| Cookie et stockage dans ton navigateur | `cookie-et-stockage` |
| Ce qu'AcroFunJam ne fait pas | `ce-qu-acrofunjam-ne-fait-pas` |
| Sécurité | `securite` |
| Tes droits et comment les exercer | `tes-droits` |
| Retirer une photo où tu figures | `retirer-une-photo` |
| Supprimer ton compte | `supprimer-ton-compte` |
| Réclamation auprès de la CNIL | `reclamation-cnil` |
| Mineurs | `mineurs` |

Ces ancres sont des adresses partageables (« /confidentialite#tes-droits ») : ne plus les changer une fois publiées. L'encadré garde `en-bref` (hors sommaire).

### Tableau des durées de conservation

Deux colonnes, lisible à 320 px **sans défilement horizontal** ni changement de `display` (un tableau passé en `display: block` perd ses rôles dans Safari).

```
<table class="legal-table">
  <caption>Combien de temps AcroFunJam garde tes données</caption>
  <thead><tr><th scope="col">Données</th><th scope="col">Durée</th></tr></thead>
  <tbody>
    <tr>
      <th scope="row"><span class="legal-table__category">Ton compte</span>
                      <span class="legal-table__detail">adresse e-mail, mot de passe haché, rôle</span></th>
      <td>Jusqu'à la suppression du compte</td>
    </tr> …
```

| Élément | Tokens |
|---|---|
| Tableau | `width: 100%`, `border-collapse: collapse`, marge basse `spacing.md` ; première colonne 55 % |
| Légende (`caption`) | en haut, alignée à gauche ; `weight.semibold`, `text`, `size.md` ; marge basse `spacing.sm` |
| En-têtes de colonne | `size.sm`, `weight.semibold`, `textMuted` ; filet bas `borderWidthStrong` `divider` |
| Cellules | `size.md`, `lineHeight.normal`, alignées en haut et à gauche ; padding `spacing.sm` vertical, `spacing.sm` horizontal (0 au bord extérieur de la première et de la dernière colonne) ; filet bas `borderWidth` `divider` ; `overflow-wrap: break-word`, `hyphens: auto` (`lang="fr"`) |
| En-tête de ligne | catégorie en `weight.semibold`, `text`, sur sa ligne ; détail dessous en `size.sm`, `weight.regular`, `textMuted` |
| Durée | `weight.regular`, `text` |

À 320 px : 288 px utiles, soit ~150 px pour la catégorie et ~130 px pour la durée ; « Jusqu'à la déconnexion, au plus 14 jours après la dernière visite » tient sur quatre lignes. Couleurs forcées : les filets deviennent `CanvasText`.

```
320 px
┌──────────────────────────────────┐
│ ☀ En bref                        │   encadré, surface
│ • AcroFunJam ne garde que …      │
│ • Aucune mesure d'audience …     │
│ • …                              │
└──────────────────────────────────┘
SOMMAIRE (sm, textMuted)
Qui traite tes données               44 px chacun
Les données et à quoi elles servent
…
──────────────────────────────────── divider
Qui traite tes données               h2
…
Durée de conservation                h2
Combien de temps AcroFunJam garde tes données     caption
Données            Durée                          sm, textMuted
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ton compte         Jusqu'à la
adresse e-mail,    suppression du
mot de passe       compte
haché, rôle
──────────────────────────────────────
…
```

Grand écran : même colonne de 70 caractères ; encadré en padding `spacing.lg` ; sommaire sur deux colonnes.

## 4. Page « S'inscrire » : renvoi à la politique (R9)

Une phrase entre le `h1` et le formulaire, **dans le style de `identity-page__context`** (`size.md`, `textMuted`, marge basse `spacing.lg`) ; le lien dans la phrase en `primary` souligné (7,1:1 sur `surface` dans le panneau ≥ 40em, 6,4:1 sur `background` en dessous). Libellé **proposé** (à confirmer par l'`ux-expert`) :

> Avant de créer ton compte, tu peux lire ce qu'AcroFunJam fait de tes données dans la [politique de confidentialité](/confidentialite).

- Lien dans le texte : cible de la hauteur de la ligne, admise pour un lien inséré dans une phrase (exception « en ligne » du critère 2.5.8).
- Quand la page a déjà une ligne de contexte (« Connecte-toi pour proposer une pose. »), la phrase vient **après** elle : contexte avec marge basse `spacing.sm`, phrase avec marge basse `spacing.lg`. Classe proposée : `identity-page__privacy` (mêmes tokens que `identity-page__context`).
- Le lien s'ouvre dans le même onglet : le formulaire est vide à ce moment-là.

```
320 px                                 ≥ 40em : dans le panneau surface de identity-page
S'inscrire                             h1
Avant de créer ton compte, tu peux     md, textMuted
lire ce qu'AcroFunJam fait de tes
données dans la politique de
confidentialité.                       lien primary souligné
                                       spacing.lg
Adresse e-mail
[                              ]
Mot de passe
[                          ][Afficher]
Ton mot de passe doit contenir au moins 10 caractères.
[        Créer mon compte        ]
Déjà un compte ? Se connecter
```

## Questions visuelles (tranchées par la réalisation)

- **V1. Contact à droite sur grand écran** : retenu (`justify-content: space-between` ; le contact repasse à gauche quand la rangée se replie).
- **V2. Icône soleil dans « En bref »** : retenue.
- **V3. Mesure en caractères** : `sizes.readingMaxWidth = '70ch'` retenu.

La maquette `../maquettes/11-informations-legales.html` reste une esquisse : ses intitulés et ses `id` sont antérieurs aux choix de l'`ux-expert` ; la référence est ce document et le code.
