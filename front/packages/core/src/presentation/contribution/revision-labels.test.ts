import { describe, expect, it } from 'vitest';
import {
  revisionDocumentTitle,
  revisionLabels,
  revisionMessageErrorLabel,
  revisionNameRefusalLabel,
  revisionSuccess,
} from './revision-labels';

describe('revisionLabels', () => {
  it('should name the page and introduce the form as the screen of story 6 specifies it', () => {
    expect(revisionLabels).toMatchObject({
      title: 'Proposer une modification',
      signInContext: 'Connecte-toi pour proposer une modification.',
      poseLine: 'Pose : ',
      publishesDirectly:
        'Ton rôle te permet de publier directement : la pose sera modifiée dans le catalogue dès que tu publieras ta modification.',
      introduction: "Change seulement ce qui doit l'être. La valeur actuelle est rappelée pour chaque champ.",
      nameHelp: '60 caractères au maximum.',
      modified: 'Modifiée',
      message: 'Message pour le validateur (facultatif)',
      messageHelp: 'Explique-lui pourquoi tu proposes cette modification. 500 caractères au maximum.',
    });
  });

  it('should name the actions of a user, and of a validator who checks then publishes', () => {
    expect(revisionLabels).toMatchObject({
      submit: 'Proposer la modification',
      submitting: 'Envoi de la modification…',
      check: 'Vérifier la modification',
      cancel: 'Annuler',
      summaryTitle: 'Vérifie ta modification',
      summaryKey: 'Valeur actuelle → nouvelle valeur',
      summaryBefore: 'Actuellement : ',
      summaryAfter: ', nouveau : ',
      summaryRest: 'Les autres valeurs restent inchangées.',
      publish: 'Publier la modification',
      publishing: 'Publication…',
      backToForm: 'Revenir au formulaire',
    });
  });

  it('should explain why a revision is not received, or cannot be proposed', () => {
    expect(revisionLabels).toMatchObject({
      changesNothing: "Tu n'as rien modifié. Change au moins une valeur pour proposer une modification.",
      poseChanged:
        'Cette pose a changé pendant que tu la modifiais. Ses nouvelles valeurs sont affichées : vérifie ta modification, puis envoie-la de nouveau.',
      notFound: "Cette pose n'est plus dans le catalogue.",
      pendingByYou: 'Tu as déjà proposé une modification de cette pose. Elle est en attente de validation.',
      pendingBySomeoneElse:
        "Une modification de cette pose est déjà en attente de validation. Tu pourras en proposer une autre une fois qu'elle aura été traitée.",
      unreachable:
        "Ta modification n'a pas pu être envoyée : impossible de joindre AcroFunJam. Vérifie ta connexion Internet, puis réessaie. Ta saisie est conservée.",
      sessionExpired:
        'Ta session a expiré. Connecte-toi de nouveau pour envoyer ta modification : ta saisie est conservée.',
    });
  });
});

describe('revisionDocumentTitle', () => {
  it('should name the pose in the title of the document', () => {
    expect(revisionDocumentTitle('Throne')).toBe('Proposer une modification de Throne');
  });
});

describe('revisionNameRefusalLabel', () => {
  it('should tell under the name that a pose of this name is in the catalog', () => {
    expect(revisionNameRefusalLabel('name-already-in-catalog')).toBe(
      'Une pose de ce nom existe déjà dans le catalogue.',
    );
  });

  it('should tell under the name that a proposal of this name is pending', () => {
    expect(revisionNameRefusalLabel('name-already-pending')).toBe(
      "Une pose de ce nom a déjà été proposée et attend d'être validée.",
    );
  });
});

describe('revisionMessageErrorLabel', () => {
  it('should give the length of the message when it is too long', () => {
    expect(revisionMessageErrorLabel(512)).toBe(
      'Le message ne doit pas dépasser 500 caractères (il en compte 512).',
    );
  });
});

describe('revisionSuccess', () => {
  it('should thank a user whose revision is pending, and say when the pose will change', () => {
    expect(revisionSuccess({ status: 'pending', name: 'Throne' })).toEqual({
      title: 'Merci, ta modification est envoyée.',
      text: "Un validateur va l'examiner. La pose changera dans le catalogue une fois la modification acceptée.",
    });
  });

  it('should tell a validator the pose is modified, under its new name', () => {
    expect(revisionSuccess({ status: 'published', name: 'High Throne' })).toEqual({
      title: 'La pose « High Throne » est modifiée dans le catalogue.',
      text: null,
    });
  });

  it('should promise nothing when the status cannot be read', () => {
    expect(revisionSuccess({ status: 'received', name: 'Throne' })).toEqual({
      title: 'Ta modification est envoyée.',
      text: null,
    });
  });
});
