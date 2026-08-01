# Lichess 駒アセット移行計画

## Context

現在の駒は `src/components/pieces/pieceSvg.tsx` に手描きの Staunton シルエット
SVG としてハードコードされている。同ファイルの冒頭コメントと `README.md:49-56`
に明記されている通り、これは元々 Cburnett セット(Wikimedia Commons / lila 版、
GPLv2+)を使う計画だったが、実装当時ネットワークアクセスがなくパスデータを
取得できなかったための代替措置だった。

今回の調査で `raw.githubusercontent.com` への WebFetch が可能なことを確認済み
であり、当初計画通り lila (lichess.org のオープンソースリポジトリ) が配布する
本家 Cburnett SVG に差し替えることで、駒の描画品質を lichess 相当に引き上げる。

ユーザーとの合意によりスコープは以下に限定する:

- **駒 SVG のみ差し替え。** 盤面コンポーネント (`Chessboard.tsx`)・駒コンポー
  ネント (`Piece.tsx`) のレイヤー構造、アニメーション、レイアウトロジックは
  無改修。`chessground` ライブラリ (GPL-3.0 のコード依存、盤面 UI の全面刷新)
  は今回採用しない。
- **盤面のマス目は現状の CSS トークン色 (`--board-light` / `--board-dark` 等)
  のまま。** lila の木目・大理石テクスチャ画像 (AGPLv3+) は導入しない。

## ライセンス上の注意

- Cburnett SVG (Colin M.L. Burnett 作) は **GPLv2+**。コードではなく画像アセッ
  トとしての取り込みであり、lila 自身も同じ扱いで配布しているため前例のある
  一般的な手法だが、**取り込んだ SVG ファイル自体には GPLv2+ が適用される**。
  リポジトリに `LICENSE` ファイルは現状存在しない(未設定/非公開前提)。アプリ
  本体のコードを GPL 化する必要はないが、アセットの出典・ライセンスを明記した
  帰属表記を追加する(README 更新 + 簡潔な NOTICE)。
- 移行対象は 12 ファイル(`w`/`b` × `P,N,B,R,Q,K`)。取得元:
  `https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/{color}{TYPE}.svg`
  (例: `wN.svg`, `bQ.svg`)。`viewBox="0 0 45 45"` で現行実装と一致するため、
  `Piece.module.css` 側の寸法調整は不要。

## 変更対象ファイル

- **`src/components/pieces/pieceSvg.tsx`**(主変更)
  - `PawnShape`〜`KingShape` の手描きパス関数と `FILL_WHITE`/`FILL_BLACK`/
    `STROKE` 定数を削除し、取得した Cburnett の実パス/circle/rect データに
    置き換える。Cburnett の SVG は色ごとに塗り分けが異なる(白駒は白塗り+黒
    縁、黒駒は黒塗り+白ハイライト等)ため、現行のような「1つの `<svg fill=...>`
    に共通シルエットを流し込む」方式ではなく、**type × color の組み合わせご
    とに本家のマークアップをそのまま再現する**形にする。
  - **公開 API は変更しない**: `PieceSvg({ type, color })` のシグネチャを維持
    し、呼び出し側 (`Piece.tsx`, `PromotionDialog.tsx`, `CapturedPieces.tsx`)
    は無改修で済むようにする。
- **`README.md:49-56`**「Piece art」節を、Cburnett 採用済みである旨と出典・
  ライセンスの記述に更新(現状の「ネットワークがなく代替した」という記述は
  削除)。
- 新規: アセットの出典・ライセンスを明記する短い NOTICE(README 内の追記で
  足りるか、`THIRD_PARTY_NOTICES.md` を新設するかは実装時に判断。既存に類似
  ファイルがなければ README 追記で十分)。

## 手順

1. lila リポジトリから 12 種の Cburnett SVG を取得し、パスデータを確認。
2. `pieceSvg.tsx` を書き換え、type × color ごとに実データを反映。
3. `README.md` の「Piece art」節と帰属表記を更新。
4. `pnpm check` / `pnpm test` を実行し、既存テストが無改修で通ることを確認
   (`RookShape` 等の内部ヘルパーはテストから直接参照されていないことを確認
   済み)。
5. dev サーバーで目視確認: 全 6 種類 × 2 色、盤面反転時の向き、
   `PromotionDialog` の選択肢表示、`CapturedPieces` の一覧表示。

## 検証方法

- `pnpm check`(型・lint)と `pnpm test` がグリーンであること。
- ブラウザで対局を開始し、各駒種・両陣営の見た目が Cburnett 相当になっている
  ことを目視確認。盤面反転、駒の移動アニメーション、プロモーション選択 UI、
  captured pieces 表示が崩れていないことを確認。

## スコープ外(将来検討事項として記録のみ)

- `chessground` ライブラリへの全面移行(GPL-3.0 コード依存、盤面コンポーネン
  トの作り直しが必要)。
- lila の盤面テクスチャ画像(AGPLv3+)の導入。
