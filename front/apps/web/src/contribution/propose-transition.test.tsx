import { fail, ok } from '@acrofunjam/core';
import { QueryClient } from '@tanstack/react-query';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  CurrentLocation,
  FakeAuthGateway,
  FakeTransitionProposalGateway,
  MemoryTransitionInputStore,
  renderSite,
  transitionPoses,
} from '../test/site-harness';

// Story 7: the form « Proposer une transition » (docs/design/ecrans/7-proposer-une-transition.md).

const path = '/poses/pose-throne/proposer-une-transition';
const alice = 'alice@example.org';
const [bird, star, throne] = transitionPoses as [
  (typeof transitionPoses)[0],
  (typeof transitionPoses)[0],
  (typeof transitionPoses)[0],
];

const signedIn = (capabilities: Array<'propose' | 'validate-proposals'> = ['propose']) => {
  const gateway = new FakeAuthGateway();
  gateway.account = { email: alice, capabilities };
  return gateway;
};

const open = (
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

const form = () => screen.findByRole('form', { name: 'Proposer une transition' });
const select = (name: string) => screen.getByRole('combobox', { name });
const group = (legend: string) => screen.getByRole('group', { name: legend });
const location = () => screen.getByLabelText('Adresse courante').textContent;

/** Fills the form: the arrival pose and the difficulties, the rest as stated. */
const fill = async (
  user: ReturnType<typeof userEvent.setup>,
  { to = 'Bird', name = '', base = 'Débutant', flyer = 'Débutant' }: Record<string, string> = {},
) => {
  if (to) await user.selectOptions(select("Pose d'arrivée"), to);
  if (name) await user.type(screen.getByRole('textbox', { name: 'Nom de la transition (facultatif)' }), name);
  await user.click(within(group('Difficulté base')).getByRole('radio', { name: base }));
  await user.click(within(group('Difficulté flyer')).getByRole('radio', { name: flyer }));
};

const submit = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: 'Proposer la transition' }));

describe('access to the form « Proposer une transition »', () => {
  it('should send a visitor to the sign-in page, coming back to the form of the same pose afterwards', async () => {
    renderSite(path, {}, <CurrentLocation />);

    await waitFor(() =>
      expect(location()).toBe('/connexion?retour=%2Fposes%2Fpose-throne%2Fproposer-une-transition'),
    );
    expect(await screen.findByText('Connecte-toi pour proposer une transition.')).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Proposer une transition' })).not.toBeInTheDocument();
  });

  it('should tell the departure pose is no longer in the catalog, without a form', async () => {
    const transitions = new FakeTransitionProposalGateway();
    transitions.poses.set(ok([bird, star]));
    open({ transitions });

    expect(await screen.findByText("Cette pose n'est plus dans le catalogue.")).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir le catalogue' })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('form', { name: 'Proposer une transition' })).not.toBeInTheDocument();
  });

  it('should tell the poses could not be loaded, then show the form on « Réessayer »', async () => {
    const transitions = new FakeTransitionProposalGateway();
    transitions.poses.set(fail({ kind: 'unreachable' }), ok(transitionPoses));
    const { user } = open({ transitions });

    expect(await screen.findByText(/^Impossible de charger les poses\./)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Réessayer' }));

    expect(await form()).toBeInTheDocument();
  });
});

describe('the form « Proposer une transition »', () => {
  it('should start from the pose consulted, the arrival pose to choose among the published poses', async () => {
    open();

    await form();
    expect(select('Pose de départ')).toHaveValue('pose-throne');
    expect(select("Pose d'arrivée")).toHaveValue('');
    const options = within(select("Pose d'arrivée"))
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(options).toEqual(['Choisis une pose', 'Bird', 'Star', 'Throne']);
    await waitFor(() => expect(document.title).toBe('Proposer une transition depuis Throne – AcroFunJam'));
  });

  it('should present its fields in order, the optional ones marked, the difficulties described by their help', async () => {
    open();

    await form();
    const fields = screen
      .getAllByRole('combobox')
      .concat(screen.getAllByRole('textbox'))
      .map((field) => (field as HTMLInputElement).labels?.[0]?.textContent);
    expect(fields).toEqual([
      'Pose de départ',
      "Pose d'arrivée",
      'Nom de la transition (facultatif)',
      'Description (facultative)',
    ]);
    expect(group('Difficulté base')).toHaveAccessibleDescription(
      'La difficulté mesure le passage seul : les deux poses sont supposées maîtrisées.',
    );
    expect(group('Difficulté flyer')).toHaveAccessibleDescription(
      'La difficulté mesure le passage seul : les deux poses sont supposées maîtrisées.',
    );
  });

  it('should tell a validator the transition will be published as soon as it is sent', async () => {
    open({}, ['propose', 'validate-proposals']);

    await form();
    expect(
      screen.getByText(
        "Ton rôle te permet de publier directement : la transition apparaîtra dans le catalogue dès l'envoi.",
      ),
    ).toBeInTheDocument();
  });

  it('should lead back to the page of the pose of origin on « Annuler »', async () => {
    open();

    await form();
    expect(screen.getByRole('link', { name: 'Annuler' })).toHaveAttribute('href', '/poses/pose-throne');
  });

  it('should tell, under the field, an arrival pose not chosen, without sending anything', async () => {
    const transitions = new FakeTransitionProposalGateway();
    const { user } = open({ transitions });
    await form();

    await fill(user, { to: '' });
    await submit(user);

    expect(select("Pose d'arrivée")).toHaveAccessibleDescription("Choisis la pose d'arrivée.");
    expect(select("Pose d'arrivée")).toHaveFocus();
    expect(transitions.sent).toEqual([]);
  });

  it('should send the transition, the departure pose changed if the person changed it', async () => {
    const transitions = new FakeTransitionProposalGateway();
    const { user } = open({ transitions });
    await form();

    await user.selectOptions(select('Pose de départ'), 'Bird');
    await fill(user, { to: 'Star' });
    await submit(user);

    await waitFor(() =>
      expect(transitions.sent).toEqual([
        {
          fromPoseId: bird.id,
          toPoseId: star.id,
          name: null,
          baseDifficulty: 'beginner',
          flyerDifficulty: 'beginner',
          description: null,
          tags: [],
        },
      ]),
    );
  });

  it('should confirm to a user the transition is sent and waits for a validation, then offer the ways out', async () => {
    const { user } = open();
    await form();

    await fill(user);
    await submit(user);

    const title = await screen.findByRole('heading', { level: 2, name: 'Merci, ta transition est envoyée.' });
    await waitFor(() => expect(title).toHaveFocus());
    expect(title).toHaveAccessibleDescription(
      "La transition de Throne vers Bird est en attente de validation. Elle apparaîtra sur la page des deux poses quand un validateur l'aura acceptée.",
    );
    const main = within(screen.getByRole('main'));
    expect(main.getByRole('link', { name: 'Voir mes propositions' })).toHaveAttribute(
      'href',
      '/mes-propositions',
    );
    expect(
      main.getByRole('button', { name: 'Proposer une autre transition depuis Throne' }),
    ).toBeInTheDocument();
    expect(main.getByRole('link', { name: 'Revenir à Throne' })).toHaveAttribute(
      'href',
      '/poses/pose-throne',
    );
  });

  it('should confirm to a validator the transition is published, then offer to see the pose', async () => {
    const transitions = new FakeTransitionProposalGateway();
    transitions.answer.set(ok({ status: 'published', fromPose: star, toPose: star, name: 'Ninja Star' }));
    const { user } = open({ transitions }, ['propose', 'validate-proposals']);
    await form();

    await fill(user, { to: 'Star', name: 'Ninja Star' });
    await submit(user);

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'La transition « Ninja Star » de Star vers Star est publiée.',
      }),
    ).toBeInTheDocument();
    const main = within(screen.getByRole('main'));
    expect(main.getByRole('link', { name: 'Voir la pose Throne' })).toHaveAttribute(
      'href',
      '/poses/pose-throne',
    );
    expect(
      main.getByRole('button', { name: 'Proposer une autre transition depuis Throne' }),
    ).toBeInTheDocument();
    expect(main.queryByRole('link', { name: 'Voir mes propositions' })).not.toBeInTheDocument();
  });

  it('should give a blank form again, from the pose of origin, to propose another transition', async () => {
    const { user } = open();
    await form();
    await fill(user, { name: 'Retour' });
    await submit(user);

    await user.click(
      await screen.findByRole('button', { name: 'Proposer une autre transition depuis Throne' }),
    );

    await form();
    expect(select('Pose de départ')).toHaveValue('pose-throne');
    expect(select("Pose d'arrivée")).toHaveValue('');
    expect(screen.getByRole('textbox', { name: 'Nom de la transition (facultatif)' })).toHaveValue('');
    // The title takes the focus, and the new form is announced.
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: 'Proposer une transition' })).toHaveFocus(),
    );
    expect(screen.getByText('Nouveau formulaire : la pose de départ est Throne.')).toBeInTheDocument();
  });

  it('should title the document after the sending', async () => {
    const { user } = open();
    await form();

    await fill(user);
    await submit(user);

    await screen.findByRole('heading', { level: 2, name: 'Merci, ta transition est envoyée.' });
    await waitFor(() => expect(document.title).toBe('Transition envoyée – AcroFunJam'));
  });

  it('should name the form by the title of the page', async () => {
    open();

    const named = await form();
    expect(named).toHaveAttribute('aria-labelledby');
    expect(named).not.toHaveAttribute('aria-label');
  });

  it('should give as example of the name the poses chosen, presented without a name', async () => {
    const { user } = open();
    await form();

    await user.selectOptions(select("Pose d'arrivée"), 'Star');

    expect(
      screen.getByRole('textbox', { name: 'Nom de la transition (facultatif)' }),
    ).toHaveAccessibleDescription(expect.stringContaining('par ses poses : Throne → Star.'));
  });

  it('should read the published poses again when a pose of the transition left the catalog, keeping the input', async () => {
    const transitions = new FakeTransitionProposalGateway();
    transitions.answer.set(fail({ kind: 'to-pose-not-found' }));
    transitions.poses.set(ok(transitionPoses), ok([star, throne]));
    const { user } = open({ transitions });
    await form();

    await fill(user, { name: 'Retour' });
    await submit(user);

    await waitFor(() => expect(select("Pose d'arrivée")).toHaveValue(''));
    expect(within(select("Pose d'arrivée")).queryByRole('option', { name: 'Bird' })).not.toBeInTheDocument();
    expect(select("Pose d'arrivée")).toHaveAccessibleDescription(
      "Cette pose n'est plus dans le catalogue. Choisis-en une autre.",
    );
    expect(screen.getByRole('textbox', { name: 'Nom de la transition (facultatif)' })).toHaveValue('Retour');
    expect(select('Pose de départ')).toHaveValue('pose-throne');
  });

  it('should lead back to the page of the pose of origin when the person signs out from the form', async () => {
    const { user } = open();
    await form();

    await user.click(screen.getByRole('button', { name: 'Se déconnecter' }));

    await waitFor(() => expect(location()).toBe('/poses/pose-throne'));
  });

  it('should tell, under the name, that a transition without a name already links these poses', async () => {
    const transitions = new FakeTransitionProposalGateway();
    transitions.answer.set(fail({ kind: 'unnamed-transition-already-in-catalog' }));
    const { user } = open({ transitions });
    await form();

    await fill(user);
    await submit(user);

    const name = screen.getByRole('textbox', { name: 'Nom de la transition (facultatif)' });
    await waitFor(() =>
      expect(name).toHaveAccessibleDescription(
        expect.stringContaining(
          'Une transition sans nom va déjà de Throne vers Bird. Donne un nom à la tienne pour la distinguer.',
        ),
      ),
    );
    expect(name).toHaveFocus();
  });

  it('should tell AcroFunJam is unreachable, keep the input, and send it again on « Réessayer »', async () => {
    const transitions = new FakeTransitionProposalGateway();
    transitions.answer.set(
      fail({ kind: 'unreachable' }),
      ok({ status: 'pending', fromPose: throne, toPose: bird, name: null }),
    );
    const transitionStore = new MemoryTransitionInputStore();
    const { user } = open({ transitions, transitionStore });
    await form();

    await fill(user);
    await submit(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Ta transition n'a pas pu être envoyée : impossible de joindre AcroFunJam.",
    );
    expect(transitionStore.load('pose-throne')?.input.toPoseId).toBe('pose-bird');
    await user.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Merci, ta transition est envoyée.' }),
    ).toBeInTheDocument();
  });

  it('should tell the session expired in the form, the input kept, with a link to sign in again', async () => {
    const transitions = new FakeTransitionProposalGateway();
    transitions.answer.set(fail({ kind: 'unauthenticated' }));
    const { user } = open({ transitions });
    await form();

    await fill(user);
    await submit(user);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Ta session a expiré.');
    expect(within(alert).getByRole('link', { name: 'Se connecter' })).toHaveAttribute(
      'href',
      '/connexion?retour=%2Fposes%2Fpose-throne%2Fproposer-une-transition',
    );
  });

  it('should give the kept input back to its owner when the form opens again', async () => {
    const transitionStore = new MemoryTransitionInputStore();
    transitionStore.save('pose-throne', {
      owner: alice,
      input: {
        fromPoseId: 'pose-star',
        toPoseId: 'pose-star',
        name: 'Ninja Star',
        baseDifficulty: 'advanced',
        flyerDifficulty: 'advanced',
        description: '',
        tags: [],
      },
    });
    open({ transitionStore });

    await form();
    expect(select('Pose de départ')).toHaveValue('pose-star');
    expect(select("Pose d'arrivée")).toHaveValue('pose-star');
    expect(screen.getByRole('textbox', { name: 'Nom de la transition (facultatif)' })).toHaveValue(
      'Ninja Star',
    );
    expect(within(group('Difficulté base')).getByRole('radio', { name: 'Avancé' })).toBeChecked();
  });
});
