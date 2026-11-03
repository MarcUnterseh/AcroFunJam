import { describe, expect, it } from 'vitest';
import {
  nameCounterLabel,
  proposalFieldErrorLabel,
  proposalLabels,
  proposalRefusalLabel,
  proposalSuccess,
} from './proposal-labels';

describe('proposalFieldErrorLabel', () => {
  it.each([
    ['pose.name-required', 'Saisis le nom de la pose.'],
    ['pose.base-difficulty-required', 'Choisis la difficulté base.'],
    ['pose.flyer-difficulty-required', 'Choisis la difficulté flyer.'],
    ['pose.can-start-flow-required', 'Indique si un flow peut commencer sur cette pose.'],
    ['pose.can-end-flow-required', 'Indique si un flow peut terminer sur cette pose.'],
  ] as const)('should explain %s as "%s"', (code, label) => {
    expect(proposalFieldErrorLabel(code, 0)).toBe(label);
  });

  it('should give the length of the name when the name is too long', () => {
    expect(proposalFieldErrorLabel('pose.name-too-long', 64)).toBe(
      'Le nom ne doit pas dépasser 60 caractères (il en compte 64).',
    );
  });
});

describe('proposalRefusalLabel', () => {
  it('should advise another name when a pose of this name is already in the catalog', () => {
    expect(proposalRefusalLabel('name-already-in-catalog')).toBe(
      'Une pose de ce nom existe déjà dans le catalogue. Choisis un autre nom : une variante a son propre nom, par exemple High Bird.',
    );
  });

  it('should say it awaits validation when a pose of this name is already pending', () => {
    expect(proposalRefusalLabel('name-already-pending')).toBe(
      "Une pose de ce nom a déjà été proposée et attend d'être validée.",
    );
  });
});

describe('nameCounterLabel', () => {
  it('should not show the counter when the name is far from the limit (under 50 characters)', () => {
    expect(nameCounterLabel(49)).toBeNull();
  });

  it.each([50, 54, 60])('should show "%i / 60 caractères" when the name is near the limit', (length) => {
    expect(nameCounterLabel(length)).toBe(`${length} / 60 caractères`);
  });

  it('should tell how many characters are too many when the name is over the limit', () => {
    expect(nameCounterLabel(61)).toBe('61 / 60 caractères : 1 de trop');
  });
});

describe('proposalSuccess', () => {
  it('should thank the user and say the pose awaits validation when the proposal is pending', () => {
    expect(proposalSuccess({ status: 'pending', name: 'Throne' })).toEqual({
      title: 'Merci, ta proposition est envoyée.',
      text: "La pose « Throne » est en attente de validation. Elle apparaîtra dans le catalogue quand un validateur l'aura acceptée.",
    });
  });

  it('should say the pose is published when the API published it directly', () => {
    expect(proposalSuccess({ status: 'published', name: 'Throne' })).toEqual({
      title: 'La pose « Throne » est publiée.',
      text: 'Elle apparaît maintenant dans le catalogue.',
    });
  });
});

describe('proposalSuccess when the status cannot be read', () => {
  it('should only say the proposal is sent, without a text', () => {
    expect(proposalSuccess({ status: 'received', name: 'Throne' })).toEqual({
      title: 'Ta proposition est envoyée.',
      text: null,
    });
  });
});

describe('proposalLabels for an outdated site', () => {
  it('should ask to reload the page, the input being kept', () => {
    expect(proposalLabels).toMatchObject({
      outdated:
        "Ta proposition n'a pas pu être envoyée : le site doit être mis à jour. Recharge la page, puis réessaie. Ta saisie est conservée.",
      reload: 'Recharger la page',
    });
  });
});

describe('proposalLabels', () => {
  it('should name the page, the form and its send button as the scenarios read them', () => {
    expect(proposalLabels).toMatchObject({
      title: 'Proposer une pose',
      name: 'Nom de la pose',
      submit: 'Proposer la pose',
      signInContext: 'Connecte-toi pour proposer une pose.',
    });
  });
});
