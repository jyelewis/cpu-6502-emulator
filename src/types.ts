import { CPU6502 } from "./CPU6502";

export enum ProcessorStatus {
  negative = 0b10000000,
  overflow = 0b01000000,
  const = 0b00100000,
  brk = 0b00010000,
  decimalMode = 0b00001000,
  disableIrqb = 0b00000100,
  zero = 0b00000010,
  carry = 0b00000001,
}

export enum ClockMode {
  paused,
  running,
  waitForInterrupt = 2,
}

export enum ReadWrite {
  read,
  write,
}

export type AccessMemoryFunc = (
  readWrite: ReadWrite,
  address: number,
  value?: number
) => number | void;

// private types
export interface CPUOperation {
  name: string; // "LDA #"
  dataBytes: 0 | 1 | 2; // number of bytes following this instruction need to be provided
  func: (cpu: CPU6502, param: number) => void;
}

export interface CPUAddressingMode {
  dataBytes: 0 | 1 | 2; // number of bytes following this instruction need to be provided
  fetchValue: (cpu: CPU6502, param: number) => number;
  storeValue: (cpu: CPU6502, param: number, value: number) => void;
}

export type AddressingModeLabel =
  | "#"
  | "a"
  | "zp"
  | "zp,x"
  | "zp,y"
  | "abs"
  | "abs,x"
  | "abs,y"
  | "(ind,x)"
  | "(ind),y";

export interface CPUOperationWithAddressingModes {
  name: string; // "LDA"
  addressingModes: { [key: number]: AddressingModeLabel };
  func: (cpu: CPU6502, param: number) => void | number;
}
