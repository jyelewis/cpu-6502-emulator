import { CPU6502 } from "../CPU6502";
import { AccessMemoryFunc, ReadWrite } from "../types";
import * as fs from "fs-extra-promise";

// const ramImagePath = __dirname + "/../../programs/a.out";
const ramImagePath = __dirname + "/../../programs/c_test/a.out.c64";

async function run() {
  // set up memory
  const ram = new Uint8ClampedArray(0x10000); // 64kb ram

  // load binary code from disk
  const ramImage = await fs.readFileAsync(ramImagePath);
  ram.fill(0x00);
  ram.set(ramImage, 0x8000); // store program code in top half of memory

  const accessMemory: AccessMemoryFunc = (
    readWrite,
    address,
    value
  ): number | void => {
    // capture a write to 0x6000 as a magic output address, print to console
    if (address === 0x6000 && readWrite === ReadWrite.write) {
      console.log(" Output: ", value, value.toString(16));
      return;
    }
    if (address === 0x6001 && readWrite === ReadWrite.write) {
      process.stdout.write(String.fromCharCode(value));
      return;
    }

    // capture a write to 0x6000 as a magic output address, pause program (exit)
    if (address === 0x6005 && readWrite === ReadWrite.write) {
      console.log("Exit captured! pausing clock");
      console.log(`${cpu.instructionsExecuted} instructions`);
      // console.log(Array.from(cpu.instructionsUsed).sort().join(";"));
      cpu.pauseClock();
      return;
    }

    if (readWrite === ReadWrite.read) {
      return ram[address];
    }

    ram[address] = value;
  };

  const cpu = new CPU6502({
    accessMemory,
    // logInstructions: true,
    // maxInstructions: 500
  });
  cpu.reset();
}

run().catch(console.error);
