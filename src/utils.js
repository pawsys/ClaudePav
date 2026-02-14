// ============================================================
// SZCZURY Z KAMIEŃCA - Utility Functions
// ============================================================

const TILE = 16;
const COLS = 30;
const ROWS = 20;
const CANVAS_W = 480;
const CANVAS_H = 320;

// Directions
const DIR = {
    UP: { x: 0, y: -1 },
    DOWN: { x: 0, y: 1 },
    LEFT: { x: -1, y: 0 },
    RIGHT: { x: 1, y: 0 }
};

function dist(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function manhattanDist(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min, max) {
    return Math.random() * (max - min) + min;
}

function choose(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

// Simple A* pathfinding
function findPath(startX, startY, endX, endY, isWalkable) {
    const open = [];
    const closed = new Set();
    const start = { x: startX, y: startY, g: 0, h: 0, f: 0, parent: null };
    start.h = manhattanDist(start, { x: endX, y: endY });
    start.f = start.h;
    open.push(start);

    while (open.length > 0) {
        open.sort((a, b) => a.f - b.f);
        const current = open.shift();
        const key = `${current.x},${current.y}`;

        if (current.x === endX && current.y === endY) {
            const path = [];
            let node = current;
            while (node) {
                path.unshift({ x: node.x, y: node.y });
                node = node.parent;
            }
            return path;
        }

        closed.add(key);

        for (const dir of [DIR.UP, DIR.DOWN, DIR.LEFT, DIR.RIGHT]) {
            const nx = current.x + dir.x;
            const ny = current.y + dir.y;
            const nkey = `${nx},${ny}`;

            if (closed.has(nkey)) continue;
            if (!isWalkable(nx, ny)) continue;

            const g = current.g + 1;
            const existing = open.find(n => n.x === nx && n.y === ny);
            if (existing) {
                if (g < existing.g) {
                    existing.g = g;
                    existing.f = g + existing.h;
                    existing.parent = current;
                }
            } else {
                const h = manhattanDist({ x: nx, y: ny }, { x: endX, y: endY });
                open.push({ x: nx, y: ny, g, h, f: g + h, parent: current });
            }
        }

        if (closed.size > 500) return null; // Limit search
    }
    return null;
}

// Pixel art drawing helpers
function drawPixelRect(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(x), Math.floor(y), w, h);
}

function drawPixelText(ctx, text, x, y, color, size) {
    ctx.fillStyle = color;
    ctx.font = `${size || 8}px monospace`;
    ctx.fillText(text, Math.floor(x), Math.floor(y));
}
