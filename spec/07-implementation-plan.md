# 07. 実装マイルストーン

実装エージェント向けの作業順序。各マイルストーンは独立にコミット可能で、**完了条件をすべて満たしてから**次へ進む。全マイルストーン共通の完了条件: `pnpm check` と `pnpm test` がクリーンに通ること。

コミットは CLAUDE.md の書式(プレフィックスなし・命令形)に従い、マイルストーンごとに 1 コミット以上とする。

## M1 — 基盤: 依存追加と盤面の静的表示

1. `pnpm add chess.js stockfish`
2. Stockfish ファイルを `public/stockfish/` に配置し、DevTools で `uciok` を確認([03](03-engine.md) §1 の手順どおり)
3. `src/theme/tokens.css` を作成し `index.css` から import。テンプレート由来の `App.css`・雛形 UI を削除
4. `game/types.ts`、`game/chessGame.ts` を実装 + テスト(06 §1.1)
5. `pieces/pieceSvg.tsx`(12 駒 SVG)を実装
6. `Chessboard` + `Piece` + `GameContainer` で**初期局面の静的表示**(タップ処理なし)。座標ラベル・木目配色・1:1 レスポンシブを完成させる

**完了条件**: モバイル幅(375px)とデスクトップ幅で初期局面が美しく表示される(`pnpm dev` で目視確認)。chessGame テスト全パス。

## M2 — 対人戦: インタラクションとゲームループ

1. `store/gameStore.ts` を実装(エンジン関連 action はスタブ: `requestEngineMove` は no-op)
2. `tapSquare` の状態遷移([05](05-interaction-flows.md) §2)+ ハイライト一式([05](05-interaction-flows.md) §5)
3. 駒移動アニメーション([04](04-components-styling.md) §5)
4. `PromotionDialog`、`GameOverModal`、`GameStatusBar`(手番・チェック表示・Resign 確認)、`MoveHistory`、`CapturedPieces`
5. `NewGameDialog`(この時点では PvP のみ有効。CPU 選択肢は disabled で用意)
6. store テスト(06 §1.4 のうち PvP 分)+ コンポーネントテスト 2 本

**完了条件**: PvP で開始〜チェックメイト/ステイルメイト/投了まで完全に遊べる。特殊手 3 種が UI 上で正しく動く(Fool's mate、キャスリング、アンパッサン、プロモーションを手動確認)。

## M3 — 永続化

1. `persistence/schema.ts`、`persistence/storage.ts` + テスト(06 §1.2)
2. `boot()` の復元フロー([02](02-state-persistence.md) §6)と毎手番保存を store に組み込む
3. store テストに復元・破損データケースを追加

**完了条件**: 対局途中でリロードして完全復元される。DevTools で保存データを壊しても新規対局ダイアログにフォールバックする(受け入れ基準の該当 2 項目を手動確認)。

## M4 — Stockfish 統合(CPU 戦)

1. `engine/uci.ts`、`engine/difficulty.ts` + テスト
2. `engine/engineAdapter.ts` + モック Worker テスト(06 §1.3)
3. store のエンジン action を本実装([02](02-state-persistence.md) §4): thinking 状態・入力ロック・世代管理・エラー/Retry
4. `NewGameDialog` の CPU 選択肢を有効化(難易度・色選択)。黒選択時の盤反転
5. `GameStatusBar` に thinking スピナー・エラーバナー
6. CPU 戦復元時の思考再開

**完了条件**: 4 難易度すべてで CPU 戦が最後まで遊べる。思考中も UI が固まらない。thinking 中のリロード → 復元後に CPU が指す。エンジン 404 時にエラーバナー + Retry が機能する。

## M5 — ポリッシュと最終検証

1. 細部の質感調整: 影・フレーム・タイポグラフィ・Dialog 装飾を [04](04-components-styling.md) の水準に仕上げる
2. アクセシビリティ最終確認: キーボード操作、aria-label、`prefers-reduced-motion`
3. `README.md` を書き直す(概要・スクリーンショット・`pnpm dev` 手順・Cburnett 帰属表記)
4. `pnpm build && pnpm preview` で本番ビルド動作確認(Worker パス・WASM ロード含む)
5. [06-quality-testing.md](06-quality-testing.md) §4 の受け入れ基準チェックリストを**全項目**確認し、結果を報告する

**完了条件**: 受け入れ基準チェックリスト全項目 ✅。

## 実装上の注意(全体)

- spec に書かれていない細部の判断は「コア原則([00](00-overview.md) §2)に最も合う選択」を採り、その判断をコミットメッセージまたは PR 説明に記録する
- spec と chess.js / stockfish の実際の API に食い違いがあれば、**ライブラリーの実 API を優先**し、spec の該当箇所を修正するコミットを添える
- 依存の追加は chess.js と stockfish の 2 つのみ。それ以外を追加したくなったら立ち止まり、既存依存(@kobalte/core, lucide-solid)や自前実装で代替できないか検討する
