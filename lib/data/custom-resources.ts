import fs from 'fs';
import path from 'path';
import type { ResourceWithRelations } from '@/types/resource';

const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'custom-resources.json');

export function getCustomResources(): ResourceWithRelations[] {
  try {
    if (!fs.existsSync(DATA_FILE_PATH)) {
      return [];
    }
    const content = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
    if (!content.trim()) return [];
    return JSON.parse(content) as ResourceWithRelations[];
  } catch (err) {
    console.error('Error reading custom resources:', err);
    return [];
  }
}

export function getCustomResourceById(idOrSlug: string): ResourceWithRelations | null {
  const current = getCustomResources();
  return current.find((r) => r.id === idOrSlug || r.slug === idOrSlug) || null;
}

export function saveCustomResource(resource: ResourceWithRelations): void {
  try {
    const dir = path.dirname(DATA_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const current = getCustomResources();
    const existingIndex = current.findIndex((r) => r.id === resource.id || r.slug === resource.slug);
    if (existingIndex >= 0) {
      current[existingIndex] = { ...current[existingIndex], ...resource, updated_at: new Date().toISOString() };
    } else {
      current.unshift(resource);
    }
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(current, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving custom resource:', err);
    throw new Error('Failed to save resource to persistent storage.');
  }
}

export function updateCustomResource(
  idOrSlug: string,
  updates: Partial<ResourceWithRelations>
): ResourceWithRelations | null {
  try {
    const current = getCustomResources();
    const existingIndex = current.findIndex((r) => r.id === idOrSlug || r.slug === idOrSlug);
    if (existingIndex < 0) return null;

    const updated: ResourceWithRelations = {
      ...current[existingIndex],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    current[existingIndex] = updated;
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(current, null, 2), 'utf-8');
    return updated;
  } catch (err) {
    console.error('Error updating custom resource:', err);
    throw new Error('Failed to update resource in persistent storage.');
  }
}

export function deleteCustomResource(idOrSlug: string): boolean {
  try {
    const current = getCustomResources();
    const filtered = current.filter((r) => r.id !== idOrSlug && r.slug !== idOrSlug);
    if (filtered.length === current.length) return false;

    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(filtered, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error deleting custom resource:', err);
    throw new Error('Failed to delete resource from persistent storage.');
  }
}
