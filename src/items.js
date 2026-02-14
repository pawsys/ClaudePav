// ============================================================
// SZCZURY Z KAMIEŃCA - Items & Interactions
// ============================================================

const KILL_METHOD_ITEMS = {
    patelnia: { item: 'patelnia', range: 1, action: 'hit', damage: 30 },
    bow: { item: 'bow', range: 5, action: 'shoot', damage: 40 },
    thermomix: { item: 'thermomix', range: 1, action: 'use_station', damage: 999 },
    window: { item: null, range: 1, action: 'throw_window', damage: 999 },
    odkurzacz: { item: 'odkurzacz', range: 2, action: 'vacuum', damage: 30 },
    dogs: { item: null, range: 0, action: 'command_dogs', damage: 50 },
    tv: { item: null, range: 1, action: 'push_tv', damage: 999 },
    dhl_truck: { item: null, range: 0, action: 'call_dhl', damage: 999 },
    cat: { item: null, range: 0, action: 'command_cat', damage: 999 },
    microwave: { item: null, range: 1, action: 'use_station', damage: 999 },
    minecraft_portal: { item: null, range: 1, action: 'use_station', damage: 999 },
    leaves: { item: 'leaves', range: 1, action: 'hit', damage: 10 },
    klapek: { item: 'klapek', range: 1, action: 'hit', damage: 40 },
    bojler: { item: null, range: 1, action: 'use_station', damage: 999 },
    ekspres: { item: null, range: 1, action: 'use_station', damage: 999 },
    cage: { item: 'cage', range: 1, action: 'catch', damage: 999 },
    nintendo_throw: { item: 'nintendo', range: 4, action: 'throw', damage: 999 },
};

// Station-based kill methods: rat must be brought near the station
const STATION_KILLS = {
    thermomix: { stationItem: 'thermomix', floor: FLOORS.GROUND },
    microwave: { stationItem: 'microwave', floor: FLOORS.GROUND },
    minecraft_portal: { stationItem: 'minecraft_portal', floor: FLOORS.UPPER },
    bojler: { stationItem: 'bojler', floor: FLOORS.GROUND },
    ekspres: { stationItem: 'ekspres', floor: FLOORS.GROUND },
};

class InteractionSystem {
    constructor(game) {
        this.game = game;
        this.carriedRat = null;  // Currently carried rat
        this.dhlTimer = 0;
        this.dhlActive = false;
    }

    // Try to interact with nearest rat using current method
    tryKillRat(player, method) {
        const methodInfo = KILL_METHOD_ITEMS[method];
        if (!methodInfo) return false;

        // Find nearest rat of matching type within range
        const range = methodInfo.range * TILE;
        let targetRat = null;
        let minDist = Infinity;

        for (const rat of this.game.rats) {
            if (!rat.alive || rat.floor !== player.floor) continue;
            if (rat.killMethod !== method && method !== 'nintendo_throw') continue;

            const d = dist({ x: player.px, y: player.py }, { x: rat.px, y: rat.py });
            if (d < range + TILE && d < minDist) {
                minDist = d;
                targetRat = rat;
            }
        }

        if (!targetRat) return false;

        // Check if player has required item
        if (methodInfo.item && !player.hasItem(methodInfo.item)) {
            player.showAlert(`Potrzebujesz: ${methodInfo.item}!`, 1.5);
            return false;
        }

        return this.executeKill(player, targetRat, method, methodInfo);
    }

    executeKill(player, rat, method, methodInfo) {
        switch (methodInfo.action) {
            case 'hit':
                return this.hitRat(player, rat, methodInfo.damage, method);
            case 'shoot':
                return this.shootRat(player, rat, methodInfo.damage);
            case 'vacuum':
                return this.vacuumRat(player, rat);
            case 'throw_window':
                return this.throwThroughWindow(player, rat);
            case 'push_tv':
                return this.pushTV(player, rat);
            case 'use_station':
                return this.useStation(player, rat, method);
            case 'command_dogs':
                return this.commandDogs(player, rat);
            case 'command_cat':
                return this.commandCat(player, rat);
            case 'call_dhl':
                return this.callDHL(player, rat);
            case 'throw':
                return this.throwItem(player, rat, methodInfo.damage);
            case 'catch':
                return this.catchRat(player, rat);
            default:
                return false;
        }
    }

    hitRat(player, rat, damage, method) {
        const killed = rat.takeDamage(damage, method);
        this.game.addEffect(rat.px, rat.py, 'hit');
        this.game.screenShake = 0.2;

        if (killed) {
            this.onRatKilled(player, rat);
            return true;
        }

        if (method === 'leaves') {
            player.showAlert(`Liście: ${rat.hitCount}/10`, 1);
        }
        return false;
    }

    shootRat(player, rat, damage) {
        const killed = rat.takeDamage(damage, 'bow');
        this.game.addEffect(rat.px, rat.py, 'hit');

        // Arrow animation
        this.game.addProjectile(player.px, player.py, rat.px, rat.py, '#8B4513');

        if (killed) {
            this.onRatKilled(player, rat);
            return true;
        }
        return false;
    }

    vacuumRat(player, rat) {
        // Pull rat toward player
        const dx = player.px - rat.px;
        const dy = player.py - rat.py;
        const d = Math.sqrt(dx * dx + dy * dy);

        if (d < TILE * 1.5) {
            rat.takeDamage(999, 'odkurzacz');
            this.game.addEffect(rat.px, rat.py, 'catch');
            this.onRatKilled(player, rat);
            return true;
        } else {
            // Pull effect
            rat.px += (dx / d) * TILE * 0.5;
            rat.py += (dy / d) * TILE * 0.5;
            player.showAlert('Wciąganie...', 0.5);
        }
        return false;
    }

    throwThroughWindow(player, rat) {
        // Check if near a window
        const nearWindow = this.isNearTile(player, T.WINDOW);
        if (!nearWindow) {
            player.showAlert('Podejdź do okna!', 1);
            return false;
        }

        if (dist({ x: player.px, y: player.py }, { x: rat.px, y: rat.py }) < TILE * 2) {
            rat.takeDamage(999, 'window');
            this.game.addEffect(rat.px, rat.py, 'catch');
            this.onRatKilled(player, rat);
            return true;
        }
        return false;
    }

    pushTV(player, rat) {
        // Must be near the TV furniture
        const tvItem = this.game.map.items.find(i => i.type === 'tv' && i.floor === player.floor);
        if (!tvItem) {
            player.showAlert('Znajdź telewizor!', 1);
            return false;
        }

        const nearTV = dist({ x: player.px, y: player.py }, { x: tvItem.x * TILE, y: tvItem.y * TILE }) < TILE * 2;
        const ratNearTV = dist({ x: rat.px, y: rat.py }, { x: tvItem.x * TILE, y: tvItem.y * TILE }) < TILE * 2;

        if (nearTV && ratNearTV) {
            rat.takeDamage(999, 'tv');
            this.game.addEffect(tvItem.x * TILE, tvItem.y * TILE, 'hit');
            this.game.screenShake = 0.5;
            this.onRatKilled(player, rat);
            return true;
        }

        player.showAlert('Zwabiaj szczura pod TV!', 1);
        return false;
    }

    useStation(player, rat, method) {
        const station = STATION_KILLS[method];
        if (!station) return false;

        const stationItem = this.game.map.items.find(
            i => i.type === station.stationItem && i.floor === player.floor
        );
        if (!stationItem) {
            player.showAlert('Znajdź stację!', 1);
            return false;
        }

        const nearStation = dist(
            { x: player.px, y: player.py },
            { x: stationItem.x * TILE, y: stationItem.y * TILE }
        ) < TILE * 2;

        const ratNearStation = dist(
            { x: rat.px, y: rat.py },
            { x: stationItem.x * TILE, y: stationItem.y * TILE }
        ) < TILE * 2.5;

        if (nearStation && ratNearStation) {
            rat.takeDamage(999, method);
            this.game.addEffect(stationItem.x * TILE, stationItem.y * TILE, 'catch');

            if (method === 'minecraft_portal') {
                player.showAlert('Szczur zgubił się w Minecraft!', 2);
            } else if (method === 'thermomix') {
                player.showAlert('Ugotowano w Thermomixie!', 2);
            } else if (method === 'microwave') {
                player.showAlert('Mikrofala... bzzzz!', 2);
            }

            this.onRatKilled(player, rat);
            return true;
        }

        player.showAlert(`Zwabiaj do: ${stationItem.name}!`, 1);
        return false;
    }

    commandDogs(player, rat) {
        const dogs = Object.values(this.game.pets).filter(p => p.type.startsWith('dog'));
        const dogsNear = dogs.filter(d =>
            d.floor === rat.floor &&
            dist({ x: d.px, y: d.py }, { x: rat.px, y: rat.py }) < TILE * 5
        );

        if (dogsNear.length >= 2) {
            // Both dogs chase the rat
            for (const dog of dogsNear) {
                dog.targetX = rat.tileX;
                dog.targetY = rat.tileY;
            }

            // Check if dogs reached rat
            const dogsOnRat = dogsNear.filter(d =>
                dist({ x: d.px, y: d.py }, { x: rat.px, y: rat.py }) < TILE * 2
            );

            if (dogsOnRat.length >= 2) {
                rat.takeDamage(999, 'dogs');
                this.game.addEffect(rat.px, rat.py, 'catch');
                this.onRatKilled(player, rat);
                return true;
            }

            player.showAlert('Psy gonią!', 1);
        } else {
            player.showAlert('Potrzeba 2 psów w pobliżu!', 1.5);
        }
        return false;
    }

    commandCat(player, rat) {
        const tula = this.game.pets.tula;
        if (!tula || tula.floor !== rat.floor) {
            player.showAlert('Gdzie jest Tula?', 1);
            return false;
        }

        const d = dist({ x: tula.px, y: tula.py }, { x: rat.px, y: rat.py });
        tula.targetX = rat.tileX;
        tula.targetY = rat.tileY;

        if (d < TILE * 1.5) {
            rat.takeDamage(999, 'cat');
            this.game.addEffect(rat.px, rat.py, 'catch');
            this.onRatKilled(player, rat);
            return true;
        }

        player.showAlert('Tula poluje...', 1);
        return false;
    }

    callDHL(player, rat) {
        if (rat.floor !== FLOORS.EXTERIOR) {
            player.showAlert('Szczur musi być na tarasie!', 1.5);
            return false;
        }

        if (!this.dhlActive) {
            this.dhlActive = true;
            this.dhlTimer = 3;
            player.showAlert('DHL jedzie!', 2);
            return false;
        }

        if (this.dhlTimer > 0) {
            return false;
        }

        // DHL arrived!
        rat.takeDamage(999, 'dhl_truck');
        this.game.addEffect(rat.px, rat.py, 'hit');
        this.game.screenShake = 1.0;
        this.dhlActive = false;
        this.onRatKilled(player, rat);
        player.showAlert('DHL dostarczył!', 2);
        return true;
    }

    throwItem(player, rat, damage) {
        rat.takeDamage(damage, 'nintendo_throw');
        this.game.addProjectile(player.px, player.py, rat.px, rat.py, '#FF0000');
        this.game.addEffect(rat.px, rat.py, 'hit');

        if (!rat.alive) {
            this.onRatKilled(player, rat);
            return true;
        }
        return false;
    }

    catchRat(player, rat) {
        if (!player.hasItem('cage')) {
            player.showAlert('Potrzebujesz klatki!', 1);
            return false;
        }

        if (dist({ x: player.px, y: player.py }, { x: rat.px, y: rat.py }) < TILE * 1.5) {
            rat.tamed = true;
            rat.alive = false;
            rat.deathTimer = 1;
            player.showAlert('Szczur oswojony!', 2);
            this.onRatKilled(player, rat);
            return true;
        }
        return false;
    }

    onRatKilled(player, rat) {
        player.ratKills++;
        this.game.ratsKilled++;
        this.game.addMessage(`${player.name} pokonał: ${rat.name}!`);
        this.game.killedTypes.add(rat.type);

        // Check if all required rats killed
        this.checkVictoryCondition();
    }

    checkVictoryCondition() {
        const requiredTypes = Object.keys(RAT_TYPES).filter(t => t !== 'tame');
        const allKilled = requiredTypes.every(t => this.game.killedTypes.has(t));

        if (allKilled && !this.game.hasKey) {
            this.game.hasKey = true;
            this.game.player.hasKey = true;
            this.game.addMessage('KLUCZ DO STRYCHU wypadł z ostatniego szczura!');
            this.game.addMessage('Znajdź Witka i razem otwórzcie strych!');
        }
    }

    isNearTile(entity, tileType) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const tx = entity.tileX + dx;
                const ty = entity.tileY + dy;
                if (this.game.map.getTile(entity.floor, tx, ty) === tileType) {
                    return { x: tx, y: ty };
                }
            }
        }
        return null;
    }

    // DHL truck update
    update(dt) {
        if (this.dhlActive && this.dhlTimer > 0) {
            this.dhlTimer -= dt;
        }
    }
}
