document.addEventListener('DOMContentLoaded', () => {
    const puzzleContainer = document.getElementById('puzzle-container');
    const shuffleButton = document.getElementById('shuffle-button');
    const hintButton = document.getElementById('hint-button');
    const imageLoader = document.getElementById('image-loader');
    const message = document.getElementById('message');
    const tileCount = 9;
    let tiles = [];

    const solvedState = Array.from({ length: tileCount }, (_, i) => i);
    const solvedStateString = solvedState.join(',');
    let currentState = [...solvedState];

    // For touch controls
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartDomIndex = -1;

    function applyImage(imageUrl) {
        tiles.forEach(tile => {
            tile.style.backgroundImage = `url('${imageUrl}')`;
        });
    }

    function handleImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                applyImage(e.target.result);
                shuffle();
            };
            reader.readAsDataURL(file);
        }
    }

    function createPuzzle() {
        puzzleContainer.innerHTML = '';
        tiles = [];
        for (let i = 0; i < tileCount; i++) {
            const tile = document.createElement('div');
            tile.classList.add('puzzle-tile');
            // Add click and touch listeners
            tile.addEventListener('click', () => moveTile(i));
            // Add passive: false to allow preventDefault
            tile.addEventListener('touchstart', (e) => handleTouchStart(e, i), { passive: false });
            tile.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
            tile.addEventListener('touchend', (e) => handleTouchEnd(e, i));
            puzzleContainer.appendChild(tile);
            tiles.push(tile);
        }
        applyImage('520166-backgroundImage1.jpeg');
        shuffle();
    }

    function handleTouchStart(event, domIndex) {
        event.preventDefault(); // Prevent page from scrolling
        touchStartDomIndex = domIndex;
        touchStartX = event.changedTouches[0].screenX;
        touchStartY = event.changedTouches[0].screenY;
    }

    function handleTouchEnd(event, domIndex) {
        if (touchStartDomIndex !== domIndex) return;

        const touchEndX = event.changedTouches[0].screenX;
        const touchEndY = event.changedTouches[0].screenY;
        const dx = touchEndX - touchStartX;
        const dy = touchEndY - touchStartY;
        const swipeThreshold = 30; // Min distance for a swipe

        // If it's not a long enough swipe, we don't treat it as a click here
        // because the 'click' event will still fire. We just handle the swipe.
        if (Math.abs(dx) < swipeThreshold && Math.abs(dy) < swipeThreshold) {
            return;
        }

        const emptyDomIndex = currentState.indexOf(8);
        const [row, col] = [Math.floor(domIndex / 3), domIndex % 3];
        const [emptyRow, emptyCol] = [Math.floor(emptyDomIndex / 3), emptyDomIndex % 3];

        if (Math.abs(dx) > Math.abs(dy)) { // Horizontal swipe
            if (dx > 0 && row === emptyRow && col + 1 === emptyCol) moveTile(domIndex); // Swipe Right
            else if (dx < 0 && row === emptyRow && col - 1 === emptyCol) moveTile(domIndex); // Swipe Left
        } else { // Vertical swipe
            if (dy > 0 && col === emptyCol && row + 1 === emptyRow) moveTile(domIndex); // Swipe Down
            else if (dy < 0 && col === emptyCol && row - 1 === emptyRow) moveTile(domIndex); // Swipe Up
        }
    }

    function updateTileClasses() {
        tiles.forEach((tile, i) => {
            const tileValue = currentState[i];
            const x = (tileValue % 3) * 100;
            const y = Math.floor(tileValue / 3) * 100;
            tile.style.backgroundPosition = `-${x}px -${y}px`;
            tile.classList.toggle('empty', tileValue === 8);
        });
    }

    function moveTile(clickedDomIndex) {
        const emptyDomIndex = currentState.indexOf(8);
        const [row, col] = [Math.floor(clickedDomIndex / 3), clickedDomIndex % 3];
        const [emptyRow, emptyCol] = [Math.floor(emptyDomIndex / 3), emptyDomIndex % 3];

        if ((Math.abs(row - emptyRow) + Math.abs(col - emptyCol)) === 1) {
            [currentState[clickedDomIndex], currentState[emptyDomIndex]] = [currentState[emptyDomIndex], currentState[clickedDomIndex]];
            updateTileClasses();
            checkWin();
        }
    }

    function shuffle() {
        message.textContent = '';
        currentState = [...solvedState];
        for (let i = currentState.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [currentState[i], currentState[j]] = [currentState[j], currentState[i]];
        }
        if (!isSolvable(currentState)) {
            if (currentState.length > 1) [currentState[0], currentState[1]] = [currentState[1], currentState[0]];
        }
        updateTileClasses();
    }
    
    function isSolvable(puzzle) {
        let inversions = 0;
        const puzzleWithoutEmpty = puzzle.filter(val => val !== 8);
        for (let i = 0; i < puzzleWithoutEmpty.length - 1; i++) {
            for (let j = i + 1; j < puzzleWithoutEmpty.length; j++) {
                if (puzzleWithoutEmpty[i] > puzzleWithoutEmpty[j]) inversions++;
            }
        }
        return inversions % 2 === 0;
    }

    function calculateManhattanDistance(state) {
        let totalDistance = 0;
        for (let i = 0; i < state.length; i++) {
            const value = state[i];
            if (value !== 8) {
                const [currentRow, currentCol] = [Math.floor(i / 3), i % 3];
                const [correctRow, correctCol] = [Math.floor(value / 3), value % 3];
                totalDistance += Math.abs(currentRow - correctRow) + Math.abs(currentCol - correctCol);
            }
        }
        return totalDistance;
    }

    function showHint() {
        const openSet = new Map();
        const closedSet = new Set();
        const startStateString = currentState.join(',');
        const startNode = { state: currentState, g: 0, h: calculateManhattanDistance(currentState), parent: null };
        startNode.f = startNode.h;
        openSet.set(startStateString, startNode);

        while (openSet.size > 0) {
            let bestNode = null;
            for (const node of openSet.values()) {
                if (bestNode === null || node.f < bestNode.f) bestNode = node;
            }
            const bestStateString = bestNode.state.join(',');
            if (bestStateString === solvedStateString) {
                let path = [];
                let current = bestNode;
                while (current.parent) {
                    path.push(current);
                    current = current.parent;
                }
                path.reverse();
                if (path.length > 0) {
                    const nextState = path[0].state;
                    const emptyIndexAfter = nextState.indexOf(8);
                    tiles[emptyIndexAfter].classList.add('hint');
                    setTimeout(() => { tiles[emptyIndexAfter].classList.remove('hint'); }, 500);
                }
                return;
            }
            openSet.delete(bestStateString);
            closedSet.add(bestStateString);
            const emptyIndex = bestNode.state.indexOf(8);
            const [emptyRow, emptyCol] = [Math.floor(emptyIndex / 3), emptyIndex % 3];
            for (let i = 0; i < tileCount; i++) {
                const [row, col] = [Math.floor(i / 3), i % 3];
                if (Math.abs(row - emptyRow) + Math.abs(col - emptyCol) === 1) {
                    const neighborState = [...bestNode.state];
                    [neighborState[i], neighborState[emptyIndex]] = [neighborState[emptyIndex], neighborState[i]];
                    const neighborStateString = neighborState.join(',');
                    if (closedSet.has(neighborStateString)) continue;
                    const gScore = bestNode.g + 1;
                    let neighborNode = openSet.get(neighborStateString);
                    if (!neighborNode || gScore < neighborNode.g) {
                        if (!neighborNode) neighborNode = {};
                        neighborNode.parent = bestNode;
                        neighborNode.state = neighborState;
                        neighborNode.g = gScore;
                        neighborNode.h = calculateManhattanDistance(neighborState);
                        neighborNode.f = neighborNode.g + neighborNode.h;
                        openSet.set(neighborStateString, neighborNode);
                    }
                }
            }
        }
    }

    function checkWin() {
        if (currentState.join(',') === solvedStateString) {
            message.textContent = 'Congratulations! You solved it!';
            const emptyTile = tiles.find((tile, i) => currentState[i] === 8);
            if (emptyTile) emptyTile.classList.remove('empty');
        } else {
            message.textContent = '';
        }
    }

    shuffleButton.addEventListener('click', shuffle);
    hintButton.addEventListener('click', showHint);
    imageLoader.addEventListener('change', handleImageUpload);

    createPuzzle();
});