/**
 * KofyOne - Curated Preset Avatars
 * 6 official built-in SVG / gradient avatars for user profiles.
 * Users pick from this curated set; custom URLs / file uploads are prohibited.
 */

export interface PresetAvatar {
  id: string;
  name: string;
  title: string;
  description: string;
  gradient: string;
  bgClasses: string;
  borderClasses: string;
  textClasses: string;
  iconName: 'GraduationCap' | 'Code' | 'Cloud' | 'Cpu' | 'Rocket' | 'Sparkles';
}

export const PRESET_AVATARS: readonly PresetAvatar[] = [
  {
    id: 'avatar-student-1',
    name: 'Campus Learner',
    title: 'Student & Academic',
    description: 'Vibrant emerald gradient for curious minds and campus learners.',
    gradient: 'from-emerald-500 to-teal-600',
    bgClasses: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    borderClasses: 'border-emerald-400/40 ring-emerald-500',
    textClasses: 'text-emerald-100',
    iconName: 'GraduationCap',
  },
  {
    id: 'avatar-coder-2',
    name: 'Code Crafter',
    title: 'Developer & Hacker',
    description: 'Electric indigo gradient for full-stack and systems programmers.',
    gradient: 'from-indigo-500 to-blue-600',
    bgClasses: 'bg-gradient-to-br from-indigo-500 to-blue-600',
    borderClasses: 'border-indigo-400/40 ring-indigo-500',
    textClasses: 'text-indigo-100',
    iconName: 'Code',
  },
  {
    id: 'avatar-cloud-3',
    name: 'Cloud Navigator',
    title: 'Cloud & Infrastructure',
    description: 'Deep azure sky gradient for cloud computing enthusiasts.',
    gradient: 'from-sky-500 to-cyan-600',
    bgClasses: 'bg-gradient-to-br from-sky-500 to-cyan-600',
    borderClasses: 'border-sky-400/40 ring-sky-500',
    textClasses: 'text-sky-100',
    iconName: 'Cloud',
  },
  {
    id: 'avatar-ai-4',
    name: 'AI Pioneer',
    title: 'Machine Learning & GenAI',
    description: 'Cosmic violet gradient for neural network and AI model builders.',
    gradient: 'from-purple-500 to-violet-600',
    bgClasses: 'bg-gradient-to-br from-purple-500 to-violet-600',
    borderClasses: 'border-purple-400/40 ring-purple-500',
    textClasses: 'text-purple-100',
    iconName: 'Cpu',
  },
  {
    id: 'avatar-rocket-5',
    name: 'Launch Architect',
    title: 'Startup & Innovation',
    description: 'Fiery amber gradient for creators shipping tomorrow\'s tech.',
    gradient: 'from-amber-500 to-orange-600',
    bgClasses: 'bg-gradient-to-br from-amber-500 to-orange-600',
    borderClasses: 'border-amber-400/40 ring-amber-500',
    textClasses: 'text-amber-100',
    iconName: 'Rocket',
  },
  {
    id: 'avatar-spark-6',
    name: 'Future Builder',
    title: 'Creative Technologist',
    description: 'Luminous rose & fuchsia gradient for visionaries and designers.',
    gradient: 'from-pink-500 to-rose-600',
    bgClasses: 'bg-gradient-to-br from-pink-500 to-rose-600',
    borderClasses: 'border-pink-400/40 ring-pink-500',
    textClasses: 'text-pink-100',
    iconName: 'Sparkles',
  },
] as const;

export const DEFAULT_AVATAR_ID = 'avatar-student-1';

export const VALID_AVATAR_IDS = new Set(PRESET_AVATARS.map((a) => a.id));

/**
 * Validates whether the given avatar identifier is an official preset avatar ID.
 * Strictly returns false for arbitrary URLs, file paths, or unrecognized strings.
 */
export function isValidPresetAvatar(avatarId?: string | null): boolean {
  if (!avatarId || typeof avatarId !== 'string') return false;
  return VALID_AVATAR_IDS.has(avatarId.trim());
}

/**
 * Retrieves the metadata for a preset avatar.
 * Falls back safely to DEFAULT_AVATAR_ID if not found or invalid.
 */
export function getPresetAvatar(avatarId?: string | null): PresetAvatar {
  if (avatarId && isValidPresetAvatar(avatarId)) {
    const found = PRESET_AVATARS.find((a) => a.id === avatarId.trim());
    if (found) return found;
  }
  return PRESET_AVATARS[0];
}
