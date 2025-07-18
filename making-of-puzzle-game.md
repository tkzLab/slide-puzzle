# Web技術で挑戦！AIヒント機能付きスライドパズルの開発裏話

こんにちは！今回は、ふと「Webで動くスライドパズルを作ってみよう」と思い立ち、開発したパズルゲームの制作過程を記事にしてみました。単にシャッフルして遊べるだけでなく、AIによるヒント機能など、少し凝った機能も実装しています。開発中の試行錯誤の道のりを共有できればと思います。

## まずは完成品のご紹介

今回作成したのは、こちらの3x3のスライドパズルです。

![Puzzle Game Image](520166-backgroundImage1.jpeg)

主な機能は以下の通りです。

*   **シャッフル機能**: ボタン一つでタイルをランダムに配置します。
*   **画像変更機能**: 好きな画像をアップロードして、オリジナルパズルで遊べます。
*   **PC・スマホ両対応**: クリック操作に加え、スワイプ操作にも対応しています。
*   **AIヒント機能**: なんと、AI（A*探索アルゴリズム）が最短で完成する次の一手を教えてくれます。

## 使用技術

特別なライブラリは使わず、Webの基本技術だけで作りました。

*   **HTML**: パズルの骨格を定義
*   **CSS**: 見た目を整える（CSS Gridを主に利用）
*   **JavaScript**: ゲームのロジック全体を制御

## 実装のポイントと試行錯誤の道のり

ここからは、具体的な実装のポイントと、開発中につまずいた点や工夫した点をご紹介します。

### ステップ1: 盤面と画像の表示 - CSS Gridとbackground-positionの活用

まず、パズルの盤面を作成しました。これはCSSの`display: grid`を使うことで、非常にシンプルに実装できました。

```css
#puzzle-container {
    display: grid;
    grid-template-columns: repeat(3, 100px);
    grid-template-rows: repeat(3, 100px);
    /* ... */
}
```

各タイルに画像を表示するために、1枚の画像を9分割して表示する必要がありました。これは、各タイル要素の`background-image`に同じ画像を指定し、`background-position`をタイルごとにずらすことで実現しています。

```javascript
// script.jsより抜粋
function updateTileClasses() {
    tiles.forEach((tile, i) => {
        const tileValue = currentState[i]; // tileValueは0~8のどのピースかを示す
        const x = (tileValue % 3) * 100;
        const y = Math.floor(tileValue / 3) * 100;
        tile.style.backgroundPosition = `-${x}px -${y}px`;
        // ...
    });
}
```

### ステップ2: シャッフル機能と「解けないパズル」の壁

タイルを動かすロジックができた後、シャッフル機能を実装しました。最初は単純に配列の要素をランダムに入れ替えるだけでした。

```javascript
// 初期のシャッフルロジック（問題あり）
function shuffle() {
    currentState.sort(() => Math.random() - 0.5);
    updateTileClasses();
}
```

しかし、これだと**約半分の確率で「絶対に完成できない配置」**が生まれてしまうという大きな問題にぶつかりました。スライドパズルには「偶置換」と「奇置換」という数学的な制約があり、初期配置によっては解けないことが決まっているのです。

この問題に対処するため、「反転数（inversion number）」を計算し、その偶奇性からパズルが解けるかどうかを判定する`isSolvable`関数を実装しました。シャッフル後に解けない配置だった場合は、タイルを2つだけ入れ替えて強制的に解ける配置に修正しています。

```javascript
// script.jsより抜粋
function isSolvable(puzzle) {
    let inversions = 0;
    const puzzleWithoutEmpty = puzzle.filter(val => val !== 8); // 空白タイルを除く
    for (let i = 0; i < puzzleWithoutEmpty.length - 1; i++) {
        for (let j = i + 1; j < puzzleWithoutEmpty.length; j++) {
            if (puzzleWithoutEmpty[i] > puzzleWithoutEmpty[j]) {
                inversions++;
            }
        }
    }
    // 3x3パズルの場合、反転数が偶数なら解ける
    return inversions % 2 === 0;
}

function shuffle() {
    // ...ランダムシャッフル処理...
    if (!isSolvable(currentState)) {
        // 解けない場合は、先頭2つを入れ替えて必ず解ける配置にする
        [currentState[0], currentState[1]] = [currentState[1], currentState[0]];
    }
    updateTileClasses();
}
```

これは大きな試行錯誤のポイントで、数学的な知識が役立った瞬間でした。

### ステップ3: スマートフォンへのタッチ操作対応

PCでのクリック操作に加え、スマートフォンでも快適に遊べるようにスワイプ操作を実装しました。`touchstart`でスワイプ開始位置を記録し、`touchend`で移動方向を判定してタイルを動かしています。

```javascript
// script.jsより抜粋
function handleTouchStart(event, domIndex) {
    // ...
    touchStartX = event.changedTouches[0].screenX;
    touchStartY = event.changedTouches[0].screenY;
}

function handleTouchEnd(event, domIndex) {
    // ...
    const dx = event.changedTouches[0].screenX - touchStartX;
    const dy = event.changedTouches[0].screenY - touchStartY;

    if (Math.abs(dx) > Math.abs(dy)) { // 横スワイプ
        // ...
    } else { // 縦スワイプ
        // ...
    }
}
```
`event.preventDefault()`を適切に呼び出し、スワイプ時に画面がスクロールしてしまうのを防ぐ工夫も入れています。

### ステップ4: 最難関！A*アルゴリズムによるヒント機能の実装

このゲームの目玉機能が、AIによるヒント機能です。これは、最短手数でパズルを完成させるための次の一手を教えてくれるものです。

この実装には**A* (A-star) 探索アルゴリズム**を利用しました。A*は、スタートからゴールまでの最短経路を見つけるための有名なアルゴリズムです。

アルゴリズムのキーとなるのが、以下の評価関数です。

`f(n) = g(n) + h(n)`

*   `g(n)`: スタートから現在の手数
*   `h(n)`: 現在地からゴールまでの推定コスト（ヒューリスティック関数）

今回のパズルでは、`h(n)`として**マンハッタン距離**を採用しました。これは、各タイルが本来あるべき位置から、縦横に何マス離れているかの合計値です。

```javascript
// script.jsより抜粋
function calculateManhattanDistance(state) {
    let totalDistance = 0;
    for (let i = 0; i < state.length; i++) {
        const value = state[i];
        if (value !== 8) { // 空白タイルは除く
            const currentRow = Math.floor(i / 3);
            const currentCol = i % 3;
            const correctRow = Math.floor(value / 3);
            const correctCol = value % 3;
            totalDistance += Math.abs(currentRow - correctRow) + Math.abs(currentCol - correctCol);
        }
    }
    return totalDistance;
}
```

A*アルゴリズム本体の実装は複雑で、オープンリスト（評価中のノード）とクローズドリスト（評価済みのノード）を管理しながら、`f(n)`が最小となる経路を探索していきます。この部分はコードも長くなるため割愛しますが、今回の開発で最も挑戦的で学びの多い部分でした。

## 今後の展望

*   **手数とタイムの記録**: ゲームクリアまでの手数や時間を記録・表示する機能。
*   **難易度設定**: 4x4や5x5など、より難しい盤面で遊べるようにする。
*   **アニメーションの強化**: タイル移動をより滑らかなアニメーションにする。

## おわりに

簡単なゲームに見えて、実は奥深い数学的な背景やアルゴリズムが隠れているのがスライドパズルの面白いところでした。特に、「解けない配置」の存在や、A*アルゴリズムのようなAI技術に触れられたのは大きな収穫でした。

この記事が、Web技術やアルゴリズムに興味を持つきっかけになれば幸いです。最後までお読みいただきありがとうございました！
