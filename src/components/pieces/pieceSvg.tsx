import { For, type JSX } from "solid-js";
import type { Color, PieceSymbol } from "../../game/types";

// NOTE: this project intended to use the Cburnett piece set (Wikimedia
// Commons, CC BY-SA 3.0) per spec/04-components-styling.md §4, but the
// implementation environment had no network access to fetch the real path
// data. Falling back to hand-drawn Staunton-silhouette shapes is the
// explicitly sanctioned fallback in that same spec section. No Unicode
// glyphs are used.

interface PieceSvgProps {
  type: PieceSymbol;
  color: Color;
}

const FILL_WHITE = "#fbf6ea";
const FILL_BLACK = "#2b2118";
const STROKE = "#1c140c";

function Base(): JSX.Element {
  return (
    <g>
      <path d="M10 36.5 L35 36.5 L32.5 32.5 L12.5 32.5 Z" />
      <rect x="6" y="36.5" width="33" height="4" rx="1.5" />
    </g>
  );
}

function PawnShape(): JSX.Element {
  return (
    <>
      <circle cx="22.5" cy="13.5" r="5.5" />
      <path d="M17.5 19.5 C16 23 14.5 27.5 14 31 C13.7 32.7 31.3 32.7 31 31 C30.5 27.5 29 23 27.5 19.5 Z" />
      <Base />
    </>
  );
}

function RookShape(): JSX.Element {
  return (
    <>
      <rect x="13.5" y="17" width="18" height="16" />
      <path d="M13.5 17 L13.5 11 L17.5 11 L17.5 13 L20.5 13 L20.5 11 L24.5 11 L24.5 13 L27.5 13 L27.5 11 L31.5 11 L31.5 17 Z" />
      <Base />
    </>
  );
}

function KnightShape(): JSX.Element {
  return (
    <>
      <path
        d="M13 33
           C12.5 29 13.5 26.5 15 25
           C12.5 23 11.5 19.5 13 17
           C14 15.3 16 14.3 17.7 14.7
           C18.3 12 20.5 9.5 24 8.5
           C28 7.3 32 9.3 32.5 13
           C32.8 15.3 31.3 17 29.3 17.3
           C30 19 30 21 28.7 22.5
           L31 33 Z"
      />
      <circle cx="28" cy="13.5" r="1.1" fill={STROKE} stroke="none" />
      <Base />
    </>
  );
}

function BishopShape(): JSX.Element {
  return (
    <>
      <circle cx="22.5" cy="7" r="2.2" />
      <path d="M22.5 10 C18 13.5 15.5 19 16.5 24.5 C17 27.5 28 27.5 28.5 24.5 C29.5 19 27 13.5 22.5 10 Z" />
      <line
        x1="18.3"
        y1="18"
        x2="26.7"
        y2="14"
        stroke={STROKE}
        stroke-width="1.1"
      />
      <Base />
    </>
  );
}

const QUEEN_CROWN_X = [11.5, 17, 22.5, 28, 33.5];

function QueenShape(): JSX.Element {
  return (
    <>
      <For each={QUEEN_CROWN_X}>{(cx) => <circle cx={cx} cy="10" r="2" />}</For>
      <path d="M13 12 L32 12 L29.5 25 C29.5 27.5 15.5 27.5 15.5 25 Z" />
      <Base />
    </>
  );
}

function KingShape(): JSX.Element {
  return (
    <>
      <rect x="21" y="2.5" width="3" height="7" />
      <rect x="18.5" y="5" width="8" height="2.6" />
      <circle cx="22.5" cy="15.5" r="4.3" />
      <path d="M15.5 20 C15 24 14.5 28 15 31.5 C15.3 33.5 29.7 33.5 30 31.5 C30.5 28 30 24 29.5 20 C27 22 25 23 22.5 23 C20 23 18 22 15.5 20 Z" />
      <Base />
    </>
  );
}

function renderShape(type: PieceSymbol): JSX.Element {
  switch (type) {
    case "p":
      return <PawnShape />;
    case "r":
      return <RookShape />;
    case "n":
      return <KnightShape />;
    case "b":
      return <BishopShape />;
    case "q":
      return <QueenShape />;
    case "k":
      return <KingShape />;
  }
}

export function PieceSvg(props: PieceSvgProps): JSX.Element {
  const fill = () => (props.color === "w" ? FILL_WHITE : FILL_BLACK);
  return (
    <svg
      viewBox="0 0 45 45"
      aria-hidden="true"
      fill={fill()}
      stroke={STROKE}
      stroke-width="1.3"
      stroke-linejoin="round"
      stroke-linecap="round"
    >
      {renderShape(props.type)}
    </svg>
  );
}
