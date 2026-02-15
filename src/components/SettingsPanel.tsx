import { createSignal } from "solid-js";
import { useEmulator } from "../App";
import "../styles/settings.css";

interface SettingsPanelProps {
  onLoadRom: () => void;
  onUploadRom: () => void;
  onToggleKeyboard: () => void;
  keyboardVisible: boolean;
  ref?: (refresh: () => void) => void;
}

export default function SettingsPanel(props: SettingsPanelProps) {
  const emu = useEmulator();

  const [scale, setScale] = createSignal(emu.getScale());
  const [targetFps, setTargetFps] = createSignal(emu.getTargetFps());
  const [ipf, setIpf] = createSignal(emu.getIpf());
  const [bgColor, setBgColor] = createSignal(emu.getBackgroundColor());
  const [fgColor, setFgColor] = createSignal(emu.getFillColor());

  function refreshFromEmulator() {
    setScale(emu.getScale());
    setTargetFps(emu.getTargetFps());
    setIpf(emu.getIpf());
    setBgColor(emu.getBackgroundColor());
    setFgColor(emu.getFillColor());
  }

  props.ref?.(refreshFromEmulator);

  return (
    <div class="settings-container">
      <div>
        <button onClick={props.onLoadRom}>Load ROM</button>
        <button onClick={props.onUploadRom}>Upload ROM</button>
        <button onClick={props.onToggleKeyboard}>
          {props.keyboardVisible ? "Hide Keyboard" : "Show Keyboard"}
        </button>
      </div>
      <div>
        <h2>Settings</h2>
        <label title="Screen Scale">
          Screen Scale
          <input
            type="range"
            min="1"
            max="15"
            step="1"
            value={scale()}
            onChange={(e) => {
              const v = +e.currentTarget.value;
              setScale(v);
              emu.setScale(v);
            }}
          />
        </label>
        <label title="Frames Per Second">
          Target FPS
          <input
            type="range"
            min="1"
            max="60"
            step="1"
            value={targetFps()}
            onChange={(e) => {
              const v = +e.currentTarget.value;
              setTargetFps(v);
              emu.setTargetFps(v);
            }}
          />
        </label>
        <label title="Instructions Per Frame">
          Target IPF
          <input
            type="range"
            min="1"
            max="1000"
            step="1"
            value={ipf()}
            onChange={(e) => {
              const v = +e.currentTarget.value;
              setIpf(v);
              emu.setIpf(v);
            }}
          />
        </label>
        <label title="Background Color">
          <input
            type="color"
            value={bgColor()}
            onInput={(e) => {
              const v = e.currentTarget.value;
              setBgColor(v);
              emu.setBackgroundColor(v);
            }}
          />
          {" "}Background Color
        </label>
        <label title="Fill Color">
          <input
            type="color"
            value={fgColor()}
            onInput={(e) => {
              const v = e.currentTarget.value;
              setFgColor(v);
              emu.setFillColor(v);
            }}
          />
          {" "}Fill Color
        </label>
      </div>
    </div>
  );
}
