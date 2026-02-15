import { For, createMemo } from "solid-js";
import { toHex, calcBitness } from "../lib/util";
import "../styles/hex-table.css";

interface HexTableProps {
  name: string;
  data: number[];
  columns: number;
  bitness: number;
  vNames?: string[];
  hNames?: string[];
  highlightIndices?: () => Set<number>;
}

export default function HexTable(props: HexTableProps) {
  const hexDigits = () => props.bitness / 4;

  const rowCount = createMemo(() =>
    Math.ceil(props.data.length / props.columns),
  );

  const hasVHeader = () => props.vNames != null || rowCount() > 1;
  const hasHHeader = () => props.hNames != null || props.columns > 1;

  const vAddrDigits = createMemo(() =>
    Math.ceil((calcBitness(props.data.length) + 1) / 4),
  );
  const hAddrDigits = createMemo(() =>
    Math.ceil((calcBitness(props.columns) + 1) / 4),
  );

  const rowIndices = createMemo(() =>
    Array.from({ length: rowCount() }, (_, i) => i),
  );
  const colIndices = createMemo(() =>
    Array.from({ length: props.columns }, (_, i) => i),
  );

  return (
    <div class="table-container">
      <table class="hex-table">
        {hasHHeader() && (
          <thead>
            <tr>
              {hasVHeader() && <th>{props.name}</th>}
              <For each={colIndices()}>
                {(col) => (
                  <th>
                    {props.hNames
                      ? props.hNames[col]
                      : toHex(col, hAddrDigits())}
                  </th>
                )}
              </For>
            </tr>
          </thead>
        )}
        <tbody>
          <For each={rowIndices()}>
            {(row) => (
              <tr>
                {hasVHeader() && (
                  <td>
                    {props.vNames
                      ? props.vNames[row]
                      : toHex(row * props.columns, vAddrDigits())}
                  </td>
                )}
                <For each={colIndices()}>
                  {(col) => {
                    const idx = row * props.columns + col;
                    return (
                      <td
                        classList={{
                          highlight:
                            props.highlightIndices?.().has(idx) ?? false,
                        }}
                      >
                        {idx < props.data.length
                          ? toHex(props.data[idx], hexDigits())
                          : ""}
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
