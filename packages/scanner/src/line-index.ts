// Fase E hardening fix (second autonomous run): every rule used to call
// `content.slice(0, index).split('\n').length` once PER MATCH to find a
// line number — O(content length) per call, so a file with many matches
// degraded to O(n²). Confirmed empirically: 20,000 near-miss lines
// (~520KB) took ~6.2s to scan before this fix (see
// packages/scanner/tests/security/redos.test.ts). This precomputes line
// start offsets ONCE per scanned file (O(n)) and does an O(log n) binary
// search per match instead.
export function createLineIndex(content: string): (index: number) => number {
  const lineStarts: number[] = [0];
  for (let i = 0; i < content.length; i += 1) {
    if (content.charCodeAt(i) === 10 /* \n */) lineStarts.push(i + 1);
  }
  return (index: number): number => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= index) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1; // 1-indexed, matching the previous behavior
  };
}
