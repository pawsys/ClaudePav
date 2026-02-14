// ============================================================
// SZCZURY Z KAMIEŃCA - Map System
// ============================================================

// Tile types
const T = {
    EMPTY: 0,
    WALL: 1,
    FLOOR: 2,
    DOOR: 3,
    STAIRS_UP: 4,
    STAIRS_DOWN: 5,
    KITCHEN_FLOOR: 6,
    BATHROOM_FLOOR: 7,
    GRASS: 8,
    PATH: 9,
    TERRACE: 10,
    FURNITURE: 11,
    WINDOW: 12,
    ATTIC_FLOOR: 13,
    ATTIC_HATCH: 14,
    LOCKED_HATCH: 15,
    GARAGE: 16,
    FIELD: 17,
    TREE: 18,
    FENCE: 19,
    GATE: 20,
    BALCONY: 21,
};

// Tile properties
const TILE_INFO = {
    [T.EMPTY]: { walkable: false, color: '#111', name: 'void' },
    [T.WALL]: { walkable: false, color: '#8B6914', name: 'ściana' },
    [T.FLOOR]: { walkable: true, color: '#D2B48C', name: 'podłoga' },
    [T.DOOR]: { walkable: true, color: '#654321', name: 'drzwi' },
    [T.STAIRS_UP]: { walkable: true, color: '#DAA520', name: 'schody ↑' },
    [T.STAIRS_DOWN]: { walkable: true, color: '#DAA520', name: 'schody ↓' },
    [T.KITCHEN_FLOOR]: { walkable: true, color: '#E8DCC8', name: 'kuchnia' },
    [T.BATHROOM_FLOOR]: { walkable: true, color: '#ADD8E6', name: 'łazienka' },
    [T.GRASS]: { walkable: true, color: '#228B22', name: 'trawa' },
    [T.PATH]: { walkable: true, color: '#C0A882', name: 'ścieżka' },
    [T.TERRACE]: { walkable: true, color: '#A0826D', name: 'taras' },
    [T.FURNITURE]: { walkable: false, color: '#6B4226', name: 'meble' },
    [T.WINDOW]: { walkable: false, color: '#87CEEB', name: 'okno' },
    [T.ATTIC_FLOOR]: { walkable: true, color: '#B8956A', name: 'poddasze' },
    [T.ATTIC_HATCH]: { walkable: true, color: '#FFD700', name: 'właz' },
    [T.LOCKED_HATCH]: { walkable: false, color: '#8B0000', name: 'właz (zamknięty)' },
    [T.GARAGE]: { walkable: true, color: '#808080', name: 'garaż' },
    [T.FIELD]: { walkable: true, color: '#90EE90', name: 'pole' },
    [T.TREE]: { walkable: false, color: '#006400', name: 'drzewo' },
    [T.FENCE]: { walkable: false, color: '#8B7355', name: 'płot' },
    [T.GATE]: { walkable: true, color: '#A0522D', name: 'brama' },
    [T.BALCONY]: { walkable: true, color: '#9E8B7E', name: 'balkon' },
};

// Room definitions for item/rat placement
const ROOMS = {};

// Floor definitions
const FLOORS = {
    GROUND: 0,
    UPPER: 1,
    ATTIC: 2,
    EXTERIOR: 3
};

// Map class
class GameMap {
    constructor() {
        this.floors = {};
        this.currentFloor = FLOORS.GROUND;
        this.items = [];      // Interactive items on map
        this.roomZones = {};   // Named zones for room identification
        this.generateAllFloors();
    }

    generateAllFloors() {
        this.floors[FLOORS.EXTERIOR] = this.generateExterior();
        this.floors[FLOORS.GROUND] = this.generateGroundFloor();
        this.floors[FLOORS.UPPER] = this.generateUpperFloor();
        this.floors[FLOORS.ATTIC] = this.generateAttic();
    }

    createEmptyGrid(fillTile) {
        const grid = [];
        for (let y = 0; y < ROWS; y++) {
            grid[y] = [];
            for (let x = 0; x < COLS; x++) {
                grid[y][x] = fillTile || T.EMPTY;
            }
        }
        return grid;
    }

    fillRect(grid, x, y, w, h, tile) {
        for (let dy = 0; dy < h; dy++) {
            for (let dx = 0; dx < w; dx++) {
                const px = x + dx;
                const py = y + dy;
                if (py >= 0 && py < ROWS && px >= 0 && px < COLS) {
                    grid[py][px] = tile;
                }
            }
        }
    }

    drawRoom(grid, x, y, w, h, floorTile) {
        // Walls
        this.fillRect(grid, x, y, w, 1, T.WALL);
        this.fillRect(grid, x, y + h - 1, w, 1, T.WALL);
        this.fillRect(grid, x, y, 1, h, T.WALL);
        this.fillRect(grid, x + w - 1, y, 1, h, T.WALL);
        // Floor
        this.fillRect(grid, x + 1, y + 1, w - 2, h - 2, floorTile || T.FLOOR);
    }

    addDoor(grid, x, y) {
        if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
            grid[y][x] = T.DOOR;
        }
    }

    addWindow(grid, x, y) {
        if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
            grid[y][x] = T.WINDOW;
        }
    }

    addFurniture(grid, x, y) {
        if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
            grid[y][x] = T.FURNITURE;
        }
    }

    generateExterior() {
        const g = this.createEmptyGrid(T.FIELD);

        // Fence around property
        this.fillRect(g, 2, 1, 26, 1, T.FENCE);
        this.fillRect(g, 2, 18, 26, 1, T.FENCE);
        this.fillRect(g, 2, 1, 1, 18, T.FENCE);
        this.fillRect(g, 27, 1, 1, 18, T.FENCE);

        // Gate (north)
        g[1][14] = T.GATE;
        g[1][15] = T.GATE;

        // Garden inside fence
        this.fillRect(g, 3, 2, 24, 16, T.GRASS);

        // Path from gate to house
        this.fillRect(g, 14, 2, 2, 5, T.PATH);

        // House footprint (represented as wall block)
        this.fillRect(g, 8, 7, 14, 8, T.WALL);
        // House entrance (north - ganek)
        g[7][14] = T.DOOR;
        g[7][15] = T.DOOR;
        this.fillRect(g, 13, 6, 4, 1, T.PATH); // ganek

        // Terrace (south)
        this.fillRect(g, 10, 15, 10, 2, T.TERRACE);

        // Garage (east)
        this.fillRect(g, 22, 8, 4, 4, T.GARAGE);
        g[10][22] = T.DOOR;

        // Trees (forest on west side)
        for (let y = 3; y < 17; y += 2) {
            g[y][3] = T.TREE;
            if (y + 1 < 17) g[y + 1][4] = T.TREE;
        }

        // Some trees on edges
        for (let x = 4; x < 27; x += 3) {
            g[2][x] = T.TREE;
            g[17][x] = T.TREE;
        }

        // Path to gate
        this.fillRect(g, 14, 2, 2, 5, T.PATH);

        this.roomZones.exterior = { floor: FLOORS.EXTERIOR, areas: [{ x: 3, y: 2, w: 24, h: 16 }] };
        this.roomZones.terrace = { floor: FLOORS.EXTERIOR, areas: [{ x: 10, y: 15, w: 10, h: 2 }] };
        this.roomZones.garage = { floor: FLOORS.EXTERIOR, areas: [{ x: 22, y: 8, w: 4, h: 4 }] };

        return g;
    }

    generateGroundFloor() {
        const g = this.createEmptyGrid(T.EMPTY);

        // Main house outline
        this.drawRoom(g, 1, 1, 28, 18, T.FLOOR);

        // === HALLWAY (przedpokój) - north center ===
        this.fillRect(g, 12, 2, 6, 4, T.FLOOR);
        // Front door
        g[1][14] = T.DOOR;
        g[1][15] = T.DOOR;

        // === KITCHEN 1 (with 2 doors) - northwest ===
        this.drawRoom(g, 2, 2, 10, 7, T.KITCHEN_FLOOR);
        this.addDoor(g, 11, 4);  // Door to hallway
        this.addDoor(g, 7, 8);   // Door to south rooms
        // Kitchen furniture
        this.addFurniture(g, 3, 3);  // Counter
        this.addFurniture(g, 4, 3);  // Thermomix
        this.addFurniture(g, 5, 3);  // Microwave
        this.addFurniture(g, 3, 7);  // Table

        // === KITCHEN 2 (open space) - northeast ===
        this.fillRect(g, 18, 2, 10, 7, T.KITCHEN_FLOOR);
        // Open to hallway (no wall between)
        this.fillRect(g, 18, 5, 1, 3, T.KITCHEN_FLOOR); // Open passage
        // Kitchen 2 furniture
        this.addFurniture(g, 24, 3);  // Fridge
        this.addFurniture(g, 25, 3);  // Ekspres do kawy
        this.addFurniture(g, 23, 3);  // Bojler area

        // Hallway connections
        this.addDoor(g, 12, 5);  // To kitchen 1 area
        this.addDoor(g, 17, 5);  // To kitchen 2 area

        // === BATHROOM 1 - west center ===
        this.drawRoom(g, 2, 9, 5, 4, T.BATHROOM_FLOOR);
        this.addDoor(g, 6, 11);

        // === ROOM 1 (Salon/Living room) - center ===
        this.drawRoom(g, 7, 9, 8, 4, T.FLOOR);
        this.addDoor(g, 7, 10);  // To bathroom
        this.addDoor(g, 14, 10); // To room 2
        this.addDoor(g, 10, 9);  // To hallway/kitchen area
        // TV
        this.addFurniture(g, 10, 12);
        this.addFurniture(g, 11, 12);
        // Sofa
        this.addFurniture(g, 9, 10);

        // === ROOM 2 - east center ===
        this.drawRoom(g, 15, 9, 7, 4, T.FLOOR);
        this.addDoor(g, 15, 10);
        this.addDoor(g, 18, 9);
        // Desk with computer
        this.addFurniture(g, 19, 10);
        this.addFurniture(g, 20, 10);

        // === BATHROOM 2 - east ===
        this.drawRoom(g, 22, 9, 6, 4, T.BATHROOM_FLOOR);
        this.addDoor(g, 22, 11);

        // === ROOM 3 - southwest ===
        this.drawRoom(g, 2, 13, 8, 5, T.FLOOR);
        this.addDoor(g, 6, 13);
        this.addFurniture(g, 3, 14);  // Bed
        this.addFurniture(g, 3, 15);

        // === ROOM 4 - south center ===
        this.drawRoom(g, 10, 13, 8, 5, T.FLOOR);
        this.addDoor(g, 13, 13);
        // Kanapa (sofa for Paweł's jiu-jitsu)
        this.addFurniture(g, 12, 15);
        this.addFurniture(g, 13, 15);
        this.addFurniture(g, 14, 15);

        // === ROOM 5 - southeast ===
        this.drawRoom(g, 18, 13, 10, 5, T.FLOOR);
        this.addDoor(g, 18, 14);
        this.addFurniture(g, 23, 14);
        this.addFurniture(g, 24, 14);

        // Terrace door (south)
        g[17][14] = T.DOOR;
        g[17][15] = T.DOOR;

        // Windows
        this.addWindow(g, 1, 5);
        this.addWindow(g, 1, 11);
        this.addWindow(g, 1, 15);
        this.addWindow(g, 28, 5);
        this.addWindow(g, 28, 11);
        this.addWindow(g, 28, 15);
        this.addWindow(g, 8, 1);
        this.addWindow(g, 22, 1);
        this.addWindow(g, 8, 17);

        // Stairs to upper floor
        g[5][15] = T.STAIRS_UP;
        g[5][16] = T.STAIRS_UP;

        // Corridor connecting rooms
        this.fillRect(g, 7, 8, 15, 1, T.FLOOR);
        this.fillRect(g, 12, 6, 6, 3, T.FLOOR);

        // Item placements
        this.items.push(
            { type: 'patelnia', x: 4, y: 4, floor: FLOORS.GROUND, name: 'Patelnia', desc: 'Ciężka żeliwna patelnia' },
            { type: 'thermomix', x: 4, y: 3, floor: FLOORS.GROUND, name: 'Thermomix', desc: 'Thermomix - maszyna kuchenna' },
            { type: 'microwave', x: 5, y: 3, floor: FLOORS.GROUND, name: 'Mikrofalówka', desc: 'Mikrofalówka' },
            { type: 'odkurzacz', x: 8, y: 11, floor: FLOORS.GROUND, name: 'Odkurzacz', desc: 'Potężny odkurzacz' },
            { type: 'tv', x: 10, y: 12, floor: FLOORS.GROUND, name: 'Telewizor', desc: 'Duży telewizor - można przewrócić' },
            { type: 'cola', x: 25, y: 4, floor: FLOORS.GROUND, name: 'Cola', desc: 'Butelka Coli' },
            { type: 'ekspres', x: 25, y: 3, floor: FLOORS.GROUND, name: 'Ekspres do kawy', desc: 'Ekspres ciśnieniowy' },
            { type: 'bojler', x: 23, y: 3, floor: FLOORS.GROUND, name: 'Bojler', desc: 'Gorący bojler' },
            { type: 'bow', x: 20, y: 14, floor: FLOORS.GROUND, name: 'Łuk', desc: 'Łuk do strzelania' },
            { type: 'klapek', x: 3, y: 14, floor: FLOORS.GROUND, name: 'Klapek', desc: 'Klapek babci' },
            { type: 'leaves', x: 5, y: 16, floor: FLOORS.GROUND, name: 'Liście', desc: 'Stos liści (10 uderzeń!)' },
            { type: 'cage', x: 22, y: 15, floor: FLOORS.GROUND, name: 'Klatka', desc: 'Klatka dla szczura' },
            { type: 'soy_sauce', x: 26, y: 4, floor: FLOORS.GROUND, name: 'Sos sojowy', desc: 'Sos sojowy - specjalny atak!' },
        );

        // Room zones
        this.roomZones.kitchen1 = { floor: FLOORS.GROUND, areas: [{ x: 3, y: 3, w: 8, h: 5 }] };
        this.roomZones.kitchen2 = { floor: FLOORS.GROUND, areas: [{ x: 19, y: 3, w: 8, h: 5 }] };
        this.roomZones.hallway = { floor: FLOORS.GROUND, areas: [{ x: 12, y: 2, w: 6, h: 6 }] };
        this.roomZones.bathroom1 = { floor: FLOORS.GROUND, areas: [{ x: 3, y: 10, w: 3, h: 2 }] };
        this.roomZones.salon = { floor: FLOORS.GROUND, areas: [{ x: 8, y: 10, w: 6, h: 2 }] };
        this.roomZones.room2 = { floor: FLOORS.GROUND, areas: [{ x: 16, y: 10, w: 5, h: 2 }] };
        this.roomZones.bathroom2 = { floor: FLOORS.GROUND, areas: [{ x: 23, y: 10, w: 4, h: 2 }] };
        this.roomZones.room3 = { floor: FLOORS.GROUND, areas: [{ x: 3, y: 14, w: 6, h: 3 }] };
        this.roomZones.room4 = { floor: FLOORS.GROUND, areas: [{ x: 11, y: 14, w: 6, h: 3 }] };
        this.roomZones.room5 = { floor: FLOORS.GROUND, areas: [{ x: 19, y: 14, w: 8, h: 3 }] };

        return g;
    }

    generateUpperFloor() {
        const g = this.createEmptyGrid(T.EMPTY);

        // Upper floor outline
        this.drawRoom(g, 1, 1, 28, 18, T.FLOOR);

        // === Shared space / corridor - center ===
        this.fillRect(g, 8, 7, 14, 5, T.FLOOR);

        // === Kitchen (middle) ===
        this.drawRoom(g, 11, 2, 8, 5, T.KITCHEN_FLOOR);
        this.addDoor(g, 14, 6);
        this.addFurniture(g, 12, 3);
        this.addFurniture(g, 13, 3);

        // === Room 1 (Ignacy's room) - northwest ===
        this.drawRoom(g, 2, 2, 9, 7, T.FLOOR);
        this.addDoor(g, 10, 5);
        // Gaming setup
        this.addFurniture(g, 3, 3);  // Desk
        this.addFurniture(g, 4, 3);  // Monitor
        this.addFurniture(g, 3, 5);  // Bed
        this.addFurniture(g, 3, 6);

        // === Room 2 (Lena's room) - northeast ===
        this.drawRoom(g, 19, 2, 9, 7, T.FLOOR);
        this.addDoor(g, 19, 5);
        // Gaming setup
        this.addFurniture(g, 24, 3);  // Desk
        this.addFurniture(g, 25, 3);  // Switch
        this.addFurniture(g, 24, 6);  // Bed
        this.addFurniture(g, 25, 6);

        // === Room 3 (Guest/Paweł) - east ===
        this.drawRoom(g, 19, 9, 9, 5, T.FLOOR);
        this.addDoor(g, 19, 11);
        this.addFurniture(g, 24, 10);
        this.addFurniture(g, 25, 10);

        // === Witek & Blanka's room - southwest ===
        this.drawRoom(g, 2, 9, 9, 5, T.FLOOR);
        this.addDoor(g, 10, 11);
        this.addFurniture(g, 3, 10);  // Xbox
        this.addFurniture(g, 4, 10);
        this.addFurniture(g, 3, 12);  // Bed
        this.addFurniture(g, 4, 12);

        // === Babcia Gosia's room - south ===
        this.drawRoom(g, 2, 14, 12, 4, T.FLOOR);
        this.addDoor(g, 8, 14);
        this.addFurniture(g, 3, 15);
        this.addFurniture(g, 4, 15);

        // === Bathroom upper ===
        this.drawRoom(g, 14, 14, 6, 4, T.BATHROOM_FLOOR);
        this.addDoor(g, 14, 15);

        // === Storage / corridor south ===
        this.fillRect(g, 20, 14, 8, 4, T.FLOOR);

        // Stairs
        g[8][15] = T.STAIRS_DOWN;
        g[8][16] = T.STAIRS_DOWN;

        // Attic hatch (locked initially)
        g[9][14] = T.LOCKED_HATCH;

        // Windows
        this.addWindow(g, 1, 5);
        this.addWindow(g, 1, 11);
        this.addWindow(g, 1, 16);
        this.addWindow(g, 28, 5);
        this.addWindow(g, 28, 11);
        this.addWindow(g, 28, 16);

        // Balcony door (south)
        g[17][24] = T.DOOR;
        g[17][25] = T.DOOR;

        // Items on upper floor
        this.items.push(
            { type: 'nintendo', x: 25, y: 3, floor: FLOORS.UPPER, name: 'Nintendo Switch', desc: 'Nintendo Switch Leny' },
            { type: 'xbox', x: 3, y: 10, floor: FLOORS.UPPER, name: 'Xbox', desc: 'Xbox Witka' },
            { type: 'minecraft_portal', x: 5, y: 4, floor: FLOORS.UPPER, name: 'Komputer Ignacego', desc: 'Minecraft jest włączony!' },
            { type: 'water_gun', x: 21, y: 15, floor: FLOORS.UPPER, name: 'Pistolet na wodę', desc: 'Pistolet na wodę Witka' },
            { type: 'duolingo', x: 4, y: 15, floor: FLOORS.UPPER, name: 'Tablet', desc: 'Tablet z Duolingo' },
        );

        // Room zones upper
        this.roomZones.ignacy_room = { floor: FLOORS.UPPER, areas: [{ x: 3, y: 3, w: 7, h: 5 }] };
        this.roomZones.lena_room = { floor: FLOORS.UPPER, areas: [{ x: 20, y: 3, w: 7, h: 5 }] };
        this.roomZones.witek_room = { floor: FLOORS.UPPER, areas: [{ x: 3, y: 10, w: 7, h: 3 }] };
        this.roomZones.guest_room = { floor: FLOORS.UPPER, areas: [{ x: 20, y: 10, w: 7, h: 3 }] };
        this.roomZones.babcia_room = { floor: FLOORS.UPPER, areas: [{ x: 3, y: 15, w: 10, h: 2 }] };

        return g;
    }

    generateAttic() {
        const g = this.createEmptyGrid(T.EMPTY);

        // Attic is smaller - under the roof
        this.drawRoom(g, 4, 3, 22, 14, T.ATTIC_FLOOR);

        // Roof slopes (walls narrowing)
        this.fillRect(g, 5, 4, 20, 1, T.ATTIC_FLOOR);
        this.fillRect(g, 6, 3, 18, 1, T.WALL);

        // The rat nest area
        this.fillRect(g, 10, 6, 10, 6, T.ATTIC_FLOOR);

        // Hatch down
        g[13][14] = T.ATTIC_HATCH;

        // Scattered junk
        this.addFurniture(g, 6, 5);
        this.addFurniture(g, 7, 5);
        this.addFurniture(g, 22, 5);
        this.addFurniture(g, 23, 5);
        this.addFurniture(g, 6, 14);
        this.addFurniture(g, 7, 14);
        this.addFurniture(g, 22, 14);

        this.roomZones.attic = { floor: FLOORS.ATTIC, areas: [{ x: 5, y: 4, w: 20, h: 12 }] };

        return g;
    }

    getTile(floor, x, y) {
        const grid = this.floors[floor];
        if (!grid || y < 0 || y >= ROWS || x < 0 || x >= COLS) return T.EMPTY;
        return grid[y][x];
    }

    setTile(floor, x, y, tile) {
        if (this.floors[floor] && y >= 0 && y < ROWS && x >= 0 && x < COLS) {
            this.floors[floor][y][x] = tile;
        }
    }

    isWalkable(floor, x, y) {
        const tile = this.getTile(floor, x, y);
        return TILE_INFO[tile]?.walkable || false;
    }

    getItemAt(floor, x, y) {
        return this.items.find(i => i.floor === floor && i.x === x && i.y === y);
    }

    getRoomAt(floor, x, y) {
        for (const [name, zone] of Object.entries(this.roomZones)) {
            if (zone.floor !== floor) continue;
            for (const area of zone.areas) {
                if (x >= area.x && x < area.x + area.w && y >= area.y && y < area.y + area.h) {
                    return name;
                }
            }
        }
        return null;
    }

    draw(ctx, floor, cameraX, cameraY) {
        const grid = this.floors[floor];
        if (!grid) return;

        const startX = Math.max(0, Math.floor(cameraX / TILE));
        const startY = Math.max(0, Math.floor(cameraY / TILE));
        const endX = Math.min(COLS, startX + Math.ceil(CANVAS_W / TILE) + 1);
        const endY = Math.min(ROWS, startY + Math.ceil(CANVAS_H / TILE) + 1);

        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const tile = grid[y][x];
                const info = TILE_INFO[tile];
                if (!info) continue;

                const px = x * TILE - cameraX;
                const py = y * TILE - cameraY;

                ctx.fillStyle = info.color;
                ctx.fillRect(px, py, TILE, TILE);

                // Add pixel art details
                if (tile === T.WALL) {
                    ctx.fillStyle = '#7A5C10';
                    ctx.fillRect(px, py + TILE - 2, TILE, 1);
                    ctx.fillStyle = '#9B7820';
                    ctx.fillRect(px, py, TILE, 1);
                    // Wood grain
                    ctx.fillStyle = '#806018';
                    ctx.fillRect(px + 3, py + 3, 1, TILE - 6);
                    ctx.fillRect(px + 8, py + 5, 1, TILE - 8);
                    ctx.fillRect(px + 13, py + 2, 1, TILE - 4);
                } else if (tile === T.DOOR) {
                    ctx.fillStyle = '#8B5E3C';
                    ctx.fillRect(px + 2, py + 1, TILE - 4, TILE - 2);
                    ctx.fillStyle = '#FFD700';
                    ctx.fillRect(px + TILE - 5, py + TILE / 2, 2, 2); // handle
                } else if (tile === T.STAIRS_UP || tile === T.STAIRS_DOWN) {
                    ctx.fillStyle = '#B8860B';
                    for (let i = 0; i < 4; i++) {
                        ctx.fillRect(px + 1, py + i * 4, TILE - 2, 3);
                    }
                    ctx.fillStyle = '#FFF';
                    ctx.font = '6px monospace';
                    ctx.fillText(tile === T.STAIRS_UP ? '↑' : '↓', px + 5, py + 10);
                } else if (tile === T.WINDOW) {
                    ctx.fillStyle = '#5CACEE';
                    ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
                    ctx.fillStyle = '#ADD8E6';
                    ctx.fillRect(px + 3, py + 3, 4, 4);
                } else if (tile === T.FURNITURE) {
                    ctx.fillStyle = '#5A3A1A';
                    ctx.fillRect(px + 1, py + 1, TILE - 2, TILE - 2);
                    ctx.fillStyle = '#7B5B3A';
                    ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
                } else if (tile === T.TREE) {
                    ctx.fillStyle = '#4A2800';
                    ctx.fillRect(px + 6, py + 8, 4, 8);
                    ctx.fillStyle = '#0A5F0A';
                    ctx.fillRect(px + 2, py + 1, 12, 9);
                    ctx.fillStyle = '#0C7A0C';
                    ctx.fillRect(px + 4, py + 2, 8, 6);
                } else if (tile === T.LOCKED_HATCH) {
                    ctx.fillStyle = '#660000';
                    ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
                    ctx.fillStyle = '#FFD700';
                    ctx.fillRect(px + 6, py + 5, 4, 6);
                    ctx.fillRect(px + 5, py + 5, 6, 2); // lock
                } else if (tile === T.ATTIC_HATCH) {
                    ctx.fillStyle = '#DAA520';
                    ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
                    ctx.fillStyle = '#FFF';
                    ctx.font = '6px monospace';
                    ctx.fillText('↓', px + 5, py + 11);
                } else if (tile === T.GRASS) {
                    // Random grass blades
                    ctx.fillStyle = '#1E8B1E';
                    if ((x + y) % 3 === 0) ctx.fillRect(px + 3, py + 4, 1, 3);
                    if ((x + y) % 2 === 0) ctx.fillRect(px + 10, py + 2, 1, 4);
                    if ((x * y) % 5 === 0) ctx.fillRect(px + 7, py + 6, 1, 3);
                } else if (tile === T.TERRACE) {
                    ctx.fillStyle = '#917362';
                    for (let i = 0; i < TILE; i += 4) {
                        ctx.fillRect(px + i, py, 1, TILE);
                    }
                } else if (tile === T.KITCHEN_FLOOR) {
                    // Checkerboard pattern
                    if ((x + y) % 2 === 0) {
                        ctx.fillStyle = '#DDD0BC';
                        ctx.fillRect(px, py, TILE, TILE);
                    }
                } else if (tile === T.BATHROOM_FLOOR) {
                    // Tile pattern
                    ctx.fillStyle = '#96C8DC';
                    ctx.fillRect(px, py, TILE / 2, TILE / 2);
                    ctx.fillRect(px + TILE / 2, py + TILE / 2, TILE / 2, TILE / 2);
                }
            }
        }

        // Draw items
        for (const item of this.items) {
            if (item.floor !== floor || item.collected) continue;
            const px = item.x * TILE - cameraX;
            const py = item.y * TILE - cameraY;
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(px + 3, py + 3, 10, 10);
            ctx.fillStyle = '#FFA500';
            ctx.fillRect(px + 4, py + 4, 8, 8);
            ctx.fillStyle = '#FFF';
            ctx.font = '6px monospace';
            ctx.fillText('!', px + 6, py + 11);
        }
    }
}
