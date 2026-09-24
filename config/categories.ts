/**
 * KofyOne - Categories Configuration
 * Centralized registry of initial resource categories.
 *
 * Designed for Microsoft resources initially:
 * - Student
 * - AI
 * - Cloud
 * - Developer
 * - Productivity
 */

export interface InitialCategoryConfig {
  slug: string;
  name: string;
  description: string;
  icon?: string;
  display_order: number;
  is_active: boolean;
}

export const INITIAL_CATEGORIES: InitialCategoryConfig[] = [
  {
    slug: 'student',
    name: 'Student',
    description: 'Official student programs, ambassador initiatives, benefits, and student packs.',
    icon: 'GraduationCap',
    display_order: 1,
    is_active: true,
  },
  {
    slug: 'ai',
    name: 'AI',
    description: 'Artificial intelligence learning paths, Microsoft Copilot, and Azure OpenAI.',
    icon: 'Sparkles',
    display_order: 2,
    is_active: true,
  },
  {
    slug: 'cloud',
    name: 'Cloud',
    description: 'Azure cloud credits, free tier services, and cloud architecture modules.',
    icon: 'Cloud',
    display_order: 3,
    is_active: true,
  },
  {
    slug: 'developer',
    name: 'Developer',
    description: 'Developer tools, Visual Studio, GitHub student benefits, and SDKs.',
    icon: 'Code2',
    display_order: 4,
    is_active: true,
  },
  {
    slug: 'productivity',
    name: 'Productivity',
    description: 'Productivity tools, Microsoft 365 student plans, and collaboration platforms.',
    icon: 'Briefcase',
    display_order: 5,
    is_active: true,
  },
];
