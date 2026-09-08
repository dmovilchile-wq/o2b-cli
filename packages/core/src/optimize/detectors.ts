import { promises as fs } from 'node:fs';
import path from 'node:path';

// Minimal, extensible stack detection: read manifest files and derive tags
// from dependency names. Deliberately not exhaustive — new tags are added
// by extending MANIFEST_DETECTORS, never by hardcoding a specific project's
// stack into the optimize engine itself.
//
// STACK DETECTION vs. TOOL RECOMMENDATION: this module ONLY answers "what
// stack is here" (facts, from manifest contents) — it never decides what
// to recommend. That decision lives entirely in `profiles/*.profile.json`
// + `run.ts`. Detecting `flutter` here does not imply any MCP server is
// relevant; that judgment call belongs to a profile, which must state a
// `reason` for anyone to see. Keeping this separation means adding a new
// detectable tag can never silently start recommending something.

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
      if (name === 'react-native') tags.add('react-native');
      if (name === 'next') tags.add('nextjs');
      if (name === 'express') tags.add('express');
      if (name.startsWith('@supabase/') || name === 'supabase') tags.add('supabase');
      if (name === 'vite') tags.add('vite');
      if (name.startsWith('vitest')) tags.add('vitest');
      if (name === 'playwright' || name === '@playwright/test') tags.add('playwright-in-deps');
      if (name === 'typescript') tags.add('typescript');
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

// Python: presence alone is the signal (unlike package.json, there's no
// single universal dependency file format to parse dependency names from
// reliably offline — requirements.txt/pyproject.toml/Pipfile all differ).
function tagsFromPythonMarker(): string[] {
  return ['python'];
}

function tagsFromDockerMarker(): string[] {
  return ['docker'];
}

const MANIFEST_DETECTORS: ManifestDetector[] = [
  { fileName: 'package.json', detect: tagsFromPackageJson },
  { fileName: 'pubspec.yaml', detect: tagsFromPubspecYaml },
  { fileName: 'requirements.txt', detect: tagsFromPythonMarker },
  { fileName: 'pyproject.toml', detect: tagsFromPythonMarker },
  { fileName: 'Pipfile', detect: tagsFromPythonMarker },
  { fileName: 'Dockerfile', detect: tagsFromDockerMarker },
  { fileName: 'docker-compose.yml', detect: tagsFromDockerMarker },
  { fileName: 'docker-compose.yaml', detect: tagsFromDockerMarker },
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
