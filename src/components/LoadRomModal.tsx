import { createResource, createMemo, createEffect, onCleanup, For, Show } from "solid-js";
import { useEmulator } from "../App";
import type { Quirks } from "../emulator/cpu";
import "../styles/modal.css";

interface RomEntry {
  platform: string;
  desc: string;
  event?: string;
  authors: string[];
  images: string[];
  options: Record<string, any>;
}

interface AuthorEntry {
  url?: string;
}

interface LoadRomModalProps {
  open: boolean;
  onClose: () => void;
  onSettingsChanged: () => void;
}

async function fetchRomData() {
  const [authorsRes, programsRes] = await Promise.all([
    fetch("./chip8Archive/authors.json"),
    fetch("./chip8Archive/programs.json"),
  ]);
  if (!authorsRes.ok || !programsRes.ok) return null;
  const authors: Record<string, AuthorEntry> = await authorsRes.json();
  const programs: Record<string, RomEntry> = await programsRes.json();
  return { authors, programs };
}

async function loadFileU8(filePath: string): Promise<Uint8Array | null> {
  const response = await fetch(filePath);
  if (!response.ok) return null;
  return new Uint8Array(await response.arrayBuffer());
}

const OPTION_TO_QUIRK: Record<string, keyof Quirks> = {
  loadStoreQuirks: "quirkMemoryLeaveIUnchanged",
  shiftQuirks: "quirkShift",
  jumpQuirks: "quirkJump",
  logicQuirks: "quirkLogic",
  vBlankQuirks: "quirkVBlank",
};

export default function LoadRomModal(props: LoadRomModalProps) {
  const emu = useEmulator();
  const [romData] = createResource(fetchRomData);

  createEffect(() => {
    if (!props.open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose();
    };
    document.addEventListener("keydown", handleEsc);
    onCleanup(() => document.removeEventListener("keydown", handleEsc));
  });

  async function runRomByName(name: string) {
    const data = romData();
    if (!data) return;

    const romEntry = data.programs[name];
    const romsrc = `./chip8Archive/roms/${name}.ch8`;

    emu.pause();
    props.onClose();

    const rom = await loadFileU8(romsrc);
    if (!rom) return;

    const options = romEntry.options;
    emu.setFillColor(options.fillColor || "#FFFFFF");
    emu.setBackgroundColor(options.backgroundColor || "#000000");
    emu.setIpf(options.tickrate);

    emu.resetQuirks();
    for (const [optKey, quirkKey] of Object.entries(OPTION_TO_QUIRK)) {
      if (optKey in options) emu.setQuirk(quirkKey, options[optKey]);
    }
    if ("clipQuirks" in options) emu.setQuirk("quirkWrap", !options.clipQuirks);
    const quirks = emu.getQuirks();
    if (quirks.quirkMemoryLeaveIUnchanged) {
      emu.setQuirk("quirkMemoryIncrementByX", false);
    }

    props.onSettingsChanged();

    emu.kill();
    emu.loadRom(rom);
    emu.beginProcess();
  }

  const chip8Roms = createMemo(() => {
    const data = romData();
    if (!data) return [];
    return Object.entries(data.programs)
      .filter(([, entry]) => entry.platform === "chip8")
      .map(([name, entry]) => ({ name, entry }));
  });

  function authorLinks(
    romAuthors: string[],
    allAuthors: Record<string, AuthorEntry>,
  ) {
    return romAuthors.map((authorId) => {
      const name = authorId !== "your name here" ? authorId : "Unknown";
      const info = allAuthors[authorId];
      if (info?.url) {
        return (
          <a href={info.url} target="_blank" rel="noopener noreferrer">
            {name}
          </a>
        );
      }
      return <span>{name} </span>;
    });
  }

  return (
    <Show when={props.open}>
      <div class="modal-overlay load-rom-modal" onClick={props.onClose}>
        <div class="modal-content" onClick={(e) => e.stopPropagation()}>
          <button class="modal-close-btn" onClick={props.onClose}>
            close
          </button>
          <h1>Load ROM</h1>
          <div class="rom-list">
            <Show when={!romData.loading} fallback={<p>Loading...</p>}>
              <For each={chip8Roms()}>
                {(rom) => (
                  <div
                    class="rom-card"
                    title={rom.entry.desc}
                    tabIndex={0}
                    onClick={() => runRomByName(rom.name)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") runRomByName(rom.name);
                    }}
                  >
                    <img
                      loading="lazy"
                      src={`./chip8Archive/src/${rom.name}/${rom.entry.images[0]}`}
                      alt={rom.name}
                    />
                    <div class="rom-card-title">{rom.name}</div>
                    <div class="rom-card-author-event">
                      {authorLinks(
                        rom.entry.authors,
                        romData()!.authors,
                      )}{" "}
                      {rom.entry.event ? ` \u2022 ${rom.entry.event}` : ""}
                    </div>
                  </div>
                )}
              </For>
            </Show>
          </div>
        </div>
      </div>
    </Show>
  );
}
