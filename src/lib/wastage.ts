export function calculateWastagePct(
  actualYards: number,
  targetQty: number,
  stdYardsPerPiece: number
): number {
  const expectedYards = targetQty * stdYardsPerPiece;
  const pct = ((actualYards - expectedYards) / expectedYards) * 100;
  return Math.round(pct * 100) / 100;
}