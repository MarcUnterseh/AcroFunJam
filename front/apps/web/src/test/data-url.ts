/** The bytes of a file inlined by Vite as a data URL (« ?inline »): the test media of the videos (story 12).
 */
export const bytesOf = (dataUrl: string) =>
  Uint8Array.from(atob(dataUrl.slice(dataUrl.indexOf(',') + 1)), (c) => c.charCodeAt(0));
