import { onMount, onCleanup, For } from "solid-js";
import { createStore } from "solid-js/store";
import { useEmulator } from "../App";
import "../styles/keyboard.css";

const KEY_NAMES = [
  "1", "2", "3", "C",
  "4", "5", "6", "D",
  "7", "8", "9", "E",
  "A", "0", "B", "F",
];

const KEY_MAP: Record<string, number> = {
  "1": 0, "2": 1, "3": 2, "4": 3,
  q: 4, w: 5, e: 6, r: 7,
  a: 8, s: 9, d: 10, f: 11,
  z: 12, x: 13, c: 14, v: 15,
};

const N_COLS = 4;
const N_ROWS = 4;

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
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
  });

  onCleanup(() => {
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("keyup", onKeyUp);
  });

  // Dragging
  function startDrag(startX: number, startY: number) {
    const elX = containerRef.offsetLeft;
    const elY = containerRef.offsetTop;

    function move(x: number, y: number) {
      let newX = elX + (x - startX);
      let newY = elY + (y - startY);

      newX = Math.max(0, Math.min(newX, window.innerWidth - containerRef.offsetWidth));
      newY = Math.max(0, Math.min(newY, window.innerHeight - containerRef.offsetHeight));

      containerRef.style.left = newX + "px";
      containerRef.style.top = newY + "px";
    }

    return move;
  }

  function onMouseDown(e: MouseEvent) {
    e.preventDefault();
    const move = startDrag(e.clientX, e.clientY);

    const handler = (ev: MouseEvent) => move(ev.clientX, ev.clientY);
    document.addEventListener("mousemove", handler);
    document.addEventListener("mouseup", () => {
      document.removeEventListener("mousemove", handler);
    }, { once: true });
  }

  function onTouchStart(e: TouchEvent) {
    e.preventDefault();
    const move = startDrag(e.touches[0].clientX, e.touches[0].clientY);

    const handler = (ev: TouchEvent) => move(ev.touches[0].clientX, ev.touches[0].clientY);
    document.addEventListener("touchmove", handler);
    document.addEventListener("touchend", () => {
      document.removeEventListener("touchmove", handler);
    }, { once: true });
  }

  const rows = Array.from({ length: N_ROWS }, (_, i) => i);
  const cols = Array.from({ length: N_COLS }, (_, i) => i);

  return (
    <div
      ref={containerRef}
      class="keyboard-overlay"
      classList={{ active: props.visible }}
      style={{ "--n-rows": N_ROWS, "--n-cols": N_COLS }}
    >
      <div class="dragger-area" onMouseDown={onMouseDown} onTouchStart={onTouchStart}>
        <div class="dragger" />
      </div>
      <table class="keyboard-table">
        <tbody>
          <For each={rows}>
            {(row) => (
              <tr>
                <For each={cols}>
                  {(col) => {
                    const idx = row * N_COLS + col;
                    return (
                      <td>
                        <button
                          class="key"
                          classList={{ pressed: !!pressed[idx] }}
                          tabIndex={-1}
                          onMouseDown={() => {
                            pressIdx(idx);
                            document.addEventListener("mouseup", () => releaseIdx(idx), { once: true });
                          }}
                          onTouchStart={() => {
                            pressIdx(idx);
                            document.addEventListener("touchend", () => releaseIdx(idx), { once: true });
                          }}
                        >
                          {KEY_NAMES[idx]}
                        </button>
                      </td>
                    );
                  }}
                </For>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
}
