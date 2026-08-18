export interface RepoFile {
  path: string;
  content: string;
}

export interface Chunk {
  id: string;
  path: string;
  startLine: number;
  endLine: number;
  text: string;
}

const CHUNK_LINES = 40;
const OVERLAP_LINES = 6;

// Splits a single file into overlapping line-window chunks.
// Overlap avoids losing a function definition that straddles a boundary.
export function chunkFile(file: RepoFile): Chunk[] {
  const lines = file.content.split("\n");
  const chunks: Chunk[] = [];
  let start = 0;
  let idx = 0;

  if (lines.length === 0) return chunks;

  while (start < lines.length) {
    const end = Math.min(start + CHUNK_LINES, lines.length);
    const slice = lines.slice(start, end).join("\n");
    chunks.push({
      id: `${file.path}#${idx}`,
      path: file.path,
      startLine: start + 1,
      endLine: end,
      text: slice,
    });
    idx += 1;
    if (end >= lines.length) break;
    start = end - OVERLAP_LINES;
  }

  return chunks;
}

export function chunkRepo(files: RepoFile[]): Chunk[] {
  return files.flatMap(chunkFile);
}

// Parses the simple paste format the UI uses:
//   ### path/to/file.ts
//   <code>
//   ### path/to/other.ts
//   <code>
// Falls back to a single "pasted.txt" file if no markers are found.
export function parsePastedRepo(raw: string): RepoFile[] {
  const markerRe = /^###\s+(.+)$/;
  const lines = raw.split("\n");
  const files: RepoFile[] = [];
  let currentPath: string | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (currentPath !== null) {
      files.push({ path: currentPath.trim(), content: buffer.join("\n").trim() });
    }
    buffer = [];
  };

  for (const line of lines) {
    const m = line.match(markerRe);
    if (m) {
      flush();
      currentPath = m[1];
    } else if (currentPath !== null) {
      buffer.push(line);
    }
  }
  flush();

  if (files.length === 0 && raw.trim().length > 0) {
    return [{ path: "pasted.txt", content: raw.trim() }];
  }
  return files;
}
