import { describe, expect, it } from 'vitest';
import {
  transitionVideoLabels as labels,
  transitionVideoLabels,
  videoTransitionName,
  videoCountLabel,
  videoCreditLabel,
  videoDurationBadge,
  videoErrorMessage,
  videoFileSummary,
  videoManagementErrorMessage,
  videoPlayName,
  videoRefusalMessage,
  videoRemovalText,
} from './video-labels';

// Story 12 « Vidéos des transitions » (UX-47 to UX-59, decouverte.md): the texts of the videos, shared by the site and,
// later, the application (ADR 0021).

/** The narrow no-break space before ; : ? ! */
const narrow = '\u202f';
/** The no-break space inside « » and around ×. */
const noBreak = '\u00a0';
/** The non-breaking hyphen of « choisis-la », « retire-la », « envoie-la ». */
const hyphen = '\u2011';

/** A text written with plain spaces and hyphens, as the French typography wants it on screen. */
const typeset = (text: string) =>
  text
    .replace(/ ([;:?!])/g, `${narrow}$1`)
    .replace(/« /g, `«${noBreak}`)
    .replace(/ »/g, `${noBreak}»`)
    .replace(/ × /g, `${noBreak}×${noBreak}`)
    .replace(/\b(choisis|retire|envoie)-la\b/gi, `$1${hyphen}la`);

/** Every text of the videos, the functions called with examples. */
const everyText = (): string[] => [
  ...Object.values(labels).map((label) =>
    typeof label === 'function' ? (label as (text: string) => string)('Pop to Bird') : label,
  ),
  videoCreditLabel('Léa Martin'),
  videoRemovalText('last', 'Pop to Bird'),
  videoRemovalText('other', 'Pop to Bird'),
  videoFileSummary('pop.mp4', 1024 * 1024, 12_000, { width: 1080, height: 1920 }),
  ...(['format', 'too-large', 'too-short', 'too-small', 'too-long'] as const).map((reason) =>
    videoRefusalMessage({ reason }),
  ),
  videoRefusalMessage({ reason: 'too-long', seconds: 31 }),
  ...(
    [
      'unreachable',
      'session-expired',
      'role-withdrawn',
      'limit-reached',
      'not-found',
      'video-not-found',
      'busy',
      'cancelled',
      'outdated',
      'invalid-input',
    ] as const
  ).flatMap((kind) => [
    videoErrorMessage({ kind }, 'Pop to Bird'),
    videoManagementErrorMessage({ kind }, 'Pop to Bird'),
  ]),
];

describe('the typography of the texts of the videos', () => {
  it('should never break a line before ; : ? ! nor inside « », nor around ×', () => {
    for (const text of everyText()) {
      expect(text).not.toMatch(/[ \u00a0][;:?!]/);
      expect(text).not.toMatch(/« |[ \u202f]»|«\u202f/);
      expect(text).not.toMatch(/ ×|× /);
    }
  });

  it('should put a narrow no-break space before a question mark and a colon', () => {
    expect(labels.removeQuestion('Pop to Bird')).toBe(`Retirer cette vidéo de Pop to Bird${narrow}?`);
    expect(videoCreditLabel('Léa Martin')).toBe(`Vidéo${narrow}: Léa Martin`);
  });

  it('should put no-break spaces inside the quotation marks and around ×', () => {
    expect(labels.prepared('Vue de face')).toBe(`La vidéo «${noBreak}Vue de face${noBreak}» est prête.`);
    expect(videoFileSummary('pop.mp4', 2 * 1024 * 1024, null, { width: 1080, height: 1920 })).toBe(
      `pop.mp4 · 2 Mo · 1080${noBreak}×${noBreak}1920 pixels`,
    );
  });

  it('should never break « choisis-la », « retire-la », « envoie-la » at their hyphen', () => {
    expect(labels.preparationFailed('Vue de face')).toContain(`Retire${hyphen}la, puis envoie${hyphen}la`);
    expect(videoRefusalMessage({ reason: 'too-long' })).toContain(`choisis${hyphen}la de nouveau`);
  });
});

describe('the texts of the videos', () => {
  it('should credit the owner of a video (UX-49)', () => {
    expect(videoCreditLabel('Léa Martin')).toBe(typeset('Vidéo : Léa Martin'));
  });

  it('should remind, before the videos, that they replace neither a lesson nor a spotter (Q242)', () => {
    expect(labels.reminder).toBe(
      typeset('Une vidéo montre une façon de faire ; elle ne remplace ni un cours ni un spotter.'),
    );
  });

  it.each([
    [12_000, '0:12'],
    [9_400, '0:09'],
    [30_900, '0:30'],
    [65_000, '1:05'],
  ])('should show a duration of %i ms as %s on the poster', (durationMs, badge) => {
    expect(videoDurationBadge(durationMs)).toBe(badge);
  });

  it('should name the button « Lire » after the caption and the duration', () => {
    expect(videoPlayName('Pop to Bird, tutoriel', 20_400)).toBe('Lire Pop to Bird, tutoriel (20 secondes)');
  });

  it('should title the fold of the description « Description », completed for the assistive technologies', () => {
    expect(labels.descriptionSummary).toBe('Description');
    expect(labels.descriptionSummaryOf('Pop to Bird, tutoriel')).toBe('de la vidéo Pop to Bird, tutoriel');
  });

  it.each([
    [1, '1 vidéo sur 3'],
    [2, '2 vidéos sur 3'],
  ])('should count %d videos out of 3', (count, text) => {
    expect(videoCountLabel(count)).toBe(text);
  });

  it('should tell the maximum, and invite to add a video to the transition', () => {
    expect(labels.maximumReached('Pop to Bird')).toBe(
      'Pop to Bird a déjà 3 vidéos, le maximum. Retire une vidéo pour en ajouter une autre.',
    );
    expect(labels.addVideoName('Pop to Bird')).toBe('Ajouter une vidéo à Pop to Bird');
  });

  it('should announce a video added, which will be shown once ready (UX-57)', () => {
    expect(labels.added('Pop to Bird')).toBe(
      "Vidéo ajoutée à Pop to Bird. Elle sera présentée dès qu'elle sera prête.",
    );
  });

  it('should tell a video that could not be prepared', () => {
    expect(labels.preparationFailed('Pop to Bird, vue de côté')).toBe(
      typeset(
        "La vidéo « Pop to Bird, vue de côté » n'a pas pu être préparée. Retire-la, puis envoie-la de nouveau ou choisis-en une autre.",
      ),
    );
  });

  it('should tell, once the page stops following the preparation, to reload the page later', () => {
    expect(labels.preparationTakesLong).toBe(
      'La préparation prend plus de temps que prévu. Recharge la page plus tard pour voir si la vidéo est prête.',
    );
  });

  it('should say what removing a video changes', () => {
    expect(labels.removeQuestion('Pop to Bird')).toBe(typeset('Retirer cette vidéo de Pop to Bird ?'));
    expect(videoRemovalText('last', 'Pop to Bird')).toBe(
      "Pop to Bird n'aura plus de vidéo, et celle-ci ne pourra pas être récupérée.",
    );
    expect(videoRemovalText('other', 'Pop to Bird')).toBe(
      'Elle ne sera plus visible, et ne pourra pas être récupérée.',
    );
  });

  it('should help to choose a video with every limit of AcroFunJam', () => {
    expect(labels.videoHelp).toBe(
      'MP4, MOV ou WebM, de 2 à 30 secondes, 100 Mo au plus, au moins 480 pixels sur le plus petit côté.',
    );
  });

  it('should tell a video without preview, the reason first', () => {
    expect(labels.previewUnavailable).toBe(
      typeset(
        "Pas d'aperçu : ton navigateur ne sait pas lire cette vidéo. AcroFunJam la préparera après l'envoi.",
      ),
    );
  });

  it('should sum up the chosen file, with what is known of it', () => {
    expect(videoFileSummary('pop.mp4', 18.4 * 1024 * 1024, 12_700, { width: 1080, height: 1920 })).toBe(
      typeset('pop.mp4 · 18,4 Mo · 12 secondes · 1080 × 1920 pixels'),
    );
    expect(videoFileSummary('pop.webm', 2 * 1024 * 1024, null, null)).toBe('pop.webm · 2 Mo');
  });
});

describe('the refusals of a video', () => {
  it.each([
    [{ reason: 'format' }, "Ce fichier n'est pas une vidéo MP4, MOV ou WebM. Choisis une autre vidéo."],
    [
      { reason: 'too-long', seconds: 31 },
      'Cette vidéo dure 31 secondes : 30 secondes au plus. Raccourcis-la sur ton appareil, puis choisis-la de nouveau.',
    ],
    [
      { reason: 'too-long' },
      'Cette vidéo dure plus de 30 secondes. Raccourcis-la sur ton appareil, puis choisis-la de nouveau.',
    ],
    [{ reason: 'too-large' }, 'Cette vidéo dépasse 100 Mo. Choisis une vidéo plus courte ou plus légère.'],
    [{ reason: 'too-short' }, 'Cette vidéo dure moins de 2 secondes. Choisis une vidéo plus longue.'],
    [
      { reason: 'too-small' },
      'Cette vidéo est trop petite : il faut au moins 480 pixels sur le plus petit côté. Choisis une vidéo de meilleure qualité.',
    ],
  ] as const)('should tell %o', (refusal, message) => {
    expect(videoRefusalMessage(refusal)).toBe(typeset(message));
  });
});

describe('videoErrorMessage', () => {
  it.each([
    [
      { kind: 'unreachable' },
      "La vidéo n'a pas pu être envoyée : impossible de joindre AcroFunJam. Vérifie ta connexion Internet, puis réessaie.",
    ],
    [
      { kind: 'session-expired' },
      'Ta session a expiré. Connecte-toi de nouveau, puis choisis de nouveau la vidéo.',
    ],
    [{ kind: 'role-withdrawn' }, 'Tu ne peux plus gérer les vidéos : ton rôle a changé.'],
    [
      { kind: 'limit-reached' },
      'Pop to Bird a déjà 3 vidéos : une autre a été ajoutée entre-temps. Retire une vidéo pour en ajouter une autre.',
    ],
    [{ kind: 'video-not-found' }, "Cette vidéo n'est plus dans le catalogue."],
    [
      { kind: 'busy' },
      "AcroFunJam reçoit déjà d'autres vidéos. Ta saisie est gardée. Réessaie dans quelques minutes.",
    ],
    [{ kind: 'cancelled' }, 'Envoi annulé. Ta saisie est gardée : tu peux renvoyer la vidéo.'],
    [{ kind: 'invalid', code: 'video.caption-required' }, 'Décris la vidéo : la légende est obligatoire.'],
    [{ kind: 'invalid', code: 'video.something-new' }, "Cette vidéo n'a pas pu être ajoutée."],
  ] as const)('should tell %o', (error, message) => {
    expect(videoErrorMessage(error, 'Pop to Bird')).toBe(typeset(message));
  });

  it('should tell a file refused by AcroFunJam as when it is chosen', () => {
    expect(
      videoErrorMessage({ kind: 'file-refused', reason: 'too-long', seconds: 45 }, 'Pop to Bird'),
    ).toContain('45 secondes');
  });
});

describe('videoManagementErrorMessage', () => {
  it.each([
    [
      { kind: 'unreachable' },
      'Impossible de joindre AcroFunJam. Vérifie ta connexion Internet, puis réessaie.',
    ],
    [{ kind: 'session-expired' }, 'Ta session a expiré. Connecte-toi de nouveau, puis réessaie.'],
    [{ kind: 'outdated' }, 'Le site doit être mis à jour. Recharge la page, puis réessaie.'],
    [
      { kind: 'invalid', code: 'video.credit-not-an-author' },
      'Le crédit doit nommer à qui appartient la vidéo. Si tu ne sais pas à qui elle appartient, retire cette vidéo.',
    ],
    [{ kind: 'video-not-found' }, "Cette vidéo n'est plus dans le catalogue."],
  ] as const)(
    'should tell %o without speaking of a sending (« Modifier », « Retirer »)',
    (error, message) => {
      expect(videoManagementErrorMessage(error, 'Pop to Bird')).toBe(typeset(message));
    },
  );

  it('should tell a credit that names no one, when correcting a video', () => {
    expect(labels.creditNotAnAuthorWhenCorrecting).toBe(
      'Le crédit doit nommer à qui appartient la vidéo. Si tu ne sais pas à qui elle appartient, retire cette vidéo.',
    );
  });
});

describe('videoTransitionName', () => {
  it('should give the name of a named transition', () => {
    expect(videoTransitionName({ name: 'Pop to Bird', from: 'Throne', to: 'Bird' })).toBe('Pop to Bird');
  });

  it('should call an unnamed transition « la transition de … vers … », so that « à » and « de » read well', () => {
    const name = videoTransitionName({ name: null, from: 'Throne', to: 'Bird' });

    expect(transitionVideoLabels.addVideoName(name)).toBe('Ajouter une vidéo à la transition de Throne vers Bird');
    expect(transitionVideoLabels.removed(name)).toBe('Vidéo retirée de la transition de Throne vers Bird.');
  });

  it('should start the sentence of the maximum with a capital when the transition has no name', () => {
    const name = videoTransitionName({ name: null, from: 'Bird', to: 'Star' });

    expect(transitionVideoLabels.maximumReached(name)).toMatch(/^La transition de Bird vers Star a déjà 3 vidéos/);
  });
});
