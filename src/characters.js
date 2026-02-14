// ============================================================
// SZCZURY Z KAMIEŃCA - Character Definitions & Logic
// ============================================================

const CHARACTER_DEFS = {
    ignacy: {
        id: 'ignacy',
        name: 'Ignacy',
        age: 11,
        desc: 'Wysoki, szczupły blondyn. Gamer - Minecraft i Zelda.',
        sprite: {
            skinColor: '#FFDAB9',
            hairColor: '#F0E68C',
            longHair: true,
            bodyColor: '#4169E1',
            clothesColor: '#4682B4',
            eyeColor: '#000',
        },
        startFloor: FLOORS.UPPER,
        startX: 5,
        startY: 4,
        speed: 1.2,
        canAddLimit: false,
        specialAbility: 'soy_attack',
        abilityDesc: 'Atak sosem sojowym (-10% HP, spowolnienie)',
        isChild: true,
        bestFriend: 'lena',
        gameAddiction: true,
        gameLimitTimer: 120,  // seconds before limit warning
        shakeIntensity: 3,
    },
    lena: {
        id: 'lena',
        name: 'Lena',
        age: 11,
        desc: 'Dziewczyna z dwoma warkoczami, w okularach i masce kota. Nintendo mistrzyni!',
        sprite: {
            skinColor: '#FFDAB9',
            hairColor: '#8B4513',
            braids: true,
            bodyColor: '#FF69B4',
            clothesColor: '#FF1493',
            eyeColor: '#000',
            glasses: true,
            catMask: true,
            catMaskColor: '#FFB6C1',
        },
        startFloor: FLOORS.UPPER,
        startX: 22,
        startY: 4,
        speed: 1.1,
        canAddLimit: false,
        specialAbility: 'nintendo_throw',
        abilityDesc: 'Rzut Nintendo - zabija KAŻDY typ szczura!',
        isChild: true,
        bestFriend: 'ignacy',
        nintendoAttack: true,
        screamTimer: 30,  // 30s before game over if rat near her
        screamDecibels: 150,
    },
    babcia_gosia: {
        id: 'babcia_gosia',
        name: 'Babcia Gosia',
        age: 68,
        desc: 'Kolorowa, energiczna babcia w okularach. Groźna mina paraliżuje!',
        sprite: {
            skinColor: '#FFDBB4',
            hairColor: '#8B6914',
            bodyColor: '#FF6347',
            clothesColor: '#FFD700',
            eyeColor: '#000',
            glasses: true,
        },
        startFloor: FLOORS.UPPER,
        startX: 6,
        startY: 15,
        speed: 0.8,
        canAddLimit: true,
        specialAbility: 'angry_face',
        abilityDesc: 'Groźna mina - spowalnia Pawła, uwalnia dzieci',
        isChild: false,
        klapekRage: true,  // When rat enters kitchen, rage mode
        duolingoAddiction: true,
        duolingoDeafChance: 0.0, // She always hears (unlike Blanka)
    },
    witek: {
        id: 'witek',
        name: 'Witek Sysiak',
        age: 42,
        desc: 'Brodacz na jeżyka. Badmintonista. Mester coli i psikacza.',
        sprite: {
            skinColor: '#FFDAB9',
            hairColor: '#3A2A1A',
            bodyColor: '#2F4F4F',
            clothesColor: '#696969',
            eyeColor: '#000',
            beard: true,
            beardColor: '#3A2A1A',
        },
        startFloor: FLOORS.UPPER,
        startX: 5,
        startY: 11,
        speed: 1.0,
        canAddLimit: true,
        specialAbility: 'cola_spray',
        abilityDesc: 'Cola + Mentos psikacz - szczury uciekają!',
        isChild: false,
        canOpenAttic: true,
        gameAddiction: true,
        xboxGamer: true,
        gameLimitTimer: 0,  // No limit, but screams
        shakeIntensity: 4,
        deafWhileGamingChance: 0.5,
    },
    blanka: {
        id: 'blanka',
        name: 'Blanka',
        age: 41,
        desc: 'Blondynka z północy Polski. Miła, ale uzależniona od Duolingo.',
        sprite: {
            skinColor: '#FFE4C4',
            hairColor: '#F0E68C',
            longHair: true,
            bodyColor: '#87CEEB',
            clothesColor: '#B0E0E6',
            eyeColor: '#4682B4',
        },
        startFloor: FLOORS.GROUND,
        startX: 14,
        startY: 4,
        speed: 0.9,
        canAddLimit: true,
        specialAbility: 'add_limit',
        abilityDesc: 'Dodaje limit Ignacemu - resetuje stres',
        isChild: false,
        duolingoAddiction: true,
        duolingoDeafChance: 0.25,  // 25% chance of not hearing Ignacy
    },
    pawel: {
        id: 'pawel',
        name: 'Paweł',
        age: 41,
        desc: 'Brodacz z półdługimi włosami. Pracowity. Brat Witka. Jiu-jitsu!',
        sprite: {
            skinColor: '#FFDAB9',
            hairColor: '#C8A882',
            longHair: true,
            bodyColor: '#556B2F',
            clothesColor: '#6B8E23',
            eyeColor: '#000',
            beard: true,
            beardColor: '#C8A882',
        },
        startFloor: FLOORS.GROUND,
        startX: 13,
        startY: 15,
        speed: 1.0,
        canAddLimit: false,
        specialAbility: 'jiu_jitsu',
        abilityDesc: 'Dźwignia Ju-Jitsu - unieruchamia cel na 10s',
        isChild: false,
        workMode: true,
        hugAttack: true,  // Przytulanie na kanapie
    },
};

const PET_DEFS = {
    dog1: {
        id: 'dog1',
        name: 'Pies 1',
        type: 'dog1',
        floor: FLOORS.GROUND,
        x: 10, y: 11,
        speed: 1.5,
        chasesRats: true,
    },
    dog2: {
        id: 'dog2',
        name: 'Kundel',
        type: 'dog2',
        desc: 'Czarno-biały kundel',
        floor: FLOORS.GROUND,
        x: 12, y: 11,
        speed: 1.3,
        chasesRats: true,
    },
    tula: {
        id: 'tula',
        name: 'Tula',
        type: 'cat',
        desc: 'Trzykolorowy kot z zielono-żółtymi oczami',
        floor: FLOORS.GROUND,
        x: 8, y: 4,
        speed: 1.8,
        attacksRats: true,
    },
};

class Character {
    constructor(def, isPlayer) {
        Object.assign(this, def);
        this.isPlayer = isPlayer;
        this.floor = def.startFloor;
        this.x = def.startX;
        this.y = def.startY;
        this.px = def.startX * TILE;
        this.py = def.startY * TILE;
        this.dir = 'down';
        this.frame = 0;
        this.moving = false;
        this.hp = 100;
        this.stress = 0;
        this.inventory = [];
        this.maxInventory = 3;
        this.state = 'idle';  // idle, gaming, working, duolingo, raging, immobilized, screaming
        this.stateTimer = 0;
        this.immobilizedTimer = 0;
        this.slowTimer = 0;
        this.alertMessage = null;
        this.alertTimer = 0;
        this.gamingTimer = 0;
        this.limitTimer = def.gameLimitTimer || 0;
        this.limitWarning = false;
        this.heldItem = null;
        this.ratKills = 0;
        this.hasKey = false;
        this.targetPath = null;
        this.pathIndex = 0;
        this.interactionCooldown = 0;
    }

    get tileX() { return Math.round(this.px / TILE); }
    get tileY() { return Math.round(this.py / TILE); }

    addToInventory(item) {
        if (this.inventory.length < this.maxInventory) {
            this.inventory.push(item);
            return true;
        }
        return false;
    }

    removeFromInventory(type) {
        const idx = this.inventory.findIndex(i => i.type === type);
        if (idx >= 0) {
            return this.inventory.splice(idx, 1)[0];
        }
        return null;
    }

    hasItem(type) {
        return this.inventory.some(i => i.type === type);
    }

    showAlert(msg, duration) {
        this.alertMessage = msg;
        this.alertTimer = duration || 2;
    }

    update(dt, game) {
        // Animation
        if (this.moving) {
            this.frame += dt * 6;
        }

        // Timers
        if (this.alertTimer > 0) this.alertTimer -= dt;
        if (this.interactionCooldown > 0) this.interactionCooldown -= dt;
        if (this.immobilizedTimer > 0) {
            this.immobilizedTimer -= dt;
            if (this.immobilizedTimer <= 0) {
                this.state = 'idle';
            }
        }
        if (this.slowTimer > 0) this.slowTimer -= dt;

        // State-specific updates for NPC
        if (!this.isPlayer) {
            this.updateNPC(dt, game);
        }
    }

    updateNPC(dt, game) {
        // Handled by AI system
    }

    getCurrentSpeed() {
        let spd = this.speed;
        if (this.slowTimer > 0) spd *= 0.5;
        if (this.immobilizedTimer > 0) spd = 0;
        if (this.state === 'gaming' || this.state === 'working' || this.state === 'duolingo') spd = 0;
        return spd;
    }

    draw(ctx, cameraX, cameraY) {
        const dx = this.px - cameraX;
        const dy = this.py - cameraY;

        // State effects
        const spriteConfig = { ...this.sprite };
        if (this.state === 'raging') spriteConfig.stressed = true;
        if (this.heldItem) spriteConfig.heldItem = true;

        // Gaming aura
        if (this.state === 'gaming') {
            ctx.fillStyle = 'rgba(0, 100, 255, 0.3)';
            ctx.fillRect(dx - 2, dy - 2, TILE + 4, TILE + 4);
        }

        // Immobilized effect
        if (this.immobilizedTimer > 0) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
            ctx.fillRect(dx - 1, dy - 1, TILE + 2, TILE + 2);
        }

        PixelSprite.drawCharacter(ctx, dx, dy, spriteConfig, this.frame, this.dir, 1);

        // Name tag
        ctx.fillStyle = this.isPlayer ? '#00FF00' : '#FFF';
        ctx.font = '5px monospace';
        const name = this.name.substring(0, 8);
        ctx.fillText(name, dx - 2, dy - 3);

        // HP bar
        if (this.hp < 100) {
            ctx.fillStyle = '#333';
            ctx.fillRect(dx, dy - 6, TILE, 2);
            ctx.fillStyle = this.hp > 50 ? '#0F0' : this.hp > 25 ? '#FF0' : '#F00';
            ctx.fillRect(dx, dy - 6, TILE * (this.hp / 100), 2);
        }

        // Alert bubble
        if (this.alertTimer > 0 && this.alertMessage) {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            const tw = this.alertMessage.length * 4 + 4;
            ctx.fillRect(dx - tw / 2 + TILE / 2, dy - 16, tw, 8);
            ctx.fillStyle = '#FFF';
            ctx.font = '5px monospace';
            ctx.fillText(this.alertMessage, dx - tw / 2 + TILE / 2 + 2, dy - 10);
        }

        // State indicator
        if (this.state === 'gaming') {
            ctx.fillStyle = '#00BFFF';
            ctx.font = '6px monospace';
            ctx.fillText('🎮', dx + 1, dy - 2);
        } else if (this.state === 'duolingo') {
            ctx.fillStyle = '#7AC143';
            ctx.font = '6px monospace';
            ctx.fillText('D', dx + 5, dy - 2);
        } else if (this.state === 'working') {
            ctx.fillStyle = '#FFA500';
            ctx.font = '6px monospace';
            ctx.fillText('W', dx + 5, dy - 2);
        }
    }
}

class Pet {
    constructor(def) {
        Object.assign(this, def);
        this.px = def.x * TILE;
        this.py = def.y * TILE;
        this.frame = 0;
        this.dir = 'right';
        this.state = 'idle';
        this.targetX = null;
        this.targetY = null;
        this.wanderTimer = rand(2, 5);
    }

    get tileX() { return Math.round(this.px / TILE); }
    get tileY() { return Math.round(this.py / TILE); }

    update(dt, game) {
        this.frame += dt * 4;
        this.wanderTimer -= dt;

        if (this.wanderTimer <= 0) {
            // Random wandering
            this.targetX = this.tileX + rand(-3, 3);
            this.targetY = this.tileY + rand(-3, 3);
            this.wanderTimer = rand(3, 8);
        }

        // Move toward target
        if (this.targetX !== null) {
            const tx = this.targetX * TILE;
            const ty = this.targetY * TILE;
            const dx = tx - this.px;
            const dy = ty - this.py;
            const d = Math.sqrt(dx * dx + dy * dy);

            if (d > 2) {
                const spd = this.speed * TILE * dt;
                this.px += (dx / d) * spd;
                this.py += (dy / d) * spd;
                this.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
            } else {
                this.targetX = null;
                this.targetY = null;
            }
        }
    }

    draw(ctx, cameraX, cameraY) {
        const dx = this.px - cameraX;
        const dy = this.py - cameraY;
        PixelSprite.drawPet(ctx, dx, dy, this.type, this.frame);

        // Name
        ctx.fillStyle = '#FFF';
        ctx.font = '4px monospace';
        ctx.fillText(this.name, dx - 2, dy - 2);
    }
}
