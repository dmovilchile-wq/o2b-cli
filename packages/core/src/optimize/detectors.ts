import { promises as fs } from 'node:fs';
import path from 'node:path';

// Minimal, extensible stack detection: read manifest files and derive tags
// from dependency names. Deliberately not exhaustive — new tags are added
// by extending MANIFEST_DETECTORS, never by hardcoding a specific project's
// stack into the optimize engine itself.

interface ManifestDetector {
  fileName: string;
  detect(content: string): string[];
}

function tagsFromPackageJson(content: string): string[] {
  try {
    const pkg = JSON.parse(content);
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const names = Object.keys(deps);
    const tags = new Set<string>();
    for (const name of names) {
      if (name === 'react' || name === 'react-dom') tags.add('react');
      if (name === 'express') tags.add('express');
      if (name.startsWith('@supabase/') || name === 'supabase') tags.add('supabase');
      if (name === 'vite') tags.add('vite');
      if (name.startsWith('vitest')) tags.add('vitest');
      if (name === 'playwright' || name === '@playwright/test') tags.add('playwright-in-deps');
    }
    return [...tags, 'node'];
  } catch {
    return [];
  }
}

function tagsFromPubspecYaml(content: string): string[] {
  const tags = new Set<string>(['flutter']);
  if (/supabase_flutter/.test(content)) tags.add('supabase');
  return [...tags];
}

const MANIFEST_DETECTORS: ManifestDetector[] = [
  { fileName: 'package.json', detect: tagsFromPackageJson },
  { fileName: 'pubspec.yaml', detect: tagsFromPubspecYaml },
];

export async function detectStackTags(rootDir: string): Promise<string[]> {
  const tags = new Set<string>();
  for (const detector of MANIFEST_DETECTORS) {
    const filePath = path.join(rootDir, detector.fileName);
    try {
      const content = await fs.readFile(filePath, 'utf8');
      for (const tag of detector.detect(content)) tags.add(tag);
    } catch {
      // Manifest not present for this detector — not an error.
    }
  }
  return [...tags];
}
