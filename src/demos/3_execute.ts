import { CPU6502 } from "../CPU6502";
import { AccessMemoryFunc, ReadWrite } from "../types";
import * as fs from "fs-extra-promise";

const ramImagePath = __dirname + "/../../programs/a.out";

async function run() {
  // set up memory
  const ramImage = await fs.readFileAsync(ramImagePath);
  // load image from disk
  const ram = Uint8ClampedArray.from(ramImage);

  const accessMemory: AccessMemoryFunc = (
    readWrite,
    address,
    value
  ): number | void => {
    // capture a write to 0x6000 as a magic output address, print to console
    if (address === 0x6000 && readWrite === ReadWrite.write) {
      console.log(
        "Output: ",
        value.toString(16),
        value.toString(2).padStart(8, "0")
      );
      return;
    }

    if (address === 0x6005 && readWrite === ReadWrite.write) {
      console.log("Exit captured! pausing clock");
      cpu.pauseClock();
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
    maxInstructions: 50,
  });
  cpu.reset();
}

run().catch(console.error);
