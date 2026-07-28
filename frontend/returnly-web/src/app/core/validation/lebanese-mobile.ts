export interface LebaneseMobileValidation {
  normalized: string | null;
  error: string | null;
}

const MOBILE_PREFIXES = new Set(['70', '71', '76', '78', '79', '81']);
const INVALID_MOBILE_MESSAGE = 'Please enter a valid Lebanese mobile number.';

export function validateLebaneseMobile(value: string): LebaneseMobileValidation {
  const input = value.trim();

  if (!input) {
    return {
      normalized: null,
      error: INVALID_MOBILE_MESSAGE,
    };
  }

  if (!/^\+?\d+$/.test(input)) {
    return {
      normalized: null,
      error: INVALID_MOBILE_MESSAGE,
    };
  }

  let localNumber = input;
  if (input.startsWith('+')) {
    if (!input.startsWith('+961')) {
      return {
        normalized: null,
        error: INVALID_MOBILE_MESSAGE,
      };
    }
    localNumber = input.slice(4);
  } else if (input.startsWith('961')) {
    localNumber = input.slice(3);
  }

  if (localNumber.length !== 8) {
    return {
      normalized: null,
      error: INVALID_MOBILE_MESSAGE,
    };
  }

  if (!MOBILE_PREFIXES.has(localNumber.slice(0, 2))) {
    return {
      normalized: null,
      error: INVALID_MOBILE_MESSAGE,
    };
  }

  return {
    normalized: `+961${localNumber}`,
    error: null,
  };
}
