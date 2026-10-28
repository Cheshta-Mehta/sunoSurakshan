export interface YamnetClassEntry {
  index: number;
  mid: string;
  displayName: string;
}

let cachedLabels: YamnetClassEntry[] | null = null;

export async function loadYamnetLabels(): Promise<YamnetClassEntry[]> {
  if (cachedLabels) return cachedLabels;
  const res = await fetch('/models/yamnet_class_map.csv');
  if (!res.ok) {
    throw new Error(`Failed to load YAMNet class map: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  cachedLabels = parseYamnetCsv(text);
  return cachedLabels;
}

function parseYamnetCsv(text: string): YamnetClassEntry[] {
  const lines = text.trim().split('\n');
  const entries: YamnetClassEntry[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const firstComma = line.indexOf(',');
    const secondComma = line.indexOf(',', firstComma + 1);
    const index = parseInt(line.slice(0, firstComma), 10);
    const mid = line.slice(firstComma + 1, secondComma);
    let displayName = line.slice(secondComma + 1);
    if (displayName.startsWith('"') && displayName.endsWith('"')) {
      displayName = displayName.slice(1, -1).replace(/""/g, '"');
    }
    entries.push({ index, mid, displayName });
  }
  return entries;
}

export interface LabelVerification {
  candidate: string;
  found: boolean;
}

export async function verifyCategoryLabels(candidates: string[]): Promise<LabelVerification[]> {
  const labels = await loadYamnetLabels();
  const lowerSet = new Set(labels.map((l) => l.displayName.toLowerCase()));
  return candidates.map((c) => ({ candidate: c, found: lowerSet.has(c.toLowerCase()) }));
}
