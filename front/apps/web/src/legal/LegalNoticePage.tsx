import { Link } from 'react-router';
import { privacyPolicyPath } from '../paths';
import { siteHost } from './legal-facts';
import { ContactLink, LegalPage, LegalSection } from './legal-parts';

/** Page « Mentions légales » (story « Mentions légales et confidentialité »): static, without any call to the API. */
export function LegalNoticePage() {
  return (
    <LegalPage title="Mentions légales">
      <LegalSection id="editeur" title="Éditeur du site">
        <p>
          AcroFunJam est un site personnel non professionnel, gratuit et sans publicité, consacré à
          l&apos;acroyoga. Conformément à la loi, son éditeur a choisi de ne pas publier son identité : il
          l&apos;a communiquée à l&apos;hébergeur du site.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="Contact">
        <p>
          Pour toute question, écris à <ContactLink />.
        </p>
      </LegalSection>

      <LegalSection id="hebergement-du-site" title="Hébergement du site">
        <p>Le site et ses données sont hébergés par :</p>
        <p className="legal-page__address">
          <strong>{siteHost.name}</strong>
          {siteHost.address.map((line) => (
            <span key={line} className="legal-page__address-line">
              {line}
            </span>
          ))}
          <span className="legal-page__address-line">Téléphone : {siteHost.phone}</span>
        </p>
      </LegalSection>

      <LegalSection id="photos-et-contenus" title="Photos et contenus">
        <p>
          Chaque photo est publiée avec l&apos;accord de son auteur, dont le nom figure dans son crédit, et de
          chaque personne photographiée. Les photos restent la propriété de leurs auteurs : ne les réutilise
          pas sans leur accord.
        </p>
        <p>
          Les poses, les transitions et leurs descriptions sont proposées par la communauté et validées avant
          leur publication.
        </p>
      </LegalSection>

      <LegalSection id="demander-un-retrait" title="Signaler un contenu ou demander un retrait">
        <p>
          Tu figures sur une photo, tu en es l&apos;auteur, ou un contenu te pose problème ? Écris à{' '}
          <ContactLink /> en indiquant la pose et la photo concernées. Pour une photo où tu figures, une seule
          demande suffit, de la base ou du flyer, sans compte à créer : la photo est retirée.
        </p>
      </LegalSection>

      <LegalSection id="donnees-personnelles" title="Données personnelles">
        <p>
          Ce qu&apos;AcroFunJam fait de tes données, et comment exercer tes droits, est expliqué dans la{' '}
          <Link to={privacyPolicyPath}>politique de confidentialité</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
