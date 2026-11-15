/**
 * Typed translation keys: t('guichet.next') autocompletes, typos fail `tsc`.
 * fr.json is the reference dictionary; ar.json must have the same keys.
 */
import 'i18next';
import type fr from './fr.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: typeof fr;
    };
    returnNull: false;
  }
}
