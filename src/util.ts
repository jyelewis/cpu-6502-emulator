export function convertToSignedValue(value: number): number {
  if (value >= 128) {
    return value - 256; // negative numbers are stored using twos complement
  }
  return value;
}
