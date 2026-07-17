export type PasswordOptions = {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  digits: boolean;
  symbols: boolean;
};

const CHARSETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{}|;:,.<>?',
};

export const DEFAULT_PASSWORD_OPTIONS: PasswordOptions = {
  length: 20,
  uppercase: true,
  lowercase: true,
  digits: true,
  symbols: true,
};

function getSecureRandomIndex(max: number): number {
  const array = new Uint8Array(1);
  let value: number;
  do {
    crypto.getRandomValues(array);
    value = array[0];
  } while (value >= Math.floor(256 / max) * max);
  return value % max;
}

export function generatePassword(options: PasswordOptions): string {
  let charset = '';
  const requiredChars: string[] = [];

  if (options.uppercase) {
    charset += CHARSETS.uppercase;
    requiredChars.push(
      CHARSETS.uppercase[getSecureRandomIndex(CHARSETS.uppercase.length)],
    );
  }
  if (options.lowercase) {
    charset += CHARSETS.lowercase;
    requiredChars.push(
      CHARSETS.lowercase[getSecureRandomIndex(CHARSETS.lowercase.length)],
    );
  }
  if (options.digits) {
    charset += CHARSETS.digits;
    requiredChars.push(
      CHARSETS.digits[getSecureRandomIndex(CHARSETS.digits.length)],
    );
  }
  if (options.symbols) {
    charset += CHARSETS.symbols;
    requiredChars.push(
      CHARSETS.symbols[getSecureRandomIndex(CHARSETS.symbols.length)],
    );
  }

  if (charset.length === 0) {
    charset = CHARSETS.lowercase;
    requiredChars.push(
      CHARSETS.lowercase[getSecureRandomIndex(CHARSETS.lowercase.length)],
    );
  }

  const length = Math.max(requiredChars.length, Math.min(options.length, 64));

  const remaining = length - requiredChars.length;
  const result: string[] = [];

  for (let i = 0; i < remaining; i++) {
    result.push(charset[getSecureRandomIndex(charset.length)]);
  }

  for (const char of requiredChars) {
    const pos = getSecureRandomIndex(result.length + 1);
    result.splice(pos, 0, char);
  }

  return result.join('');
}
