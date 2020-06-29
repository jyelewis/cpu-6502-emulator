import {
  CPUAddressingMode,
  CPUOperation,
  CPUOperationWithAddressingModes,
  ProcessorStatus,
} from "./types";
import { convertToSignedValue } from "./util";

export const cpuOperations: { [key: number]: CPUOperation } = {
  0x00: {
    name: "BRK",
    dataBytes: 1, // one ghost operand, doesn't do anything but the processor treats is as if it does
    func: (cpu) => {
      // helpful for debugging at the moment
      console.log("BRK!");
      // console.log(Array.from(cpu.instructionsUsed).sort().join(";"));
      process.exit(1);

      cpu.triggerIRQB(true); // a brk is a software irqb with the brk processor status set
    },
  },
  0x08: {
    name: "PHP",
    dataBytes: 0,
    func: (cpu) => {
      cpu._push8BitValueToStack(cpu.processorStatus);
    },
  },
  0x28: {
    name: "PLP",
    dataBytes: 0,
    func: (cpu) => {
      cpu.processorStatus = cpu._pull8BitValueFromStack();
    },
  },
  0x18: {
    name: "CLC", // clear carry
    dataBytes: 0,
    func: (cpu) => {
      cpu.processorStatus = cpu.processorStatus & ~ProcessorStatus.carry;
    },
  },
  0x20: {
    name: "JSR abs",
    dataBytes: 2,
    func: (cpu, address) => {
      // before we jump, push the return address (current program counter) onto the stack
      cpu._push16BitValueToStack(cpu.programCounter);
      cpu.programCounter = address;
    },
  },
  0x24: {
    name: "BIT zp",
    dataBytes: 1,
    func: (cpu, zpAddress) => {
      // honestly, I have no idea what this instruction is meant to be used for.
      // interpreted what it does from these two websites:
      // https://www.masswerk.at/6502/6502_instruction_set.html#BIT
      // https://retrocomputing.stackexchange.com/questions/11108/why-does-the-6502-have-the-bit-instruction

      const memValue = cpu._read8BitValue(zpAddress);
      const zero = (cpu.reg_a & memValue) === 0;

      cpu.processorStatus =
        (cpu.processorStatus & 0b00111101) |
        (memValue & 0b11000000) |
        (zero ? 0b00000010 : 0);
    },
  },
  0x2c: {
    name: "BIT abs",
    dataBytes: 2,
    func: (cpu, address) => {
      // honestly, I have no idea what this instruction is meant to be used for.
      // interpreted what it does from these two websites:
      // https://www.masswerk.at/6502/6502_instruction_set.html#BIT
      // https://retrocomputing.stackexchange.com/questions/11108/why-does-the-6502-have-the-bit-instruction

      const memValue = cpu._read8BitValue(address);
      const zero = (cpu.reg_a & memValue) === 0;

      cpu.processorStatus =
        (cpu.processorStatus & 0b00111101) |
        (memValue & 0b11000000) |
        (zero ? 0b00000010 : 0);
    },
  },
  0x60: {
    name: "RTS",
    dataBytes: 0,
    func: (cpu) => {
      cpu.programCounter = cpu._pull16BitValueFromStack();
    },
  },
  0xba: {
    name: "TSX",
    dataBytes: 0,
    func: (cpu) => {
      cpu.reg_x = cpu._convertValueTo8BitAndSetStatusFlags(cpu.stackPointer);
    },
  },
  0x9a: {
    name: "TXS",
    dataBytes: 0,
    func: (cpu) => {
      cpu.stackPointer = cpu.reg_x;
    },
  },
  0x8a: {
    name: "TXA",
    dataBytes: 0,
    func: (cpu) => {
      cpu.reg_a = cpu._convertValueTo8BitAndSetStatusFlags(cpu.reg_x);
    },
  },
  0x98: {
    name: "TYA",
    dataBytes: 0,
    func: (cpu) => {
      cpu.reg_a = cpu._convertValueTo8BitAndSetStatusFlags(cpu.reg_y);
    },
  },
  0xa8: {
    name: "TAY",
    dataBytes: 0,
    func: (cpu) => {
      cpu.reg_y = cpu._convertValueTo8BitAndSetStatusFlags(cpu.reg_a);
    },
  },
  0xaa: {
    name: "TAX",
    dataBytes: 0,
    func: (cpu) => {
      cpu.reg_x = cpu._convertValueTo8BitAndSetStatusFlags(cpu.reg_a);
    },
  },
  0xd8: {
    name: "CLD",
    dataBytes: 0,
    func: () => {
      // noop, decimal mode not supported
    },
  },
  0x48: {
    name: "PHA",
    dataBytes: 0,
    func: (cpu) => {
      cpu._push8BitValueToStack(cpu.reg_a);
    },
  },
  0x68: {
    name: "PLA",
    dataBytes: 0,
    func: (cpu) => {
      cpu.reg_a = cpu._convertValueTo8BitAndSetStatusFlags(
        cpu._pull8BitValueFromStack()
      );
    },
  },
  0x38: {
    name: "SEC",
    dataBytes: 0,
    func: (cpu) => {
      cpu.processorStatus |= ProcessorStatus.carry;
    },
  },
  // branch
  0x10: {
    name: "BPL rel", // branch if plus (negative is not set)
    dataBytes: 1,
    func: (cpu, relativeAddress) => {
      if ((cpu.processorStatus & ProcessorStatus.negative) !== 0) {
        // negative bit is set, don't branch
        return;
      }

      // this is a SIGNED relative move
      cpu.programCounter =
        cpu.programCounter + convertToSignedValue(relativeAddress);
    },
  },
  0x90: {
    name: "BCC rel", // branch if carry clear
    dataBytes: 1,
    func: (cpu, relativeAddress) => {
      if ((cpu.processorStatus & ProcessorStatus.carry) !== 0) {
        // carry bit is set, don't branch
        return;
      }

      // this is a SIGNED relative move
      cpu.programCounter =
        cpu.programCounter + convertToSignedValue(relativeAddress);
    },
  },
  0xb0: {
    name: "BCS rel", // branch if carry set
    dataBytes: 1,
    func: (cpu, relativeAddress) => {
      if ((cpu.processorStatus & ProcessorStatus.carry) === 0) {
        // carry bit is clear, don't branch
        return;
      }

      // this is a SIGNED relative move
      cpu.programCounter =
        cpu.programCounter + convertToSignedValue(relativeAddress);
    },
  },
  0xf0: {
    name: "BEQ rel", // branch if equal (branch if result zero)
    dataBytes: 1,
    func: (cpu, relativeAddress) => {
      if ((cpu.processorStatus & ProcessorStatus.zero) === 0) {
        // zero bit is clear, don't branch
        return;
      }

      // this is a SIGNED relative move
      cpu.programCounter =
        cpu.programCounter + convertToSignedValue(relativeAddress);
    },
  },
  0x30: {
    name: "BMI rel", // branch if minus (branch if negative bit is set)
    dataBytes: 1,
    func: (cpu, relativeAddress) => {
      if ((cpu.processorStatus & ProcessorStatus.negative) === 0) {
        // negative bit is clear, don't branch
        return;
      }

      // this is a SIGNED relative move
      cpu.programCounter =
        cpu.programCounter + convertToSignedValue(relativeAddress);
    },
  },
  0xd0: {
    name: "BNE rel", // branch if not zero
    dataBytes: 1,
    func: (cpu, relativeAddress) => {
      if ((cpu.processorStatus & ProcessorStatus.zero) !== 0) {
        // zero bit is set, don't branch
        return;
      }

      // this is a SIGNED relative move
      cpu.programCounter =
        cpu.programCounter + convertToSignedValue(relativeAddress);
    },
  },
  0x50: {
    name: "BVC rel", // branch if overflow clear
    dataBytes: 1,
    func: (cpu, relativeAddress) => {
      if ((cpu.processorStatus & ProcessorStatus.overflow) !== 0) {
        // overflow bit is set, don't branch
        return;
      }

      // this is a SIGNED relative move
      cpu.programCounter =
        cpu.programCounter + convertToSignedValue(relativeAddress);
    },
  },
  0x70: {
    name: "BVS rel", // branch if overflow set
    dataBytes: 1,
    func: (cpu, relativeAddress) => {
      if ((cpu.processorStatus & ProcessorStatus.overflow) === 0) {
        // overflow bit is clear, don't branch
        return;
      }

      // this is a SIGNED relative move
      cpu.programCounter =
        cpu.programCounter + convertToSignedValue(relativeAddress);
    },
  },
  // toggle system register bits

  // inc/dec xy
  0xe8: {
    name: "INX",
    dataBytes: 0,
    func: (cpu) => {
      cpu.reg_x = (cpu.reg_x + 1) % 256;
      cpu._convertValueTo8BitAndSetStatusFlags(cpu.reg_x);
    },
  },
  0xc8: {
    name: "INY",
    dataBytes: 0,
    func: (cpu) => {
      cpu.reg_y = (cpu.reg_y + 1) % 256;
      cpu._convertValueTo8BitAndSetStatusFlags(cpu.reg_y);
    },
  },
  0xca: {
    name: "DEX",
    dataBytes: 0,
    func: (cpu) => {
      cpu.reg_x--;
      // wrap around
      if (cpu.reg_x === -1) {
        cpu.reg_x = 255;
      }
      cpu._convertValueTo8BitAndSetStatusFlags(cpu.reg_x);
    },
  },
  0x88: {
    name: "DEY",
    dataBytes: 0,
    func: (cpu) => {
      cpu.reg_y--;
      // wrap around
      if (cpu.reg_y === -1) {
        cpu.reg_y = 255;
      }
      cpu._convertValueTo8BitAndSetStatusFlags(cpu.reg_y);
    },
  },

  0x4c: {
    name: "JMP abs",
    dataBytes: 2,
    func: (cpu, absAddress) => {
      cpu.programCounter = absAddress;
    },
  },
  0xea: {
    name: "NOP",
    dataBytes: 0,
    func: (cpu, value) => {
      // do nothing, nop
    },
  },
};

// to avoid having to re-implement each operation for each addressing mode, provide an abstract operation generator
// dynamically create functions for each opcode at runtime
const operationsWithMultipleAddressingModes: CPUOperationWithAddressingModes[] = [
  {
    name: "LDA",
    addressingModes: {
      0xa9: "#",
      0xa5: "zp",
      0xb5: "zp,x",
      0xad: "abs",
      0xbd: "abs,x",
      0xb9: "abs,y",
      0xa1: "(ind,x)",
      0xb1: "(ind),y",
    },
    func: (cpu, value) => {
      cpu.reg_a = cpu._convertValueTo8BitAndSetStatusFlags(value);
    },
  },
  {
    name: "STA",
    addressingModes: {
      0x85: "zp",
      0x95: "zp,x",
      0x8d: "abs",
      0x9d: "abs,x",
      0x99: "abs,y",
      0x81: "(ind,x)",
      0x91: "(ind),y",
    },
    func: (cpu) => {
      return cpu.reg_a;
    },
  },
  {
    name: "LDX",
    addressingModes: {
      0xa2: "#",
      0xa6: "zp",
      0xb6: "zp,y",
      0xae: "abs",
      0xbe: "abs,y",
    },
    func: (cpu, value) => {
      cpu.reg_x = cpu._convertValueTo8BitAndSetStatusFlags(value);
    },
  },
  {
    name: "STX",
    addressingModes: {
      0x86: "zp",
      0x96: "zp,y",
      0x8e: "abs",
    },
    func: (cpu, value) => {
      return cpu.reg_x;
    },
  },
  {
    name: "LDY",
    addressingModes: {
      0xa0: "#",
      0xa4: "zp",
      0xb4: "zp,x",
      0xac: "abs",
      0xbc: "abs,x",
    },
    func: (cpu, value) => {
      cpu.reg_y = cpu._convertValueTo8BitAndSetStatusFlags(value);
    },
  },
  {
    name: "STY",
    addressingModes: {
      0x84: "zp",
      0x94: "zp,x",
      0x8c: "abs",
    },
    func: (cpu, value) => {
      return cpu.reg_y;
    },
  },
  {
    name: "ORA",
    addressingModes: {
      0x09: "#",
      0x05: "zp",
      0x15: "zp,x",
      0x0d: "abs",
      0x1d: "abs,x",
      0x19: "abs,y",
      0x01: "(ind,x)",
      0x11: "(ind),y",
    },
    func: (cpu, value) => {
      cpu.reg_a = cpu._convertValueTo8BitAndSetStatusFlags(cpu.reg_a | value);
    },
  },
  {
    name: "ASL",
    addressingModes: {
      0x0a: "a",
      0x06: "zp",
      0x16: "zp,x",
      0x0e: "abs",
      0x1e: "abs,x",
    },
    func: (cpu, value) => {
      return cpu._convertValueTo8BitAndSetStatusFlags(value << 1, true);
    },
  },
  {
    name: "ROL",
    addressingModes: {
      0x2a: "a",
      0x26: "zp",
      0x36: "zp,x",
      0x2e: "abs",
      0x3e: "abs,x",
    },
    func: (cpu, value) => {
      // basically the same as ASL but with a wrap around
      const carrySet =
        (cpu.processorStatus & ProcessorStatus.carry) === ProcessorStatus.carry;

      value = value << 1;

      // check if the carry bit was set, and wrap it to the lsb
      if (carrySet) {
        value = value | 0b00000001;
      }

      value = cpu._convertValueTo8BitAndSetStatusFlags(value, true);
      return value;
    },
  },
  {
    name: "ROR",
    addressingModes: {
      0x6a: "a",
      0x66: "zp",
      0x76: "zp,x",
      0x6e: "abs",
      0x7e: "abs,x",
    },
    func: (cpu, value) => {
      // basically the same as ASL but with a wrap around
      const carrySet =
        (cpu.processorStatus & ProcessorStatus.carry) === ProcessorStatus.carry;

      // check if the lsb was set, and wrap it to the overflow bit
      const willWrap = (value & 0b00000001) === 0b00000001;

      value = value >> 1;

      if (willWrap) {
        // set the carry bit if we lost a bit over the lsb edge
        value = value | 0b100000000;
      }

      if (carrySet) {
        // set the highest bit if the carry was set before
        value = value | 0b010000000;
      }

      value = cpu._convertValueTo8BitAndSetStatusFlags(value, true);
      return value;
    },
  },
  {
    name: "ADC",
    addressingModes: {
      0x69: "#",
      0x65: "zp",
      0x75: "zp,x",
      0x6d: "abs",
      0x7d: "abs,x",
      0x79: "abs,y",
      0x61: "(ind,x)",
      0x71: "(ind),y",
    },
    func: (cpu, value) => {
      const carry = (cpu.processorStatus & ProcessorStatus.carry) === 0 ? 0 : 1;
      const sum = value + cpu.reg_a + carry;
      const cappedSum = cpu._convertValueTo8BitAndSetStatusFlags(sum, true);

      // update overflow flag
      // formula taken from
      // http://www.righto.com/2012/12/the-6502-overflow-flag-explained.html
      const overflow = (value ^ cappedSum) & (cpu.reg_a ^ cappedSum) & 0x80;

      if (overflow) {
        cpu.processorStatus |= ProcessorStatus.overflow;
      } else {
        cpu.processorStatus &= ~ProcessorStatus.overflow;
      }

      // store result in reg a
      cpu.reg_a = cappedSum;
    },
  },
  {
    name: "AND",
    addressingModes: {
      0x29: "#",
      0x25: "zp",
      0x35: "zp,x",
      0x2d: "abs",
      0x3d: "abs,x",
      0x39: "abs,y",
      0x21: "(ind,x)",
      0x31: "(ind),y",
    },
    func: (cpu, value) => {
      cpu.reg_a = cpu._convertValueTo8BitAndSetStatusFlags(cpu.reg_a & value);
    },
  },
  {
    name: "INC",
    addressingModes: {
      0xe6: "zp",
      0xf6: "zp,x",
      0xee: "abs",
      0xfe: "abs,x",
    },
    func: (cpu, value) => {
      value = (value + 1) % 256;
      cpu._convertValueTo8BitAndSetStatusFlags(value);
      return value;
    },
  },
  {
    name: "DEC",
    addressingModes: {
      0xc6: "zp",
      0xd6: "zp,x",
      0xce: "abs",
      0xde: "abs,x",
    },
    func: (cpu, value) => {
      value = value - 1; // wrap around
      if (value === -1) {
        value = 255;
      }
      cpu._convertValueTo8BitAndSetStatusFlags(value);
      return value;
    },
  },
  {
    name: "CMP",
    addressingModes: {
      0xc9: "#",
      0xc5: "zp",
      0xd5: "zp,x",
      0xcd: "abs",
      0xdd: "abs,x",
      0xd9: "abs,y",
      0xc1: "(ind,x)",
      0xd1: "(ind),y",
    },
    func: (cpu, value) => {
      const result = cpu.reg_a - value;
      cpu._convertValueTo8BitAndSetStatusFlags(result);

      // manually set the carry, the logic here isn't what you would expect
      if (cpu.reg_a >= value) {
        cpu.processorStatus |= ProcessorStatus.carry;
      } else {
        cpu.processorStatus &= ~ProcessorStatus.carry;
      }
    },
  },
  {
    name: "CPX",
    addressingModes: {
      0xe0: "#",
      0xe4: "zp",
      0xec: "abs",
    },
    func: (cpu, value) => {
      const result = cpu.reg_x - value;
      cpu._convertValueTo8BitAndSetStatusFlags(result);

      // manually set the carry, the logic here isn't what you would expect
      if (cpu.reg_x >= value) {
        cpu.processorStatus |= ProcessorStatus.carry;
      } else {
        cpu.processorStatus &= ~ProcessorStatus.carry;
      }
    },
  },
  {
    name: "CPY",
    addressingModes: {
      0xc0: "#",
      0xc4: "zp",
      0xcc: "abs",
    },
    func: (cpu, value) => {
      const result = cpu.reg_y - value;
      cpu._convertValueTo8BitAndSetStatusFlags(result);

      // manually set the carry, the logic here isn't what you would expect
      if (cpu.reg_y >= value) {
        cpu.processorStatus |= ProcessorStatus.carry;
      } else {
        cpu.processorStatus &= ~ProcessorStatus.carry;
      }
    },
  },
  {
    name: "SBC",
    addressingModes: {
      0xe9: "#",
      0xe5: "zp",
      0xf5: "zp,x",
      0xed: "abs",
      0xfd: "abs,x",
      0xf9: "abs,y",
      0xe1: "(ind,x)",
      0xf1: "(ind),y",
    },
    func: (cpu, value) => {
      const carry =
        (cpu.processorStatus & ProcessorStatus.carry) === ProcessorStatus.carry
          ? 1
          : 0;
      const result = cpu.reg_a - value - (1 - carry);

      // manually set the carry, the logic here isn't what you would expect
      if (result >= 0) {
        cpu.processorStatus |= ProcessorStatus.carry;
      } else {
        cpu.processorStatus &= ~ProcessorStatus.carry;
      }

      // manually set the overflow bit, don't really understand this logic, stole it from
      // https://github.com/6502/js6502/blob/master/6502.js
      const overflow = (cpu.reg_a & 10000000) != (result & 10000000);
      if (overflow) {
        cpu.processorStatus |= ProcessorStatus.overflow;
      } else {
        cpu.processorStatus &= ~ProcessorStatus.overflow;
      }

      cpu.reg_a = cpu._convertValueTo8BitAndSetStatusFlags(result);
    },
  },
  {
    name: "EOR",
    addressingModes: {
      0x49: "#",
      0x45: "zp",
      0x55: "zp,x",
      0x4d: "abs",
      0x5d: "abs,x",
      0x59: "abs,y",
      0x41: "(ind,x)",
      0x51: "(ind),y",
    },
    func: (cpu, value) => {
      const result = cpu.reg_a ^ value;
      cpu.reg_a = cpu._convertValueTo8BitAndSetStatusFlags(result);
    },
  },
];

const addressingModes: { [key: string]: CPUAddressingMode } = {
  "#": {
    dataBytes: 1,
    fetchValue: (cpu, v) => v,
    storeValue: () => {
      throw new Error("Cannot store to immediate value");
    },
  },
  a: {
    dataBytes: 0,
    fetchValue: (cpu) => cpu.reg_a,
    storeValue: (cpu, address, value) => (cpu.reg_a = value),
  },
  zp: {
    dataBytes: 1,
    fetchValue: (cpu, address) => cpu._read8BitValue(address),
    storeValue: (cpu, address, value) => cpu._write8BitValue(address, value),
  },
  "zp,x": {
    dataBytes: 1,
    fetchValue: (cpu, address) => cpu._read8BitValue(address + cpu.reg_x),
    storeValue: (cpu, address, value) =>
      cpu._write8BitValue(address + cpu.reg_x, value),
  },
  "zp,y": {
    dataBytes: 1,
    fetchValue: (cpu, address) => cpu._read8BitValue(address + cpu.reg_y),
    storeValue: (cpu, address, value) =>
      cpu._write8BitValue(address + cpu.reg_y, value),
  },
  abs: {
    dataBytes: 2,
    fetchValue: (cpu, address) => cpu._read8BitValue(address),
    storeValue: (cpu, address, value) => cpu._write8BitValue(address, value),
  },
  "abs,x": {
    dataBytes: 2,
    fetchValue: (cpu, address) => cpu._read8BitValue(address + cpu.reg_x),
    storeValue: (cpu, address, value) =>
      cpu._write8BitValue(address + cpu.reg_x, value),
  },
  "abs,y": {
    dataBytes: 2,
    fetchValue: (cpu, address) => cpu._read8BitValue(address + cpu.reg_y),
    storeValue: (cpu, address, value) =>
      cpu._write8BitValue(address + cpu.reg_y, value),
  },
  "(ind,x)": {
    dataBytes: 1,
    fetchValue: (cpu, indirectAddress) => {
      const address = cpu._read16BitValue(indirectAddress + cpu.reg_x);
      return cpu._read8BitValue(address);
    },
    storeValue: (cpu, indirectAddress, value) => {
      const address = cpu._read16BitValue(indirectAddress + cpu.reg_x);
      cpu._write8BitValue(address, value);
    },
  },
  "(ind),y": {
    dataBytes: 1,
    fetchValue: (cpu, indirectAddress) => {
      const address = cpu._read16BitValue(indirectAddress) + cpu.reg_y;
      return cpu._read8BitValue(address);
    },
    storeValue: (cpu, indirectAddress, value) => {
      const address = cpu._read16BitValue(indirectAddress) + cpu.reg_y;
      cpu._write8BitValue(address, value);
    },
  },
};

operationsWithMultipleAddressingModes.forEach((operation) => {
  Object.keys(operation.addressingModes).forEach((opcodeStr) => {
    const opcode = parseInt(opcodeStr, 10);
    const addressingModeLabel = operation.addressingModes[opcode];
    const addressingMode = addressingModes[addressingModeLabel];

    cpuOperations[opcode] = {
      name: `${operation.name} ${addressingModeLabel}`,
      dataBytes: addressingMode.dataBytes,
      // how meta can we get
      func: (cpu, param) => {
        const inputValue = addressingMode.fetchValue(cpu, param);
        const outputValue = operation.func(cpu, inputValue);
        if (outputValue !== undefined) {
          addressingMode.storeValue(cpu, param, outputValue as number);
        }
      },
    };
  });
});
