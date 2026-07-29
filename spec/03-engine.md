# 03. Stockfish 統合

## 1. ビルドの選定と配置

**シングルスレッド lite WASM ビルド**を採用する。マルチスレッド版は SharedArrayBuffer を要求し、COOP/COEP ヘッダーが必要になるため静的ホスティングで扱いにくい。lite 版(NNUE 小型ネット)でも人間相手には十分すぎる強さがある。

手順(M1 で実施):

1. `pnpm add stockfish`
2. `node_modules/stockfish/src/` から **lite・single 版**(ファイル名に `lite` と `single` を含む `.js` と `.wasm` のペア。例: `stockfish-17.1-lite-single-<hash>.js/.wasm`)を `public/stockfish/` にコピーし、`stockfish-lite-single.js` / `stockfish-lite-single.wasm` にリネームする。
   - `.js` は同名 `.wasm` を自身の URL 相対で解決するため、**両ファイルの basename は必ず一致させる**。
   - コピーは `package.json` の `postinstall` スクリプト化はせず、リポジトリーに直接コミットする(ビルド再現性優先。`.gitignore` に注意)。
3. 動作確認: `pnpm dev` 起動後、DevTools コンソールで
   ```js
   const w = new Worker("/stockfish/stockfish-lite-single.js");
   w.onmessage = (e) => console.log(e.data);
   w.postMessage("uci");
   ```
   を実行し、`uciok` が出力されることを確認する。パッケージのバージョンによりファイル構成が異なる場合は、この確認が通る組み合わせを採用すること。

## 2. UCI ユーティリティ(`src/engine/uci.ts`)

Worker との文字列プロトコルを純粋関数に分離する(単体テスト対象)。

```ts
export const cmdSetSkill = (level: number) => `setoption name Skill Level value ${level}`;
export const cmdPosition = (fen: string) => `position fen ${fen}`;
export const cmdGo = (movetimeMs: number) => `go movetime ${movetimeMs}`;

/** Parses "bestmove e2e4 ponder ..." → "e2e4". Returns null for other lines. */
export function parseBestMove(line: string): string | null;
/** True for "uciok" / "readyok" lines. */
export function isUciOk(line: string): boolean;
export function isReadyOk(line: string): boolean;
```

`bestmove (none)` は合法手なし(実際には終局後にしか起きない)を意味し、`parseBestMove` は `null` を返す。呼び出し側はエラーとして扱う。

## 3. 難易度プリセット(`src/engine/difficulty.ts`)

| Difficulty | Skill Level | movetime (ms) | 想定プレイヤー |
| --- | --- | --- | --- |
| `easy` | 2 | 300 | 入門者。頻繁に駒を捨てる |
| `normal` | 8 | 600 | カジュアル層 |
| `hard` | 14 | 1000 | クラブプレイヤー |
| `master` | 20 | 2000 | フルスペック |

```ts
export const DIFFICULTY_PRESETS: Record<Difficulty, { skill: number; movetimeMs: number }>;
```

movetime を短く保つことで、低難易度ほど応答も速くなり体感が良い。`master` でも 2 秒以内に応答する。

## 4. EngineAdapter(`src/engine/engineAdapter.ts`)

Worker とのメッセージングを Promise API に隠蔽する。SolidJS 非依存。

```ts
export interface EngineAdapter {
  /** Spawns the worker and completes the UCI handshake. Idempotent. */
  init(): Promise<void>;
  /** Resolves with a UCI move string (e.g. "e7e8q"). Rejects on timeout/crash/none. */
  bestMove(fen: string, difficulty: Difficulty): Promise<string>;
  /** Terminates the worker. Safe to call at any time. */
  dispose(): void;
}

export function createEngineAdapter(
  workerUrl = "/stockfish/stockfish-lite-single.js",
): EngineAdapter;
```

### init() のシーケンス

1. `new Worker(workerUrl)`
2. `postMessage("uci")` → `uciok` を待つ
3. `postMessage("isready")` → `readyok` を待つ
4. タイムアウト **10 秒**(WASM ロード込み)。超過時は reject し worker を terminate。

### bestMove() のシーケンス

1. `setoption name Skill Level value <skill>`(難易度が前回と同じでも毎回送ってよい — 冪等)
2. `position fen <fen>`
3. `go movetime <movetimeMs>`
4. `bestmove` 行を待って resolve。タイムアウトは `movetimeMs + 5000` ms。超過時は `postMessage("stop")` を送ってから reject。

### 直列化

`bestMove()` の同時多重呼び出しは想定しない(store が手番制御するため)が、防御として: 進行中の呼び出しがある間に再度呼ばれたら、先に `stop` を送って前の Promise を reject(`EngineBusyError`)してから新リクエストを開始する。

## 5. 古い応答の破棄(世代管理)

エンジン思考中に「新規対局」や「復元」が起きると、届いた `bestmove` は無効な局面への手になりうる。二重に防御する:

1. **Adapter 層**: 新しい `bestMove()`/`dispose()` が前のリクエストを stop/reject する(§4)。
2. **Store 層**: `newGame()` のたびに `gameId`(連番)をインクリメントし、`requestEngineMove()` は呼び出し時点の `gameId` をクロージャーに捕捉。`bestMove` の resolve 後、現在の `gameId` と不一致なら**適用せず黙って破棄**する。

## 6. エラーハンドリング

| 事象 | 検知 | 挙動 |
| --- | --- | --- |
| WASM ロード失敗(404 等) | `init()` タイムアウト / worker `onerror` | `engine = "error"`。GameStatusBar にバナー "Engine failed to load" + Retry ボタン |
| 思考タイムアウト | `bestMove()` reject | 同上("Engine did not respond") |
| `bestmove (none)` | parse 結果 null | 同上(理論上未到達。終局判定は chess.js が先に行うため) |
| Worker クラッシュ | `onerror` / `onmessageerror` | dispose して `engine = "error"` |

Retry は `retryEngine()` action([02](02-state-persistence.md) §4)経由。エラー中も PvP としての盤面閲覧・投了・新規対局は常に可能で、**アプリがデッドエンドに陥る状態を作らない**。
