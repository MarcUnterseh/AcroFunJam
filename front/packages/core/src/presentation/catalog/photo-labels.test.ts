import { describe, expect, it } from 'vitest';
import {
  enlargedPhotoAnnouncement,
  enlargedPhotoTitle,
  morePhotosLink,
  photoCountLabel,
  photoCreditLabel,
  photoErrorMessage,
  photoFileSummary,
  posePhotoLabels as labels,
  removalConsequenceText,
} from './photo-labels';

// Story 10 « Photos des poses »: the texts of the photos, shared by the site and, later, the application (ADR 0021).

describe('the texts of the photos', () => {
  it('should credit the author of a photo', () => {
    expect(photoCreditLabel('Léa Martin')).toBe('Photo : Léa Martin');
  });

  it.each([
    [1, '1 photo sur 5'],
    [2, '2 photos sur 5'],
  ])('should count %d photos out of 5', (count, text) => {
    expect(photoCountLabel(count)).toBe(text);
  });

  it.each([
    [1, "Voir l'autre photo"],
    [2, 'Voir les 2 autres photos'],
    [4, 'Voir les 4 autres photos'],
  ])('should invite to see the %d other photos', (others, text) => {
    expect(morePhotosLink(others)).toBe(text);
  });

  it('should title the enlargement', () => {
    expect(enlargedPhotoTitle(2, 3, 'Bird')).toBe('Photo 2 sur 3 de Bird');
  });

  it('should announce the photo shown in the enlargement', () => {
    expect(enlargedPhotoAnnouncement(3, 3, 'Bird', 'Bird, les prises')).toBe(
      'Photo 3 sur 3 de Bird : Bird, les prises',
    );
  });

  it('should put narrow no-break spaces inside the French quotation marks', () => {
    expect(labels.mainChosen('Bird vue de face', 'Bird')).toBe(
      '« Bird vue de face » est maintenant la photo principale de Bird.',
    );
    expect(labels.altTextHelp).toContain('« Photo de »');
    expect(labels.creditHelp).toContain('« Photo : Léa Martin »');
  });

  it('should name the sections and the invitation after the pose', () => {
    expect(labels.sectionTitle('Bird')).toBe('Photos de Bird');
    expect(labels.otherPhotosTitle('Bird')).toBe('Autres photos de Bird');
    expect(labels.addPhotoName('Throne')).toBe('Ajouter une photo de Throne');
    expect(labels.noPhotoYet('Throne')).toBe("Throne n'a pas encore de photo.");
    expect(labels.maximumReached('Bird')).toBe(
      'Bird a déjà 5 photos, le maximum. Retire une photo pour en ajouter une autre.',
    );
    expect(labels.added('Throne')).toBe('Photo ajoutée à Throne.');
    expect(labels.removeQuestion('Throne')).toBe('Retirer cette photo de Throne ?');
  });

  it.each([
    ['main', 'La photo suivante deviendra la photo principale et la vignette du catalogue.'],
    ['last', "Throne n'aura plus de photo."],
    ['other', 'Elle ne sera plus visible, et ne pourra pas être récupérée.'],
  ] as const)('should say what removing the %s photo changes', (consequence, text) => {
    expect(removalConsequenceText(consequence, 'Throne')).toBe(text);
  });

  it('should give the dimensions of a photo too small', () => {
    expect(labels.tooSmallMeasured(1200, 799)).toBe(
      'Cette photo mesure 1200 × 799 pixels : il faut au moins 800 pixels sur le plus petit côté. Choisis une photo plus grande.',
    );
  });

  it('should summarise the chosen file', () => {
    expect(photoFileSummary('folded-leaf.jpg', 3.2 * 1024 * 1024, { width: 4000, height: 3000 })).toBe(
      'folded-leaf.jpg · 3,2 Mo · 4000 × 3000 pixels',
    );
    expect(photoFileSummary('img_2048.heic', 3.1 * 1024 * 1024, null)).toBe('img_2048.heic · 3,1 Mo');
  });

  it.each([
    [
      { kind: 'unreachable' },
      "La photo n'a pas pu être envoyée : impossible de joindre AcroFunJam. Vérifie ta connexion Internet, puis réessaie.",
    ],
    [
      { kind: 'session-expired' },
      'Ta session a expiré. Connecte-toi de nouveau, puis choisis de nouveau la photo.',
    ],
    [{ kind: 'role-withdrawn' }, 'Tu ne peux plus gérer les photos : ton rôle a changé.'],
    [
      { kind: 'limit-reached' },
      'Bird a déjà 5 photos : une autre a été ajoutée entre-temps. Retire une photo pour en ajouter une autre.',
    ],
    [{ kind: 'not-found' }, "Cette pose n'est plus dans le catalogue."],
    [{ kind: 'photo-not-found' }, "Cette photo n'est plus dans le catalogue."],
    [{ kind: 'cancelled' }, 'Envoi annulé.'],
    [
      { kind: 'outdated' },
      "La photo n'a pas pu être envoyée : le site doit être mis à jour. Recharge la page, puis choisis de nouveau la photo.",
    ],
    [
      { kind: 'invalid', code: 'photo.credit-not-an-author' },
      "Le crédit doit nommer la personne qui a pris la photo. Si tu ne sais pas qui l'a prise, n'ajoute pas cette photo.",
    ],
  ] as const)('should explain the error %j', (error, text) => {
    expect(photoErrorMessage(error, 'Bird')).toBe(text);
  });
});
