export interface CountryPhoneConfig {
  isoCode: string;
  callingCode: string;
  nationalNumberLength: number;
  validateNationalNumber: (digits: string) => boolean;
  toE164: (digits: string) => string;
  fromE164: (value: string) => string | null;
  invalidMessage: string;
}

export interface CountryPhoneValidation {
  normalized: string | null;
  nationalNumber: string;
  error: string | null;
}

const LOCAL_PREFIXES = new Set(['01', '03', '04', '05', '06', '07', '08', '09']);
const MOBILE_PREFIXES = new Set(['70', '71', '76', '78', '79', '81']);

export const LEBANON_PHONE_CONFIG: CountryPhoneConfig = {
  isoCode: 'LB',
  callingCode: '+961',
  nationalNumberLength: 8,
  invalidMessage: 'Please enter a valid Lebanese phone number.',
  validateNationalNumber: (digits) =>
    digits.length === 8
    && (LOCAL_PREFIXES.has(digits.slice(0, 2)) || MOBILE_PREFIXES.has(digits.slice(0, 2))),
  toE164: (digits) => `+961${digits.startsWith('0') ? digits.slice(1) : digits}`,
  fromE164: (value) => {
    const digits = value.replace(/\D/g, '');
    if (!digits.startsWith('961')) return null;
    const subscriber = digits.slice(3);
    return subscriber.length === 7 ? `0${subscriber}` : subscriber;
  },
};

export function validateCountryPhone(
  value: string,
  config: CountryPhoneConfig,
  required = false,
): CountryPhoneValidation {
  const input = value.trim();
  if (!input) {
    return { normalized: null, nationalNumber: '', error: required ? config.invalidMessage : null };
  }
  if (!/^[\d ]+$/.test(input)) {
    return { normalized: null, nationalNumber: input, error: config.invalidMessage };
  }
  const digits = input.replace(/\s/g, '');
  return config.validateNationalNumber(digits)
    ? { normalized: config.toE164(digits), nationalNumber: digits, error: null }
    : { normalized: null, nationalNumber: digits, error: config.invalidMessage };
}

export function formatNationalPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 8)]
    .filter(Boolean)
    .join(' ');
}
