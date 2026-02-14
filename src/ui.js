// ============================================================
// SZCZURY Z KAMIEŃCA - UI System
// ============================================================

class UISystem {
    constructor(game) {
        this.game = game;
        this.messages = [];
        this.maxMessages = 5;
        this.selectedAction = null;
        this.showInventory = false;
        this.showHelp = false;
        this.tooltip = null;
        this.tooltipTimer = 0;
    }

    addMessage(text) {
        this.messages.push({ text, timer: 5 });
        if (this.messages.length > this.maxMessages) {
            this.messages.shift();
        }
    }

    update(dt) {
        this.messages = this.messages.filter(m => {
            m.timer -= dt;
            return m.timer > 0;
        });
        if (this.tooltipTimer > 0) this.tooltipTimer -= dt;
    }

    showTooltip(text, duration) {
        this.tooltip = text;
        this.tooltipTimer = duration || 2;
    }

    draw(ctx) {
        const player = this.game.player;
        if (!player) return;

        // === TOP BAR ===
        // Floor indicator
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, CANVAS_W, 14);

        ctx.fillStyle = '#FFF';
        ctx.font = '7px monospace';
        const floorNames = { 0: 'Parter', 1: 'Piętro', 2: 'Poddasze', 3: 'Podwórko' };
        ctx.fillText(`${floorNames[this.game.currentFloor] || '?'}`, 4, 9);

        // Rat counter
        ctx.fillStyle = '#FF4444';
        ctx.fillText(`Szczury: ${this.game.ratsKilled}/${this.game.totalRatsToKill}`, 80, 9);

        // Stress meter
        const stress = this.game.globalStress;
        ctx.fillStyle = '#333';
        ctx.fillRect(180, 3, 60, 6);
        ctx.fillStyle = stress > 70 ? '#FF0000' : stress > 40 ? '#FF8800' : '#00FF00';
        ctx.fillRect(180, 3, 60 * (stress / 100), 6);
        ctx.fillStyle = '#FFF';
        ctx.fillText(`Stres: ${Math.floor(stress)}%`, 245, 9);

        // Timer / Key indicator
        if (this.game.hasKey) {
            ctx.fillStyle = '#FFD700';
            ctx.fillText('KLUCZ!', 340, 9);
        }

        // Rain indicator
        if (this.game.isRaining) {
            ctx.fillStyle = '#4488FF';
            ctx.fillText('DESZCZ', 400, 9);
        }

        ctx.fillText(`${player.name}`, CANVAS_W - 60, 9);

        // === BOTTOM BAR - Inventory & Actions ===
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(0, CANVAS_H - 40, CANVAS_W, 40);

        // HP bar
        ctx.fillStyle = '#333';
        ctx.fillRect(4, CANVAS_H - 38, 50, 5);
        ctx.fillStyle = player.hp > 50 ? '#0F0' : player.hp > 25 ? '#FF0' : '#F00';
        ctx.fillRect(4, CANVAS_H - 38, 50 * (player.hp / 100), 5);
        ctx.fillStyle = '#FFF';
        ctx.font = '5px monospace';
        ctx.fillText(`HP:${player.hp}`, 4, CANVAS_H - 34);

        // Inventory slots
        ctx.fillStyle = '#FFF';
        ctx.font = '6px monospace';
        ctx.fillText('Ekwipunek:', 4, CANVAS_H - 22);

        for (let i = 0; i < player.maxInventory; i++) {
            const slotX = 60 + i * 40;
            const slotY = CANVAS_H - 30;

            // Slot background
            ctx.fillStyle = this.selectedAction === i ? '#555' : '#333';
            ctx.strokeStyle = '#888';
            ctx.fillRect(slotX, slotY, 36, 16);
            ctx.strokeRect(slotX, slotY, 36, 16);

            // Item in slot
            if (player.inventory[i]) {
                ctx.fillStyle = '#FFD700';
                ctx.font = '5px monospace';
                const name = player.inventory[i].name.substring(0, 6);
                ctx.fillText(name, slotX + 2, slotY + 7);

                // Key shortcut
                ctx.fillStyle = '#888';
                ctx.fillText(`[${i + 1}]`, slotX + 2, slotY + 14);
            } else {
                ctx.fillStyle = '#555';
                ctx.font = '5px monospace';
                ctx.fillText(`[${i + 1}]`, slotX + 12, slotY + 10);
            }
        }

        // Action buttons
        ctx.fillStyle = '#FFF';
        ctx.font = '6px monospace';
        ctx.fillText('[E] Użyj  [Q] Podnieś  [SPACE] Atak  [TAB] Piętro  [H] Pomoc', 4, CANVAS_H - 4);

        // === MESSAGES ===
        let msgY = CANVAS_H - 50;
        for (let i = this.messages.length - 1; i >= 0; i--) {
            const msg = this.messages[i];
            const alpha = Math.min(1, msg.timer);
            ctx.fillStyle = `rgba(0,0,0,${alpha * 0.7})`;
            ctx.fillRect(4, msgY - 8, msg.text.length * 4 + 8, 10);
            ctx.fillStyle = `rgba(255,255,255,${alpha})`;
            ctx.font = '6px monospace';
            ctx.fillText(msg.text, 8, msgY);
            msgY -= 12;
        }

        // === TOOLTIP ===
        if (this.tooltipTimer > 0 && this.tooltip) {
            const tw = this.tooltip.length * 4 + 10;
            ctx.fillStyle = 'rgba(0,0,0,0.9)';
            ctx.fillRect(CANVAS_W / 2 - tw / 2, CANVAS_H / 2 - 20, tw, 16);
            ctx.fillStyle = '#FFD700';
            ctx.font = '7px monospace';
            ctx.fillText(this.tooltip, CANVAS_W / 2 - tw / 2 + 5, CANVAS_H / 2 - 10);
        }

        // === NEARBY RAT INFO ===
        const nearestRat = this.findNearestRatToPlayer();
        if (nearestRat && nearestRat.dist < TILE * 4) {
            const rat = nearestRat.rat;
            const infoY = 18;
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(CANVAS_W - 140, infoY, 136, 24);
            ctx.fillStyle = rat.color;
            if (rat.rainbow) ctx.fillStyle = `hsl(${Date.now() / 10 % 360}, 100%, 50%)`;
            ctx.fillRect(CANVAS_W - 136, infoY + 2, 8, 8);
            ctx.fillStyle = '#FFF';
            ctx.font = '5px monospace';
            ctx.fillText(rat.name, CANVAS_W - 124, infoY + 8);
            ctx.fillStyle = '#FFD700';
            ctx.fillText(rat.killDesc, CANVAS_W - 136, infoY + 18);
        }

        // === LIMIT CRISIS WARNING ===
        if (this.game.limitCrisis) {
            const blink = Math.sin(Date.now() / 100) > 0;
            if (blink) {
                ctx.fillStyle = 'rgba(255,0,0,0.3)';
                ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
            }
            ctx.fillStyle = '#FF0000';
            ctx.font = '10px monospace';
            ctx.fillText('IGNACY POTRZEBUJE LIMITU!', CANVAS_W / 2 - 90, 30);

            if (this.game.limitCrisisTimer !== undefined) {
                ctx.fillText(`${Math.ceil(this.game.limitCrisisTimer)}s`, CANVAS_W / 2 - 10, 42);
            }
        }

        // === BOSS HP BAR ===
        if (this.game.bossRat && this.game.bossRat.alive && this.game.currentFloor === FLOORS.ATTIC) {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(CANVAS_W / 2 - 80, 16, 160, 14);
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(CANVAS_W / 2 - 78, 18, 156 * (this.game.bossRat.hp / this.game.bossRat.maxHp), 10);
            ctx.fillStyle = '#FFF';
            ctx.font = '6px monospace';
            ctx.fillText('KRÓL SZCZURÓW', CANVAS_W / 2 - 30, 26);
        }

        // === HELP OVERLAY ===
        if (this.showHelp) {
            this.drawHelp(ctx);
        }

        // === RAIN EFFECT ===
        if (this.game.isRaining && this.game.currentFloor === FLOORS.EXTERIOR) {
            this.drawRain(ctx);
        }
    }

    drawHelp(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.9)';
        ctx.fillRect(20, 20, CANVAS_W - 40, CANVAS_H - 60);

        ctx.fillStyle = '#FFD700';
        ctx.font = '8px monospace';
        ctx.fillText('SZCZURY Z KAMIEŃCA - POMOC', 30, 35);

        ctx.fillStyle = '#FFF';
        ctx.font = '6px monospace';
        const lines = [
            'WASD / Strzałki - Ruch',
            'SPACE - Atak / Użyj przedmiotu na szczurze',
            'E - Interakcja z przedmiotem / NPC',
            'Q - Podnieś / Upuść przedmiot',
            '1-3 - Wybierz slot ekwipunku',
            'TAB - Zmień piętro (przy schodach)',
            'R - Specjalna zdolność postaci',
            'H - Pomoc (ta plansza)',
            '',
            'CEL: Zabij wszystkie szczury i pokonaj Króla!',
            'Każdy szczur wymaga innej metody!',
            'Podejdź do szczura by zobaczyć wskazówkę.',
            '',
            'UWAGA: Nie muszkuj Ignacego przy graniu!',
            'Dodaj limit gdy Ignacy krzyczy!',
        ];

        let y = 48;
        for (const line of lines) {
            ctx.fillText(line, 30, y);
            y += 9;
        }

        ctx.fillStyle = '#888';
        ctx.fillText('[H] aby zamknąć', 30, CANVAS_H - 50);
    }

    drawRain(ctx) {
        ctx.fillStyle = 'rgba(100, 150, 255, 0.3)';
        for (let i = 0; i < 50; i++) {
            const rx = (Date.now() * 0.1 + i * 37) % CANVAS_W;
            const ry = (Date.now() * 0.3 + i * 23) % CANVAS_H;
            ctx.fillRect(rx, ry, 1, 4);
        }
    }

    findNearestRatToPlayer() {
        const player = this.game.player;
        if (!player) return null;

        let nearest = null;
        let minD = Infinity;
        for (const rat of this.game.rats) {
            if (!rat.alive || rat.floor !== player.floor) continue;
            const d = dist({ x: player.px, y: player.py }, { x: rat.px, y: rat.py });
            if (d < minD) {
                minD = d;
                nearest = { rat, dist: d };
            }
        }
        return nearest;
    }
}

class MenuSystem {
    constructor() {
        this.state = 'title';  // title, select, playing, gameover, victory
        this.selectedCharacter = 0;
        this.characterList = Object.keys(CHARACTER_DEFS);
        this.titleFrame = 0;
        this.ratAnimFrame = 0;
    }

    update(dt) {
        this.titleFrame += dt;
        this.ratAnimFrame += dt * 4;
    }

    drawTitle(ctx) {
        // Background
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // Stars
        for (let i = 0; i < 50; i++) {
            const sx = (i * 97 + Math.sin(this.titleFrame + i) * 3) % CANVAS_W;
            const sy = (i * 53 + Math.cos(this.titleFrame * 0.5 + i) * 2) % (CANVAS_H / 2);
            ctx.fillStyle = '#FFF';
            ctx.fillRect(sx, sy, 1, 1);
        }

        // House silhouette
        ctx.fillStyle = '#2a1a0e';
        ctx.fillRect(160, 160, 160, 100);
        // Roof
        ctx.beginPath();
        ctx.moveTo(150, 160);
        ctx.lineTo(240, 100);
        ctx.lineTo(330, 160);
        ctx.fillStyle = '#3a2a1e';
        ctx.fill();
        // Windows glowing
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(180, 190, 20, 20);
        ctx.fillRect(220, 190, 20, 20);
        ctx.fillRect(260, 190, 20, 20);
        ctx.fillRect(200, 130, 15, 15);
        ctx.fillRect(260, 130, 15, 15);
        // Door
        ctx.fillStyle = '#654321';
        ctx.fillRect(228, 225, 24, 35);

        // Animated rats running across
        for (let i = 0; i < 5; i++) {
            const rx = (this.titleFrame * 30 + i * 100) % (CANVAS_W + 40) - 20;
            PixelSprite.drawRat(ctx, rx, 262 + Math.sin(i) * 3, ['#8B4513', '#1A1A1A', '#FF69B4', '#228B22', '#800080'][i], this.ratAnimFrame + i, 1);
        }

        // Ground
        ctx.fillStyle = '#228B22';
        ctx.fillRect(0, 268, CANVAS_W, 52);
        ctx.fillStyle = '#1a7a1a';
        for (let x = 0; x < CANVAS_W; x += 8) {
            ctx.fillRect(x, 268, 4, 2);
        }

        // Title
        ctx.fillStyle = '#000';
        ctx.fillRect(70, 30, 342, 50);
        ctx.fillStyle = '#FFD700';
        ctx.font = '16px monospace';
        ctx.fillText('SZCZURY Z KAMIEŃCA', 90, 55);
        ctx.fillStyle = '#FFF';
        ctx.font = '8px monospace';
        ctx.fillText('Gra o przetrwaniu w podwarszawskim domu', 100, 70);

        // Prompt
        const blink = Math.sin(this.titleFrame * 3) > 0;
        if (blink) {
            ctx.fillStyle = '#FFF';
            ctx.font = '8px monospace';
            ctx.fillText('Naciśnij ENTER aby zacząć', 160, 295);
        }

        // Credits
        ctx.fillStyle = '#888';
        ctx.font = '5px monospace';
        ctx.fillText('Kamieniec, okolice Warszawy • 2024', 170, 310);
    }

    drawCharacterSelect(ctx) {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        ctx.fillStyle = '#FFD700';
        ctx.font = '10px monospace';
        ctx.fillText('WYBIERZ POSTAĆ', 170, 25);

        const chars = this.characterList;
        const cols = 3;
        const cellW = 140;
        const cellH = 120;
        const startX = 30;
        const startY = 40;

        for (let i = 0; i < chars.length; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const cx = startX + col * (cellW + 10);
            const cy = startY + row * (cellH + 10);
            const def = CHARACTER_DEFS[chars[i]];

            // Card background
            ctx.fillStyle = i === this.selectedCharacter ? '#333355' : '#222';
            ctx.fillRect(cx, cy, cellW, cellH);

            // Selection border
            if (i === this.selectedCharacter) {
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 2;
                ctx.strokeRect(cx, cy, cellW, cellH);
                ctx.lineWidth = 1;
            }

            // Character sprite (big)
            PixelSprite.drawCharacter(ctx, cx + 10, cy + 10, def.sprite, this.titleFrame * 2, 'down', 2);

            // Name & info
            ctx.fillStyle = '#FFF';
            ctx.font = '7px monospace';
            ctx.fillText(def.name, cx + 50, cy + 15);

            ctx.fillStyle = '#AAA';
            ctx.font = '5px monospace';
            ctx.fillText(`Wiek: ${def.age}`, cx + 50, cy + 25);
            ctx.fillText(`Szybkość: ${def.speed}`, cx + 50, cy + 33);

            // Description (wrapped)
            ctx.fillStyle = '#888';
            const desc = def.desc;
            const maxW = cellW - 10;
            let line = '';
            let ly = cy + 55;
            for (const word of desc.split(' ')) {
                const test = line + word + ' ';
                if (test.length * 3 > maxW) {
                    ctx.fillText(line, cx + 5, ly);
                    line = word + ' ';
                    ly += 8;
                } else {
                    line = test;
                }
            }
            ctx.fillText(line, cx + 5, ly);

            // Ability
            ctx.fillStyle = '#FFD700';
            ctx.font = '5px monospace';
            ctx.fillText(def.abilityDesc.substring(0, 30), cx + 5, cy + cellH - 12);

            // Key hint
            ctx.fillStyle = '#555';
            ctx.fillText(`[${i + 1}]`, cx + cellW - 15, cy + 10);
        }

        // Instructions
        ctx.fillStyle = '#FFF';
        ctx.font = '7px monospace';
        ctx.fillText('Strzałki/1-6 = Wybierz • ENTER = Graj', 100, CANVAS_H - 10);
    }

    drawGameOver(ctx) {
        ctx.fillStyle = 'rgba(100, 0, 0, 0.8)';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        ctx.fillStyle = '#FF0000';
        ctx.font = '16px monospace';
        ctx.fillText('GAME OVER', 170, CANVAS_H / 2 - 20);

        ctx.fillStyle = '#FFF';
        ctx.font = '8px monospace';
        ctx.fillText('Szczury opanowały dom w Kamieńcu!', 120, CANVAS_H / 2 + 10);
        ctx.fillText(`Zabiłeś ${this.game?.ratsKilled || 0} szczurów.`, 170, CANVAS_H / 2 + 25);

        const blink = Math.sin(this.titleFrame * 3) > 0;
        if (blink) {
            ctx.fillText('ENTER = Spróbuj ponownie', 150, CANVAS_H / 2 + 50);
        }
    }

    drawVictory(ctx) {
        ctx.fillStyle = 'rgba(0, 50, 0, 0.8)';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // Fireworks
        for (let i = 0; i < 10; i++) {
            const fx = (Math.sin(this.titleFrame * 2 + i * 3) + 1) / 2 * CANVAS_W;
            const fy = (Math.cos(this.titleFrame * 1.5 + i * 2) + 1) / 2 * (CANVAS_H / 2);
            const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFD700', '#FF69B4'];
            ctx.fillStyle = colors[i % colors.length];
            ctx.fillRect(fx, fy, 4, 4);
            ctx.fillRect(fx - 3, fy + 2, 3, 3);
            ctx.fillRect(fx + 4, fy + 2, 3, 3);
            ctx.fillRect(fx, fy + 5, 4, 3);
        }

        ctx.fillStyle = '#FFD700';
        ctx.font = '14px monospace';
        ctx.fillText('ZWYCIĘSTWO!', 170, CANVAS_H / 2 - 30);

        ctx.fillStyle = '#FFF';
        ctx.font = '8px monospace';
        ctx.fillText('Dom w Kamieńcu jest wolny od szczurów!', 100, CANVAS_H / 2);
        ctx.fillText('Ostatni szczur został oswojony!', 130, CANVAS_H / 2 + 15);

        ctx.fillStyle = '#AAA';
        ctx.font = '7px monospace';
        ctx.fillText('Babcia Gosia może znów spokojnie', 120, CANVAS_H / 2 + 40);
        ctx.fillText('gotować w kuchni!', 170, CANVAS_H / 2 + 52);

        const blink = Math.sin(this.titleFrame * 3) > 0;
        if (blink) {
            ctx.fillStyle = '#FFF';
            ctx.fillText('ENTER = Nowa gra', 180, CANVAS_H / 2 + 80);
        }
    }
}
