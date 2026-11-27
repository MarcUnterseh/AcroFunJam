import { Icon } from '../layout/Icon';
import {
  backupDays,
  cnilComplaintUrl,
  logDays,
  minimumAge,
  sessionCookieDays,
  siteHost,
} from './legal-facts';
import { ContactLink, LegalPage, LegalSection } from './legal-parts';

/** The sections of the policy, in order: their anchors make the summary. */
const sections = {
  controller: { id: 'qui-traite-tes-donnees', title: 'Qui traite tes données' },
  data: { id: 'tes-donnees', title: 'Les données et leur usage' },
  legalBases: { id: 'bases-legales', title: 'Pourquoi AcroFunJam peut les utiliser' },
  durations: { id: 'duree-de-conservation', title: 'Durée de conservation' },
  hosting: { id: 'ou-sont-tes-donnees', title: 'Où sont hébergées tes données' },
  cookie: { id: 'cookie-et-stockage', title: 'Cookie et stockage dans ton navigateur' },
  notDone: { id: 'ce-qu-acrofunjam-ne-fait-pas', title: "Ce qu'AcroFunJam ne fait pas" },
  security: { id: 'securite', title: 'Sécurité' },
  rights: { id: 'tes-droits', title: 'Tes droits et comment les exercer' },
  photo: { id: 'retirer-une-photo-ou-une-video', title: 'Retirer une photo ou une vidéo où tu figures' },
  account: { id: 'supprimer-ton-compte', title: 'Supprimer ton compte' },
  cnil: { id: 'reclamation-cnil', title: 'Réclamation auprès de la CNIL' },
  minors: { id: 'mineurs', title: 'Mineurs' },
} as const;

/** How long each data is kept (R4): the table of the durations. */
const durations: ReadonlyArray<{ category: string; detail?: string; duration: string }> = [
  {
    category: 'Ton compte',
    detail: 'adresse e-mail, mot de passe haché, rôle',
    duration: "Jusqu'à la suppression du compte",
  },
  { category: 'Tes propositions et les décisions des validateurs', duration: "Tant qu'AcroFunJam existe" },
  {
    category: 'La confirmation des droits sur une photo',
    detail: 'compte et date',
    duration: 'Aussi longtemps que la photo',
  },
  { category: 'Les photos', detail: 'crédit et texte alternatif', duration: "Jusqu'à leur retrait" },
  {
    category: 'La confirmation des droits sur une vidéo',
    detail: 'compte et date',
    duration: 'Aussi longtemps que la vidéo',
  },
  { category: 'Les vidéos', detail: 'crédit, légende et description', duration: "Jusqu'à leur retrait" },
  {
    category: 'Le cookie de session',
    duration: `Jusqu'à la déconnexion, au plus ${sessionCookieDays} jours après la dernière visite`,
  },
  { category: 'Les sauvegardes de la base de données', duration: `${backupDays} jours` },
  { category: 'Les journaux du serveur', detail: 'dont des adresses IP', duration: `${logDays} jours` },
];

/** Page « Politique de confidentialité » (story « Mentions légales et confidentialité »): static, without the API. */
export function PrivacyPolicyPage() {
  return (
    <LegalPage title="Politique de confidentialité">
      <section className="summary-box" aria-labelledby="en-bref">
        <h2 id="en-bref">
          <Icon name="sun" />
          En bref
        </h2>
        <ul>
          <li>Pour créer un compte, tu ne donnes que ton adresse e-mail et un mot de passe.</li>
          <li>Aucune mesure d&apos;audience, aucun traceur, aucune publicité.</li>
          <li>Rien n&apos;est vendu ni cédé.</li>
          <li>
            Pour toute demande, écris à <ContactLink /> : AcroFunJam te répond sous un mois.
          </li>
        </ul>
      </section>

      <nav className="legal-toc" aria-label="Sommaire">
        <p className="legal-toc__title" aria-hidden="true">
          Sommaire
        </p>
        <ul role="list">
          {Object.values(sections).map(({ id, title }) => (
            <li key={id}>
              <a href={`#${id}`}>{title}</a>
            </li>
          ))}
        </ul>
      </nav>

      <LegalSection {...sections.controller}>
        <p>
          AcroFunJam est un site personnel non professionnel. Son éditeur est responsable de tes données (le «
          responsable du traitement ») ; tu le joins à <ContactLink />.
        </p>
      </LegalSection>

      <LegalSection {...sections.data}>
        <h3>Ton compte</h3>
        <p>
          Ton adresse e-mail et ton mot de passe servent à te connecter. Ton mot de passe est haché : il est
          gardé sous une forme illisible, même pour AcroFunJam. Ton rôle (utilisateur, validateur,
          administrateur) dit ce que tu peux faire sur le site.
        </p>
        <p>
          Pour protéger ton compte, AcroFunJam garde aussi des données de sécurité de connexion, comme le
          nombre de tentatives de connexion échouées.
        </p>
        <h3>Tes propositions</h3>
        <p>
          Les poses, les modifications et les transitions que tu proposes sont gardées avec la décision prise,
          pour savoir d&apos;où vient chaque élément du catalogue. Si tu supprimes ton compte, elles restent,
          mais ne sont plus rattachées à ton adresse.
        </p>{' '}
        <h3>Les photos</h3>
        <p>
          Une photo est publiée avec le crédit de son auteur et un texte alternatif ; les personnes
          photographiées ne sont jamais nommées. AcroFunJam retire de chaque photo toutes ses métadonnées,
          comme une position GPS.
        </p>
        <p>
          Quand une personne ajoute une photo, elle confirme que l&apos;auteur et chaque personne
          photographiée ont donné leur accord. AcroFunJam garde cette confirmation (le compte qui l&apos;a
          donnée et sa date), sans jamais l&apos;afficher.
        </p>
        <h3>Les vidéos</h3>
        <p>
          Une vidéo est publiée avec le crédit de la personne, du duo ou du collectif à qui elle appartient,
          une légende et, s&apos;il y en a une, une description du mouvement ; les personnes filmées ne sont
          jamais nommées.
        </p>
        <p>
          AcroFunJam retire de chaque vidéo la bande son et toutes ses métadonnées, comme une position GPS ou
          le modèle de l&apos;appareil, et ne garde pas le fichier d&apos;origine.
        </p>
        <p>
          Quand une personne ajoute une vidéo, elle confirme que l&apos;auteur et chaque personne filmée ont
          donné leur accord, et qu&apos;aucune personne mineure n&apos;y est reconnaissable. AcroFunJam garde
          cette confirmation (le compte qui l&apos;a donnée et sa date) aussi longtemps que la vidéo, sans
          jamais l&apos;afficher.
        </p>
        <h3>Les journaux du serveur</h3>
        <p>
          Le serveur note des informations techniques sur ses échanges avec ton navigateur, dont ton adresse
          IP, pour repérer les pannes et les attaques. Elles sont effacées après {logDays} jours.
        </p>
      </LegalSection>

      <LegalSection {...sections.legalBases}>
        <ul>
          <li>
            Ton compte et tes propositions : AcroFunJam en a besoin pour te rendre le service que tu demandes
            en t&apos;inscrivant.
          </li>
          <li>
            La confirmation des droits sur une photo ou une vidéo, les sauvegardes et les journaux :
            AcroFunJam a un intérêt légitime à prouver l&apos;accord donné et à protéger le site.
          </li>
          <li>Une photo ou une vidéo où figure une personne : cette personne a donné son accord.</li>
        </ul>
      </LegalSection>

      <LegalSection {...sections.durations}>
        <table className="legal-table">
          <caption>Combien de temps AcroFunJam garde tes données</caption>
          <thead>
            <tr>
              <th scope="col">Données</th>
              <th scope="col">Durée</th>
            </tr>
          </thead>
          <tbody>
            {durations.map(({ category, detail, duration }) => (
              <tr key={category}>
                <th scope="row">
                  <span className="legal-table__category">{category}</span>
                  {detail && <span className="legal-table__detail"> {detail}</span>}
                </th>
                <td>{duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </LegalSection>

      <LegalSection {...sections.hosting}>
        <p>Deux sous-traitants, des sociétés qui gardent des données pour AcroFunJam, les hébergent :</p>
        <ul>
          <li>
            {siteHost.shortName} : le serveur, la base de données et la messagerie de l&apos;adresse de
            contact, dans l&apos;Union européenne.
          </li>
          <li>
            Cloudflare : les photos, les vidéos et les sauvegardes. Cloudflare est une société américaine :
            ces données peuvent être stockées hors de l&apos;Union européenne, avec les garanties du cadre de
            protection des données entre l&apos;Union européenne et les États-Unis (Data Privacy Framework).
          </li>
        </ul>
      </LegalSection>

      <LegalSection {...sections.cookie}>
        <p>
          Le site dépose un seul cookie, le cookie de session, strictement nécessaire pour rester connecté :
          aucun consentement n&apos;est donc demandé.
        </p>
        <p>
          Le site garde aussi, dans ton navigateur, le fait que tu étais connecté et ce que tu as commencé à
          saisir dans un formulaire, pour ne pas le perdre. Ces données ne quittent pas ton navigateur.
        </p>
        <p>
          Aucune mesure d&apos;audience, aucun traceur, aucun service tiers : les polices de caractères
          viennent du site lui-même.
        </p>
      </LegalSection>

      <LegalSection {...sections.notDone}>
        <ul>
          <li>Pas de publicité.</li>
          <li>Pas de revente ni de cession de tes données.</li>
          <li>Pas d&apos;e-mail que tu n&apos;aurais pas demandé.</li>
        </ul>
      </LegalSection>

      <LegalSection {...sections.security}>
        <p>
          Le site n&apos;est accessible qu&apos;en HTTPS, ton mot de passe est haché, et seules des clés de
          connexion sécurisées donnent accès au serveur.
        </p>
      </LegalSection>

      <LegalSection {...sections.rights}>
        <p>Tu peux à tout moment :</p>
        <ul>
          <li>accéder à tes données, les corriger ou les faire effacer ;</li>
          <li>t&apos;opposer à leur utilisation ou la limiter.</li>
        </ul>
        <p>
          Écris à <ContactLink /> depuis l&apos;adresse de ton compte. AcroFunJam te répond sous un mois.
        </p>
      </LegalSection>

      <LegalSection {...sections.photo}>
        <p>
          Tu figures sur une photo ou une vidéo ? Écris à <ContactLink /> en indiquant la photo ou la vidéo
          concernée (la pose ou la transition, et sa légende) : une seule demande suffit, de la base ou du
          flyer, sans compte à créer. La photo ou la vidéo est retirée et n&apos;est plus accessible.
        </p>
      </LegalSection>

      <LegalSection {...sections.account}>
        <p>
          Le site ne permet pas encore de supprimer ton compte toi-même. Pour supprimer ton compte, écris à{' '}
          <ContactLink /> depuis l&apos;adresse de ton compte : il est supprimé sous un mois.
        </p>
        <p>
          Tes propositions restent dans le catalogue, mais ne sont plus rattachées à ton adresse. Une copie de
          ton compte reste dans les sauvegardes de la base de données pendant {backupDays} jours au plus, puis
          disparaît.
        </p>
      </LegalSection>

      <LegalSection {...sections.cnil}>
        <p>
          Si tu estimes que tes droits ne sont pas respectés, tu peux{' '}
          <a href={cnilComplaintUrl}>adresser une réclamation à la CNIL</a> (Commission nationale de
          l&apos;informatique et des libertés).
        </p>
      </LegalSection>

      <LegalSection {...sections.minors}>
        <p>Il faut avoir au moins {minimumAge} ans pour créer un compte.</p>
      </LegalSection>
    </LegalPage>
  );
}
