/**
 * Converts Arabic-Indic (٠-٩) and Persian (۰-۹) digits to ASCII digits (0-9).
 * Also converts Arabic decimal separator (٫) to "." and removes Arabic thousands separator (٬).
 * Safe to run on any string — Arabic letters are untouched.
 */
export function toEnglishDigits(str: string): string {
  return str
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0))
    .replace(/٫/g, '.')   // Arabic decimal separator → .
    .replace(/٬/g, '');   // Arabic thousands separator → remove
}
