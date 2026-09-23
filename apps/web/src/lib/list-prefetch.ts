/** True once the reader is at least 70% through the loaded rows. */
export function shouldPrefetchNextPage(index: number, count: number): boolean {
  if (count <= 0 || index < 0) {
    return false;
  }
  return (index + 1) / count >= 0.7;
}
