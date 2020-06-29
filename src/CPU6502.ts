import {
  ProcessorStatus,
  ReadWrite,
  AccessMemoryFunc,
  ClockMode,
} from "./types";
import { cpuOperations } from "./cpuOperations";

export class CPU6502 {
  // configuration
  public instructionsPerEventLoopBreathe = 10000;
  public logInstructions = false;
  public logInternalState = false;
  public maxInstructions: undefined | number = undefined;

  // internal CPU state
  // 3 primary registers
  public reg_a: number = 0; // accumulator (8 bit)
  public reg_x: number = 0; // x index register (8 bit)
  public reg_y: number = 0; // y index register (8 bit)

  // internal registers
  public programCounter: number = 0; // (16 bit)
  public stackPointer: number = 0x55; // (8 bit, implicit stack page 0001)
  public processorStatus: number = ProcessorStatus.const; // (8 bit)

  // internal states
  public clockMode: ClockMode = ClockMode.paused;
  private interruptPending: false | "RESB" | "IRQB" | "NMIB" = false;
  private isExecuting: boolean = false;
  public instructionsExecuted: number = 0;

  // delegates
  public accessMemory: AccessMemoryFunc = () => {
    throw new Error("accessMemory function not configured");
  };

  // constructor
  public constructor({
    accessMemory,
    logInstructions,
    maxInstructions,
  }: {
    accessMemory?: AccessMemoryFunc;
    logInstructions?: boolean;
    maxInstructions?: number;
  }) {
    if (accessMemory) {
      this.accessMemory = accessMemory;
    }

    if (logInstructions) {
      this.logInstructions = logInstructions;
    }

    if (maxInstructions) {
      this.maxInstructions = maxInstructions;
    }
  }

  // public functions
  public reset() {
    this.interruptPending = "RESB";

    // reset will always start the clock
    this.clockMode = ClockMode.running;
    this.ensureExecutingIfNotPaused();
  }

  public triggerIRQB(setBrk: boolean) {
    if (setBrk) {
      // enable brk processor status flag
      this.processorStatus = this.processorStatus | ProcessorStatus.brk;
    } else {
      // disable brk processor status flag
      this.processorStatus = this.processorStatus & ~ProcessorStatus.brk;
    }

    this.interruptPending = "IRQB";

    if (this.clockMode === ClockMode.waitForInterrupt) {
      this.clockMode = ClockMode.running;
    }
    this.ensureExecutingIfNotPaused();
  }

  public triggerNMIB() {
    this.interruptPending = "NMIB";

    if (this.clockMode === ClockMode.waitForInterrupt) {
      this.clockMode = ClockMode.running;
    }
    this.ensureExecutingIfNotPaused();
  }

  public startClock() {
    this.clockMode = ClockMode.running;
    this.ensureExecutingIfNotPaused();
  }

  public pauseClock() {
    this.clockMode = ClockMode.paused; // next time executeNextInstruction is called it will stop
  }

  // private functions -----------------------------------------------------------------
  private executeNextInstruction() {
    // use a for loop to execute this.instructionsPerEventLoopBreathe in sequence
    // avoids the overhead of recursion or queuing on the event loop
    for (let i = 0; i < this.instructionsPerEventLoopBreathe; i++) {
      if (this.clockMode !== ClockMode.running) {
        this.isExecuting = false;
        return;
      }

      if (this.interruptPending) {
        if (this.interruptPending === "IRQB") {
          this.execInterruptIRQB();
        }
        if (this.interruptPending === "NMIB") {
          this.execInterruptNMIB();
        }
        if (this.interruptPending === "RESB") {
          this.execInterruptReset();
        }
      }

      // read 8 bit value at current program counter, this will always be the opcode
      const instructionAddress = this.programCounter; // store for logging later
      const instructionOpCode = this._read8BitValue(instructionAddress);
      this.programCounter++; // move past the opcode

      const instruction = cpuOperations[instructionOpCode];
      if (instruction === undefined) {
        // invalid opcode! no instruction for this code
        throw new Error(`Invalid opcode ${instructionOpCode.toString(16)}`);
      }

      let instructionParam: number | undefined = undefined;
      if (instruction.dataBytes === 1) {
        instructionParam = this._read8BitValue(this.programCounter);
        this.programCounter++; // move past the single byte instruction param
      }
      if (instruction.dataBytes === 2) {
        instructionParam = this._read16BitValue(this.programCounter);
        this.programCounter += 2; // move past the 2 byte instruction param
      }

      // log what we are executing
      if (this.logInternalState) {
        const dataStack = `${this._read8BitValue(0x4000 - 8).toString(
          16
        )}|${this._read8BitValue(0x4000 - 7).toString(
          16
        )}|${this._read8BitValue(0x4000 - 5).toString(
          16
        )}|${this._read8BitValue(0x4000 - 5).toString(
          16
        )}|${this._read8BitValue(0x4000 - 4).toString(
          16
        )}|${this._read8BitValue(0x4000 - 3).toString(
          16
        )}|${this._read8BitValue(0x4000 - 2).toString(
          16
        )}|${this._read8BitValue(0x4000 - 1).toString(
          16
        )}|${this._read8BitValue(0x4000).toString(16)}`;
        const hwStack = `${this._read8BitValue(0x01ff - 15).toString(
          16
        )}|${this._read8BitValue(0x01ff - 14).toString(
          16
        )}|${this._read8BitValue(0x01ff - 13).toString(
          16
        )}|${this._read8BitValue(0x01ff - 12).toString(
          16
        )}|${this._read8BitValue(0x01ff - 11).toString(
          16
        )}|${this._read8BitValue(0x01ff - 10).toString(
          16
        )}|${this._read8BitValue(0x01ff - 9).toString(
          16
        )}|${this._read8BitValue(0x01ff - 8).toString(
          16
        )}|${this._read8BitValue(0x01ff - 7).toString(
          16
        )}|${this._read8BitValue(0x01ff - 5).toString(
          16
        )}|${this._read8BitValue(0x01ff - 5).toString(
          16
        )}|${this._read8BitValue(0x01ff - 4).toString(
          16
        )}|${this._read8BitValue(0x01ff - 3).toString(
          16
        )}|${this._read8BitValue(0x01ff - 2).toString(
          16
        )}|${this._read8BitValue(0x01ff - 1).toString(
          16
        )}|${this._read8BitValue(0x01ff).toString(16)}`;
        const carry =
          (this.processorStatus & ProcessorStatus.carry) === 0 ? 0 : 1;
        console.log(
          `                                        a: ${this.reg_a.toString(
            16
          )} x: ${this.reg_x.toString(16)} y: ${this.reg_y.toString(
            16
          )} hwsp: ${this.stackPointer.toString(
            16
          )} dsp: ${this._read16BitValue(0x00).toString(
            16
          )} carry: ${carry} dataStack: ${dataStack} hwStack: ${hwStack}`
        );
      }
      if (this.logInstructions) {
        console.log(
          `${instructionAddress.toString(16)}: ${instruction.name}${
            instructionParam !== undefined
              ? " [" + instructionParam.toString(16) + "]"
              : ""
          } - ${this.reg_a}`
        );
      }

      // execute instruction with param
      instruction.func(this, instructionParam);

      // execute another instruction
      // loop

      this.instructionsExecuted++;
      if (
        this.maxInstructions &&
        this.instructionsExecuted >= this.maxInstructions
      ) {
        console.warn(
          `Reached max instructions of ${this.maxInstructions}, pausing`
        );
        this.clockMode = ClockMode.paused;
      }
    }

    // once loop as ended, queue 'executeNextInstruction' to run again
    setTimeout(() => this.executeNextInstruction(), 1);
  }

  private ensureExecutingIfNotPaused() {
    if (!this.isExecuting || this.clockMode !== ClockMode.paused) {
      this.executeNextInstruction();
    }
  }

  private execInterruptReset() {
    // clear registers
    this.reg_a = 0;
    this.reg_x = 0;
    this.reg_y = 0;

    this.stackPointer = 0;
    this.processorStatus = ProcessorStatus.const;

    // read reset vector
    const resetVector = this._read16BitValue(0xfffc);

    // jump to reset vector
    this.programCounter = resetVector;

    // clear the pending interrupt flag (we just handled it)
    this.interruptPending = false;
  }

  public execInterruptIRQB() {
    // TODO: test this... seem to often get caught with brks triggering brks, which shouldn't be possible because irqb should disable on trigger
    if (
      (this.processorStatus & ProcessorStatus.disableIrqb) ===
      ProcessorStatus.disableIrqb
    ) {
      // irqb interrupts are disabled, ignore and continue
      // note: this will still wake the processor if in "wait for interrupt" state, this is by design
      return;
    }

    // push current program counter & processor status onto stack
    this._push16BitValueToStack(this.programCounter);
    this._push8BitValueToStack(this.processorStatus);

    // set disable irqb flag in processor status register
    this.processorStatus = this.processorStatus & ProcessorStatus.disableIrqb;

    // read irqb/brk vector
    const irqbVector = this._read16BitValue(0xfffe);

    // jump to irqb vector
    this.programCounter = irqbVector;

    // clear the pending interrupt flag (we just handled it)
    this.interruptPending = false;
  }

  public execInterruptNMIB() {
    // push current program counter & processor status onto stack
    this._push16BitValueToStack(this.programCounter);
    this._push8BitValueToStack(this.processorStatus);

    // read nmib vector
    const nmibVector = this._read16BitValue(0xfffe);

    // jump to nmib vector
    this.programCounter = nmibVector;

    // clear the pending interrupt flag (we just handled it)
    this.interruptPending = false;
  }

  // private, utility functions --------------------------------------------------------
  // we don't use 'private' because the op code functions may make use of these internal methods
  public _read8BitValue(address: number): number {
    const value = this.accessMemory(ReadWrite.read, address) as number;
    if (value < 0 || value > 0xff) {
      throw new Error(`Invalid 8 bit value ${value}`);
    }
    return value;
  }

  public _write8BitValue(address: number, value: number): void {
    if (value < 0 || value > 0xff) {
      throw new Error(`Invalid 8 bit value ${value}`);
    }
    this.accessMemory(ReadWrite.write, address, value);
  }

  public _read16BitValue(address: number): number {
    // read 2 values, from address and address+1, little endian
    const lowByte = this._read8BitValue(address);
    const highByte = this._read8BitValue(address + 1);

    const value = (highByte << 8) + lowByte;

    if (value < 0 || value > 0xffff) {
      throw new Error(`Invalid 16 bit value ${value}`);
    }
    return value;
  }

  public _write16BitValue(address: number, value: number): void {
    // write 2 values, to address and address+1, little endian
    if (value < 0 || value > 0xffff) {
      throw new Error(`Invalid 16 bit value ${value}`);
    }

    const highByte = value >> 8;
    const lowByte = value & 0b0000000011111111;

    this._write8BitValue(address, lowByte);
    this._write8BitValue(address + 1, highByte);
  }

  public _push8BitValueToStack(value: number): void {
    // calculate address for stack value (65c02 has a fixed 255 byte page of stack at 0x0010)
    const fullStackAddress = 0x0100 + this.stackPointer;
    this._write8BitValue(fullStackAddress, value);

    // decrement stack pointer (65c02 stack grows downwards as values are written)
    this._decSP();
  }

  public _pull8BitValueFromStack(): number {
    // increment stack pointer (65c02 stack grows downwards as values are written)
    // increment BEFORE we read (stack pointer points to next available stack location)
    this._incSP();

    // calculate address for stack value (65c02 has a fixed 255 byte page of stack at 0x0010)
    const fullStackAddress = 0x0100 + this.stackPointer;

    // read value from stack page in memory
    const value = this._read8BitValue(fullStackAddress);

    return value;
  }

  public _push16BitValueToStack(value: number): void {
    if (value < 0 || value > 0xffff) {
      throw new Error(`Invalid 16 bit value ${value}`);
    }

    // we don't use the write16BitValue helper methods here because the value might wrap around
    // e.g. high byte at 00, low byte at 255
    const highByte = value >> 8;
    const lowByte = value & 0b0000000011111111;

    // write value, high byte first (little endian conserved, even though the stack grows down)
    this._push8BitValueToStack(highByte);
    this._push8BitValueToStack(lowByte);
  }

  public _pull16BitValueFromStack(): number {
    // we don't use the write16BitValue helper methods here because the value might wrap around
    // e.g. high byte at 00, low byte at 255
    const lowByte = this._pull8BitValueFromStack();
    const highByte = this._pull8BitValueFromStack();

    const value = (highByte << 8) + lowByte;
    return value;
  }

  public _decSP() {
    this.stackPointer--;
    if (this.stackPointer === -1) {
      this.stackPointer = 255; // simulate sp wrap around
    }
  }

  public _incSP() {
    this.stackPointer++;
    if (this.stackPointer === 256) {
      this.stackPointer = 0; // simulate sp wrap around
    }
  }

  public _convertValueTo8BitAndSetStatusFlags(
    value: number,
    checkCarry: boolean = false
  ) {
    // set flags
    if (checkCarry) {
      const carry = (value & 0b100000000) === 0b100000000; // check for overflow
      if (carry) {
        this.processorStatus |= ProcessorStatus.carry;
      } else {
        this.processorStatus &= ~ProcessorStatus.carry;
      }
    }

    const negative = (value & 0b10000000) === 0b10000000; // check for 7th bit
    if (negative) {
      this.processorStatus |= ProcessorStatus.negative;
    } else {
      this.processorStatus &= ~ProcessorStatus.negative;
    }

    const zero = value === 0;
    if (zero) {
      this.processorStatus |= ProcessorStatus.zero;
    } else {
      this.processorStatus &= ~ProcessorStatus.zero;
    }

    value = value & 0b11111111; // cap at 8 bits
    return value;
  }
}
