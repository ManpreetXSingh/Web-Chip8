import { createMemo } from "solid-js";
import { useEmulator } from "../App";
import HexTable from "./HexTable";

export default function DebugPanel() {
  const emu = useEmulator();

  const pointersData = createMemo(() => [
    emu.pc(),
    emu.indexReg(),
    emu.sp(),
  ]);

  const timersData = createMemo(() => [
    emu.delayTimer(),
    emu.soundTimer(),
  ]);

  const stackHighlight = createMemo(
    () => new Set([emu.sp()]),
  );

  const memoryHighlight = createMemo(
    () => new Set([emu.pc(), emu.pc() + 1]),
  );

  return (
    <div class="debug-container">
      <HexTable
        name="Pointers"
        data={pointersData()}
        columns={1}
        bitness={16}
        vNames={["PC", "I", "SP"]}
        hNames={["Value"]}
      />
      <HexTable
        name="Timers"
        data={timersData()}
        columns={1}
        bitness={16}
        vNames={["DT", "ST"]}
        hNames={["Value"]}
      />
      <HexTable
        name="Registers"
        data={emu.registers}
        columns={16}
        bitness={8}
        vNames={["Value"]}
        hNames={[
          "V0", "V1", "V2", "V3", "V4", "V5", "V6", "V7",
          "V8", "V9", "VA", "VB", "VC", "VD", "VE", "VF",
        ]}
      />
      <HexTable
        name="Stack"
        data={emu.stack}
        columns={16}
        bitness={16}
        vNames={["Value"]}
        highlightIndices={stackHighlight}
      />
      <HexTable
        name="Memory"
        data={emu.memory}
        columns={16}
        bitness={8}
        highlightIndices={memoryHighlight}
      />
    </div>
  );
}
