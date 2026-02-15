import { createSignal } from "solid-js";
import { useEmulator } from "../App";
import type { Quirks } from "../emulator/cpu";

interface QuirksPanelProps {
  ref?: (refresh: () => void) => void;
}

export default function QuirksPanel(props: QuirksPanelProps) {
  const emu = useEmulator();

  const [quirks, setQuirksState] = createSignal<Quirks>(emu.getQuirks());

  function updateQuirk<K extends keyof Quirks>(key: K, value: boolean) {
    emu.setQuirk(key, value);

    if (key === "quirkMemoryLeaveIUnchanged" && value) {
      emu.setQuirk("quirkMemoryIncrementByX", false);
    } else if (key === "quirkMemoryIncrementByX" && value) {
      emu.setQuirk("quirkMemoryLeaveIUnchanged", false);
    }

    setQuirksState(emu.getQuirks());
  }

  props.ref?.(() => setQuirksState(emu.getQuirks()));

  return (
    <div>
      <h2>Quirks</h2>
      <div>
        <label title="Shift Quirk">
          <input
            type="checkbox"
            checked={quirks().quirkShift}
            onChange={(e) => updateQuirk("quirkShift", e.currentTarget.checked)}
          />
          <code>{"<<="}</code> and <code>{">>="}</code> modify{" "}
          <var>Vx</var> in place and leave <var>Vy</var> unchanged
        </label>

        <label title="Memory Quirk Leave I Unchanged">
          <input
            type="checkbox"
            checked={quirks().quirkMemoryLeaveIUnchanged}
            onChange={(e) =>
              updateQuirk("quirkMemoryLeaveIUnchanged", e.currentTarget.checked)
            }
          />
          Load and Store operations leave <var>I</var> unchanged
        </label>

        <label title="Memory Quirk Increment I By X">
          <input
            type="checkbox"
            checked={quirks().quirkMemoryIncrementByX}
            onChange={(e) =>
              updateQuirk("quirkMemoryIncrementByX", e.currentTarget.checked)
            }
          />
          Load and Store operations Increment <var>I</var> by <var>X</var>
        </label>

        <label title="Jump Quirk">
          <input
            type="checkbox"
            checked={quirks().quirkJump}
            onChange={(e) => updateQuirk("quirkJump", e.currentTarget.checked)}
          />
          Jump to <code>address + Vx</code> instead of{" "}
          <code>address + V0</code>
        </label>

        <label title="Wrap Quirk">
          <input
            type="checkbox"
            checked={quirks().quirkWrap}
            onChange={(e) => updateQuirk("quirkWrap", e.currentTarget.checked)}
          />
          Wrap sprite instead of clipping
        </label>

        <label title="Logic Quirk">
          <input
            type="checkbox"
            checked={quirks().quirkLogic}
            onChange={(e) => updateQuirk("quirkLogic", e.currentTarget.checked)}
          />
          Reset <var>Vf</var> after <code>Vx |= Vy</code>,{" "}
          <code>Vx &= Vy</code> and <code>Vx ^= Vy</code>
        </label>

        <label title="VBlank Quirk">
          <input
            type="checkbox"
            checked={quirks().quirkVBlank}
            onChange={(e) =>
              updateQuirk("quirkVBlank", e.currentTarget.checked)
            }
          />
          Wait for VBlank before drawing sprite
        </label>
      </div>
    </div>
  );
}
