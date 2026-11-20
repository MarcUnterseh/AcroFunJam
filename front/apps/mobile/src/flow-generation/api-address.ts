/**
 * The address of the API (ADR 0038): EXPO_PUBLIC_API_URL, set per build profile (eas.json) or in .env.local. Checked at
 * start: a missing or invalid address is a build mistake, reported as such.
 */
export const apiAddressOf = (value: string | undefined): string => {
  const address = value?.trim() ?? '';
  if (!/^https?:\/\/[^\s/]+/.test(address))
    throw new Error(`EXPO_PUBLIC_API_URL must be the http(s) address of the API, not « ${address} ».`);
  return address.replace(/\/+$/, '');
};
