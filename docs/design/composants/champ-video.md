# Champ « Vidéo » (choix d'une vidéo, aperçu, résumé)

Story 12 (V4 à V7, V22 ; UX-55, Q300). Page « Ajouter une vidéo à Pop to Bird ». Calqué sur `champ-photo.md` : mêmes règles, mêmes classes à l'élément près (`.video-field` au lieu de `.photo-field`), mêmes états. Ce document ne dit que les écarts. Token : `sizes.videoMaxHeight` (480, nouveau).

## Structure

```
Vidéo                                          <- libellé
MP4, MOV ou WebM, 30 secondes et 100 Mo au     <- aide (proposée), size.sm, textMuted
plus, au moins 480 pixels sur le plus petit
côté.
[ (▷) Choisir une vidéo ]                      <- secondaire 48 px, icône vidéo

après le choix :
┌────────────────────────────────┐
│▒▒▒▒▒▒▒▒▒┌──────────┐▒▒▒▒▒▒▒▒▒▒▒│             <- aperçu : <video> muet, contrôles du navigateur,
│▒▒▒▒▒▒▒▒▒│ vidéo    │▒▒▒▒▒▒▒▒▒▒▒│                photoMat, radius.md, hauteur ≤ videoMaxHeight
│▒▒▒▒▒▒▒▒▒│ ▶ ──●─── │▒▒▒▒▒▒▒▒▒▒▒│
└────────────────────────────────┘
pop-to-bird-cote.mp4 · 18,4 Mo · 12 secondes · 1080 × 1920 pixels
[ Changer de vidéo ]
```

| Élément | Écart avec `champ-photo.md` |
|---|---|
| `input type="file"` | `accept="video/mp4,video/quicktime,video/webm"` |
| Aide (**proposée**) | « MP4, MOV ou WebM, 30 secondes et 100 Mo au plus, au moins 480 pixels sur le plus petit côté. » |
| Bouton | « Choisir une vidéo », icône **vidéo** (cadre arrondi et triangle de lecture, nouvelle) |
| Aperçu (`.video-field__preview`) | `<video muted playsinline controls preload="metadata">` (pas de lecture automatique, pas de boucle) ; `inline-size: 100%`, `block-size: auto`, **`max-block-size: sizes.videoMaxHeight`**, `object-fit: contain`, fond `photoMat`, rayon `radius.md`, `overflow: hidden` ; nom accessible « Aperçu de la vidéo choisie » (proposé) |
| Résumé | nom · poids · **durée en toutes lettres** (« 12 secondes », comme dans les messages ; la pastille « 0:12 » est réservée à l'affiche) · dimensions une fois redressée (« 1080 × 1920 pixels ») ; `tabular-nums` |
| « Changer de vidéo » | secondaire 44 px |

## États

| État | Rendu |
|---|---|
| Vide | libellé, aide, « Choisir une vidéo » |
| Vidéo choisie, lisible | aperçu, résumé complet, « Changer de vidéo » |
| Vidéo choisie, **illisible par le navigateur (HEVC)**, en-tête lu (UX-55) | cadre « aperçu indisponible » (`photoMat`, padding `spacing.md`, icône **vidéo** `iconLarge` en `textMuted`, texte `size.sm` `text`) : « Ton navigateur ne sait pas lire cette vidéo HEVC : pas d'aperçu. AcroFunJam la préparera après l'envoi. » (**proposé**) ; résumé **complet** (durée et dimensions tirées de l'en-tête) ; les contrôles s'appliquent dès le choix |
| Idem, en-tête non lu (si l'ADR écarte cette lecture) | même cadre, texte « … AcroFunJam la vérifiera après l'envoi. » ; résumé sans durée ni dimensions |
| Erreur sans vidéo (« Choisis une vidéo. ») | bouton avec contour 2 px `danger` + message sous le bouton |
| Erreur avec vidéo (format, poids, **durée**, dimensions) | aperçu (ou cadre indisponible) entouré de **2 px `danger`** ; le résumé montre la valeur en cause (« 31 secondes ») ; message sous « Changer de vidéo » : « Cette vidéo dure 31 secondes : 30 secondes au plus. Raccourcis-la sur ton appareil, puis choisis-la de nouveau. » |

Le site **ne réduit pas** une vidéo (V5) : aucun état « réduction ».

## Légende, crédit, description, case des droits

| Champ | Contrôle | Sous le champ (aides **proposées**, `ux-expert`) |
|---|---|---|
| Légende | champ texte 48 px | « Ce que montre la vidéo, et s'il s'agit d'une démonstration ou d'un tutoriel. Ne nomme pas les personnes filmées. » ; **Exemple :** Pop to Bird, vue de côté, tutoriel ; compteur « 0 / 100 » |
| Crédit | champ texte 48 px | « La personne, le duo ou le collectif à qui appartient la vidéo, présenté sous elle : « Vidéo : Léa Martin ». » ; compteur « 0 / 100 » |
| Description de la vidéo (**facultative**) | zone de texte `rows="4"` | libellé « Description de la vidéo » suivi de « (facultative) » en `regular` `textMuted` dans le `label` ; aide « Décris le mouvement pour qui ne voit pas la vidéo : ce que font la base et le flyer. Ne nomme pas les personnes filmées. » ; **Exemple :** La base pousse les pieds du flyer, qui passe de l'assise à l'horizontale, face au sol. ; compteur « 0 / 300 » |
| Case des droits | `case-confirmation.md` | texte de V14 ; aide « AcroFunJam garde ta confirmation avec la vidéo (ton compte et la date). » |

Ordre : Vidéo, Légende, Crédit, Description de la vidéo, case des droits.

## Couleurs forcées

Comme `champ-photo.md` (aperçu et cadre indisponible avec contour `CanvasText`).
