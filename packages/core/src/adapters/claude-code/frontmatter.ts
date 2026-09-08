// Minimal frontmatter parser: only handles flat `key: value` pairs inside a
// leading `---\n...\n---` block, which is all O2B needs (name/description/model).
// Deliberately not a full YAML parser — avoids taking on a YAML dependency
// for a narrow, well-defined need.

export interface ParsedMarkdown {
  frontmatter: Record<string, string>;
  frontmatterBytes: number;
  body: string;
  bodyBytes: number;
}

export function parseFrontmatterMarkdown(content: string): ParsedMarkdown {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return {
      frontmatter: {},
      frontmatterBytes: 0,
      body: content,
      bodyBytes: Buffer.byteLength(content, 'utf8'),
    };
  }
  const [, rawFrontmatter, body] = match;
  const frontmatter: Record<string, string> = {};
  for (const line of rawFrontmatter.split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) continue;
    const [, key, rawValue] = kv;
    frontmatter[key.trim()] = rawValue.trim().replace(/^["']|["']$/g, '');
  }
  return {
    frontmatter,
    frontmatterBytes: Buffer.byteLength(rawFrontmatter, 'utf8'),
    body,
    bodyBytes: Buffer.byteLength(body, 'utf8'),
  };
}
