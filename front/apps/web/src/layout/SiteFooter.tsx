import { NavLink } from 'react-router';
import { ContactLink } from '../legal/legal-parts';
import { legalNoticePath, privacyPolicyPath } from '../paths';

/**
 * Footer of every page (docs/design/composants/pied-de-page.md): the legal pages and the contact address. It reads
 * neither the session nor the API, so that it is there in every state of a page.
 */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <nav aria-label="Informations légales">
          <ul className="site-footer__links">
            <li>
              <NavLink to={legalNoticePath} className="site-footer__link">
                Mentions légales
              </NavLink>
            </li>
            <li>
              <NavLink to={privacyPolicyPath} className="site-footer__link">
                Politique de confidentialité
              </NavLink>
            </li>
          </ul>
        </nav>
        <p className="site-footer__contact">
          <span className="site-footer__label">Contact : </span>
          <ContactLink className="site-footer__link" />
        </p>
      </div>
    </footer>
  );
}
