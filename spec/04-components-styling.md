# 04. コンポーネントとスタイリング

## 1. コンポーネントツリーと契約

```
App
└── GameContainer                 … store を生成・保持。レイアウトの器
    ├── GameStatusBar             … 手番/チェック表示、エンジン状態、New Game・Resign ボタン
    ├── Chessboard                … 8×8 grid + 座標ラベル + 駒 + ハイライト
    │   ├── (64 squares: Chessboard 内部で描画。独立コンポーネントにしない)
    │   ├── Piece × 最大32        … <For each={pieces}> で id キー描画
    │   └── PromotionDialog       … @kobalte/core Dialog
    ├── CapturedPieces × 2        … 白側・黒側の捕獲駒トレー
    ├── MoveHistory               … SAN 履歴(2 手 1 行の表)
    ├── GameOverModal             … @kobalte/core Dialog(終局時)
    └── NewGameDialog             … @kobalte/core Dialog(モード・難易度・色選択)
```

| コンポーネント | Props | 責務 / 備考 |
| --- | --- | --- |
| `GameContainer` | なし | `createGameStore(createEngineAdapter)` を生成し `onMount(boot)`。子へ store と actions を渡す |
| `GameStatusBar` | `state`, `onNewGame`, `onResign`, `onRetryEngine` | "White to move" / "Check!" / "Stockfish is thinking…"(スピナー)/ エンジンエラーバナー |
| `Chessboard` | `state`, `onTapSquare(sq)` | 盤の描画・タップ入力・全ハイライト(選択、合法手、lastMove、チェック中のキング) |
| `Piece` | `piece: BoardPiece`, `interactive: boolean` | SVG 描画。位置は `translate` で指定(§5) |
| `PromotionDialog` | `pending`, `color`, `onSelect(piece)`, `onCancel` | Q/R/B/N の 4 択。閉じる=キャンセル |
| `CapturedPieces` | `pieces: PieceSymbol[]`, `color` | 小さい駒アイコンを価値順(Q→R→B→N→P)に表示 |
| `MoveHistory` | `history: HistoryEntry[]` | 新しい手が入ったら自動で末尾へスクロール |
| `GameOverModal` | `status`, `onNewGame` | 結果文言(§7)+ "New Game" ボタン。閉じても盤面は閲覧可能 |
| `NewGameDialog` | `open`, `onStart(config: GameConfig)`, `onClose` | mode(PvP / vs CPU)、difficulty、playerColor(White/Black/Random)を選択 |

Square を独立コンポーネントにしない理由: マスは静的な市松模様 + ハイライトクラスのみで、駒と分離して grid の背面レイヤーとして一括描画する方が SolidJS の更新粒度・アニメーションともに単純になる。

## 2. デザイントークン(`src/theme/tokens.css`)

伝統的な木製セットの質感を CSS カスタムプロパティに集約する。**色・寸法・時間のリテラルをコンポーネント CSS に直書きしない。**

```css
:root {
  /* Board — walnut & maple */
  --board-light: #ead9b8;        /* maple */
  --board-dark: #9e6b4a;         /* walnut */
  --board-frame: #5d4030;        /* outer frame */
  --board-coord: #f7efe0;        /* rank/file labels on frame */

  /* Feedback overlays (semi-transparent, layered on squares) */
  --hl-selected: rgb(218 165 32 / 55%);   /* goldenrod */
  --hl-legal-dot: rgb(60 40 20 / 35%);
  --hl-last-move: rgb(205 180 90 / 40%);
  --hl-check: rgb(178 34 34 / 55%);       /* firebrick on king square */

  /* Surface & text */
  --surface: #f4ede1;            /* parchment background */
  --surface-raised: #fffdf7;
  --ink: #2b2118;
  --ink-muted: #7a6a58;
  --accent: #7c4a2d;

  /* Typography */
  --font-display: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
  --font-ui: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;

  /* Shape & elevation */
  --radius: 10px;
  --shadow-piece: drop-shadow(0 2px 2px rgb(0 0 0 / 30%));
  --shadow-panel: 0 2px 12px rgb(43 33 24 / 12%);

  /* Motion */
  --dur-move: 160ms;
  --dur-fade: 120ms;
  --ease-move: cubic-bezier(0.2, 0.8, 0.3, 1);
}
```

Web フォントは読み込まない(システムセリフスタックで十分、かつ初期表示が速い)。ダークモード対応はスコープ外。コントラストは `--ink` on `--surface` で WCAG AA を満たすこと。

## 3. 盤面の 1:1 とレスポンシブレイアウト

- 盤本体: `display: grid; grid-template: repeat(8, 1fr) / repeat(8, 1fr); aspect-ratio: 1;`
- サイズ決定(モバイルで横幅いっぱい、デスクトップで上限):
  ```css
  .board { width: min(100vw - 2rem, 100dvh - 14rem, 560px); }
  ```
  `100dvh - 14rem` はステータスバー等の UI 高さを引いた縦方向の制約で、横向きモバイルでも盤がはみ出さないための項。
- 座標ラベル(a–h, 1–8)は盤を囲む `--board-frame` 色のフレーム上に置く。フレームは padding で作る。
- レイアウトブレークポイント: **単一、`64rem`(1024px)**。
  - モバイル(default): 縦 1 カラム — StatusBar / CapturedPieces(相手) / Board / CapturedPieces(自分) / MoveHistory
  - デスクトップ(`@media (min-width: 64rem)`): 2 カラム — 左に Board、右にサイドパネル(StatusBar・CapturedPieces・MoveHistory を縦積み、`max-width: 20rem`)
- CPU 戦で黒を選んだ場合、盤を反転する(rank/file の描画順を反転。CSS `transform: rotate` は使わない — ラベルと駒が逆さになるため、描画順の反転で実装する)。

## 4. 駒 SVG(`src/components/pieces/pieceSvg.tsx`)

- **Cburnett セット**(Wikimedia Commons の標準チェス駒 SVG、Staunton 様式)のパスデータを 12 種(6 駒種 × 2 色)インライン `<svg viewBox="0 0 45 45">` として定義する。
- ライセンス: CC BY-SA 3.0。README に "Chess piece graphics by Colin M.L. Burnett (Wikimedia Commons), CC BY-SA 3.0" の帰属表記を追加すること。
- 実装形: `export function PieceSvg(props: { type: PieceSymbol; color: Color }): JSX.Element` — 内部で 12 パターンを switch。ファイルが 300 行を超える場合は白黒で 2 ファイルに分割してよい。
- パスデータを正確に再現できない場合の代替(fallback): 幾何学的にシンプルな自作 Staunton 風シルエット SVG を自分で描いてよいが、**Unicode 文字(♞ 等)は使用禁止**(プラットフォームでの見た目差が大きく品質原則に反する)。

## 5. 駒の移動アニメーション

- `Chessboard` は盤 grid の上に絶対配置レイヤーを重ね、`<For each={state.pieces}>`(`id` により同一性維持)で `Piece` を描画する。
- 各 `Piece` は `width/height: 12.5%` で、位置を `translate: calc(file * 100%) calc(rank * 100%)` により指定。`transition: translate var(--dur-move) var(--ease-move)` だけで移動アニメーションが成立する(FLIP 不要)。キャスリングもルークの `translate` 変更で自動的に同時アニメーションになる。
- 捕獲された駒は `pieces` 配列から消えるため即座に DOM から外れる。消滅フェードは実装しない(実物のチェスで駒は即座に取り除かれる — 伝統的美学に合致)。
- `@media (prefers-reduced-motion: reduce)` では `--dur-move: 0ms; --dur-fade: 0ms` に上書きし、全アニメーションを無効化する。

## 6. CSS Modules 規約

- クラス名は camelCase(`boardFrame`, `legalDot`)。Biome/lightningcss のデフォルトに従う。
- 状態はクラス切り替えで表現: `classList={{ [styles.selected]: isSelected }}`。style 属性の直書きは駒の `translate` 位置指定のみ許可。
- z-index の階層: 盤マス(0)→ ハイライト(1)→ 駒(2)→ ドラッグ等の浮遊 UI(3)→ Dialog(kobalte 既定)。各 module 内で `z-index` は 0–3 のみ使用。
- @kobalte/core の Dialog はヘッドレスなので、`Dialog.Overlay` / `Dialog.Content` に module クラスを当てて §2 のトークンで装飾する。Overlay は `rgb(43 33 24 / 45%)` + `backdrop-filter: blur(2px)`。

## 7. 文言(すべて英語)

| 状況 | 表示 |
| --- | --- |
| 手番 | "White to move" / "Black to move" |
| チェック | "Check!" |
| CPU 思考中 | "Stockfish is thinking…" |
| チェックメイト | "Checkmate — White wins" / "… Black wins" |
| ステイルメイト | "Draw — Stalemate" |
| ドロー | "Draw — Threefold repetition" / "… Insufficient material" / "… Fifty-move rule" |
| 投了 | "White resigns — Black wins"(逆も同様) |
