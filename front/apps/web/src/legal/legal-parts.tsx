import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { contactAddress, contactMailto, legalPagesUpdatedOn } from './legal-facts';

/** The contact address, written out, in a link that prepares a message to it (footer, legal pages). */
export function ContactLink({ className }: { readonly className?: string }) {
  return (
    // The name starts with the visible address (WCAG 2.5.3) and tells the action; no trailing space in the underline.
    <a href={contactMailto} className={className} aria-label={`${contactAddress} (écrire un e-mail)`}>
      {contactAddress}
    </a>
  );
}

/** A legal page (docs/design/ecrans/informations-legales.md): its title, the date of its last update, its sections. */
export function LegalPage({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  const { hash } = useLocation();
  useEffect(() => {
    document.title = `${title} – AcroFunJam`;
  }, [title]);
  // The page is drawn after the browser has looked for the anchor of the address: go to the section now.
  useEffect(() => {
    if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
  }, [hash]);
  return (
    <div className="legal-page">
      <h1 tabIndex={-1}>{title}</h1>
      <p className="legal-page__updated">
        Dernière mise à jour : <time dateTime={legalPagesUpdatedOn.iso}>{legalPagesUpdatedOn.label}</time>
      </p>
      {children}
    </div>
  );
}

/** A section of a legal page, with an anchor to share it (« /confidentialite#tes-droits »). */
export function LegalSection({
  id,
  title,
  children,
}: {
  readonly id: string;
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      {children}
    </section>
  );
}
