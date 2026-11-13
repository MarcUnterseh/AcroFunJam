import { fail, ok } from '@acrofunjam/core';
import { QueryClient } from '@tanstack/react-query';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  aRevisablePose,
  CurrentLocation,
  FakeAuthGateway,
  FakePoseRevisionGateway,
  MemoryRevisionInputStore,
  renderSite,
} from '../test/site-harness';

// Story 6: the form « Proposer une modification » (docs/design/ecrans/6-proposer-une-modification.md).

const path = '/poses/pose-throne/proposer-une-modification';
const alice = 'alice@example.org';

const signedIn = (capabilities: Array<'propose' | 'validate-proposals'> = ['propose']) => {
  const gateway = new FakeAuthGateway();
  gateway.account = { email: alice, capabilities };
  return gateway;
};

const open = async (
  options: Parameters<typeof renderSite>[1] = {},
  capabilities?: Array<'propose' | 'validate-proposals'>,
) => {
  const view = renderSite(
    path,
    { gateway: signedIn(capabilities), queryClient: new QueryClient(), ...options },
    <CurrentLocation />,
  );
  return { ...view, user: userEvent.setup() };
};

const form = () => screen.findByRole('form', { name: 'Proposer une modification' });
const field = (name: string) => screen.getByRole('textbox', { name });
const group = (legend: string) => screen.getByRole('group', { name: legend });
const radio = (legend: string, option: string) => within(group(legend)).getByRole('radio', { name: option });
const location = () => screen.getByLabelText('Adresse courante').textContent;

describe('access to the form « Proposer une modification »', () => {
  it('should send a visitor to the sign-in page, coming back to the form of the same pose afterwards', async () => {
    renderSite(path, {}, <CurrentLocation />);

    await waitFor(() =>
      expect(location()).toBe('/connexion?retour=%2Fposes%2Fpose-throne%2Fproposer-une-modification'),
    );
    expect(await screen.findByText('Connecte-toi pour proposer une modification.')).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Proposer une modification' })).not.toBeInTheDocument();
  });

  it('should tell the pose is no longer in the catalog, without a form', async () => {
    const revision = new FakePoseRevisionGateway();
    revision.pose.set(fail({ kind: 'not-found' }));
    await open({ revision });

    expect(await screen.findByText("Cette pose n'est plus dans le catalogue.")).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Proposer une modification' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir le catalogue' })).toHaveAttribute('href', '/');
  });

  it('should tell a revision of someone else is pending, without a form', async () => {
    const revision = new FakePoseRevisionGateway();
    revision.pending.set(ok({ isYours: false }));
    await open({ revision });

    expect(
      await screen.findByText(
        "Une modification de cette pose est déjà en attente de validation. Tu pourras en proposer une autre une fois qu'elle aura été traitée.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Proposer une modification' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Voir mes propositions' })).not.toBeInTheDocument();
  });

  it('should tell the person their own revision is pending, and offer to see their proposals', async () => {
    const revision = new FakePoseRevisionGateway();
    revision.pending.set(ok({ isYours: true }));
    await open({ revision });

    expect(
      await screen.findByText(
        'Tu as déjà proposé une modification de cette pose. Elle est en attente de validation.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir mes propositions' })).toHaveAttribute(
      'href',
      '/mes-propositions',
    );
  });
});

describe('the form « Proposer une modification »', () => {
  it('should present the pose, its current values prefilled and reminded', async () => {
    await open();

    expect(await form()).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Proposer une modification' })).toBeInTheDocument();
    expect(screen.getByText(/^Pose :/)).toHaveTextContent('Pose : Throne');
    await waitFor(() => expect(document.title).toBe('Proposer une modification de Throne – AcroFunJam'));
    expect(
      screen.getByText(
        "Change seulement ce qui doit l'être. La valeur actuelle est rappelée pour chaque champ.",
      ),
    ).toBeInTheDocument();
    expect(field('Nom de la pose')).toHaveValue('Throne');
    expect(field('Nom de la pose')).toHaveAccessibleDescription(
      'Actuellement : Throne 60 caractères au maximum.',
    );
    expect(radio('Difficulté base', 'Débutant')).toBeChecked();
    expect(group('Difficulté base')).toHaveAccessibleDescription('Actuellement : Débutant');
    expect(radio('Difficulté flyer', 'Intermédiaire')).toBeChecked();
    expect(radio('Peut-on commencer un flow sur cette pose ?', 'Oui')).toBeChecked();
    expect(field('Message pour le validateur (facultatif)')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Proposer la modification' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Annuler' })).toHaveAttribute('href', '/');
  });

  it('should tag a changed field « Modifiée », in its description, not in its name', async () => {
    const { user } = await open();
    await form();

    await user.click(radio('Difficulté flyer', 'Découverte'));

    expect(group('Difficulté flyer')).toHaveAccessibleDescription('Modifiée Actuellement : Intermédiaire');
    expect(group('Difficulté base')).toHaveAccessibleDescription('Actuellement : Débutant');
    await user.type(field('Nom de la pose'), ' ');
    expect(field('Nom de la pose')).toHaveAccessibleDescription(
      'Actuellement : Throne 60 caractères au maximum.',
    );
  });

  it('should send the changed fields only, then thank a user whose revision is pending', async () => {
    const { user, revision } = await open();
    await form();
    await user.click(radio('Difficulté flyer', 'Découverte'));
    await user.type(field('Message pour le validateur (facultatif)'), 'Plus facile côté flyer.');

    await user.click(screen.getByRole('button', { name: 'Proposer la modification' }));

    expect(revision.sent).toEqual([
      {
        poseId: 'pose-throne',
        poseVersion: 1,
        changes: [{ field: 'flyerDifficulty', before: 'intermediate', after: 'discovery' }],
        message: 'Plus facile côté flyer.',
      },
    ]);
    const title = await screen.findByRole('heading', {
      level: 2,
      name: 'Merci, ta modification est envoyée.',
    });
    await waitFor(() => expect(title).toHaveFocus());
    expect(
      screen.getByText(
        "Un validateur va l'examiner. La pose changera dans le catalogue une fois la modification acceptée.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir mes propositions' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir le catalogue' })).toBeInTheDocument();
  });

  it('should tell nothing was changed, sending nothing', async () => {
    const { user, revision } = await open();
    await form();

    await user.click(screen.getByRole('button', { name: 'Proposer la modification' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Tu n'as rien modifié. Change au moins une valeur pour proposer une modification.",
    );
    expect(revision.sent).toEqual([]);
  });

  it('should tell under the name that a pose of this name is in the catalog', async () => {
    const revision = new FakePoseRevisionGateway();
    revision.answer.set(fail({ kind: 'name-already-in-catalog' }));
    const { user } = await open({ revision });
    await form();
    await user.clear(field('Nom de la pose'));
    await user.type(field('Nom de la pose'), 'bird');

    await user.click(screen.getByRole('button', { name: 'Proposer la modification' }));

    await waitFor(() =>
      expect(field('Nom de la pose')).toHaveAccessibleDescription(
        'Modifiée Actuellement : Throne 60 caractères au maximum. Une pose de ce nom existe déjà dans le catalogue.',
      ),
    );
    expect(field('Nom de la pose')).toHaveFocus();
  });

  it('should show the new values of a pose changed meanwhile, keeping the input, then send from the new version', async () => {
    const revision = new FakePoseRevisionGateway();
    revision.answer.set(fail({ kind: 'pose-changed' }), ok({ status: 'pending', name: 'Throne' }));
    const { user } = await open({ revision });
    await form();
    await user.click(radio('Difficulté flyer', 'Découverte'));
    revision.pose.set(ok(aRevisablePose({ baseDifficulty: 'intermediate', version: 2 })));

    await user.click(screen.getByRole('button', { name: 'Proposer la modification' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Cette pose a changé pendant que tu la modifiais. Ses nouvelles valeurs sont affichées : vérifie ta modification, puis envoie-la de nouveau.',
    );
    expect(group('Difficulté base')).toHaveAccessibleDescription('Actuellement : Intermédiaire');
    expect(radio('Difficulté base', 'Intermédiaire')).toBeChecked();
    expect(radio('Difficulté flyer', 'Découverte')).toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Proposer la modification' }));
    expect(revision.sent[1]).toMatchObject({ poseVersion: 2 });
  });

  it('should keep the input of the pose, and offer to retry, when AcroFunJam cannot be reached', async () => {
    const revision = new FakePoseRevisionGateway();
    revision.answer.set(fail({ kind: 'unreachable' }));
    const revisionStore = new MemoryRevisionInputStore();
    const { user } = await open({ revision, revisionStore });
    await form();
    await user.click(radio('Difficulté flyer', 'Découverte'));

    await user.click(screen.getByRole('button', { name: 'Proposer la modification' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      "Ta modification n'a pas pu être envoyée : impossible de joindre AcroFunJam.",
    );
    expect(within(alert).getByRole('button', { name: 'Réessayer' })).toBeInTheDocument();
    expect(revisionStore.kept.get('pose-throne')?.input.values.flyerDifficulty).toBe('discovery');
  });

  it('should tell the session expired, offering to sign in again and come back to this form', async () => {
    const revision = new FakePoseRevisionGateway();
    revision.answer.set(fail({ kind: 'unauthenticated' }));
    const { user } = await open({ revision });
    await form();
    await user.click(radio('Difficulté flyer', 'Découverte'));

    await user.click(screen.getByRole('button', { name: 'Proposer la modification' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Ta session a expiré.');
    expect(within(alert).getByRole('link', { name: 'Se connecter' })).toHaveAttribute(
      'href',
      '/connexion?retour=%2Fposes%2Fpose-throne%2Fproposer-une-modification',
    );
  });

  it('should give back the input kept for this pose, to its owner', async () => {
    const revisionStore = new MemoryRevisionInputStore();
    revisionStore.save('pose-throne', {
      owner: alice,
      input: { values: { ...aRevisablePose(), flyerDifficulty: 'discovery' }, message: 'Plus facile.' },
    });
    await open({ revisionStore });
    await form();

    await waitFor(() => expect(radio('Difficulté flyer', 'Découverte')).toBeChecked());
    expect(field('Message pour le validateur (facultatif)')).toHaveValue('Plus facile.');
  });
});

describe('a revision refused when sent because there is nothing to type any more', () => {
  it.each([
    [
      'revision-already-pending',
      "Une modification de cette pose est déjà en attente de validation. Tu pourras en proposer une autre une fois qu'elle aura été traitée.",
    ],
    ['not-found', "Cette pose n'est plus dans le catalogue."],
  ] as const)('should replace the form by the block "%s", focused', async (kind, text) => {
    const revision = new FakePoseRevisionGateway();
    revision.answer.set(fail({ kind }));
    const { user } = await open({ revision });
    await form();
    await user.click(radio('Difficulté flyer', 'Découverte'));

    await user.click(screen.getByRole('button', { name: 'Proposer la modification' }));

    await waitFor(() => expect(screen.getByText(text).closest('.form-alert')).toHaveFocus());
    expect(screen.queryByRole('form', { name: 'Proposer une modification' })).not.toBeInTheDocument();
  });
});

describe('the blocks in place of the form', () => {
  it('should announce politely the pending revision told on opening', async () => {
    const revision = new FakePoseRevisionGateway();
    revision.pending.set(ok({ isYours: true }));
    await open({ revision });

    await waitFor(() =>
      expect(screen.getAllByRole('status').map((status) => status.textContent)).toContain(
        'Tu as déjà proposé une modification de cette pose. Elle est en attente de validation.',
      ),
    );
  });
});

describe('the form of a validator, who publishes directly', () => {
  const validator: Array<'propose' | 'validate-proposals'> = ['propose', 'validate-proposals'];

  it('should tell the revision will be published directly, without a message for the validator', async () => {
    await open({}, validator);
    await form();

    expect(
      screen.getByText(
        'Ton rôle te permet de publier directement : la pose sera modifiée dans le catalogue dès que tu publieras ta modification.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /Message pour le validateur/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vérifier la modification' })).toBeInTheDocument();
  });

  it('should present the summary « actuellement → nouveau » before publishing, then publish', async () => {
    const revision = new FakePoseRevisionGateway();
    revision.answer.set(ok({ status: 'published', name: 'Throne' }));
    const { user } = await open({ revision }, validator);
    await form();
    await user.click(radio('Difficulté flyer', 'Découverte'));

    await user.click(screen.getByRole('button', { name: 'Vérifier la modification' }));

    const summary = screen.getByRole('heading', { level: 2, name: 'Vérifie ta modification' });
    await waitFor(() => expect(summary).toHaveFocus());
    expect(screen.getByRole('definition')).toHaveTextContent(
      'Actuellement : Intermédiaire, nouveau : Découverte',
    );
    expect(screen.getByText('Les autres valeurs restent inchangées.')).toBeInTheDocument();
    expect(revision.sent).toEqual([]);

    await user.click(screen.getByRole('button', { name: 'Publier la modification' }));

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'La pose « Throne » est modifiée dans le catalogue.',
      }),
    ).toBeInTheDocument();
    expect(revision.sent).toHaveLength(1);
  });

  it('should give the focus to the alert when publishing from the summary fails', async () => {
    const revision = new FakePoseRevisionGateway();
    revision.answer.set(fail({ kind: 'unreachable' }));
    const { user } = await open({ revision }, validator);
    await form();
    await user.click(radio('Difficulté flyer', 'Découverte'));
    await user.click(screen.getByRole('button', { name: 'Vérifier la modification' }));

    await user.click(screen.getByRole('button', { name: 'Publier la modification' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveFocus());
  });

  it('should keep the line of the pose above the success, with the new name of a renamed pose', async () => {
    const revision = new FakePoseRevisionGateway();
    revision.answer.set(ok({ status: 'published', name: 'High Throne' }));
    const { user } = await open({ revision }, validator);
    await form();
    await user.clear(field('Nom de la pose'));
    await user.type(field('Nom de la pose'), 'High Throne');
    await user.click(screen.getByRole('button', { name: 'Vérifier la modification' }));

    await user.click(screen.getByRole('button', { name: 'Publier la modification' }));

    await screen.findByRole('heading', {
      level: 2,
      name: 'La pose « High Throne » est modifiée dans le catalogue.',
    });
    expect(screen.getByText(/^Pose :/)).toHaveTextContent('Pose : High Throne');
  });

  it('should go back to the form, the input kept, from the summary', async () => {
    const { user } = await open({}, validator);
    await form();
    await user.click(radio('Difficulté flyer', 'Découverte'));
    await user.click(screen.getByRole('button', { name: 'Vérifier la modification' }));

    await user.click(screen.getByRole('button', { name: 'Revenir au formulaire' }));

    expect(radio('Difficulté flyer', 'Découverte')).toBeChecked();
  });
});
