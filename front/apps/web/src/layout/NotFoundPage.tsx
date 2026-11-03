import { useEffect } from 'react';
import { Link } from 'react-router';
import { catalogPath } from '../paths';

/** Fallback of every unknown address of the site, inside the usual layout (header, main). */
export function NotFoundPage() {
  useEffect(() => {
    document.title = 'Page introuvable – AcroFunJam';
  }, []);
  return (
    <div className="not-found">
      <h1 tabIndex={-1}>Page introuvable</h1>
      <p>Cette page n’existe pas, ou plus.</p>
      <Link to={catalogPath} className="button button--secondary link-button">
        Retour au catalogue
      </Link>
    </div>
  );
}
