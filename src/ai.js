// ============================================================
// SZCZURY Z KAMIEŃCA - NPC AI System
// ============================================================

class NPCAISystem {
    constructor(game) {
        this.game = game;
    }

    update(dt) {
        for (const char of this.game.characters) {
            if (char.isPlayer) continue;
            this.updateCharacterAI(char, dt);
        }
    }

    updateCharacterAI(char, dt) {
        // State machine for each character type
        switch (char.id) {
            case 'ignacy': this.updateIgnacy(char, dt); break;
            case 'lena': this.updateLena(char, dt); break;
            case 'babcia_gosia': this.updateBabciaGosia(char, dt); break;
            case 'witek': this.updateWitek(char, dt); break;
            case 'blanka': this.updateBlanka(char, dt); break;
            case 'pawel': this.updatePawel(char, dt); break;
        }

        // Common NPC movement
        this.moveNPC(char, dt);
    }

    moveNPC(char, dt) {
        if (char.immobilizedTimer > 0) return;
        if (char.state === 'gaming' || char.state === 'working' || char.state === 'duolingo') return;

        if (char.targetPath && char.pathIndex < char.targetPath.length) {
            const target = char.targetPath[char.pathIndex];
            const tx = target.x * TILE;
            const ty = target.y * TILE;
            const dx = tx - char.px;
            const dy = ty - char.py;
            const d = Math.sqrt(dx * dx + dy * dy);

            if (d > 2) {
                const spd = char.getCurrentSpeed() * TILE * dt;
                char.px += (dx / d) * spd;
                char.py += (dy / d) * spd;
                char.moving = true;
                char.dir = Math.abs(dx) > Math.abs(dy)
                    ? (dx > 0 ? 'right' : 'left')
                    : (dy > 0 ? 'down' : 'up');
            } else {
                char.pathIndex++;
                char.x = target.x;
                char.y = target.y;
            }
        } else {
            char.moving = false;
            // Random wander
            if (Math.random() < 0.02 * dt && char.state === 'idle') {
                this.wanderNPC(char);
            }
        }
    }

    wanderNPC(char) {
        const tx = char.tileX + rand(-3, 3);
        const ty = char.tileY + rand(-3, 3);
        if (this.game.map.isWalkable(char.floor, tx, ty)) {
            char.targetPath = findPath(
                char.tileX, char.tileY, tx, ty,
                (x, y) => this.game.map.isWalkable(char.floor, x, y)
            );
            char.pathIndex = 0;
        }
    }

    // === IGNACY AI ===
    updateIgnacy(char, dt) {
        if (char.state === 'gaming') {
            char.gamingTimer += dt;

            // Limit countdown
            if (char.limitTimer > 0) {
                char.limitTimer -= dt;

                // Shaking starts when limit is ending
                if (char.limitTimer < 15) {
                    this.game.screenShake = Math.max(this.game.screenShake, 0.1 * (1 - char.limitTimer / 15));
                    char.limitWarning = true;

                    if (char.limitTimer < 10) {
                        // Scream for limit
                        if (!char._limitCried) {
                            char.showAlert('LIMIT! DODAĆ!', 3);
                            this.game.addMessage('Ignacy krzyczy: LIMIT! DODAĆ!');
                            char._limitCried = true;
                            this.game.limitCrisis = true;
                            this.game.limitCrisisTimer = 15;
                        }
                    }
                }

                if (char.limitTimer <= 0) {
                    // Game over check handled in main game
                }
            }

            // Rats climb on Ignacy while gaming - he doesn't notice
            return;
        }

        // When not gaming, react to nearby rats
        const nearRat = this.findNearestRat(char);
        if (nearRat && nearRat.dist < TILE * 4) {
            // Ignacy tries to catch rats
            char.targetPath = findPath(
                char.tileX, char.tileY, nearRat.rat.tileX, nearRat.rat.tileY,
                (x, y) => this.game.map.isWalkable(char.floor, x, y)
            );
            char.pathIndex = 0;
        }

        // Random chance to start gaming
        if (char.state === 'idle' && Math.random() < 0.005 * dt) {
            this.startGaming(char);
        }
    }

    startGaming(char) {
        char.state = 'gaming';
        char.gamingTimer = 0;
        char.limitTimer = char.gameLimitTimer || 120;
        char.limitWarning = false;
        char._limitCried = false;
        this.game.addMessage(`${char.name} zaczyna grać!`);
    }

    addLimit(char) {
        char.limitTimer = char.gameLimitTimer || 120;
        char.limitWarning = false;
        char._limitCried = false;
        this.game.limitCrisis = false;
        this.game.addMessage(`Ktoś dodał limit ${char.name}!`);
        char.showAlert('Limit dodany!', 2);

        // Reduce stress
        this.game.globalStress = Math.max(0, this.game.globalStress - 20);
    }

    // === LENA AI ===
    updateLena(char, dt) {
        const nearRat = this.findNearestRat(char);

        if (nearRat && nearRat.dist < TILE * 3) {
            // Lena jumps on chair and throws Nintendo
            if (char.state !== 'screaming') {
                char.state = 'screaming';
                char.stateTimer = 30;  // 30 second timer
                char.showAlert('AAAA! SZCZUR!!!', 2);
                this.game.addMessage('Lena wrzeszczy na 150 decybeli!');
            }

            char.stateTimer -= dt;

            // Throw Nintendo at rat
            if (char.interactionCooldown <= 0) {
                this.game.interactions.throwItem(char, nearRat.rat, 999);
                char.interactionCooldown = 2;
            }

            if (char.stateTimer <= 0) {
                // 30 seconds passed - building damage!
                this.game.addMessage('Lena wrzeszczy za długo! Dom się rozpada!');
                this.game.globalStress += 50;
                this.game.screenShake = 2;
            }
        } else {
            if (char.state === 'screaming') {
                char.state = 'idle';
                char.stateTimer = 0;
            }
        }

        // Best friend alert system
        const ignacy = this.game.characters.find(c => c.id === 'ignacy');
        if (ignacy && char.immobilizedTimer > 0) {
            if (ignacy.state !== 'gaming') {
                ignacy.showAlert('Lena w potrzebie!', 2);
            }
        }
    }

    // === BABCIA GOSIA AI ===
    updateBabciaGosia(char, dt) {
        // Check if rat in kitchen
        const ratsInKitchen = this.game.rats.filter(r =>
            r.alive && r.floor === char.floor &&
            (this.game.map.getRoomAt(r.floor, r.tileX, r.tileY) === 'kitchen1' ||
                this.game.map.getRoomAt(r.floor, r.tileX, r.tileY) === 'kitchen2')
        );

        if (ratsInKitchen.length > 0 && char.state !== 'raging') {
            // RAGE MODE
            char.state = 'raging';
            char.speed = 1.5;  // Faster when raging
            this.game.addMessage('Babcia Gosia się WKURZA! Szczur w kuchni!');
            this.game.globalStress += 5;
        }

        if (char.state === 'raging') {
            // Chase with klapek
            if (ratsInKitchen.length > 0) {
                const targetRat = ratsInKitchen[0];
                char.targetPath = findPath(
                    char.tileX, char.tileY, targetRat.tileX, targetRat.tileY,
                    (x, y) => this.game.map.isWalkable(char.floor, x, y)
                );
                char.pathIndex = 0;
                this.game.globalStress += dt * 2;
            } else {
                char.state = 'idle';
                char.speed = CHARACTER_DEFS.babcia_gosia.speed;
            }

            // Steam particles
            // (visual only, handled in draw)
        }

        // Duolingo addiction
        if (char.state === 'idle' && Math.random() < 0.003 * dt) {
            char.state = 'duolingo';
            char.stateTimer = rand(15, 30);
            this.game.addMessage('Babcia Gosia gra w Duolingo!');
        }

        if (char.state === 'duolingo') {
            char.stateTimer -= dt;
            if (char.stateTimer <= 0) {
                char.state = 'idle';
            }
        }
    }

    // === WITEK AI ===
    updateWitek(char, dt) {
        if (char.state === 'gaming') {
            char.gamingTimer += dt;
            // Witek screams while gaming
            if (Math.random() < 0.1 * dt) {
                this.game.screenShake = Math.max(this.game.screenShake, 0.3);
                this.game.globalStress += 2;
            }

            // Random chance to stop gaming
            if (Math.random() < 0.005 * dt) {
                char.state = 'idle';
                this.game.addMessage('Witek przestaje grać.');
            }

            // 50% chance of not hearing Ignacy's limit cry
            if (this.game.limitCrisis) {
                if (Math.random() > char.deafWhileGamingChance) {
                    // He heard! Add limit
                    const ignacy = this.game.characters.find(c => c.id === 'ignacy');
                    if (ignacy && ignacy.limitWarning) {
                        this.addLimit(ignacy);
                        char.state = 'idle';
                    }
                }
            }
            return;
        }

        // Rats flee from Witek (when not gaming)
        const nearRats = this.game.rats.filter(r =>
            r.alive && r.floor === char.floor &&
            dist({ x: r.px, y: r.py }, { x: char.px, y: char.py }) < TILE * 5
        );
        for (const rat of nearRats) {
            rat.fleeing = true;
        }

        // Cola spray attack (NPC behavior)
        if (nearRats.length > 0 && char.interactionCooldown <= 0) {
            const colaItem = this.game.map.items.find(i => i.type === 'cola' && !i.collected);
            if (colaItem) {
                char.showAlert('Cola + Mentos!', 1.5);
                for (const rat of nearRats) {
                    rat.fleeing = true;
                    rat.speed *= 0.5;
                }
                char.interactionCooldown = 5;
            }
        }

        // Random chance to start gaming
        if (char.state === 'idle' && Math.random() < 0.003 * dt) {
            char.state = 'gaming';
            this.game.addMessage('Witek zaczyna grać na Xbox!');
            this.game.screenShake = 0.2;
        }

        // Respond to limit crisis
        if (this.game.limitCrisis && char.state !== 'gaming') {
            const ignacy = this.game.characters.find(c => c.id === 'ignacy');
            if (ignacy) {
                this.addLimit(ignacy);
            }
        }
    }

    // === BLANKA AI ===
    updateBlanka(char, dt) {
        // Duolingo addiction
        if (char.state === 'duolingo') {
            char.stateTimer -= dt;
            if (char.stateTimer <= 0) {
                char.state = 'idle';
            }

            // 25% chance of not hearing limit crisis
            if (this.game.limitCrisis) {
                if (Math.random() > char.duolingoDeafChance) {
                    const ignacy = this.game.characters.find(c => c.id === 'ignacy');
                    if (ignacy && ignacy.limitWarning) {
                        this.addLimit(ignacy);
                        char.state = 'idle';
                    }
                }
            }
            return;
        }

        // Random duolingo
        if (char.state === 'idle' && Math.random() < 0.004 * dt) {
            char.state = 'duolingo';
            char.stateTimer = rand(10, 25);
            this.game.addMessage('Blanka gra w Duolingo!');
        }

        // Respond to limit crisis (always hears when not in duolingo)
        if (this.game.limitCrisis && char.state !== 'duolingo') {
            const ignacy = this.game.characters.find(c => c.id === 'ignacy');
            if (ignacy) {
                this.addLimit(ignacy);
            }
        }

        // Blanka can reduce stress
        if (char.state === 'idle') {
            // Calming presence
            this.game.globalStress = Math.max(0, this.game.globalStress - dt * 0.5);
        }
    }

    // === PAWEŁ AI ===
    updatePawel(char, dt) {
        if (char.state === 'working') {
            char.stateTimer -= dt;
            if (char.stateTimer <= 0) {
                char.state = 'idle';
                this.game.addMessage('Paweł skończył pracować.');
            }
            return;
        }

        // Random work mode
        if (char.state === 'idle' && Math.random() < 0.003 * dt) {
            char.state = 'working';
            char.stateTimer = rand(20, 40);
            this.game.addMessage('Paweł zaczyna pracować!');
        }

        // Jiu-jitsu: grab nearby children on sofa
        if (char.state === 'idle') {
            const nearbyKids = this.game.characters.filter(c =>
                c.isChild && c.floor === char.floor &&
                dist({ x: c.px, y: c.py }, { x: char.px, y: char.py }) < TILE * 2 &&
                c.immobilizedTimer <= 0
            );

            // Hug attack on sofa (slow down game for kid)
            if (nearbyKids.length > 0 && Math.random() < 0.01 * dt) {
                const kid = choose(nearbyKids);
                this.jiuJitsu(char, kid);
            }
        }

        // Babcia Gosia can stop Paweł
        const babcia = this.game.characters.find(c => c.id === 'babcia_gosia');
        if (babcia && babcia.state === 'raging') {
            if (dist({ x: babcia.px, y: babcia.py }, { x: char.px, y: char.py }) < TILE * 3) {
                char.slowTimer = 5;
                char.showAlert('Mama patrzy groźnie...', 2);
            }
        }
    }

    jiuJitsu(pawel, target) {
        target.immobilizedTimer = 10;
        target.state = 'immobilized';
        pawel.showAlert('Dźwignia!', 2);
        target.showAlert('Pomocy!', 2);
        this.game.addMessage(`Paweł złapał ${target.name} w dźwignię!`);

        // Alert best friend
        const friend = this.game.characters.find(c => c.id === target.bestFriend);
        if (friend && friend.state !== 'gaming') {
            friend.showAlert(`${target.name} złapany!`, 3);
        }
    }

    // Helper: find nearest rat to character
    findNearestRat(char) {
        let nearest = null;
        let minD = Infinity;

        for (const rat of this.game.rats) {
            if (!rat.alive || rat.floor !== char.floor) continue;
            const d = dist({ x: char.px, y: char.py }, { x: rat.px, y: rat.py });
            if (d < minD) {
                minD = d;
                nearest = { rat, dist: d };
            }
        }

        return nearest;
    }
}
