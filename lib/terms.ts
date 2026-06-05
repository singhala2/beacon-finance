export const TERMS_VERSION = '2026-06-04';
export const TERMS_EFFECTIVE_DATE = 'June 4, 2026';
export const SUPPORT_EMAIL = 'saaanant@gmail.com';

export function termsAreStale(acceptedVersion: string | null | undefined): boolean {
  return !acceptedVersion || acceptedVersion !== TERMS_VERSION;
}
