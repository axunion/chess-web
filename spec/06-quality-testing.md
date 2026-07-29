# 06. 品質基準とテスト

## 1. テスト戦略

テストは実装と同時に書く(CLAUDE.md 準拠)。観察可能な振る舞いをテストし、内部実装(chess.js の呼び出し回数等)には依存しない。各テストは自己完結とし、LocalStorage は `beforeEach` でクリアする。ランナーは Vitest(既設定: happy-dom, `globals: false` — 明示 import)。

### 1.1 `game/chessGame.test.ts`(最重要 — ドメインロジック)

| ケース | 検証内容 |
| --- | --- |
| 初期局面 | reset 後の fen・pieces が 32 駒、turn = "w" |
| 通常の移動と履歴 | e4 e5 Nf3 → history の san/from/to が正しい |
| キャスリング | K/R が正しい位置へ。両者の `id` が移動前と同一(アニメーション同一性) |
| アンパッサン | 捕獲されたポーンが pieces から消える。`captured: "p"` |
| プロモーション | `isPromotion` が true、move 後に駒種 q・**新 id** が発番される |
| チェックメイト | Fool's mate(f3 e5 g4 Qh4#)で `checkmate, winner: "b"` |
| ステイルメイト / 各ドロー | 既知の FEN からの終了判定(threefold は同型反復手順で) |
| moveUci | "e2e4" と "e7e8q" 形式の適用 |
| capturedBy | 捕獲列の導出が正しい |

### 1.2 `persistence/storage.test.ts`

- save → load の往復で SavedGameV1 が同値
- 破損 JSON / version 不一致 / フィールド欠落 → `null` を返しキーが削除される
- LocalStorage が throw する場合(モック)→ 例外を伝播させず warn に留める

### 1.3 `engine/uci.test.ts` + `engine/engineAdapter.test.ts`

- uci.ts: `parseBestMove("bestmove e2e4 ponder d7d5") === "e2e4"`、`(none)` → null、ノイズ行(`info depth …`)→ null
- engineAdapter: **モック Worker**(`Worker` をコンストラクター注入 or `vi.stubGlobal`)で
  - init: uci→uciok, isready→readyok の往復完了
  - bestMove: position/go 送信 → bestmove 応答で resolve
  - タイムアウト: 応答なし → reject(fake timers 使用)
  - 多重呼び出し: 先行 Promise が reject され stop が送られる

### 1.4 `store/gameStore.test.ts`

モックエンジン(即座に固定手を返す `EngineAdapter` 実装)を注入して:

- newGame(pvp) → tapSquare 系列で 1 手進み、保存が行われる(LocalStorage を直接検証)
- タップ状態遷移表([05](05-interaction-flows.md) §2)の 6 パターン全て
- プロモーション: pendingPromotion セット → confirm → 反映 / cancel → 選択クリア
- CPU 戦: 人間の手の後、モックエンジンの手が自動適用される
- 入力ロック: thinking 中・終局後・CPU 手番中の tapSquare が no-op
- boot: 保存データからの復元(PGN リプレイ)、破損データ → 初期状態
- 世代管理: newGame 後に届いた旧対局の bestmove が破棄される
- resign → status 反映 + 保存

### 1.5 `components/` (代表 2 本のみ)

- `Chessboard.test.tsx`: 初期局面の描画(32 駒・aria-label)、タップで選択ハイライトが付く → 合法マスタップで駒が移動する(@solidjs/testing-library + fireEvent)
- `PromotionDialog.test.tsx`: 表示・選択・キャンセル

コンポーネントテストはこの 2 本に絞る。ロジックの網羅は store 層で担保済みであり、UI テストの重複は保守コストに見合わない。

## 2. パフォーマンス基準

- 駒移動は CSS transition のみで駆動(JS アニメーションループ禁止)— 60fps を GPU 合成で確保
- Stockfish は CPU 戦開始まで一切ロードしない(初期バンドルに WASM を含めない — `public/` 配置で自然に満たされる)
- タップから選択ハイライト表示まで体感即時(同期処理のみ、16ms 以内)
- `pnpm build` の初期 JS バンドル(gzip)目標 < 150KB(chess.js + solid で十分収まる)

## 3. アクセシビリティ基準

- 全マスがキーボード到達可能([05](05-interaction-flows.md) §8)
- テキストコントラスト AA 以上、ハイライトは色のみに依存しない(選択=塗り、合法手=形状[ドット/リング]で区別)
- `prefers-reduced-motion` 対応([04](04-components-styling.md) §5)
- Dialog のフォーカス管理は @kobalte/core に委譲

## 4. 受け入れ基準チェックリスト(最終確認)

機能:

- [ ] PvP: 2 人対局が最初から終局まで指せる
- [ ] CPU 戦: 4 難易度 × 先手/後手/Random で対局できる
- [ ] キャスリング(両翼)・アンパッサン・プロモーション(4 駒種)が UI 上で正しく動く
- [ ] チェックメイト・ステイルメイト・3 種ドロー・投了がすべて正しい文言のモーダルで表示される
- [ ] 対局途中(CPU 思考中を含む)にリロードしても、局面・履歴・設定が完全復元され、CPU 手番なら思考が再開する
- [ ] 保存データを手で破壊(DevTools で不正 JSON に書き換え)しても起動し、新規対局ダイアログが出る
- [ ] エンジンファイルを 404 にしても(リネームで確認)エラーバナー + Retry が機能し、PvP は遊べる

品質:

- [ ] iPhone SE 相当(375px)〜 デスクトップで盤が常に 1:1、レイアウト破綻なし
- [ ] 駒移動・キャスリングのアニメーションが滑らか(CPU の手も lastMove ハイライトで追える)
- [ ] `pnpm check` と `pnpm test` が警告・失敗ゼロで通る
- [ ] コード・UI 文言がすべて英語、README に Cburnett 帰属表記がある
