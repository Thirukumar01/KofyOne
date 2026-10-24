/**
 * KofyOne - Password Strength & Validation Utility
 */

export interface PasswordFeedback {
  score: number; // 0 to 4
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  color: string;
  errors: string[];
}

export function validatePassword(password: string): PasswordFeedback {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Must be at least 8 characters long');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Must include at least one lowercase letter');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Must include at least one uppercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Must include at least one number');
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push('Must include at least one special character (!@#$%^&*...)');
  }

  // Calculate score
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password) && /[^a-zA-Z0-9]/.test(password)) score++;

  // Cap score if basic requirements aren't met
  if (password.length < 8) score = 0;
  else if (errors.length > 2) score = Math.min(score, 1);
  else if (errors.length > 0) score = Math.min(score, 2);

  const labels: Array<PasswordFeedback['label']> = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = [
    'text-red-500 bg-red-500',
    'text-orange-500 bg-orange-500',
    'text-amber-500 bg-amber-500',
    'text-blue-500 bg-blue-500',
    'text-emerald-500 bg-emerald-500',
  ];

  return {
    score,
    label: labels[score] ?? 'Very Weak',
    color: colors[score] ?? 'text-red-500 bg-red-500',
    errors,
  };
}
