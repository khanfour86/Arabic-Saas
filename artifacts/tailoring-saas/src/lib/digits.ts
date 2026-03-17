/**
 * Converts Arabic-Indic (٠-٩) and Persian (۰-۹) digits to ASCII digits (0-9).
 * Safe to run on any string — only digits are affected, Arabic letters are untouched.
 */
export function toEnglishDigits(str: string): string {
  return str
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0));
}
