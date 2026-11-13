/** The initial of the signed-in person, shown in the decorative avatar of the header (docs/design/composants/en-tete.md). */
export const accountInitial = (email: string): string => {
  const [first = ''] = Array.from(email.trim().normalize('NFC'));
  return first.toLocaleUpperCase('fr-FR');
};
