import { CPU6502 } from "../CPU6502";
import { AccessMemoryFunc, ReadWrite } from "../types";

// example instructions
// const I_NOOP = 0xEA;
const I_ORA = 0x0d;
const I_LDA = 0xa9;
const I_STA = 0x8d;
const I_JMP = 0x4c;

// set up memory
const ram = new Uint8ClampedArray(0xffff); // 64kb ram
ram.fill(0xea); // fill with noop instructions
ram[0xfffc] = 0x69; // store reset vector as 0269
ram[0xfffd] = 0x02;

// create a basic program
ram.set(
  [
    // store 0x69 in address 0x0001
    I_LDA,
    0x69, // lda 69
    I_STA,
    0x01,
    0x00,

    // set port b to output 0x55
    I_LDA,
    0x55, // lda 55
    I_ORA,
    0x01,
    0x00,
    I_STA,
    0x00,
    0x60, // 55 -> 6000 (output 55 to port b)

    // I_NOOP, I_NOOP, I_NOOP, // even out timing with the final jmp instruction

    // set port b to output 0xAA
    I_LDA,
    0xaa, // lda AA
    I_STA,
    0x00,
    0x60, // AA -> 6000 (output AA to port b)

    I_JMP,
    0x69,
    0x02, // jump back to start of program
  ],
  0x0269
);

const accessMemory: AccessMemoryFunc = (
  readWrite,
  address,
  value
): number | void => {
  // capture a write to 0x6000 as a magic output address, print to console
  if (address === 0x6000 && readWrite === ReadWrite.write) {
    console.log("Output: ", value.toString(16));
    return;
  }

  if (readWrite === ReadWrite.read) {
    return ram[address];
  }

  ram[address] = value;
};

// @ts-ignore
const cpu = new CPU6502({
  accessMemory,
  logInstructions: true,
  // maxInstructions: 50
});
cpu.reset();
