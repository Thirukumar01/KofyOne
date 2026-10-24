/**
 * KofyOne - Predefined Security Questions
 *
 * Enforces exactly three predefined questions for user registration
 * and self-service account recovery.
 */

export interface SecurityQuestion {
  id: string;
  label: string;
}

export const PREDEFINED_SECURITY_QUESTIONS: readonly SecurityQuestion[] = [
  {
    id: 'first_school',
    label: 'What was the name of your first school?',
  },
  {
    id: 'first_pet',
    label: 'What is the name of your first pet?',
  },
  {
    id: 'birth_city',
    label: 'In what city were you born?',
  },
] as const;

export type SecurityQuestionId = (typeof PREDEFINED_SECURITY_QUESTIONS)[number]['id'];

/**
 * Validates that the provided question ID is one of the three predefined options.
 */
export function isValidSecurityQuestionId(id: unknown): id is SecurityQuestionId {
  if (typeof id !== 'string') return false;
  return PREDEFINED_SECURITY_QUESTIONS.some((q) => q.id === id);
}

/**
 * Returns question by ID, or undefined if invalid.
 */
export function getSecurityQuestionById(id: string): SecurityQuestion | undefined {
  return PREDEFINED_SECURITY_QUESTIONS.find((q) => q.id === id);
}
