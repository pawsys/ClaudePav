// ============================================================
// SZCZURY Z KAMIEŃCA - Main Game Engine
// ============================================================

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.uiCanvas = document.getElementById('uiCanvas');
        this.uiCtx = this.uiCanvas.getContext('2d');
        this.menuCanvas = document.getElementById('menuOverlay');
        this.menuCtx = this.menuCanvas.getContext('2d');

        // Disable smoothing for pixel art
        for (const c of [this.ctx, this.uiCtx, this.menuCtx]) {
            c.imageSmoothingEnabled = false;
            c.mozImageSmoothingEnabled = false;
            c.webkitImageSmoothingEnabled = false;
        }

        this.map = null;
        this.characters = [];
        this.player = null;
        this.rats = [];
        this.pets = {};
        this.bossRat = null;
        this.interactions = null;
        this.ai = null;
        this.ui = null;
        this.menu = new MenuSystem();

        // Game state
        this.state = 'menu';  // menu, select, playing, gameover, victory
        this.currentFloor = FLOORS.GROUND;
        this.cameraX = 0;
        this.cameraY = 0;

        // Counters & flags
        this.ratsKilled = 0;
        this.totalRatsToKill = 15;
        this.killedTypes = new Set();
        this.hasKey = false;
        this.atticOpen = false;
        this.bossPhase = false;
        this.globalStress = 0;
        this.limitCrisis = false;
        this.limitCrisisTimer = 15;
        this.screenShake = 0;
        this.gameTime = 0;
        this.isRaining = false;
        this.rainTimer = 0;

        // Effects
        this.effects = [];
        this.projectiles = [];

        // Input
        this.keys = {};
        this.keysJustPressed = {};
        this.setupInput();

        // Timing
        this.lastTime = performance.now();
        this.gameLoop = this.gameLoop.bind(this);

        // Start
        requestAnimationFrame(this.gameLoop);
    }

    setupInput() {
        document.addEventListener('keydown', (e) => {
            if (!this.keys[e.code]) {
                this.keysJustPressed[e.code] = true;
            }
            this.keys[e.code] = true;
            e.preventDefault();
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        // Mouse for menu
        this.menuCanvas.addEventListener('click', (e) => {
            // Convert to canvas coords
            const rect = this.menuCanvas.getBoundingClientRect();
            const scaleX = 480 / rect.width;
            const scaleY = 320 / rect.height;
            const mx = (e.clientX - rect.left) * scaleX;
            const my = (e.clientY - rect.top) * scaleY;
            this.handleMenuClick(mx, my);
        });
    }

    handleMenuClick(mx, my) {
        if (this.state === 'select') {
            // Check character card clicks
            const cols = 3;
            const cellW = 140;
            const cellH = 120;
            const startX = 30;
            const startY = 40;
            const chars = this.menu.characterList;

            for (let i = 0; i < chars.length; i++) {
                const col = i % cols;
                const row = Math.floor(i / cols);
                const cx = startX + col * (cellW + 10);
                const cy = startY + row * (cellH + 10);

                if (mx >= cx && mx < cx + cellW && my >= cy && my < cy + cellH) {
                    this.menu.selectedCharacter = i;
                    this.startGame(chars[i]);
                    return;
                }
            }
        }
    }

    startGame(characterId) {
        this.state = 'playing';
        this.menuCanvas.style.display = 'none';

        // Initialize map
        this.map = new GameMap();

        // Create all characters
        this.characters = [];
        for (const [id, def] of Object.entries(CHARACTER_DEFS)) {
            const isPlayer = (id === characterId);
            const char = new Character(def, isPlayer);
            this.characters.push(char);
            if (isPlayer) {
                this.player = char;
                this.currentFloor = char.floor;
            }
        }

        // Create pets
        this.pets = {};
        for (const [id, def] of Object.entries(PET_DEFS)) {
            this.pets[id] = new Pet(def);
        }

        // Initialize systems
        this.interactions = new InteractionSystem(this);
        this.ai = new NPCAISystem(this);
        this.ui = new UISystem(this);

        // Spawn initial rats
        this.spawnInitialRats();

        // Reset state
        this.ratsKilled = 0;
        this.killedTypes = new Set();
        this.hasKey = false;
        this.atticOpen = false;
        this.bossPhase = false;
        this.globalStress = 0;
        this.gameTime = 0;
        this.isRaining = false;
        this.rainTimer = rand(60, 120);
        this.effects = [];
        this.projectiles = [];

        this.addMessage('Witaj w domu w Kamieńcu! Znajdź i pokonaj wszystkie szczury!');
        this.addMessage(`Grasz jako: ${this.player.name}`);
    }

    spawnInitialRats() {
        this.rats = [];
        const types = Object.keys(RAT_TYPES).filter(t => t !== 'tame');

        // One of each type
        for (const type of types) {
            const def = RAT_TYPES[type];

            // Choose spawn location
            let floor, x, y;
            if (def.spawnArea === 'terrace') {
                floor = FLOORS.EXTERIOR;
                x = 14; y = 16;
            } else {
                floor = choose([FLOORS.GROUND, FLOORS.UPPER]);
                // Find walkable spot
                for (let attempt = 0; attempt < 50; attempt++) {
                    x = rand(3, COLS - 4);
                    y = rand(3, ROWS - 4);
                    if (this.map.isWalkable(floor, x, y)) break;
                }
            }

            this.rats.push(new Rat(def, x, y, floor));
        }

        this.totalRatsToKill = types.length;
    }

    spawnRat(type, x, y, floor) {
        const def = RAT_TYPES[type];
        if (!def) return;
        this.rats.push(new Rat(def, x, y, floor));
    }

    addMessage(text) {
        if (this.ui) this.ui.addMessage(text);
    }

    addEffect(x, y, type) {
        this.effects.push({ x, y, type, progress: 0, duration: 0.5 });
    }

    addProjectile(fromX, fromY, toX, toY, color) {
        this.projectiles.push({
            x: fromX, y: fromY,
            toX, toY,
            color,
            progress: 0,
            duration: 0.3,
        });
    }

    gameLoop(now) {
        const dt = Math.min((now - this.lastTime) / 1000, 0.05);
        this.lastTime = now;

        this.update(dt);
        this.render();

        // Clear just-pressed keys
        this.keysJustPressed = {};

        requestAnimationFrame(this.gameLoop);
    }

    update(dt) {
        this.menu.update(dt);

        if (this.state === 'menu') {
            if (this.keysJustPressed['Enter'] || this.keysJustPressed['Space']) {
                this.state = 'select';
                this.menuCanvas.style.pointerEvents = 'auto';
            }
            return;
        }

        if (this.state === 'select') {
            this.handleSelectInput();
            return;
        }

        if (this.state === 'gameover' || this.state === 'victory') {
            if (this.keysJustPressed['Enter']) {
                this.state = 'menu';
                this.menuCanvas.style.display = 'block';
                this.menuCanvas.style.pointerEvents = 'auto';
            }
            return;
        }

        if (this.state !== 'playing') return;

        this.gameTime += dt;

        // Player input
        this.handlePlayerInput(dt);

        // Update characters
        for (const char of this.characters) {
            char.update(dt, this);
        }

        // Update AI
        this.ai.update(dt);

        // Update rats
        for (const rat of this.rats) {
            rat.update(dt, this);
        }
        // Remove fully dead rats
        this.rats = this.rats.filter(r => r.alive || r.deathTimer > 0);

        // Update pets
        for (const pet of Object.values(this.pets)) {
            pet.update(dt, this);
        }

        // Update boss
        if (this.bossRat) {
            this.bossRat.update(dt, this);
            if (this.bossRat.defeated) {
                this.onBossDefeated();
            }
        }

        // Update systems
        this.interactions.update(dt);
        this.ui.update(dt);

        // Update effects
        this.effects = this.effects.filter(e => {
            e.progress += dt / e.duration;
            return e.progress < 1;
        });

        // Update projectiles
        this.projectiles = this.projectiles.filter(p => {
            p.progress += dt / p.duration;
            p.x = lerp(p.x, p.toX, p.progress);
            p.y = lerp(p.y, p.toY, p.progress);
            return p.progress < 1;
        });

        // Screen shake decay
        if (this.screenShake > 0) {
            this.screenShake -= dt * 2;
            if (this.screenShake < 0) this.screenShake = 0;
        }

        // Stress management
        this.updateStress(dt);

        // Weather
        this.updateWeather(dt);

        // Limit crisis
        if (this.limitCrisis) {
            this.limitCrisisTimer -= dt;
            if (this.limitCrisisTimer <= 0) {
                this.gameOver('Ignacy nie dostał limitu! GAME OVER!');
            }
        }

        // Camera follow player
        this.updateCamera(dt);

        // Game over check
        if (this.player.hp <= 0) {
            this.gameOver('Twoje HP spadło do zera!');
        }
        if (this.globalStress >= 100) {
            this.gameOver('Stres w domu osiągnął maksimum!');
        }
    }

    handleSelectInput() {
        const chars = this.menu.characterList;

        if (this.keysJustPressed['ArrowRight'] || this.keysJustPressed['KeyD']) {
            this.menu.selectedCharacter = (this.menu.selectedCharacter + 1) % chars.length;
        }
        if (this.keysJustPressed['ArrowLeft'] || this.keysJustPressed['KeyA']) {
            this.menu.selectedCharacter = (this.menu.selectedCharacter - 1 + chars.length) % chars.length;
        }
        if (this.keysJustPressed['ArrowDown'] || this.keysJustPressed['KeyS']) {
            this.menu.selectedCharacter = Math.min(chars.length - 1, this.menu.selectedCharacter + 3);
        }
        if (this.keysJustPressed['ArrowUp'] || this.keysJustPressed['KeyW']) {
            this.menu.selectedCharacter = Math.max(0, this.menu.selectedCharacter - 3);
        }

        // Number keys
        for (let i = 1; i <= 6; i++) {
            if (this.keysJustPressed[`Digit${i}`] && i <= chars.length) {
                this.menu.selectedCharacter = i - 1;
            }
        }

        if (this.keysJustPressed['Enter']) {
            this.startGame(chars[this.menu.selectedCharacter]);
        }
    }

    handlePlayerInput(dt) {
        const player = this.player;
        if (!player || player.immobilizedTimer > 0) return;
        if (player.state === 'gaming' || player.state === 'working' || player.state === 'duolingo') {
            // Press E to stop activity
            if (this.keysJustPressed['KeyE']) {
                player.state = 'idle';
                this.addMessage(`${player.name} przestaje ${player.state === 'gaming' ? 'grać' : 'pracować'}.`);
            }
            return;
        }

        // Movement
        let dx = 0, dy = 0;
        if (this.keys['ArrowUp'] || this.keys['KeyW']) { dy = -1; player.dir = 'up'; }
        if (this.keys['ArrowDown'] || this.keys['KeyS']) { dy = 1; player.dir = 'down'; }
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) { dx = -1; player.dir = 'left'; }
        if (this.keys['ArrowRight'] || this.keys['KeyD']) { dx = 1; player.dir = 'right'; }

        if (dx !== 0 || dy !== 0) {
            const spd = player.getCurrentSpeed() * TILE * dt;
            const newX = player.px + dx * spd;
            const newY = player.py + dy * spd;
            const newTileX = Math.round(newX / TILE);
            const newTileY = Math.round(newY / TILE);

            if (this.map.isWalkable(player.floor, newTileX, player.tileY)) {
                player.px = newX;
            }
            if (this.map.isWalkable(player.tileX, player.floor, newTileY)) {
                // Fix: check with correct floor
            }
            if (this.map.isWalkable(player.floor, player.tileX, newTileY)) {
                player.py = newY;
            }

            player.x = player.tileX;
            player.y = player.tileY;
            player.moving = true;
        } else {
            player.moving = false;
        }

        // Pick up item (Q)
        if (this.keysJustPressed['KeyQ']) {
            this.tryPickupItem(player);
        }

        // Use item / interact (E)
        if (this.keysJustPressed['KeyE']) {
            this.tryInteract(player);
        }

        // Attack / use held item on rat (Space)
        if (this.keysJustPressed['Space']) {
            this.tryAttackRat(player);
        }

        // Inventory selection (1-3)
        if (this.keysJustPressed['Digit1']) this.ui.selectedAction = 0;
        if (this.keysJustPressed['Digit2']) this.ui.selectedAction = 1;
        if (this.keysJustPressed['Digit3']) this.ui.selectedAction = 2;

        // Change floor (Tab)
        if (this.keysJustPressed['Tab']) {
            this.tryChangeFloor(player);
        }

        // Special ability (R)
        if (this.keysJustPressed['KeyR']) {
            this.useSpecialAbility(player);
        }

        // Help (H)
        if (this.keysJustPressed['KeyH']) {
            this.ui.showHelp = !this.ui.showHelp;
        }
    }

    tryPickupItem(player) {
        const item = this.map.getItemAt(player.floor, player.tileX, player.tileY);
        if (!item && player.tileX > 0) {
            // Check adjacent tiles too
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const adjItem = this.map.getItemAt(player.floor, player.tileX + dx, player.tileY + dy);
                    if (adjItem && !adjItem.collected) {
                        if (player.addToInventory(adjItem)) {
                            adjItem.collected = true;
                            this.addMessage(`Podniesiono: ${adjItem.name}`);
                            return;
                        } else {
                            this.addMessage('Ekwipunek pełny!');
                            return;
                        }
                    }
                }
            }
            return;
        }

        if (item && !item.collected) {
            if (player.addToInventory(item)) {
                item.collected = true;
                this.addMessage(`Podniesiono: ${item.name}`);
            } else {
                this.addMessage('Ekwipunek pełny!');
            }
        }
    }

    tryInteract(player) {
        // Check for NPCs nearby
        for (const char of this.characters) {
            if (char === player) continue;
            if (char.floor !== player.floor) continue;
            if (dist({ x: char.px, y: char.py }, { x: player.px, y: player.py }) > TILE * 2) continue;

            // Interact with Witek to open attic
            if (char.id === 'witek' && this.hasKey && !this.atticOpen) {
                if (char.state !== 'gaming') {
                    this.addMessage('Witek i Ty otwieracie strych razem!');
                    this.openAttic();
                    return;
                } else {
                    this.addMessage('Witek gra - nie może pomóc teraz!');
                    return;
                }
            }

            // Add limit to Ignacy
            if (char.id === 'ignacy' && char.limitWarning && player.canAddLimit) {
                this.ai.addLimit(char);
                return;
            }

            // Interact with other NPCs
            char.showAlert('Cześć!', 1);
            return;
        }

        // Check for station interactions (bring rat to station)
        // Find carried rat or nearest rat
        const nearRat = this.findNearestAliveRat(player);
        if (nearRat) {
            // Try station-based kills
            for (const [method, station] of Object.entries(STATION_KILLS)) {
                if (nearRat.killMethod === method) {
                    this.interactions.tryKillRat(player, method);
                    return;
                }
            }
        }

        // Check special tiles
        const tile = this.map.getTile(player.floor, player.tileX, player.tileY);
        if (tile === T.LOCKED_HATCH && this.hasKey) {
            this.addMessage('Potrzebujesz Witka żeby otworzyć strych!');
        }
    }

    tryAttackRat(player) {
        // Find nearest rat
        const nearRat = this.findNearestAliveRat(player);
        if (!nearRat) {
            player.showAlert('Brak szczurów w pobliżu!', 1);
            return;
        }

        const ratDist = dist({ x: player.px, y: player.py }, { x: nearRat.px, y: nearRat.py });

        // Check if we should warn about Ignacy
        this.checkIgnacyProximity(player, nearRat);

        // Lena's special: Nintendo throw kills any type
        if (player.id === 'lena' && player.hasItem('nintendo')) {
            this.interactions.tryKillRat(player, 'nintendo_throw');
            return;
        }

        // Try with held item
        const selectedSlot = this.ui?.selectedAction;
        if (selectedSlot !== null && selectedSlot !== undefined && player.inventory[selectedSlot]) {
            const item = player.inventory[selectedSlot];
            const method = item.type;
            if (this.interactions.tryKillRat(player, method)) return;
        }

        // Try matching method for this rat
        const method = nearRat.killMethod;

        // Item-based methods
        const methodInfo = KILL_METHOD_ITEMS[method];
        if (methodInfo) {
            if (methodInfo.item && !player.hasItem(methodInfo.item)) {
                player.showAlert(`${nearRat.name}: ${nearRat.killDesc}`, 2);
                return;
            }
            this.interactions.tryKillRat(player, method);
        }

        // Boss attack
        if (this.bossRat && this.bossRat.alive && player.floor === FLOORS.ATTIC) {
            if (dist({ x: player.px, y: player.py },
                { x: this.bossRat.px, y: this.bossRat.py }) < TILE * 3) {
                // Any attack damages boss
                let damage = 20;
                if (player.inventory.length > 0) damage = 30;
                this.bossRat.takeDamage(damage);
                this.addEffect(this.bossRat.px, this.bossRat.py, 'hit');
                this.screenShake = 0.3;
            }
        }
    }

    checkIgnacyProximity(player, rat) {
        const ignacy = this.characters.find(c => c.id === 'ignacy');
        if (!ignacy || ignacy === player) return;
        if (ignacy.floor !== player.floor) return;

        if (ignacy.state === 'gaming' &&
            dist({ x: ignacy.px, y: ignacy.py }, { x: rat.px, y: rat.py }) < TILE * 2) {
            player.showAlert('Uwaga na Ignacego!', 1.5);
        }
    }

    findNearestAliveRat(player) {
        let nearest = null;
        let minD = Infinity;
        for (const rat of this.rats) {
            if (!rat.alive || rat.floor !== player.floor) continue;
            const d = dist({ x: player.px, y: player.py }, { x: rat.px, y: rat.py });
            if (d < minD) {
                minD = d;
                nearest = rat;
            }
        }
        return nearest;
    }

    tryChangeFloor(player) {
        const tile = this.map.getTile(player.floor, player.tileX, player.tileY);

        if (tile === T.STAIRS_UP) {
            if (player.floor === FLOORS.GROUND) {
                player.floor = FLOORS.UPPER;
                this.currentFloor = FLOORS.UPPER;
                player.px = 15 * TILE;
                player.py = 8 * TILE;
                this.addMessage('Wchodzisz na piętro.');
            }
        } else if (tile === T.STAIRS_DOWN) {
            if (player.floor === FLOORS.UPPER) {
                player.floor = FLOORS.GROUND;
                this.currentFloor = FLOORS.GROUND;
                player.px = 15 * TILE;
                player.py = 5 * TILE;
                this.addMessage('Schodzisz na parter.');
            }
        } else if (tile === T.DOOR) {
            // Check if at front/back door for exterior access
            if (player.floor === FLOORS.GROUND &&
                (player.tileY <= 2 || player.tileY >= 16)) {
                player.floor = FLOORS.EXTERIOR;
                this.currentFloor = FLOORS.EXTERIOR;
                player.px = 14 * TILE;
                player.py = 8 * TILE;
                this.addMessage('Wychodzisz na podwórko.');
            } else if (player.floor === FLOORS.EXTERIOR) {
                player.floor = FLOORS.GROUND;
                this.currentFloor = FLOORS.GROUND;
                player.px = 14 * TILE;
                player.py = 3 * TILE;
                this.addMessage('Wchodzisz do domu.');
            }
        } else if (tile === T.ATTIC_HATCH || tile === T.LOCKED_HATCH) {
            if (this.atticOpen) {
                if (player.floor === FLOORS.UPPER) {
                    player.floor = FLOORS.ATTIC;
                    this.currentFloor = FLOORS.ATTIC;
                    player.px = 14 * TILE;
                    player.py = 13 * TILE;
                    this.addMessage('Wchodzisz na poddasze!');
                } else if (player.floor === FLOORS.ATTIC) {
                    player.floor = FLOORS.UPPER;
                    this.currentFloor = FLOORS.UPPER;
                    player.px = 14 * TILE;
                    player.py = 9 * TILE;
                    this.addMessage('Schodzisz z poddasza.');
                }
            } else {
                this.addMessage('Właz jest zamknięty! Potrzebujesz klucza i Witka!');
            }
        }
    }

    useSpecialAbility(player) {
        if (player.interactionCooldown > 0) {
            player.showAlert('Cooldown!', 0.5);
            return;
        }

        switch (player.specialAbility) {
            case 'soy_attack': {
                // Ignacy/Lena soy sauce attack
                if (!player.hasItem('soy_sauce')) {
                    // Check if cola is nearby for crafting
                    const cola = player.hasItem('cola');
                    if (cola) {
                        player.showAlert('Sos sojowy + cola!', 1.5);
                    } else {
                        player.showAlert('Potrzebujesz sosu sojowego!', 1);
                    }
                    return;
                }
                // Splash damage to all nearby characters
                for (const char of this.characters) {
                    if (char === player) continue;
                    if (char.isChild) continue;
                    if (char.floor !== player.floor) continue;
                    if (dist({ x: char.px, y: char.py }, { x: player.px, y: player.py }) < TILE * 3) {
                        char.hp -= 10;
                        char.slowTimer = 5;
                        char.showAlert('Sos sojowy!', 2);
                        this.addEffect(char.px, char.py, 'hit');
                    }
                }
                player.interactionCooldown = 10;
                this.addMessage(`${player.name} używa ataku sosem sojowym!`);
                break;
            }
            case 'nintendo_throw': {
                // Lena throws Nintendo at nearest rat
                const nearRat = this.findNearestAliveRat(player);
                if (nearRat) {
                    this.interactions.tryKillRat(player, 'nintendo_throw');
                    player.interactionCooldown = 3;
                }
                break;
            }
            case 'angry_face': {
                // Babcia Gosia's angry face
                const pawel = this.characters.find(c => c.id === 'pawel');
                if (pawel && pawel.floor === player.floor &&
                    dist({ x: pawel.px, y: pawel.py }, { x: player.px, y: player.py }) < TILE * 4) {
                    pawel.slowTimer = 10;
                    pawel.showAlert('Mama patrzy...', 2);
                    // Free children
                    for (const char of this.characters) {
                        if (char.isChild && char.immobilizedTimer > 0) {
                            char.immobilizedTimer = 0;
                            char.state = 'idle';
                            char.showAlert('Wolność!', 1.5);
                        }
                    }
                    this.addMessage('Babcia Gosia patrzy groźnie na Pawła!');
                    player.interactionCooldown = 15;
                }
                break;
            }
            case 'cola_spray': {
                // Witek's cola + mentos spray
                const nearRats = this.rats.filter(r =>
                    r.alive && r.floor === player.floor &&
                    dist({ x: r.px, y: r.py }, { x: player.px, y: player.py }) < TILE * 4
                );
                for (const rat of nearRats) {
                    rat.fleeing = true;
                    rat.speed *= 0.3;
                    this.addEffect(rat.px, rat.py, 'smoke');
                }
                if (nearRats.length > 0) {
                    this.addMessage('Witek psika Colą + Mentos!');
                    this.screenShake = 0.3;
                }
                player.interactionCooldown = 8;
                break;
            }
            case 'add_limit': {
                // Blanka adds limit
                const ignacy = this.characters.find(c => c.id === 'ignacy');
                if (ignacy && ignacy.limitWarning) {
                    this.ai.addLimit(ignacy);
                    player.interactionCooldown = 5;
                } else {
                    player.showAlert('Ignacy nie potrzebuje limitu.', 1);
                }
                break;
            }
            case 'jiu_jitsu': {
                // Paweł's jiu-jitsu
                const nearKids = this.characters.filter(c =>
                    c.isChild && c.floor === player.floor &&
                    dist({ x: c.px, y: c.py }, { x: player.px, y: player.py }) < TILE * 2
                );
                if (nearKids.length > 0) {
                    const target = nearKids[0];
                    target.immobilizedTimer = 10;
                    target.state = 'immobilized';
                    target.showAlert('Dźwignia!', 2);
                    this.addMessage(`Paweł łapie ${target.name} w dźwignię!`);
                    player.interactionCooldown = 15;

                    // Alert best friend
                    const friend = this.characters.find(c => c.id === target.bestFriend);
                    if (friend && friend.state !== 'gaming') {
                        friend.showAlert(`${target.name} potrzebuje pomocy!`, 3);
                    }
                }
                break;
            }
        }
    }

    openAttic() {
        this.atticOpen = true;
        this.map.setTile(FLOORS.UPPER, 14, 9, T.ATTIC_HATCH);
        this.addMessage('Strych otwarty! Zielony dym wylatuje!');
        this.screenShake = 1.0;
        this.globalStress += 10;

        // Spawn boss
        this.bossRat = new BossRat(14, 8);
        this.bossPhase = true;

        // Smoke effect
        for (let i = 0; i < 10; i++) {
            this.addEffect(14 * TILE + rand(-20, 20), 9 * TILE + rand(-20, 0), 'smoke');
        }
    }

    onBossDefeated() {
        this.addMessage('KRÓL SZCZURÓW POKONANY!');
        this.addMessage('Zamienia się w zwykłego szczura...');
        this.screenShake = 1.5;

        // Spawn tame rat
        const tameRat = new Rat(RAT_TYPES.tame, this.bossRat.tileX, this.bossRat.tileY, FLOORS.ATTIC);
        this.rats.push(tameRat);
        this.bossRat = null;

        this.addMessage('Oswój ostatniego szczura klatką!');
    }

    updateStress(dt) {
        // Stress decreases slowly over time
        this.globalStress = Math.max(0, this.globalStress - dt * 0.3);

        // Stress from gaming characters
        for (const char of this.characters) {
            if (char.state === 'gaming') {
                if (char.id === 'witek') {
                    this.globalStress += dt * 1.5;
                }
            }
            if (char.state === 'screaming') {
                this.globalStress += dt * 3;
            }
            if (char.state === 'raging') {
                this.globalStress += dt * 1;
            }
        }

        // Rats in kitchen increase stress
        const kitchenRats = this.rats.filter(r =>
            r.alive && r.floor === FLOORS.GROUND &&
            (this.map.getRoomAt(FLOORS.GROUND, r.tileX, r.tileY) === 'kitchen1' ||
                this.map.getRoomAt(FLOORS.GROUND, r.tileX, r.tileY) === 'kitchen2')
        );
        this.globalStress += kitchenRats.length * dt * 2;

        this.globalStress = clamp(this.globalStress, 0, 100);
    }

    updateWeather(dt) {
        this.rainTimer -= dt;
        if (this.rainTimer <= 0) {
            this.isRaining = !this.isRaining;
            this.rainTimer = this.isRaining ? rand(20, 40) : rand(60, 120);
            if (this.isRaining) {
                this.addMessage('Zaczyna padać deszcz! Dzieci nie mogą wyjść na dwór!');
            } else {
                this.addMessage('Przestało padać.');
            }
        }

        // Rain blocks children from going outside
        if (this.isRaining && this.player.isChild && this.currentFloor === FLOORS.EXTERIOR) {
            this.player.showAlert('Pada! Trzeba wrócić!', 1);
            // Nudity effect - slow down
            this.player.slowTimer = Math.max(this.player.slowTimer, 1);
        }
    }

    updateCamera(dt) {
        if (!this.player) return;

        const targetX = this.player.px - CANVAS_W / 2 + TILE / 2;
        const targetY = this.player.py - CANVAS_H / 2 + TILE / 2;

        this.cameraX = lerp(this.cameraX, targetX, dt * 5);
        this.cameraY = lerp(this.cameraY, targetY, dt * 5);

        // Clamp camera
        this.cameraX = clamp(this.cameraX, 0, COLS * TILE - CANVAS_W);
        this.cameraY = clamp(this.cameraY, 0, ROWS * TILE - CANVAS_H);
    }

    gameOver(reason) {
        this.state = 'gameover';
        this.menuCanvas.style.display = 'block';
        this.menuCanvas.style.pointerEvents = 'auto';
        this.menu.game = this;
        this.addMessage(reason);
    }

    victory() {
        this.state = 'victory';
        this.menuCanvas.style.display = 'block';
        this.menuCanvas.style.pointerEvents = 'auto';
        this.menu.game = this;
    }

    render() {
        // Clear
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        this.uiCtx.clearRect(0, 0, CANVAS_W, CANVAS_H);

        if (this.state === 'menu') {
            this.menu.drawTitle(this.menuCtx);
            return;
        }

        if (this.state === 'select') {
            this.menu.drawCharacterSelect(this.menuCtx);
            return;
        }

        if (this.state === 'gameover') {
            this.menu.drawGameOver(this.menuCtx);
            return;
        }

        if (this.state === 'victory') {
            this.menu.drawVictory(this.menuCtx);
            return;
        }

        // Apply screen shake
        let shakeX = 0, shakeY = 0;
        if (this.screenShake > 0) {
            shakeX = (Math.random() - 0.5) * this.screenShake * 8;
            shakeY = (Math.random() - 0.5) * this.screenShake * 8;
        }

        const camX = this.cameraX + shakeX;
        const camY = this.cameraY + shakeY;

        // Draw map
        this.map.draw(this.ctx, this.currentFloor, camX, camY);

        // Draw pets (on current floor)
        for (const pet of Object.values(this.pets)) {
            if (pet.floor === this.currentFloor) {
                pet.draw(this.ctx, camX, camY);
            }
        }

        // Draw rats
        for (const rat of this.rats) {
            if (rat.floor === this.currentFloor) {
                rat.draw(this.ctx, camX, camY);
            }
        }

        // Draw boss
        if (this.bossRat && this.bossRat.alive && this.currentFloor === FLOORS.ATTIC) {
            this.bossRat.draw(this.ctx, camX, camY);
        }

        // Draw characters (sorted by Y for depth)
        const visibleChars = this.characters.filter(c => c.floor === this.currentFloor);
        visibleChars.sort((a, b) => a.py - b.py);
        for (const char of visibleChars) {
            char.draw(this.ctx, camX, camY);
        }

        // Draw effects
        for (const effect of this.effects) {
            PixelSprite.drawEffect(this.ctx, effect.x - camX, effect.y - camY, effect.type, effect.progress);
        }

        // Draw projectiles
        for (const proj of this.projectiles) {
            this.ctx.fillStyle = proj.color;
            this.ctx.fillRect(proj.x - camX, proj.y - camY, 3, 3);
        }

        // Draw green smoke if attic is open and on upper floor
        if (this.atticOpen && this.currentFloor === FLOORS.UPPER) {
            const hatchX = 14 * TILE - camX;
            const hatchY = 9 * TILE - camY;
            for (let i = 0; i < 5; i++) {
                const sx = hatchX + Math.sin(Date.now() / 300 + i * 2) * 10;
                const sy = hatchY - 5 - Math.abs(Math.sin(Date.now() / 500 + i)) * 15;
                this.ctx.fillStyle = `rgba(0, 200, 0, ${0.3 - i * 0.05})`;
                this.ctx.fillRect(sx, sy, 4, 4);
            }
        }

        // Stress vignette
        if (this.globalStress > 50) {
            const intensity = (this.globalStress - 50) / 50;
            this.ctx.fillStyle = `rgba(255, 0, 0, ${intensity * 0.15})`;
            this.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        }

        // Draw UI
        this.ui.draw(this.uiCtx);

        // Clear menu canvas during gameplay
        if (this.state === 'playing') {
            this.menuCtx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        }

        // Check for tame rat victory condition
        for (const rat of this.rats) {
            if (rat.isFinal && rat.tamed) {
                this.victory();
            }
        }
    }
}

// ============================================================
// START THE GAME
// ============================================================
window.addEventListener('load', () => {
    window.game = new Game();
});
