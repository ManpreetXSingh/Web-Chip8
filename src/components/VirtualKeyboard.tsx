import { onMount, onCleanup, For } from "solid-js";
import { createStore } from "solid-js/store";
import { useEmulator } from "../App";
import "../styles/keyboard.css";

// prettier-ignore
const KEY_NAMES = [
  "1", "2", "3", "C",
  "4", "5", "6", "D",
  "7", "8", "9", "E",
  "A", "0", "B", "F",
];

// prettier-ignore
const KEY_MAP: Record<string, number> = {
  "1": 0, "2": 1, "3": 2, "4": 3,
  q: 4, w: 5, e: 6, r: 7,
  a: 8, s: 9, d: 10, f: 11,
  z: 12, x: 13, c: 14, v: 15,
};

const KEY_BINDINGS = KEY_NAMES.map(
  (_, i) =>
    Object.entries(KEY_MAP)
      .find(([, v]) => v === i)?.[0]
      .toUpperCase() ?? "",
);

const N_COLS = 4;
const N_ROWS = 4;

type Corner = "tl" | "tr" | "bl" | "br";
const CORNERS: Corner[] = ["tl", "tr", "bl", "br"];

interface VirtualKeyboardProps {
  visible: boolean;
}

export default function VirtualKeyboard(props: VirtualKeyboardProps) {
  const emu = useEmulator();
  const [pressed, setPressed] = createStore<Record<number, boolean>>({});
  let containerRef!: HTMLDivElement;

  const heldKeys = new Set<string>();

  function pressIdx(idx: number) {
    setPressed(idx, true);
    emu.pressKey(KEY_NAMES[idx].toLowerCase());
  }

  function releaseIdx(idx: number) {
    setPressed(idx, false);
    emu.releaseKey(KEY_NAMES[idx].toLowerCase());
  }

  function onKeyDown(e: KeyboardEvent) {
    if (heldKeys.has(e.key)) return;
    const idx = KEY_MAP[e.key];
    if (idx !== undefined) {
      heldKeys.add(e.key);
      pressIdx(idx);
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    heldKeys.delete(e.key);
    const idx = KEY_MAP[e.key];
    if (idx !== undefined) {
      releaseIdx(idx);
    }
  }

  onMount(() => {
    const w = containerRef.offsetWidth;
    const h = containerRef.offsetHeight;
    containerRef.style.left = Math.max(0, (window.innerWidth - w) / 2) + "px";
    containerRef.style.top = Math.max(0, window.innerHeight - h - 16) + "px";

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
  });

  onCleanup(() => {
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("keyup", onKeyUp);
  });

  function startDrag(startX: number, startY: number) {
    const elX = containerRef.offsetLeft;
    const elY = containerRef.offsetTop;

    function move(x: number, y: number) {
      let newX = elX + (x - startX);
      let newY = elY + (y - startY);

      newX = Math.max(
        0,
        Math.min(newX, window.innerWidth - containerRef.offsetWidth),
      );
      newY = Math.max(
        0,
        Math.min(newY, window.innerHeight - containerRef.offsetHeight),
      );

      containerRef.style.left = newX + "px";
      containerRef.style.top = newY + "px";
    }

    return move;
  }

  function onDragMouseDown(e: MouseEvent) {
    e.preventDefault();
    const move = startDrag(e.clientX, e.clientY);
    const handler = (ev: MouseEvent) => move(ev.clientX, ev.clientY);
    document.addEventListener("mousemove", handler);
    document.addEventListener(
      "mouseup",
      () => document.removeEventListener("mousemove", handler),
      { once: true },
    );
  }

  function onDragTouchStart(e: TouchEvent) {
    e.preventDefault();
    const move = startDrag(e.touches[0].clientX, e.touches[0].clientY);
    const handler = (ev: TouchEvent) =>
      move(ev.touches[0].clientX, ev.touches[0].clientY);
    document.addEventListener("touchmove", handler);
    document.addEventListener(
      "touchend",
      () => document.removeEventListener("touchmove", handler),
      { once: true },
    );
  }

  function startResize(startX: number, startY: number, corner: Corner) {
    const rect = containerRef.getBoundingClientRect();
    const iW = rect.width;
    const iH = rect.height;
    const iL = rect.left;
    const iT = rect.top;
    const minW = 180,
      minH = 160,
      maxW = 800,
      maxH = 600;

    return (x: number, y: number) => {
      const dx = x - startX;
      const dy = y - startY;
      let w = iW,
        h = iH,
        l = iL,
        t = iT;

      if (corner === "br" || corner === "tr") w = iW + dx;
      else {
        w = iW - dx;
        l = iL + dx;
      }

      if (corner === "br" || corner === "bl") h = iH + dy;
      else {
        h = iH - dy;
        t = iT + dy;
      }

      w = Math.max(minW, Math.min(maxW, w));
      h = Math.max(minH, Math.min(maxH, h));

      if (corner === "bl" || corner === "tl") l = iL + iW - w;
      if (corner === "tr" || corner === "tl") t = iT + iH - h;

      containerRef.style.width = w + "px";
      containerRef.style.height = h + "px";
      containerRef.style.left = l + "px";
      containerRef.style.top = t + "px";
    };
  }

  function onResizeMouseDown(e: MouseEvent, corner: Corner) {
    e.preventDefault();
    e.stopPropagation();
    const move = startResize(e.clientX, e.clientY, corner);
    const handler = (ev: MouseEvent) => move(ev.clientX, ev.clientY);
    document.addEventListener("mousemove", handler);
    document.addEventListener(
      "mouseup",
      () => document.removeEventListener("mousemove", handler),
      { once: true },
    );
  }

  function onResizeTouchStart(e: TouchEvent, corner: Corner) {
    e.preventDefault();
    e.stopPropagation();
    const t = e.touches[0];
    const move = startResize(t.clientX, t.clientY, corner);
    const handler = (ev: TouchEvent) =>
      move(ev.touches[0].clientX, ev.touches[0].clientY);
    document.addEventListener("touchmove", handler);
    document.addEventListener(
      "touchend",
      () => document.removeEventListener("touchmove", handler),
      { once: true },
    );
  }

  const rows = Array.from({ length: N_ROWS }, (_, i) => i);
  const cols = Array.from({ length: N_COLS }, (_, i) => i);

  return (
    <div
      ref={containerRef}
      class="keyboard-overlay"
      classList={{ active: props.visible }}
    >
      <For each={CORNERS}>
        {(corner) => (
          <div
            class={`resize-handle resize-${corner}`}
            onMouseDown={(e) => onResizeMouseDown(e, corner)}
            onTouchStart={(e) => onResizeTouchStart(e, corner)}
          />
        )}
      </For>

      <div
        class="dragger-area"
        onMouseDown={onDragMouseDown}
        onTouchStart={onDragTouchStart}
      >
        <div class="dragger" />
      </div>

      <div class="keyboard-grid">
        <For each={rows}>
          {(row) => (
            <For each={cols}>
              {(col) => {
                const idx = row * N_COLS + col;
                return (
                  <button
                    class="key"
                    classList={{ pressed: !!pressed[idx] }}
                    tabIndex={-1}
                    onMouseDown={() => {
                      pressIdx(idx);
                      document.addEventListener(
                        "mouseup",
                        () => releaseIdx(idx),
                        { once: true },
                      );
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      pressIdx(idx);
                      document.addEventListener(
                        "touchend",
                        () => releaseIdx(idx),
                        { once: true },
                      );
                    }}
                  >
                    <span class="key-label">{KEY_NAMES[idx]}</span>
                    <span class="key-bind">{KEY_BINDINGS[idx]}</span>
                  </button>
                );
              }}
            </For>
          )}
        </For>
      </div>
    </div>
  );
}
