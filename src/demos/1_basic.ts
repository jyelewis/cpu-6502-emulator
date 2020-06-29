import { CPU6502 } from "../CPU6502";
import { AccessMemoryFunc, ReadWrite } from "../types";

// instruction opcodes
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
    // set port b to output 0x55
    I_LDA,
    0x55, // lda 55
    I_STA,
    0x00,
    0x60, // 55 -> 6000 (output 55 to address 0x6000)

    // set port b to output 0xAA
    I_LDA,
    0xaa, // lda AA
    I_STA,
    0x00,
    0x60, // AA -> 6000 (output AA to address 0x6000)

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

const cpu = new CPU6502({
  accessMemory,
  logInstructions: true,
  // maxInstructions: 50
});
cpu.reset();
