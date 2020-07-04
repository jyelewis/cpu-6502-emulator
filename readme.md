# CPU6502 Emulator
A javascript emulator for the MOS6502 (WDC 65c02 compatible) CPU.
Designed for simulating custom logic boards that use the 6502.

All memory read/writes call out to a delegate function, allowing custom memory logic, I/O logic and address decoding.

## Configuration
```javascript 1.8
const cpu = new CPU6502({
  accessMemory, // function to be called when CPU reads/writes to memory
  logInstructions: false, // output each instruction to console, for advanced debugging
  logInternalState: false, // output internal processor state after each instruction for advanced debugging
  maxInstructions: 50 // automatically pause execution after 50 instructions
});
```

## Usage

### Available methods
```javascript 1.8
const cpu = new CPU6502();

cpu.reset(); // trigger reset sequence
cpu.triggerIRQB(); // trigger IRQB interrupt
cpu.triggerNMIB(); // trigger NMIB interrupt

cpu.pauseClock(); // pause clock, stop executing instructions
cpu.startClock(); // start/resume clock

// accessing internal state
console.log(cpu.reg_a);
console.log(cpu.reg_x);
console.log(cpu.reg_y);
console.log(cpu.programCounter);
console.log(cpu.stackPointer);
console.log(cpu.processorStatus);
```

### Example 1: Executing simple machine code
```javascript 1.8
import { CPU6502, ReadWrite } from "6502-emulator";

// instruction opcodes
const I_NOOP = 0xea;
const I_LDA = 0xa9;
const I_STA = 0x8d;
const I_JMP = 0x4c;

// set up memory
const ram = new Uint8ClampedArray(0xffff); // 64kb ram
ram.fill(I_NOOP); // fill ram with noop instructions

// store reset vector as 0200 (little endian)
ram[0xfffc] = 0x00;
ram[0xfffd] = 0x02;

// create a basic program
ram.set(
  [
    I_LDA, 0x55, // lda 55
    I_STA, 0x00, 0x60, // 55 -> 6000 (output 55 to address 0x6000)

    I_LDA, 0xaa, // lda AA
    I_STA, 0x00, 0x60, // AA -> 6000 (output AA to address 0x6000)

    I_JMP, 0x00, 0x02  // jump back to start of program
  ],
  0x0200
);

const accessMemory = (readWrite, address, value) => {
  // capture a write to 0x6000 as a magic output address, print to console
  if (address === 0x6000 && readWrite === ReadWrite.write) {
    console.log("Output: ", value.toString(16));
    return;
  }
  
  // write value to RAM (processor is reading from [address])
  if (readWrite === ReadWrite.read) {
    return ram[address];
  }

  // store value in RAM (processor is writing [value] to [address])
  ram[address] = value;
};

const cpu = new CPU6502({ accessMemory });
// trigger a reset to start the clock & jump to the reset vector
cpu.reset();
```

### Example 2: Load ROM image from disk
```javascript 1.8
import { CPU6502, ReadWrite } from "6502-emulator";

// load image from disk
const ramImagePath = "./myROMFile";
const ramImage = fs.readFileSync(ramImagePath);
  
// set up memory
const ram = Uint8ClampedArray.from(ramImage);

const accessMemory = (readWrite, address, value) => {
  // capture a write to 0x6000 as a magic output address, print to console
  if (address === 0x6000 && readWrite === ReadWrite.write) {
    console.log("Output: ", value.toString(16));
    return;
  }

  // capture a write to 0x6005 as a magic output address, pause the clock
  if (address === 0x6005 && readWrite === ReadWrite.write) {
    console.log("Exit captured! pausing clock");
    cpu.pauseClock();
    return;
  }

  // write value to RAM (processor is reading from [address])
  if (readWrite === ReadWrite.read) {
    return ram[address];
  }

  // store value in RAM (processor is writing [value] to [address])
  ram[address] = value;
}

const cpu = new CPU6502({ accessMemory });
// trigger a reset to start the clock & jump to the reset vector
cpu.reset();
```