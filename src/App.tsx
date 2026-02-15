import { createContext, useContext, createSignal, onMount, onCleanup } from "solid-js";
import { Portal } from "solid-js/web";
import Chip8Emulator from "./emulator/emulator";
import { createEmulatorState, type EmulatorState } from "./state/emulator-state";
import Header from "./components/Header";
import ControlBar from "./components/ControlBar";
import SettingsPanel from "./components/SettingsPanel";
import QuirksPanel from "./components/QuirksPanel";
import DebugPanel from "./components/DebugPanel";
import LoadRomModal from "./components/LoadRomModal";
import UploadRomModal from "./components/UploadRomModal";
import VirtualKeyboard from "./components/VirtualKeyboard";
import "./styles/app.css";
import "./styles/screen.css";

const EmulatorContext = createContext<EmulatorState>();
export const useEmulator = () => {
  const ctx = useContext(EmulatorContext);
  if (!ctx) throw new Error("useEmulator must be used within EmulatorContext");
  return ctx;
};

export default function App() {
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 160;
  const emulator = new Chip8Emulator(canvas, 60, 20);
  const state = createEmulatorState(emulator);

  const [loadRomOpen, setLoadRomOpen] = createSignal(false);
  const [uploadRomOpen, setUploadRomOpen] = createSignal(false);
  const [keyboardVisible, setKeyboardVisible] = createSignal(false);

  let screenContainerRef!: HTMLDivElement;
  let settingsRefresh: (() => void) | null = null;
  let quirksRefresh: (() => void) | null = null;

  let dragLeaveTimeout: ReturnType<typeof setTimeout> | null = null;

  function onDragEnter(ev: DragEvent) {
    if (!ev.dataTransfer?.types.includes("Files")) return;
    ev.preventDefault();
    ev.stopPropagation();
    setUploadRomOpen(true);
  }

  function onDragOver(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    if (dragLeaveTimeout) {
      clearTimeout(dragLeaveTimeout);
      dragLeaveTimeout = null;
    }
  }

  function onDragLeave(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    if (!dragLeaveTimeout) {
      dragLeaveTimeout = setTimeout(() => setUploadRomOpen(false), 500);
    }
  }

  function onDropCancel() {
    setUploadRomOpen(false);
  }

  function onVisibilityChange() {
    if (document.hidden) state.pause();
  }

  onMount(() => {
    screenContainerRef.appendChild(canvas);

    document.body.addEventListener("dragenter", onDragEnter);
    document.body.addEventListener("dragover", onDragOver);
    document.body.addEventListener("dragleave", onDragLeave);
    document.body.addEventListener("drop", onDropCancel);
    document.addEventListener("visibilitychange", onVisibilityChange);
  });

  onCleanup(() => {
    document.body.removeEventListener("dragenter", onDragEnter);
    document.body.removeEventListener("dragover", onDragOver);
    document.body.removeEventListener("dragleave", onDragLeave);
    document.body.removeEventListener("drop", onDropCancel);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  });

  function refreshSettingsUI() {
    settingsRefresh?.();
    quirksRefresh?.();
  }

  return (
    <EmulatorContext.Provider value={state}>
      <main>
        <Header />
        <div class="layout-column">
          <ControlBar />
          <div class="emulator-container">
            <div class="screen-container" ref={screenContainerRef} />
          </div>
          <SettingsPanel
            onLoadRom={() => setLoadRomOpen(true)}
            onUploadRom={() => setUploadRomOpen(true)}
            onToggleKeyboard={() => setKeyboardVisible((v) => !v)}
            keyboardVisible={keyboardVisible()}
            ref={(r: () => void) => (settingsRefresh = r)}
          />
          <QuirksPanel ref={(r: () => void) => (quirksRefresh = r)} />
        </div>
        <div class="layout-column">
          <DebugPanel />
        </div>
      </main>
      <Portal>
        <VirtualKeyboard visible={keyboardVisible()} />
      </Portal>
      <Portal>
        <LoadRomModal
          open={loadRomOpen()}
          onClose={() => setLoadRomOpen(false)}
          onSettingsChanged={refreshSettingsUI}
        />
      </Portal>
      <Portal>
        <UploadRomModal
          open={uploadRomOpen()}
          onClose={() => setUploadRomOpen(false)}
        />
      </Portal>
    </EmulatorContext.Provider>
  );
}
