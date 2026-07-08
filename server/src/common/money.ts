export function minorToAmount(value: number): number {
  return value / 100;
}

export function amountToMinor(value: number): number {
  return Math.round(value * 100);
}
