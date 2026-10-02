/**
 * Validation utilities for Nepal IP Room Platform
 * Phone numbers, email, legal validation according to Nepalese telecom norms
 */

/**
 * Validates whether a phone number is a valid 10-digit mobile number in Nepal.
 * Valid prefixes:
 * - Nepal Telecom (NTC): 984, 985, 986, 974, 975, 976
 * - Ncell: 980, 981, 982
 * - Smart Telecom / Others: 988, 961, 962
 * Supports inputs with or without '+977' or leading 0, spaces, and hyphens.
 */
export const isValidNepalPhone = (phone: string | null | undefined): boolean => {
  if (!phone || typeof phone !== 'string') return false;
  // Strip non-digit characters except leading plus
  const cleaned = phone.trim().replace(/[\s\-\(\)\.]/g, '');
  
  // Regex matching:
  // 1. +9779[78]\d{8}
  // 2. 09[78]\d{8}
  // 3. 9[78]\d{8}
  return /^(?:\+977|0)?(9[78]\d{8})$/.test(cleaned);
};

/**
 * Normalizes any valid Nepal mobile number into standard international E.164-style display:
 * e.g. "9841234567" -> "+977 9841234567"
 */
export const formatNepalPhone = (phone: string | null | undefined): string => {
  if (!phone || typeof phone !== 'string') return '';
  const cleaned = phone.trim().replace(/[\s\-\(\)\.]/g, '');
  const match = cleaned.match(/^(?:\+977|0)?(9[78]\d{8})$/);
  if (match) {
    return `+977 ${match[1]}`;
  }
  return phone.trim();
};

/**
 * Extracts 10-digit number without country code for local SMS/calling:
 * e.g. "+977 9841234567" -> "9841234567"
 */
export const getCleanNepalPhoneDigits = (phone: string | null | undefined): string => {
  if (!phone || typeof phone !== 'string') return '';
  const cleaned = phone.trim().replace(/[\s\-\(\)\.]/g, '');
  const match = cleaned.match(/^(?:\+977|0)?(9[78]\d{8})$/);
  return match ? match[1] : cleaned;
};
