import { useEmulator } from "../App";
import "../styles/control-bar.css";

export default function ControlBar() {
  const emu = useEmulator();

  function handlePlayPause() {
    if (emu.paused()) {
      emu.resume();
    } else {
      emu.pause();
    }
  }

  function handleReplay() {
    emu.kill();
  }

  function handleStep() {
    if (emu.paused()) emu.step();
  }

  function handleStepFrame() {
    if (emu.paused()) emu.stepFrame();
  }

  return (
    <div class="control-bar">
      <div class="controls">
        <button
          class="material-icons-round md-light md-24"
          title="Replay"
          onClick={handleReplay}
        >
          replay
        </button>
        <button
          class="material-icons-round md-light md-24"
          title="Play/Pause"
          onClick={handlePlayPause}
        >
          {emu.paused() ? "play_arrow" : "pause"}
        </button>
        <button
          class="material-icons-round md-light md-24"
          title="Step Instruction"
          onClick={handleStep}
        >
          skip_next
        </button>
        <button
          class="material-icons-round md-light md-24"
          title="Step Frame"
          onClick={handleStepFrame}
        >
          keyboard_tab
        </button>
      </div>
      <div class="info">
        <div title="Frames Per Second">
          FPS: <span>{emu.fps().toFixed(1)}</span>
        </div>
        <div title="Instructions Per Second">
          IPS: <span>{emu.ips().toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
}
