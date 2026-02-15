import { Show, createEffect, onCleanup } from "solid-js";
import { useEmulator } from "../App";
import "../styles/modal.css";

interface UploadRomModalProps {
  open: boolean;
  onClose: () => void;
}

export default function UploadRomModal(props: UploadRomModalProps) {
  const emu = useEmulator();

  function handleDrop(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();

    function onLoad(e: ProgressEvent<FileReader>) {
      props.onClose();
      const rom = new Uint8Array(e.target!.result as ArrayBuffer);
      emu.kill();
      emu.loadRom(rom);
      emu.beginProcess();
    }

    if (ev.dataTransfer?.items) {
      for (const item of ev.dataTransfer.items) {
        if (item.kind !== "file") continue;
        const file = item.getAsFile();
        if (!file) continue;
        const reader = new FileReader();
        reader.onload = onLoad;
        reader.readAsArrayBuffer(file);
        return;
      }
    } else if (ev.dataTransfer?.files[0]) {
      const file = ev.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = onLoad;
      reader.readAsArrayBuffer(file);
    }
  }

  createEffect(() => {
    if (!props.open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose();
    };
    document.addEventListener("keydown", handleEsc);
    onCleanup(() => document.removeEventListener("keydown", handleEsc));
  });

  return (
    <Show when={props.open}>
      <div
        class="modal-overlay upload-rom-modal"
        onClick={props.onClose}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <div class="modal-content" onClick={(e) => e.stopPropagation()}>
          <span class="material-icons-round upload-icon">upload_file</span>
          <p>Drop your file here</p>
        </div>
      </div>
    </Show>
  );
}
