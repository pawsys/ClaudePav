// ============================================================
// SZCZURY Z KAMIEŃCA - Pixel Art Sprite System
// ============================================================

class PixelSprite {
    static drawCharacter(ctx, x, y, config, frame, dir, scale) {
        const s = scale || 1;
        const f = Math.floor(frame) % 4;
        const sz = TILE * s;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(x + 2, y + sz - 2, sz - 4, 2);

        // Body
        ctx.fillStyle = config.bodyColor;
        ctx.fillRect(x + 3, y + 6, sz - 6, sz - 8);

        // Shirt/clothes
        ctx.fillStyle = config.clothesColor;
        ctx.fillRect(x + 3, y + 6, sz - 6, 5);

        // Head
        ctx.fillStyle = config.skinColor;
        ctx.fillRect(x + 4, y + 1, sz - 8, 6);

        // Hair
        ctx.fillStyle = config.hairColor;
        ctx.fillRect(x + 4, y, sz - 8, 3);
        if (config.longHair) {
            ctx.fillRect(x + 3, y + 1, 1, 5);
            ctx.fillRect(x + sz - 4, y + 1, 1, 5);
        }
        if (config.braids) {
            ctx.fillRect(x + 2, y + 3, 2, 6);
            ctx.fillRect(x + sz - 4, y + 3, 2, 6);
        }

        // Eyes
        ctx.fillStyle = config.eyeColor || '#000';
        ctx.fillRect(x + 5, y + 3, 2, 2);
        ctx.fillRect(x + sz - 7, y + 3, 2, 2);

        // Glasses
        if (config.glasses) {
            ctx.fillStyle = '#333';
            ctx.fillRect(x + 4, y + 2, 3, 3);
            ctx.fillRect(x + sz - 7, y + 2, 3, 3);
            ctx.fillRect(x + 7, y + 3, sz - 14, 1);
            // Lens
            ctx.fillStyle = '#88AACC';
            ctx.fillRect(x + 5, y + 3, 1, 1);
            ctx.fillRect(x + sz - 6, y + 3, 1, 1);
        }

        // Beard
        if (config.beard) {
            ctx.fillStyle = config.beardColor || config.hairColor;
            ctx.fillRect(x + 5, y + 5, sz - 10, 3);
        }

        // Cat mask (Lena)
        if (config.catMask) {
            ctx.fillStyle = config.catMaskColor || '#FFA0B0';
            ctx.fillRect(x + 4, y + 1, 2, 2);
            ctx.fillRect(x + sz - 6, y + 1, 2, 2);
        }

        // Walking animation
        if (f === 1 || f === 3) {
            ctx.fillStyle = config.bodyColor;
            ctx.fillRect(x + 4, y + sz - 3, 3, 1);
            ctx.fillRect(x + sz - 7, y + sz - 2, 3, 1);
        } else {
            ctx.fillStyle = config.bodyColor;
            ctx.fillRect(x + 5, y + sz - 2, 2, 1);
            ctx.fillRect(x + sz - 7, y + sz - 2, 2, 1);
        }

        // Direction indicator
        ctx.fillStyle = '#FFF';
        if (dir === 'up') ctx.fillRect(x + sz / 2 - 1, y - 1, 2, 1);
        else if (dir === 'down') ctx.fillRect(x + sz / 2 - 1, y + sz, 2, 1);
        else if (dir === 'left') ctx.fillRect(x - 1, y + sz / 2, 1, 2);
        else if (dir === 'right') ctx.fillRect(x + sz, y + sz / 2, 1, 2);

        // Held item
        if (config.heldItem) {
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(x + sz - 2, y + 6, 4, 4);
        }

        // Stress steam
        if (config.stressed) {
            ctx.fillStyle = '#FF4444';
            const steamOff = Math.sin(Date.now() / 200) * 2;
            ctx.fillRect(x + 4, y - 3 + steamOff, 2, 2);
            ctx.fillRect(x + sz - 6, y - 4 - steamOff, 2, 2);
        }
    }

    static drawRat(ctx, x, y, color, frame, size) {
        const s = size || 1;
        const f = Math.floor(frame) % 4;
        const w = Math.floor(10 * s);
        const h = Math.floor(6 * s);

        // Body
        ctx.fillStyle = color;
        ctx.fillRect(x, y + 2, w, h);

        // Head
        ctx.fillRect(x + w - 3, y + 1, 4, 4);

        // Ears
        ctx.fillStyle = '#FFB6C1';
        ctx.fillRect(x + w - 2, y, 2, 2);
        ctx.fillRect(x + w, y, 2, 2);

        // Eyes
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(x + w, y + 2, 1, 1);

        // Tail
        ctx.fillStyle = '#FFB6C1';
        const tailWag = f % 2 === 0 ? -1 : 1;
        ctx.fillRect(x - 3, y + 3 + tailWag, 4, 1);
        ctx.fillRect(x - 5, y + 2 + tailWag, 3, 1);

        // Legs (animated)
        ctx.fillStyle = color;
        if (f < 2) {
            ctx.fillRect(x + 2, y + h + 2, 2, 2);
            ctx.fillRect(x + w - 4, y + h + 2, 2, 2);
        } else {
            ctx.fillRect(x + 1, y + h + 2, 2, 2);
            ctx.fillRect(x + w - 3, y + h + 2, 2, 2);
        }
    }

    static drawBossRat(ctx, x, y, frame) {
        const f = Math.floor(frame) % 4;

        // Green smoke
        ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
        for (let i = 0; i < 5; i++) {
            const sx = x - 10 + Math.sin(Date.now() / 300 + i) * 15;
            const sy = y - 5 + Math.cos(Date.now() / 400 + i) * 8;
            ctx.fillRect(sx, sy, 6, 6);
        }

        // Giant body
        ctx.fillStyle = '#4A0000';
        ctx.fillRect(x - 12, y, 32, 18);

        // Head
        ctx.fillRect(x + 18, y - 4, 12, 14);

        // Crown
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(x + 19, y - 8, 10, 4);
        ctx.fillRect(x + 19, y - 10, 3, 3);
        ctx.fillRect(x + 23, y - 11, 3, 3);
        ctx.fillRect(x + 27, y - 10, 3, 3);

        // Red eyes
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(x + 24, y - 1, 3, 3);
        ctx.fillRect(x + 28, y - 1, 3, 3);
        // Eye glow
        if (f % 2 === 0) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.fillRect(x + 23, y - 2, 5, 5);
        }

        // Teeth
        ctx.fillStyle = '#FFF';
        ctx.fillRect(x + 25, y + 6, 2, 3);
        ctx.fillRect(x + 28, y + 6, 2, 3);

        // Ears
        ctx.fillStyle = '#800040';
        ctx.fillRect(x + 20, y - 6, 4, 3);
        ctx.fillRect(x + 26, y - 6, 4, 3);

        // Tail
        ctx.fillStyle = '#800040';
        const tw = f % 2 === 0 ? -2 : 2;
        ctx.fillRect(x - 18, y + 6 + tw, 8, 2);
        ctx.fillRect(x - 24, y + 4 + tw, 8, 2);

        // Legs
        ctx.fillStyle = '#4A0000';
        ctx.fillRect(x - 8, y + 18, 5, 4);
        ctx.fillRect(x + 4, y + 18, 5, 4);
        ctx.fillRect(x + 14, y + 18, 5, 4);
    }

    static drawPet(ctx, x, y, type, frame) {
        const f = Math.floor(frame) % 4;

        if (type === 'dog1' || type === 'dog2') {
            // Dog body
            ctx.fillStyle = type === 'dog1' ? '#C4A35A' : '#333';
            ctx.fillRect(x, y + 3, 12, 7);
            if (type === 'dog2') {
                // Black and white patches
                ctx.fillStyle = '#FFF';
                ctx.fillRect(x + 3, y + 4, 4, 4);
            }
            // Head
            ctx.fillStyle = type === 'dog1' ? '#C4A35A' : '#333';
            ctx.fillRect(x + 10, y + 1, 6, 6);
            // Ears
            ctx.fillRect(x + 10, y - 1, 3, 3);
            ctx.fillRect(x + 14, y - 1, 3, 3);
            // Eyes
            ctx.fillStyle = '#000';
            ctx.fillRect(x + 12, y + 2, 1, 1);
            ctx.fillRect(x + 14, y + 2, 1, 1);
            // Tail
            ctx.fillStyle = type === 'dog1' ? '#C4A35A' : '#333';
            const tw = f % 2 === 0 ? -2 : 0;
            ctx.fillRect(x - 3, y + 2 + tw, 4, 2);
            // Legs
            if (f < 2) {
                ctx.fillRect(x + 1, y + 10, 2, 3);
                ctx.fillRect(x + 8, y + 10, 2, 3);
            } else {
                ctx.fillRect(x + 2, y + 10, 2, 3);
                ctx.fillRect(x + 9, y + 10, 2, 3);
            }
        } else if (type === 'cat') {
            // Tula - calico cat
            ctx.fillStyle = '#FFA500'; // Orange
            ctx.fillRect(x, y + 3, 10, 6);
            ctx.fillStyle = '#FFF'; // White patches
            ctx.fillRect(x + 3, y + 4, 3, 3);
            ctx.fillStyle = '#333'; // Black patches
            ctx.fillRect(x + 7, y + 3, 3, 3);
            // Head
            ctx.fillStyle = '#FFA500';
            ctx.fillRect(x + 8, y, 6, 5);
            ctx.fillStyle = '#FFF';
            ctx.fillRect(x + 9, y + 1, 2, 2);
            // Ears
            ctx.fillStyle = '#FFA500';
            ctx.fillRect(x + 8, y - 2, 2, 3);
            ctx.fillRect(x + 12, y - 2, 2, 3);
            // Eyes (green-yellow)
            ctx.fillStyle = '#7CFC00';
            ctx.fillRect(x + 10, y + 1, 2, 2);
            ctx.fillRect(x + 13, y + 1, 2, 2);
            ctx.fillStyle = '#000';
            ctx.fillRect(x + 11, y + 1, 1, 1);
            ctx.fillRect(x + 14, y + 1, 1, 1);
            // Tail
            ctx.fillStyle = '#333';
            const ct = Math.sin(Date.now() / 300) * 2;
            ctx.fillRect(x - 4, y + 3 + ct, 5, 1);
            ctx.fillRect(x - 5, y + 1 + ct, 2, 2);
        }
    }

    static drawEffect(ctx, x, y, type, progress) {
        const p = progress; // 0 to 1

        if (type === 'hit') {
            ctx.fillStyle = `rgba(255, 255, 0, ${1 - p})`;
            const size = 8 + p * 12;
            ctx.fillRect(x - size / 2, y - size / 2, size, size);
        } else if (type === 'smoke') {
            ctx.fillStyle = `rgba(0, 255, 0, ${0.5 - p * 0.5})`;
            for (let i = 0; i < 3; i++) {
                const ox = Math.sin(i * 2 + p * 5) * (5 + p * 10);
                const oy = -p * 15 + Math.cos(i * 3) * 5;
                ctx.fillRect(x + ox, y + oy, 4, 4);
            }
        } else if (type === 'stress') {
            ctx.fillStyle = `rgba(255, 0, 0, ${0.8 - p * 0.8})`;
            ctx.font = `${8 + p * 4}px monospace`;
            ctx.fillText('!', x, y - p * 10);
        } else if (type === 'catch') {
            ctx.fillStyle = `rgba(255, 215, 0, ${1 - p})`;
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2 + p * 3;
                const r = p * 15;
                ctx.fillRect(x + Math.cos(angle) * r, y + Math.sin(angle) * r, 3, 3);
            }
        } else if (type === 'scream') {
            ctx.fillStyle = `rgba(255, 100, 100, ${1 - p})`;
            const rings = 3;
            for (let i = 0; i < rings; i++) {
                const r = (p + i * 0.3) * 20;
                ctx.strokeStyle = `rgba(255, 100, 100, ${(1 - p) * 0.5})`;
                ctx.lineWidth = 1;
                ctx.strokeRect(x - r, y - r, r * 2, r * 2);
            }
        }
    }
}
