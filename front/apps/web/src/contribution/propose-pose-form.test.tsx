import { fail, ok, type PoseProposalInput } from '@acrofunjam/core';
import { QueryClient } from '@tanstack/react-query';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  CurrentLocation,
  FakeAuthGateway,
  FakeContributionGateway,
  FakeSessionMemory,
  MemoryProposalInputStore,
  renderSite,
} from '../test/site-harness';

type Capabilities = Array<'propose' | 'validate-proposals' | 'manage-roles'>;

const alice = 'alice@example.org';

const signedIn = (capabilities: Capabilities = ['propose']) => {
  const gateway = new FakeAuthGateway();
  gateway.account = { email: alice, capabilities };
  return gateway;
};

const throne: PoseProposalInput = {
  name: 'Throne',
  baseDifficulty: 'beginner',
  flyerDifficulty: 'discovery',
  canStartFlow: true,
  canEndFlow: false,
};

const openForm = async (options: Parameters<typeof renderSite>[1] = {}, extra?: React.ReactNode) => {
  const view = renderSite(
    '/proposer-une-pose',
    { gateway: signedIn(), queryClient: new QueryClient(), ...options },
    extra,
  );
  const form = await screen.findByRole('form', { name: 'Proposer une pose' });
  // The session is read again (navigation, another tab, focus): the test says what /me answers then.
  const readSessionAgain = () =>
    act(async () => {
      await view.queryClient.invalidateQueries({ queryKey: ['session'] });
      // React Query notifies the components on the next tick: let the page render the new session.
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  return { ...view, form, user: userEvent.setup(), readSessionAgain };
};

const nameField = () => screen.getByRole('textbox', { name: 'Nom de la pose' });
const group = (legend: string) => screen.getByRole('group', { name: legend });
const radio = (legend: string, label: string) => within(group(legend)).getByRole('radio', { name: label });
const submitButton = () =>
  screen.getByRole('button', { name: /^(Proposer la pose|Envoi de la proposition…)$/ });
const announcements = () => screen.getAllByRole('status').map((status) => status.textContent);
const startQuestion = 'Peut-on commencer un flow sur cette pose ?';
const endQuestion = 'Peut-on terminer un flow sur cette pose ?';

const fillThrone = async (user: ReturnType<typeof userEvent.setup>, name = 'Throne') => {
  await user.type(nameField(), name);
  await user.click(radio('Difficulté base', 'Débutant'));
  await user.click(radio('Difficulté flyer', 'Découverte'));
  await user.click(radio(startQuestion, 'Oui'));
  await user.click(radio(endQuestion, 'Non'));
};

describe('form « Proposer une pose »', () => {
  it('should present the fields in order, every choice open, when the form opens', async () => {
    await openForm();

    expect(screen.getByText('Tous les champs sont obligatoires.')).toBeInTheDocument();
    expect(nameField()).toHaveValue('');
    expect(nameField()).not.toHaveAttribute('maxlength');
    expect(nameField()).toHaveAttribute('spellcheck', 'false');
    expect(nameField()).toHaveAccessibleDescription(
      'Le nom usuel de la pose, par exemple Throne ou High Bird. 60 caractères au maximum.',
    );
    const legends = screen
      .getAllByRole('group')
      .map((fieldset) => fieldset.querySelector('legend')?.textContent);
    expect(legends).toEqual(['Difficulté base', 'Difficulté flyer', startQuestion, endQuestion]);
    expect(
      within(group('Difficulté base'))
        .getAllByRole('radio')
        .map((choice) => choice.closest('label')?.textContent),
    ).toEqual(['Découverte', 'Débutant', 'Intermédiaire', 'Avancé']);
    for (const choice of screen.getAllByRole('radio')) expect(choice).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Proposer la pose' })).toBeInTheDocument();
  });

  it('should describe each flow question by its own definition only', async () => {
    await openForm();

    expect(group(startQuestion)).toHaveAccessibleDescription(
      "Peut commencer : le duo s'installe dans la pose directement depuis le sol.",
    );
    expect(group(endQuestion)).toHaveAccessibleDescription(
      'Peut terminer : le flyer redescend au sol directement et sans danger.',
    );
  });

  it('should describe the form by its introduction', async () => {
    const { form } = await openForm();

    expect(form).toHaveAccessibleDescription('Tous les champs sont obligatoires.');
  });

  it('should not announce a direct publication to a user', async () => {
    await openForm();

    expect(screen.queryByText(/Ton rôle te permet de publier directement/)).not.toBeInTheDocument();
  });

  it.each<[string, Capabilities]>([
    ['validator', ['propose', 'validate-proposals']],
    ['administrator', ['propose', 'validate-proposals', 'manage-roles']],
  ])(
    'should announce a direct publication to a %s, in a static box describing the form',
    async (_role, capabilities) => {
      const { form } = await openForm({ gateway: signedIn(capabilities) });

      const box = screen.getByText(
        "Ton rôle te permet de publier directement : la pose apparaîtra dans le catalogue dès l'envoi.",
      );
      expect(box.closest('[role="alert"]')).toBeNull();
      expect(form).toHaveAccessibleDescription(
        "Ton rôle te permet de publier directement : la pose apparaîtra dans le catalogue dès l'envoi. Tous les champs sont obligatoires.",
      );
    },
  );

  describe('name counter', () => {
    it('should not show a counter far from the limit', async () => {
      const { user } = await openForm();

      await user.type(nameField(), 'x'.repeat(49));

      expect(screen.queryByText(/\/ 60 caractères/)).not.toBeInTheDocument();
    });

    it('should count the characters without the superfluous spaces, near the limit', async () => {
      const { user } = await openForm();

      await user.type(nameField(), `  ${'x'.repeat(27)}    ${'y'.repeat(26)}  `);

      expect(screen.getByText('54 / 60 caractères')).toBeInTheDocument();
    });

    it('should tell how many characters are too many, and announce it, over the limit', async () => {
      const { user, form } = await openForm();

      await user.type(nameField(), 'x'.repeat(61));

      expect(within(form).getByText('61 / 60 caractères : 1 de trop')).toBeInTheDocument();
      expect(announcements()).toContain('61 / 60 caractères : 1 de trop');
    });

    it('should announce the counter once when the name is back under the limit', async () => {
      const { user } = await openForm();
      await user.type(nameField(), 'x'.repeat(61));

      await user.type(nameField(), '{Backspace}');

      expect(announcements()).toContain('60 / 60 caractères');
    });
  });

  describe('checks before sending', () => {
    it('should show every message, send nothing, and focus the first field in error, when nothing is answered', async () => {
      const { user, contribution } = await openForm();

      await user.click(submitButton());

      expect(nameField()).toHaveAccessibleDescription(expect.stringContaining('Saisis le nom de la pose.'));
      expect(nameField()).toHaveAttribute('aria-invalid', 'true');
      expect(group('Difficulté base')).toHaveAccessibleDescription('Choisis la difficulté base.');
      expect(radio('Difficulté base', 'Découverte')).toHaveAttribute('aria-invalid', 'true');
      expect(radio('Difficulté base', 'Avancé')).toHaveAccessibleDescription('Choisis la difficulté base.');
      expect(group('Difficulté flyer')).toHaveAccessibleDescription('Choisis la difficulté flyer.');
      expect(group(startQuestion)).toHaveAccessibleDescription(
        expect.stringContaining('Indique si un flow peut commencer sur cette pose.'),
      );
      expect(group(endQuestion)).toHaveAccessibleDescription(
        expect.stringContaining('Indique si un flow peut terminer sur cette pose.'),
      );
      expect(nameField()).toHaveFocus();
      expect(contribution.sent).toEqual([]);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should focus the first choice of the first group in error when the name is valid', async () => {
      const { user } = await openForm();

      await user.type(nameField(), 'Throne');
      await user.click(submitButton());

      expect(radio('Difficulté base', 'Découverte')).toHaveFocus();
    });

    it('should give the length of a name that is too long', async () => {
      const { user, contribution } = await openForm();

      await fillThrone(user, 'x'.repeat(64));
      await user.click(submitButton());

      expect(
        screen.getByText('Le nom ne doit pas dépasser 60 caractères (il en compte 64).'),
      ).toBeInTheDocument();
      expect(contribution.sent).toEqual([]);
    });

    it('should remove a message as soon as its field is answered', async () => {
      const { user } = await openForm();
      await user.click(submitButton());

      await user.type(nameField(), 'Throne');
      await user.click(radio('Difficulté base', 'Débutant'));

      expect(screen.queryByText('Saisis le nom de la pose.')).not.toBeInTheDocument();
      expect(screen.queryByText('Choisis la difficulté base.')).not.toBeInTheDocument();
      expect(screen.getByText('Choisis la difficulté flyer.')).toBeInTheDocument();
    });
  });

  describe('sending', () => {
    it('should send the proposal once, showing it is busy, until the API answers', async () => {
      const contribution = new FakeContributionGateway('held');
      const { user } = await openForm({ contribution });
      await fillThrone(user);

      await user.click(submitButton());
      await user.click(submitButton());

      expect(submitButton()).toHaveTextContent('Envoi de la proposition…');
      expect(submitButton()).toHaveAttribute('aria-disabled', 'true');
      expect(contribution.sent).toEqual([throne]);
      await act(async () => contribution.release(ok({ status: 'pending', name: 'Throne' })));
    });

    it('should replace the form by the confirmation of a pending proposal, its title focused and described', async () => {
      const { user } = await openForm();
      await fillThrone(user);

      await user.click(submitButton());

      const title = await screen.findByRole('heading', {
        level: 2,
        name: 'Merci, ta proposition est envoyée.',
      });
      expect(title).toHaveFocus();
      expect(title).toHaveAccessibleDescription(
        "La pose « Throne » est en attente de validation. Elle apparaîtra dans le catalogue quand un validateur l'aura acceptée.",
      );
      expect(screen.queryByRole('form', { name: 'Proposer une pose' })).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1, name: 'Proposer une pose' })).toBeInTheDocument();
    });

    it('should confirm the publication from the status returned by the API, and refresh the catalog', async () => {
      const queryClient = new QueryClient();
      queryClient.setQueryData(['catalog', 'poses'], []);
      const contribution = new FakeContributionGateway(ok({ status: 'published', name: 'Throne' }));
      // Even for a person the site thought could not publish: the API decides.
      const { user } = await openForm({ contribution, queryClient });
      await fillThrone(user);

      await user.click(submitButton());

      expect(
        await screen.findByRole('heading', { level: 2, name: 'La pose « Throne » est publiée.' }),
      ).toHaveFocus();
      expect(screen.getByText('Elle apparaît maintenant dans le catalogue.')).toBeInTheDocument();
      expect(queryClient.getQueryState(['catalog', 'poses'])?.isInvalidated).toBe(true);
    });

    it('should only say the proposal is sent, with both next steps, when its status cannot be read', async () => {
      const contribution = new FakeContributionGateway(ok({ status: 'received', name: 'Throne' }));
      const { user } = await openForm({ contribution });
      await fillThrone(user);

      await user.click(submitButton());

      expect(
        await screen.findByRole('heading', { level: 2, name: 'Ta proposition est envoyée.' }),
      ).toHaveFocus();
      expect(screen.getByRole('button', { name: 'Proposer une autre pose' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Voir le catalogue' })).toBeInTheDocument();
    });

    it('should not refresh the catalog when the proposal is only pending', async () => {
      const queryClient = new QueryClient();
      queryClient.setQueryData(['catalog', 'poses'], []);
      const { user } = await openForm({ queryClient });
      await fillThrone(user);

      await user.click(submitButton());

      await screen.findByRole('heading', { level: 2, name: 'Merci, ta proposition est envoyée.' });
      expect(queryClient.getQueryState(['catalog', 'poses'])?.isInvalidated).toBe(false);
    });

    it('should offer an empty form, the name focused, when the person proposes another pose', async () => {
      const { user } = await openForm();
      await fillThrone(user);
      await user.click(submitButton());

      await user.click(await screen.findByRole('button', { name: 'Proposer une autre pose' }));

      expect(nameField()).toHaveValue('');
      expect(nameField()).toHaveFocus();
      for (const choice of screen.getAllByRole('radio')) expect(choice).not.toBeChecked();
    });

    it('should lead to the catalog when the person chooses to see it', async () => {
      const { user } = await openForm({}, <CurrentLocation />);
      await fillThrone(user);
      await user.click(submitButton());

      await user.click(await screen.findByRole('link', { name: 'Voir le catalogue' }));

      await waitFor(() => expect(screen.getByLabelText('Adresse courante')).toHaveTextContent(/^\/$/));
    });

    it.each([
      [
        'name-already-in-catalog',
        'Une pose de ce nom existe déjà dans le catalogue. Choisis un autre nom : une variante a son propre nom, par exemple High Bird.',
      ],
      ['name-already-pending', "Une pose de ce nom a déjà été proposée et attend d'être validée."],
    ] as const)('should show the refusal %s under the name, and focus it', async (kind, message) => {
      const contribution = new FakeContributionGateway(fail({ kind }));
      const { user } = await openForm({ contribution });
      await fillThrone(user, 'high bird');

      await user.click(submitButton());

      expect(await screen.findByText(message)).toBeInTheDocument();
      expect(nameField()).toHaveAccessibleDescription(expect.stringContaining(message));
      expect(nameField()).toHaveFocus();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();

      await user.type(nameField(), 'x');
      expect(screen.queryByText(message)).not.toBeInTheDocument();
    });

    it('should keep the input and offer to retry when AcroFunJam cannot be reached', async () => {
      const contribution = new FakeContributionGateway(
        fail({ kind: 'unreachable' }),
        ok({ status: 'pending', name: 'Throne' }),
      );
      const { user, store } = await openForm({ contribution });
      await fillThrone(user);

      await user.click(submitButton());

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(
        "Ta proposition n'a pas pu être envoyée : impossible de joindre AcroFunJam. Vérifie ta connexion Internet, puis réessaie. Ta saisie est conservée.",
      );
      expect(nameField()).toHaveValue('Throne');
      expect(radio('Difficulté base', 'Débutant')).toBeChecked();
      expect(store.kept).toEqual({ owner: alice, input: throne });

      await user.click(within(alert).getByRole('button', { name: 'Réessayer' }));
      expect(
        await screen.findByRole('heading', { level: 2, name: 'Merci, ta proposition est envoyée.' }),
      ).toBeInTheDocument();
      expect(contribution.sent).toHaveLength(2);
      expect(store.kept).toBeNull();
    });

    it('should keep what the person keeps typing while AcroFunJam cannot be reached', async () => {
      const contribution = new FakeContributionGateway(fail({ kind: 'unreachable' }));
      const { user, store } = await openForm({ contribution });
      await fillThrone(user);
      await user.click(submitButton());
      await screen.findByRole('alert');

      await user.type(nameField(), ' Bird');

      expect(store.kept).toEqual({ owner: alice, input: { ...throne, name: 'Throne Bird' } });
    });

    it('should keep the focus on « Réessayer », busy, while retrying, then on the new alert when it fails again', async () => {
      const contribution = new FakeContributionGateway(fail({ kind: 'unreachable' }), 'held');
      const { user } = await openForm({ contribution });
      await fillThrone(user);
      await user.click(submitButton());
      const first = await screen.findByRole('alert');

      await user.click(within(first).getByRole('button', { name: 'Réessayer' }));

      const busy = within(screen.getByRole('alert')).getByRole('button', {
        name: 'Envoi de la proposition…',
      });
      expect(busy).toHaveFocus();
      expect(busy).toHaveAttribute('aria-disabled', 'true');

      await act(async () => contribution.release(fail({ kind: 'unreachable' })));

      const again = await screen.findByRole('alert');
      expect(again).not.toBe(first); // a new node: the failure is announced again
      expect(within(again).getByRole('button', { name: 'Réessayer' })).toHaveFocus();
    });

    it('should ask to reload the page, keeping the input, when the site is outdated', async () => {
      const contribution = new FakeContributionGateway(fail({ kind: 'outdated' }));
      const { user, store } = await openForm({ contribution });
      await fillThrone(user);

      await user.click(submitButton());

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(
        "Ta proposition n'a pas pu être envoyée : le site doit être mis à jour. Recharge la page, puis réessaie. Ta saisie est conservée.",
      );
      expect(within(alert).getByRole('button', { name: 'Recharger la page' })).toBeInTheDocument();
      expect(within(alert).queryByRole('button', { name: 'Réessayer' })).not.toBeInTheDocument();
      expect(store.kept).toEqual({ owner: alice, input: throne });
    });
  });

  describe('expired session', () => {
    it('should tell the session expired in the form, keep the input, and offer to sign in again, coming back here', async () => {
      const contribution = new FakeContributionGateway(fail({ kind: 'unauthenticated' }));
      const { user, store } = await openForm({ contribution });
      await fillThrone(user);

      await user.click(submitButton());

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(
        'Ta session a expiré. Connecte-toi de nouveau pour envoyer ta proposition : ta saisie est conservée.',
      );
      expect(within(alert).getByRole('link', { name: 'Se connecter' })).toHaveAttribute(
        'href',
        '/connexion?retour=%2Fproposer-une-pose',
      );
      expect(nameField()).toHaveValue('Throne');
      expect(store.kept).toEqual({ owner: alice, input: throne });
      // The alert replaces the banner of the whole site; the header shows a visitor.
      expect(screen.queryByRole('region', { name: 'Session expirée' })).not.toBeInTheDocument();
      expect(
        within(screen.getByRole('navigation', { name: 'Compte' })).getByRole('link', {
          name: 'Se connecter',
        }),
      ).toBeInTheDocument();
    });

    it('should tell it in the form, keeping the form and what is typed, when the session expired while typing', async () => {
      const gateway = signedIn();
      const { user, store, readSessionAgain } = await openForm({ gateway });
      await user.type(nameField(), 'Thr');

      gateway.account = null;
      await readSessionAgain();
      await user.type(nameField(), 'one');

      expect(await screen.findByRole('alert')).toHaveTextContent('Ta session a expiré.');
      expect(nameField()).toHaveValue('Throne');
      expect(store.kept).toEqual({
        owner: alice,
        input: {
          ...throne,
          name: 'Throne',
          baseDifficulty: null,
          flyerDifficulty: null,
          canStartFlow: null,
          canEndFlow: null,
        },
      });
      expect(screen.queryByRole('region', { name: 'Session expirée' })).not.toBeInTheDocument();
    });

    it('should remove the alert when the person is signed in again (another tab)', async () => {
      const gateway = signedIn();
      const contribution = new FakeContributionGateway(fail({ kind: 'unauthenticated' }));
      const { user, readSessionAgain } = await openForm({ gateway, contribution });
      await fillThrone(user);
      await user.click(submitButton());
      await screen.findByRole('alert');

      await readSessionAgain();

      await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
      expect(nameField()).toHaveValue('Throne');
    });

    it('should keep the form when /me cannot be reached after it opened (an outage is no sign-out)', async () => {
      const gateway = signedIn();
      const { user, readSessionAgain } = await openForm({ gateway }, <CurrentLocation />);
      await user.type(nameField(), 'Throne');

      gateway.accountUnreachable = true;
      await readSessionAgain();

      expect(screen.getByRole('form', { name: 'Proposer une pose' })).toBeInTheDocument();
      expect(nameField()).toHaveValue('Throne');
      expect(screen.getByLabelText('Adresse courante')).toHaveTextContent('/proposer-une-pose');
    });

    it('should give back the kept input once, and announce it, when its owner comes back', async () => {
      const store = new MemoryProposalInputStore({ owner: alice, input: throne });

      await openForm({ store });

      expect(nameField()).toHaveValue('Throne');
      expect(radio('Difficulté base', 'Débutant')).toBeChecked();
      expect(radio('Difficulté flyer', 'Découverte')).toBeChecked();
      expect(radio(startQuestion, 'Oui')).toBeChecked();
      expect(radio(endQuestion, 'Non')).toBeChecked();
      expect(announcements()).toContain('Ta saisie a été restaurée. Tu peux envoyer ta proposition.');
      expect(store.kept).toBeNull();
    });

    it('should neither give back nor keep the input of someone else (shared device)', async () => {
      const store = new MemoryProposalInputStore({ owner: 'bruno@example.org', input: throne });

      await openForm({ store });

      expect(nameField()).toHaveValue('');
      expect(announcements()).not.toContain('Ta saisie a été restaurée. Tu peux envoyer ta proposition.');
      expect(store.kept).toBeNull();
    });
  });

  describe('signing out', () => {
    it('should lead to the catalog, its title focused, and forget the kept input, when signing out from the form', async () => {
      const store = new MemoryProposalInputStore();
      const { user } = await openForm({ store }, <CurrentLocation />);
      await user.type(nameField(), 'Throne');
      store.save({ owner: alice, input: throne });

      await user.click(screen.getByRole('button', { name: 'Se déconnecter' }));

      await waitFor(() => expect(screen.getByLabelText('Adresse courante')).toHaveTextContent(/^\/$/));
      expect(store.kept).toBeNull();
      expect(announcements()).toContain('Déconnexion effectuée.');
      await waitFor(() =>
        expect(screen.getByRole('heading', { level: 1, name: 'Catalogue des poses' })).toHaveFocus(),
      );
    });

    it('should forget the kept input when the person signed out in another tab', async () => {
      const gateway = signedIn();
      const memory = new FakeSessionMemory();
      const store = new MemoryProposalInputStore();
      const { user, readSessionAgain } = await openForm({ gateway, memory, store }, <CurrentLocation />);
      await user.type(nameField(), 'Throne');
      store.save({ owner: alice, input: throne });

      gateway.account = null;
      memory.forget(); // the other tab forgot that a session existed
      await readSessionAgain();

      await waitFor(() => expect(store.kept).toBeNull());
      await waitFor(() => expect(screen.getByLabelText('Adresse courante')).toHaveTextContent(/^\/$/));
    });
  });
});
