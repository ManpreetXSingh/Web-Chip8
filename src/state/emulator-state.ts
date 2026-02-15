import { createSignal, batch } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import type Chip8Emulator from "../emulator/emulator";
import type { Quirks } from "../emulator/cpu";

export function createEmulatorState(emulator: Chip8Emulator) {
  const [fps, setFps] = createSignal(0);
  const [ips, setIps] = createSignal(0);
  const [pc, setPc] = createSignal(0x200);
  const [sp, setSp] = createSignal(0);
  const [indexReg, setIndexReg] = createSignal(0);
  const [delayTimer, setDelayTimer] = createSignal(0);
  const [soundTimer, setSoundTimer] = createSignal(0);
  const [paused, setPaused] = createSignal(true);

  const [registers, setRegisters] = createStore<number[]>(
    new Array(16).fill(0),
  );
  const [stack, setStack] = createStore<number[]>(new Array(16).fill(0));
  const [memory, setMemory] = createStore<number[]>(
    new Array(4096).fill(0),
  );

  function sync() {
    batch(() => {
      setFps(emulator.fps);
      setIps(emulator.ips);
      setPc(emulator.cpu.programCounter);
      setSp(emulator.cpu.stackPointer);
      setIndexReg(emulator.cpu.indexRegister);
      setDelayTimer(emulator.cpu.delayTimer);
      setSoundTimer(emulator.cpu.soundTimer);
      setPaused(emulator.paused);

      const regUpdates = emulator.registers.updates;
      if (regUpdates.length > 0) {
        if (regUpdates[0] === -1) {
          setRegisters(
            reconcile(Array.from(emulator.registers.underlyingArray)),
          );
        } else {
          for (const idx of regUpdates) {
            setRegisters(idx, emulator.registers.get(idx));
          }
        }
      }

      const stackUpdates = emulator.stack.updates;
      if (stackUpdates.length > 0) {
        if (stackUpdates[0] === -1) {
          setStack(reconcile(Array.from(emulator.stack.underlyingArray)));
        } else {
          for (const idx of stackUpdates) {
            setStack(idx, emulator.stack.get(idx));
          }
        }
      }

      const memUpdates = emulator.memory.updates;
      if (memUpdates.length > 0) {
        if (memUpdates[0] === -1) {
          setMemory(
            reconcile(Array.from(emulator.memory.underlyingArray)),
          );
        } else {
          for (const idx of memUpdates) {
            setMemory(idx, emulator.memory.get(idx));
          }
        }
      }
    });
  }

  emulator.updateDisplay = sync;

  function setQuirk<K extends keyof Quirks>(key: K, value: Quirks[K]) {
    emulator.cpu.quirks[key] = value;
  }

  function getQuirks(): Quirks {
    return { ...emulator.cpu.quirks };
  }

  function setScale(scale: number) {
    emulator.screen.updateResScale(scale);
    emulator.screen.forceRefresh();
  }

  function getScale(): number {
    return emulator.screen.resScale;
  }

  function setTargetFps(targetFps: number) {
    emulator.targetFps = targetFps;
    emulator.targetFrameInterval = 1000 / (targetFps + 3);
  }

  function getTargetFps(): number {
    return emulator.targetFps;
  }

  function setIpf(ipf: number) {
    emulator.instructionsPerFrame = ipf;
  }

  function getIpf(): number {
    return emulator.instructionsPerFrame;
  }

  function setFillColor(color: string) {
    emulator.screen.fillColor = color;
    emulator.screen.forceRefresh();
  }

  function getFillColor(): string {
    return emulator.screen.fillColor;
  }

  function setBackgroundColor(color: string) {
    emulator.screen.backgroundColor = color;
    emulator.screen.forceRefresh();
  }

  function getBackgroundColor(): string {
    return emulator.screen.backgroundColor;
  }

  function loadRom(rom: Uint8Array): boolean {
    return emulator.loadRom(rom);
  }

  function pause() {
    emulator.pause();
    setPaused(true);
  }

  function resume() {
    emulator.resume();
    setPaused(false);
  }

  function step() {
    emulator.step();
    sync();
  }

  function stepFrame() {
    emulator.stepFrame();
    sync();
  }

  function kill() {
    emulator.killProcess();
    sync();
  }

  function beginProcess() {
    emulator.beginProcess();
    setPaused(false);
  }

  function pressKey(key: string) {
    emulator.pressKey(key);
  }

  function releaseKey(key: string) {
    emulator.releaseKey(key);
  }

  function resetQuirks() {
    emulator.cpu.resetQuirks();
  }

  return {
    fps,
    ips,
    pc,
    sp,
    indexReg,
    delayTimer,
    soundTimer,
    paused,
    registers,
    stack,
    memory,

    setQuirk,
    getQuirks,
    setScale,
    getScale,
    setTargetFps,
    getTargetFps,
    setIpf,
    getIpf,
    setFillColor,
    getFillColor,
    setBackgroundColor,
    getBackgroundColor,
    loadRom,
    pause,
    resume,
    step,
    stepFrame,
    kill,
    beginProcess,
    pressKey,
    releaseKey,
    resetQuirks,
  };
}

export type EmulatorState = ReturnType<typeof createEmulatorState>;
