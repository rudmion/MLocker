export const getPasswordSecurityLevel = (password: string): 1 | 2 | 3 => {
  let score = 0;

  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return 1;
  if (score <= 4) return 2;

  return 3;
};
