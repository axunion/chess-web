# 01. ディレクトリ構成とアーキテクチャ

## 1. レイヤー構造

4 層の単方向依存で構成する。**依存は必ず上から下へ**。下層が上層を import することを禁止する。

```
components/  (UI — 表示とユーザー入力のみ。store の読み取りと action 呼び出しだけを行う)
    ↓
store/       (アプリ状態と action — 唯一の書き込み経路。下 3 モジュールを編成する)
    ↓
game/  ・  engine/  ・  persistence/   (ドメイン層 — 互いに依存しない。SolidJS に依存しない純粋 TS)
```

- `game/`, `engine/`, `persistence/` は **SolidJS を import しない**。純粋な TypeScript として単体テスト可能に保つ。
- `components/` は chess.js・EngineAdapter・LocalStorage に**直接触れない**。必ず store の action を経由する。
- 循環 import が生じたら設計ミス。型だけの共有は `game/types.ts` に置いて解決する。

## 2. ディレクトリツリー

```
chess-web/
├── public/
│   ├── favicon.svg
│   └── stockfish/                  # Stockfish worker 一式(03-engine.md 参照)
│       ├── stockfish-lite-single.js
│       └── stockfish-lite-single.wasm
├── spec/                           # 本設計書群
└── src/
    ├── index.tsx                   # エントリー。render(() => <App />)
    ├── index.css                   # リセット + theme/tokens.css の import
    ├── App.tsx                     # <GameContainer /> をマウントし、初回復元を起動
    ├── theme/
    │   └── tokens.css              # CSS カスタムプロパティ(04 参照)
    ├── game/
    │   ├── types.ts                # Square, Color, PieceSymbol, GameStatus 等の共有型
    │   └── chessGame.ts            # chess.js ラッパー(唯一の chess.js import 地点)
    ├── engine/
    │   ├── engineAdapter.ts        # Promise ベースの UCI アダプター
    │   ├── uci.ts                  # UCI メッセージの構築・パース(純粋関数)
    │   └── difficulty.ts           # 難易度プリセット表
    ├── persistence/
    │   ├── schema.ts               # SavedGameV1 型とバリデーション
    │   └── storage.ts              # load / save / clear
    ├── store/
    │   └── gameStore.ts            # createStore + 全 action(02 参照)
    └── components/
        ├── GameContainer.tsx / GameContainer.module.css
        ├── Chessboard.tsx  / Chessboard.module.css     # 盤 + Square の grid
        ├── Piece.tsx       / Piece.module.css          # 駒 1 つ(SVG 描画 + 移動 transition)
        ├── pieces/
        │   └── pieceSvg.tsx                            # 12 種の駒 SVG パス定義
        ├── PromotionDialog.tsx / PromotionDialog.module.css
        ├── GameStatusBar.tsx   / GameStatusBar.module.css
        ├── MoveHistory.tsx     / MoveHistory.module.css
        ├── CapturedPieces.tsx  / CapturedPieces.module.css
        ├── GameOverModal.tsx   / GameOverModal.module.css
        └── NewGameDialog.tsx   / NewGameDialog.module.css
```

命名規約: コンポーネントは PascalCase、その他のモジュールは camelCase。テストは対象と同階層に `*.test.ts(x)`。1 ファイル 1 関心、約 300 行を超えたら分割(CLAUDE.md 準拠)。

## 3. chess.js の扱い

- chess.js の `Chess` インスタンスは `game/chessGame.ts` 内にカプセル化し、モジュール外へ**インスタンスを漏らさない**。
- `chessGame.ts` は「命令を受けて chess.js を操作し、シリアライズ可能なスナップショットを返す」薄いラッパーとする。公開 API は [02-state-persistence.md](02-state-persistence.md) §3 に定義。
- これにより store は常に plain object のみを保持し、SolidJS のリアクティビティと永続化が単純になる。

## 4. Web Worker ライフサイクル

Stockfish Worker は重い(WASM 約 7MB)ため、必要になるまで生成しない。

| イベント | 挙動 |
| --- | --- |
| アプリ起動 | Worker を生成**しない** |
| CPU 戦の開始 / CPU 戦の復元 | `EngineAdapter.init()` を呼び、Worker 生成 + UCI ハンドシェイク(非同期、UI 非ブロック) |
| CPU 戦中の各手番 | 既存 Worker を再利用 |
| PvP 戦へ切り替え / 新規 PvP 対局 | `EngineAdapter.dispose()` で `worker.terminate()` |
| ページ離脱 | ブラウザーが自動破棄(明示処理不要) |
| HMR(開発時) | `gameStore.ts` で `import.meta.hot?.dispose(() => adapter.dispose())` を登録し、Worker のリークを防ぐ |

Worker インスタンスは同時に最大 1 つ。`EngineAdapter` はモジュールスコープのシングルトンではなく、store が生成・保持する(テストでモック差し替え可能にするため、store 初期化時に注入できる形にする — [02](02-state-persistence.md) §4 参照)。

## 5. エラー境界

- エンジンのロード失敗・クラッシュは `EngineState = "error"` として store に反映し、UI はバナーで通知 + 再試行ボタンを出す(アプリ全体は落とさない)。
- LocalStorage の読み書き失敗(容量超過・プライベートモード)は console.warn に留め、ゲーム続行を優先する。
- 上記以外の想定外例外に対するグローバルなエラー境界は実装しない(YAGNI)。
