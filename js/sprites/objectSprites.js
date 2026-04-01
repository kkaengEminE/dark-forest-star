// Procedural object sprites
const ObjectSprites = {
    sprites: {},

    init() {
        // Bus stop sign (16x32)
        this.sprites.busStop = this._create(16, 32, (ctx) => {
            // Pole
            ctx.fillStyle = '#888888';
            ctx.fillRect(7, 8, 2, 24);
            // Sign
            ctx.fillStyle = '#2266aa';
            ctx.fillRect(2, 0, 12, 10);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(4, 2, 2, 1); // B
            ctx.fillRect(4, 4, 2, 1);
            ctx.fillRect(4, 6, 2, 1);
            ctx.fillRect(4, 2, 1, 5);
            ctx.fillRect(8, 2, 2, 1); // U
            ctx.fillRect(8, 6, 2, 1);
            ctx.fillRect(8, 2, 1, 5);
            ctx.fillRect(9, 2, 1, 5);
            ctx.fillRect(11, 2, 2, 1); // S
            ctx.fillRect(11, 4, 2, 1);
            ctx.fillRect(11, 6, 2, 1);
        });

        // Door (16x16)
        this.sprites.door = this._create(16, 16, (ctx) => {
            ctx.fillStyle = '#8B6914';
            ctx.fillRect(3, 0, 10, 16);
            ctx.fillStyle = '#7a5a0a';
            ctx.fillRect(3, 0, 10, 1);
            ctx.fillRect(3, 0, 1, 16);
            ctx.fillRect(12, 0, 1, 16);
            // Doorknob
            ctx.fillStyle = '#ddcc00';
            ctx.fillRect(10, 8, 2, 2);
        });

        // Carrot plant (16x16)
        this.sprites.carrot = this._create(16, 16, (ctx) => {
            // Green top
            ctx.fillStyle = '#44aa33';
            ctx.fillRect(5, 0, 2, 5);
            ctx.fillRect(8, 1, 2, 4);
            ctx.fillRect(3, 2, 2, 3);
            // Orange carrot peeking
            ctx.fillStyle = '#ff8833';
            ctx.fillRect(6, 5, 3, 4);
            ctx.fillRect(7, 9, 2, 3);
            ctx.fillRect(7, 12, 1, 2);
        });

        // Carrot harvested (empty plot)
        this.sprites.carrotEmpty = this._create(16, 16, (ctx) => {
            ctx.fillStyle = '#6a5030';
            ctx.fillRect(4, 6, 8, 4);
            ctx.fillStyle = '#5a4020';
            ctx.fillRect(5, 7, 6, 2);
        });

        // Windmill (32x48)
        this.sprites.windmill = this._create(32, 48, (ctx) => {
            // Base
            ctx.fillStyle = '#ccbbaa';
            ctx.fillRect(10, 20, 12, 28);
            ctx.fillStyle = '#bbaa99';
            ctx.fillRect(10, 20, 12, 2);
            // Roof
            ctx.fillStyle = '#884444';
            ctx.fillRect(8, 16, 16, 6);
            ctx.fillRect(10, 14, 12, 4);
            // Blades
            ctx.fillStyle = '#aa9988';
            ctx.fillRect(14, 2, 4, 14);
            ctx.fillRect(6, 22, 20, 3);
            // Center
            ctx.fillStyle = '#666666';
            ctx.fillRect(15, 22, 2, 2);
            // Door
            ctx.fillStyle = '#7a5a0a';
            ctx.fillRect(13, 38, 6, 10);
        });

        // Bed (32x32)
        this.sprites.bed = this._create(32, 32, (ctx) => {
            // Frame
            ctx.fillStyle = '#8B6914';
            ctx.fillRect(0, 4, 32, 28);
            // Mattress
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(2, 6, 28, 22);
            // Pillow
            ctx.fillStyle = '#eeeeff';
            ctx.fillRect(4, 8, 10, 6);
            // Blanket
            ctx.fillStyle = '#4466aa';
            ctx.fillRect(2, 16, 28, 12);
        });

        // Desk (32x24)
        this.sprites.desk = this._create(32, 24, (ctx) => {
            // Top
            ctx.fillStyle = '#8B7355';
            ctx.fillRect(0, 0, 32, 8);
            // Legs
            ctx.fillStyle = '#7a6345';
            ctx.fillRect(2, 8, 4, 16);
            ctx.fillRect(26, 8, 4, 16);
            // Drawer
            ctx.fillStyle = '#9B8365';
            ctx.fillRect(10, 8, 12, 10);
            ctx.fillStyle = '#ddcc00';
            ctx.fillRect(15, 12, 2, 2);
        });

        // Tree (16x32)
        this.sprites.tree = this._create(16, 32, (ctx) => {
            // Trunk
            ctx.fillStyle = '#8B6914';
            ctx.fillRect(6, 16, 4, 16);
            // Foliage
            ctx.fillStyle = '#337733';
            ctx.fillRect(2, 4, 12, 14);
            ctx.fillRect(0, 8, 16, 8);
            ctx.fillStyle = '#448844';
            ctx.fillRect(4, 2, 8, 4);
            ctx.fillRect(3, 6, 10, 6);
        });

        // TAX Building sign (48x16)
        this.sprites.taxSign = this._create(48, 16, (ctx) => {
            ctx.fillStyle = '#333344';
            ctx.fillRect(0, 0, 48, 16);
            ctx.fillStyle = '#ffffff';
            // T
            ctx.fillRect(4, 3, 8, 2);
            ctx.fillRect(7, 3, 2, 10);
            // A
            ctx.fillRect(16, 5, 2, 8);
            ctx.fillRect(22, 5, 2, 8);
            ctx.fillRect(16, 3, 8, 2);
            ctx.fillRect(16, 8, 8, 2);
            // X
            ctx.fillRect(28, 3, 2, 2);
            ctx.fillRect(36, 3, 2, 2);
            ctx.fillRect(30, 5, 2, 2);
            ctx.fillRect(34, 5, 2, 2);
            ctx.fillRect(32, 7, 2, 2);
            ctx.fillRect(30, 9, 2, 2);
            ctx.fillRect(34, 9, 2, 2);
            ctx.fillRect(28, 11, 2, 2);
            ctx.fillRect(36, 11, 2, 2);
        });

        // Pixel bus for loading screen (64x32)
        this.sprites.bus = this._create(64, 32, (ctx) => {
            // Body
            ctx.fillStyle = '#dd8833';
            ctx.fillRect(4, 4, 56, 20);
            // Roof
            ctx.fillStyle = '#cc7722';
            ctx.fillRect(6, 0, 52, 6);
            // Windows
            ctx.fillStyle = '#aaddff';
            ctx.fillRect(8, 6, 10, 8);
            ctx.fillRect(22, 6, 10, 8);
            ctx.fillRect(36, 6, 10, 8);
            ctx.fillRect(50, 6, 8, 8);
            // Wheels
            ctx.fillStyle = '#333333';
            ctx.fillRect(10, 24, 8, 8);
            ctx.fillRect(46, 24, 8, 8);
            ctx.fillStyle = '#666666';
            ctx.fillRect(12, 26, 4, 4);
            ctx.fillRect(48, 26, 4, 4);
            // Headlight
            ctx.fillStyle = '#ffff88';
            ctx.fillRect(58, 16, 4, 4);
        });

        // Interaction prompt icon (small arrow)
        this.sprites.prompt = this._create(16, 8, (ctx) => {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(6, 0, 4, 4);
            ctx.fillRect(4, 4, 8, 2);
            ctx.fillRect(2, 6, 12, 2);
        });
    },

    _create(w, h, drawFn) {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');
        drawFn(ctx);
        return c;
    },

    draw(ctx, name, x, y) {
        const sprite = this.sprites[name];
        if (sprite) {
            ctx.drawImage(sprite, x, y);
        }
    }
};
