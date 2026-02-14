// ============================================================
// SZCZURY Z KAMIEŃCA - Rat Types and Behavior
// ============================================================

const RAT_TYPES = {
    brown: {
        id: 'brown',
        name: 'Brązowy Szczur',
        color: '#8B4513',
        killMethod: 'patelnia',
        killDesc: 'Pacnij patelnią!',
        hp: 30,
        speed: 0.8,
        spawnWeight: 1,
    },
    black: {
        id: 'black',
        name: 'Czarny Szczur',
        color: '#1A1A1A',
        killMethod: 'bow',
        killDesc: 'Zastrzel z łuku!',
        hp: 40,
        speed: 1.0,
        spawnWeight: 1,
    },
    pink: {
        id: 'pink',
        name: 'Różowy Szczur',
        color: '#FF69B4',
        killMethod: 'thermomix',
        killDesc: 'Ugotuj w Thermomixie!',
        hp: 25,
        speed: 0.7,
        spawnWeight: 1,
    },
    blue: {
        id: 'blue',
        name: 'Niebieski Szczur',
        color: '#4169E1',
        killMethod: 'window',
        killDesc: 'Wyrzuć przez okno!',
        hp: 35,
        speed: 0.9,
        spawnWeight: 1,
    },
    blackwhite: {
        id: 'blackwhite',
        name: 'Czarno-biały Szczur',
        color: '#666',
        secondColor: '#FFF',
        killMethod: 'odkurzacz',
        killDesc: 'Wciągnij odkurzaczem!',
        hp: 30,
        speed: 0.8,
        spawnWeight: 1,
    },
    purple: {
        id: 'purple',
        name: 'Fioletowy Szczur',
        color: '#800080',
        killMethod: 'dogs',
        killDesc: 'Pogonić dwoma psami!',
        hp: 50,
        speed: 1.2,
        spawnWeight: 1,
    },
    green: {
        id: 'green',
        name: 'Zielony Szczur',
        color: '#228B22',
        killMethod: 'tv',
        killDesc: 'Przewróć na niego telewizor!',
        hp: 45,
        speed: 0.6,
        spawnWeight: 1,
    },
    orange: {
        id: 'orange',
        name: 'Pomarańczowy Szczur',
        color: '#FF8C00',
        killMethod: 'dhl_truck',
        killDesc: 'Wezwij ciężarówkę DHL!',
        hp: 60,
        speed: 0.5,
        spawnWeight: 1,
        spawnArea: 'terrace',
    },
    tula_target: {
        id: 'tula_target',
        name: 'Szary Szczur',
        color: '#808080',
        killMethod: 'cat',
        killDesc: 'Niech Tula go zaatakuje!',
        hp: 20,
        speed: 1.0,
        spawnWeight: 1,
    },
    rainbow: {
        id: 'rainbow',
        name: 'Tęczowy Szczur',
        color: '#FF0000',
        rainbow: true,
        killMethod: 'microwave',
        killDesc: 'Wrzuć do mikrofali!',
        hp: 35,
        speed: 0.9,
        spawnWeight: 1,
    },
    minecraft: {
        id: 'minecraft',
        name: 'Pikselowy Szczur',
        color: '#00AA00',
        killMethod: 'minecraft_portal',
        killDesc: 'Wrzuć do Minecrafta!',
        hp: 30,
        speed: 1.1,
        spawnWeight: 1,
        blocky: true,
    },
    leaf: {
        id: 'leaf',
        name: 'Liściasty Szczur',
        color: '#556B2F',
        killMethod: 'leaves',
        killDesc: 'Pacnij liśćmi 10 razy!',
        hp: 100,  // needs 10 hits
        hitPerLeaf: 10,
        speed: 0.7,
        spawnWeight: 1,
    },
    slipper: {
        id: 'slipper',
        name: 'Bezczelny Szczur',
        color: '#B22222',
        killMethod: 'klapek',
        killDesc: 'Bij klapkiem po mordzie!',
        hp: 40,
        speed: 0.8,
        spawnWeight: 1,
    },
    boiler: {
        id: 'boiler',
        name: 'Gorący Szczur',
        color: '#FF4500',
        killMethod: 'bojler',
        killDesc: 'Wstaw do bojlera!',
        hp: 45,
        speed: 0.6,
        spawnWeight: 1,
    },
    coffee: {
        id: 'coffee',
        name: 'Kawowy Szczur',
        color: '#6B3A2A',
        killMethod: 'ekspres',
        killDesc: 'Wrzuć do ekspresu do kawy!',
        hp: 35,
        speed: 1.0,
        spawnWeight: 1,
    },
    tame: {
        id: 'tame',
        name: 'Łagodny Szczur',
        color: '#DEB887',
        killMethod: 'cage',
        killDesc: 'Oswój i schowaj do klatki!',
        hp: 15,
        speed: 0.5,
        spawnWeight: 0,  // Only spawns from boss
        isFinal: true,
    },
};

// Boss rat
const BOSS_RAT = {
    id: 'boss',
    name: 'KRÓL SZCZURÓW',
    color: '#4A0000',
    hp: 300,
    speed: 0.4,
    phase: 1,
    maxPhase: 3,
};

class Rat {
    constructor(typeDef, x, y, floor) {
        this.type = typeDef.id;
        this.typeDef = typeDef;
        this.name = typeDef.name;
        this.color = typeDef.color;
        this.secondColor = typeDef.secondColor;
        this.rainbow = typeDef.rainbow;
        this.blocky = typeDef.blocky;
        this.killMethod = typeDef.killMethod;
        this.killDesc = typeDef.killDesc;
        this.maxHp = typeDef.hp;
        this.hp = typeDef.hp;
        this.hitPerLeaf = typeDef.hitPerLeaf || 0;
        this.speed = typeDef.speed;
        this.isFinal = typeDef.isFinal || false;

        this.x = x;
        this.y = y;
        this.floor = floor;
        this.px = x * TILE;
        this.py = y * TILE;
        this.frame = 0;
        this.dir = choose(['left', 'right']);
        this.alive = true;
        this.caught = false;
        this.tamed = false;
        this.fleeing = false;

        this.wanderTimer = rand(1, 4);
        this.targetX = null;
        this.targetY = null;
        this.stateTimer = 0;
        this.hitCount = 0;
        this.flashTimer = 0;
        this.deathEffect = null;
        this.deathTimer = 0;
        this.onCharacter = null;  // sitting on a character
    }

    get tileX() { return Math.round(this.px / TILE); }
    get tileY() { return Math.round(this.py / TILE); }

    update(dt, game) {
        if (!this.alive) {
            this.deathTimer -= dt;
            return;
        }

        this.frame += dt * (this.fleeing ? 8 : 4);
        this.wanderTimer -= dt;
        if (this.flashTimer > 0) this.flashTimer -= dt;

        // Check if on a gaming character (Ignacy/Witek)
        this.checkClimbOnGamer(game);

        if (this.caught) return;

        // Wander or flee
        if (this.fleeing) {
            this.updateFlee(dt, game);
        } else if (this.wanderTimer <= 0) {
            this.chooseWanderTarget(game);
            this.wanderTimer = randFloat(2, 6);
        }

        // Move toward target
        if (this.targetX !== null) {
            const tx = this.targetX * TILE;
            const ty = this.targetY * TILE;
            const dx = tx - this.px;
            const dy = ty - this.py;
            const d = Math.sqrt(dx * dx + dy * dy);

            if (d > 2) {
                const spd = this.speed * TILE * dt * (this.fleeing ? 2 : 1);
                this.px += (dx / d) * spd;
                this.py += (dy / d) * spd;
                this.dir = dx > 0 ? 'right' : 'left';
            } else {
                this.targetX = null;
                this.targetY = null;
            }
        }

        // Random floor change (using stairs)
        if (Math.random() < 0.001 * dt) {
            this.tryChangeFloor(game);
        }
    }

    chooseWanderTarget(game) {
        const range = 5;
        for (let attempt = 0; attempt < 10; attempt++) {
            const tx = this.tileX + rand(-range, range);
            const ty = this.tileY + rand(-range, range);
            if (game.map.isWalkable(this.floor, tx, ty)) {
                this.targetX = tx;
                this.targetY = ty;
                return;
            }
        }
    }

    updateFlee(dt, game) {
        // Flee from nearest threat
        const player = game.player;
        if (player && player.floor === this.floor) {
            const dx = this.tileX - player.tileX;
            const dy = this.tileY - player.tileY;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < 8) {
                const tx = this.tileX + Math.sign(dx) * 3;
                const ty = this.tileY + Math.sign(dy) * 3;
                if (game.map.isWalkable(this.floor, tx, ty)) {
                    this.targetX = tx;
                    this.targetY = ty;
                }
            }
        }
    }

    checkClimbOnGamer(game) {
        // Rats climb on gaming characters
        for (const char of game.characters) {
            if (char.floor !== this.floor) continue;
            if (char.state !== 'gaming') continue;
            if (dist({ x: this.px, y: this.py }, { x: char.px, y: char.py }) < TILE * 1.5) {
                this.onCharacter = char.id;
                this.px = char.px + rand(-4, 4);
                this.py = char.py - 4;
                return;
            }
        }
        this.onCharacter = null;
    }

    tryChangeFloor(game) {
        const tile = game.map.getTile(this.floor, this.tileX, this.tileY);
        if (tile === T.STAIRS_UP && this.floor < FLOORS.UPPER) {
            this.floor = this.floor + 1;
        } else if (tile === T.STAIRS_DOWN && this.floor > FLOORS.GROUND) {
            this.floor = this.floor - 1;
        }
    }

    takeDamage(amount, method) {
        if (method !== this.killMethod && method !== 'nintendo_throw') {
            return false;  // Wrong method!
        }

        this.hp -= amount;
        this.flashTimer = 0.2;

        if (this.killMethod === 'leaves') {
            this.hitCount++;
        }

        if (this.hp <= 0) {
            this.die();
            return true;
        }
        return false;
    }

    die() {
        this.alive = false;
        this.deathTimer = 1.0;
        this.deathEffect = 'catch';
    }

    draw(ctx, cameraX, cameraY) {
        const dx = this.px - cameraX;
        const dy = this.py - cameraY;

        if (!this.alive) {
            if (this.deathTimer > 0) {
                PixelSprite.drawEffect(ctx, dx + 5, dy + 3, 'catch', 1 - this.deathTimer);
            }
            return;
        }

        // Flash on hit
        if (this.flashTimer > 0) {
            ctx.fillStyle = '#FFF';
            ctx.fillRect(dx - 1, dy - 1, 14, 12);
        }

        // Rainbow rat color cycling
        let color = this.color;
        if (this.rainbow) {
            const hue = (Date.now() / 10) % 360;
            color = `hsl(${hue}, 100%, 50%)`;
        }

        // Draw the rat
        if (this.blocky) {
            // Minecraft-style blocky rat
            ctx.fillStyle = color;
            ctx.fillRect(dx, dy + 2, 12, 8);
            ctx.fillRect(dx + 10, dy, 6, 6);
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(dx + 13, dy + 2, 2, 2);
        } else {
            PixelSprite.drawRat(ctx, dx, dy, color, this.frame, 1);

            // Second color for black-white
            if (this.secondColor) {
                ctx.fillStyle = this.secondColor;
                ctx.fillRect(dx + 2, dy + 3, 4, 3);
                ctx.fillRect(dx + 7, dy + 4, 3, 2);
            }
        }

        // HP bar (when damaged)
        if (this.hp < this.maxHp) {
            ctx.fillStyle = '#333';
            ctx.fillRect(dx, dy - 4, 12, 2);
            ctx.fillStyle = '#F00';
            ctx.fillRect(dx, dy - 4, 12 * (this.hp / this.maxHp), 2);
        }

        // Kill method hint when player is near
        if (this.caught) {
            ctx.fillStyle = '#FF0';
            ctx.font = '5px monospace';
            ctx.fillText('ZŁAPANY!', dx - 4, dy - 6);
        }
    }
}

class BossRat {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.floor = FLOORS.ATTIC;
        this.px = x * TILE;
        this.py = y * TILE;
        this.hp = BOSS_RAT.hp;
        this.maxHp = BOSS_RAT.hp;
        this.speed = BOSS_RAT.speed;
        this.phase = 1;
        this.frame = 0;
        this.alive = true;
        this.defeated = false;
        this.attackTimer = 3;
        this.summonTimer = 8;
        this.dir = 'left';
        this.targetX = null;
        this.targetY = null;
        this.flashTimer = 0;
        this.enraged = false;
        this.smokeParticles = [];
    }

    get tileX() { return Math.round(this.px / TILE); }
    get tileY() { return Math.round(this.py / TILE); }

    update(dt, game) {
        if (!this.alive) return;

        this.frame += dt * 3;
        this.attackTimer -= dt;
        this.summonTimer -= dt;
        if (this.flashTimer > 0) this.flashTimer -= dt;

        // Phase changes
        if (this.hp < this.maxHp * 0.66 && this.phase === 1) {
            this.phase = 2;
            this.speed = 0.6;
            game.addMessage('Król Szczurów wścieka się! Faza 2!');
        }
        if (this.hp < this.maxHp * 0.33 && this.phase === 2) {
            this.phase = 3;
            this.speed = 0.8;
            this.enraged = true;
            game.addMessage('FAZA 3! Król Szczurów szaleje!');
        }

        // Move toward nearest player on attic
        const playersOnAttic = game.characters.filter(c => c.floor === FLOORS.ATTIC);
        if (playersOnAttic.length > 0) {
            const nearest = playersOnAttic.reduce((a, b) =>
                dist({ x: this.px, y: this.py }, { x: a.px, y: a.py }) <
                    dist({ x: this.px, y: this.py }, { x: b.px, y: b.py }) ? a : b);

            const dx = nearest.px - this.px;
            const dy = nearest.py - this.py;
            const d = Math.sqrt(dx * dx + dy * dy);

            if (d > TILE * 2) {
                const spd = this.speed * TILE * dt;
                this.px += (dx / d) * spd;
                this.py += (dy / d) * spd;
            }

            // Attack
            if (this.attackTimer <= 0 && d < TILE * 3) {
                this.attack(nearest, game);
                this.attackTimer = this.enraged ? 1.5 : 3;
            }
        }

        // Summon minions
        if (this.summonTimer <= 0 && this.phase >= 2) {
            this.summonMinions(game);
            this.summonTimer = this.enraged ? 6 : 10;
        }

        // Smoke particles
        if (Math.random() < 0.3) {
            this.smokeParticles.push({
                x: this.px + rand(-10, 20),
                y: this.py + rand(-5, 10),
                life: 1,
            });
        }
        this.smokeParticles = this.smokeParticles.filter(p => {
            p.life -= dt;
            p.y -= dt * 10;
            return p.life > 0;
        });
    }

    attack(target, game) {
        target.hp -= 15;
        target.stress += 10;
        target.showAlert('ATAK KRÓLA!', 1.5);
        game.addEffect(target.px, target.py, 'hit');
        game.screenShake = 0.5;
    }

    summonMinions(game) {
        const types = Object.keys(RAT_TYPES).filter(t => t !== 'tame');
        for (let i = 0; i < (this.phase); i++) {
            const type = choose(types);
            const rx = this.tileX + rand(-3, 3);
            const ry = this.tileY + rand(-3, 3);
            if (game.map.isWalkable(FLOORS.ATTIC, rx, ry)) {
                game.spawnRat(type, rx, ry, FLOORS.ATTIC);
            }
        }
        game.addMessage('Król przywołuje posiłki!');
    }

    takeDamage(amount) {
        this.hp -= amount;
        this.flashTimer = 0.3;
        if (this.hp <= 0) {
            this.alive = false;
            this.defeated = true;
            return true;
        }
        return false;
    }

    draw(ctx, cameraX, cameraY) {
        if (!this.alive) return;

        const dx = this.px - cameraX;
        const dy = this.py - cameraY;

        // Smoke
        for (const p of this.smokeParticles) {
            ctx.fillStyle = `rgba(0, 200, 0, ${p.life * 0.4})`;
            ctx.fillRect(p.x - cameraX, p.y - cameraY, 4, 4);
        }

        // Flash
        if (this.flashTimer > 0) {
            ctx.fillStyle = '#FFF';
            ctx.fillRect(dx - 14, dy - 2, 36, 24);
        }

        PixelSprite.drawBossRat(ctx, dx, dy, this.frame);

        // HP bar
        ctx.fillStyle = '#333';
        ctx.fillRect(dx - 15, dy - 16, 40, 4);
        ctx.fillStyle = this.phase === 3 ? '#FF0000' : this.phase === 2 ? '#FF8800' : '#FF4444';
        ctx.fillRect(dx - 15, dy - 16, 40 * (this.hp / this.maxHp), 4);

        // Phase indicator
        ctx.fillStyle = '#FFF';
        ctx.font = '5px monospace';
        ctx.fillText(`FAZA ${this.phase}`, dx - 5, dy - 18);

        // Enraged effect
        if (this.enraged) {
            ctx.fillStyle = `rgba(255, 0, 0, ${0.3 + Math.sin(Date.now() / 100) * 0.2})`;
            ctx.fillRect(dx - 16, dy - 6, 40, 28);
        }
    }
}
