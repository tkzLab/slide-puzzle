document.addEventListener('DOMContentLoaded', () => {
    const board = document.getElementById('board');
    const movesNum = document.getElementById('moves-num');
    const clearOverlay = document.getElementById('clear-overlay');
    const shuffleButton = document.getElementById('shuffle-button');
    const hintButton = document.getElementById('hint-button');
    const imageLoader = document.getElementById('image-loader');
    const sizeSeg = document.getElementById('size-seg');
    const picker = document.getElementById('picker');

    let N = 3;
    let order = [];       // order[domIndex] = 絵柄番号（N*N-1 が空き）
    let tiles = [];
    let moves = 0;
    let cleared = false;
    let imgUrl = 'img/farm-1.jpg';

    // スワイプ用
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartDomIndex = -1;

    const emptyIndex = () => order.indexOf(N * N - 1);

    function buildBoard() {
        board.innerHTML = '';
        board.style.gridTemplateColumns = `repeat(${N}, 1fr)`;
        tiles = [];
        for (let i = 0; i < N * N; i++) {
            const t = document.createElement('div');
            t.className = 'tile';
            t.addEventListener('click', () => tryMove(i));
            t.addEventListener('touchstart', (e) => handleTouchStart(e, i), { passive: false });
            t.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
            t.addEventListener('touchend', (e) => handleTouchEnd(e, i));
            board.appendChild(t);
            tiles.push(t);
        }
        shuffle();
    }

    function render() {
        const last = N * N - 1;
        tiles.forEach((t, i) => {
            const v = order[i];
            t.style.backgroundImage = `url('${imgUrl}')`;
            t.style.backgroundSize = `${N * 100}% ${N * 100}%`;
            t.style.backgroundPosition =
                `${(v % N) / (N - 1) * 100}% ${Math.floor(v / N) / (N - 1) * 100}%`;
            t.classList.toggle('empty', v === last && !cleared);
        });
        movesNum.textContent = moves;
    }

    function tryMove(i) {
        if (cleared) return;
        const e = emptyIndex();
        const [r, c] = [Math.floor(i / N), i % N];
        const [er, ec] = [Math.floor(e / N), e % N];
        if (Math.abs(r - er) + Math.abs(c - ec) !== 1) return;
        [order[i], order[e]] = [order[e], order[i]];
        moves++;
        render();
        checkWin();
    }

    function shuffle() {
        cleared = false;
        clearOverlay.classList.remove('show');
        moves = 0;
        order = Array.from({ length: N * N }, (_, i) => i);
        // 完成形からランダムに有効手を打つことで可解性を保証する
        let prev = -1;
        for (let k = 0; k < 80 * N * N; k++) {
            const e = emptyIndex();
            const [er, ec] = [Math.floor(e / N), e % N];
            const cand = [];
            if (er > 0) cand.push(e - N);
            if (er < N - 1) cand.push(e + N);
            if (ec > 0) cand.push(e - 1);
            if (ec < N - 1) cand.push(e + 1);
            const picks = cand.filter(x => x !== prev);
            const pick = picks[Math.floor(Math.random() * picks.length)];
            [order[e], order[pick]] = [order[pick], order[e]];
            prev = e;
        }
        render();
    }

    /* ---- スワイプ操作 ---- */
    function handleTouchStart(event, domIndex) {
        event.preventDefault();
        touchStartDomIndex = domIndex;
        touchStartX = event.changedTouches[0].screenX;
        touchStartY = event.changedTouches[0].screenY;
    }

    function handleTouchEnd(event, domIndex) {
        if (touchStartDomIndex !== domIndex) return;

        const dx = event.changedTouches[0].screenX - touchStartX;
        const dy = event.changedTouches[0].screenY - touchStartY;
        const swipeThreshold = 30;

        // スワイプ距離が短ければタップ扱い（click イベント側で処理）
        if (Math.abs(dx) < swipeThreshold && Math.abs(dy) < swipeThreshold) return;

        const e = emptyIndex();
        const [row, col] = [Math.floor(domIndex / N), domIndex % N];
        const [emptyRow, emptyCol] = [Math.floor(e / N), e % N];

        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0 && row === emptyRow && col + 1 === emptyCol) tryMove(domIndex);
            else if (dx < 0 && row === emptyRow && col - 1 === emptyCol) tryMove(domIndex);
        } else {
            if (dy > 0 && col === emptyCol && row + 1 === emptyRow) tryMove(domIndex);
            else if (dy < 0 && col === emptyCol && row - 1 === emptyRow) tryMove(domIndex);
        }
    }

    /* ---- ヒント ---- */
    function manhattanOf(i, v) {
        return Math.abs(Math.floor(i / N) - Math.floor(v / N)) + Math.abs(i % N - v % N);
    }

    function totalManhattan(state) {
        const last = N * N - 1;
        let total = 0;
        for (let i = 0; i < state.length; i++) {
            if (state[i] !== last) total += manhattanOf(i, state[i]);
        }
        return total;
    }

    function flashHint(domIndex) {
        tiles[domIndex].classList.add('hint');
        setTimeout(() => tiles[domIndex].classList.remove('hint'), 700);
    }

    // 3×3: A* で最適手を出す
    function hintAStar() {
        const last = N * N - 1;
        const solvedString = Array.from({ length: N * N }, (_, i) => i).join(',');
        const openSet = new Map();
        const closedSet = new Set();
        const startNode = { state: order, g: 0, h: totalManhattan(order), parent: null };
        startNode.f = startNode.h;
        openSet.set(order.join(','), startNode);

        while (openSet.size > 0) {
            let bestNode = null;
            for (const node of openSet.values()) {
                if (bestNode === null || node.f < bestNode.f) bestNode = node;
            }
            const bestStateString = bestNode.state.join(',');
            if (bestStateString === solvedString) {
                let path = [];
                let current = bestNode;
                while (current.parent) {
                    path.push(current);
                    current = current.parent;
                }
                path.reverse();
                if (path.length > 0) flashHint(path[0].state.indexOf(last));
                return;
            }
            openSet.delete(bestStateString);
            closedSet.add(bestStateString);
            const e = bestNode.state.indexOf(last);
            const [er, ec] = [Math.floor(e / N), e % N];
            for (let i = 0; i < N * N; i++) {
                const [r, c] = [Math.floor(i / N), i % N];
                if (Math.abs(r - er) + Math.abs(c - ec) !== 1) continue;
                const neighborState = [...bestNode.state];
                [neighborState[i], neighborState[e]] = [neighborState[e], neighborState[i]];
                const neighborStateString = neighborState.join(',');
                if (closedSet.has(neighborStateString)) continue;
                const gScore = bestNode.g + 1;
                let neighborNode = openSet.get(neighborStateString);
                if (!neighborNode || gScore < neighborNode.g) {
                    if (!neighborNode) neighborNode = {};
                    neighborNode.parent = bestNode;
                    neighborNode.state = neighborState;
                    neighborNode.g = gScore;
                    neighborNode.h = totalManhattan(neighborState);
                    neighborNode.f = neighborNode.g + neighborNode.h;
                    openSet.set(neighborStateString, neighborNode);
                }
            }
        }
    }

    // 4×4: 貪欲法（A* は状態数が多く固まる恐れがあるため）
    function hintGreedy() {
        const e = emptyIndex();
        const [er, ec] = [Math.floor(e / N), e % N];
        let best = -1, bestGain = -Infinity;
        [[er - 1, ec], [er + 1, ec], [er, ec - 1], [er, ec + 1]].forEach(([r, c]) => {
            if (r < 0 || r >= N || c < 0 || c >= N) return;
            const i = r * N + c;
            const gain = manhattanOf(i, order[i]) - manhattanOf(e, order[i]);
            if (gain > bestGain) { bestGain = gain; best = i; }
        });
        if (best >= 0) flashHint(best);
    }

    function showHint() {
        if (cleared) return;
        if (N === 3) hintAStar();
        else hintGreedy();
    }

    /* ---- クリア ---- */
    function checkWin() {
        if (order.every((v, i) => v === i)) {
            cleared = true;
            render(); // 空きマスにも絵を表示して完成画にする
            clearOverlay.classList.add('show');
        }
    }

    /* ---- イベント ---- */
    shuffleButton.addEventListener('click', shuffle);
    hintButton.addEventListener('click', showHint);

    sizeSeg.addEventListener('click', (ev) => {
        const btn = ev.target.closest('button');
        if (!btn) return;
        sizeSeg.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === btn));
        N = Number(btn.dataset.n);
        buildBoard();
    });

    picker.addEventListener('click', (ev) => {
        const btn = ev.target.closest('button');
        if (!btn) return;
        picker.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === btn));
        imgUrl = btn.dataset.img;
        shuffle();
    });

    imageLoader.addEventListener('change', (ev) => {
        const file = ev.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            imgUrl = e.target.result;
            picker.querySelectorAll('button').forEach(b => b.classList.remove('on'));
            shuffle();
        };
        reader.readAsDataURL(file);
    });

    picker.querySelector(`button[data-img="${imgUrl}"]`).classList.add('on');
    buildBoard();
});
