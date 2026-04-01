// Room Scene - interior of house/cottage
const RoomScene = {
    TILE_SIZE: 16,
    MAP_COLS: 20,
    MAP_ROWS: 15,
    tileMap: [],
    interactables: [],
    previousScene: 'city', // Where we came from
    offsetX: 0,
    offsetY: 0,

    T: {
        FLOOR: 0,
        WALL: 1,
        CARPET: 2,
        DOOR: 3,
    },

    solidTiles: null,

    tileNames: ['floor', 'wall', 'carpet', 'door'],

    _buildMap() {
        const T = this.T;
        const map = [];

        for (let r = 0; r < this.MAP_ROWS; r++) {
            map[r] = [];
            for (let c = 0; c < this.MAP_COLS; c++) {
                let tile = T.FLOOR;

                // Walls around edges
                if (r === 0 || r === this.MAP_ROWS - 1 || c === 0 || c === this.MAP_COLS - 1) {
                    tile = T.WALL;
                }

                // Carpet in center
                if (r >= 6 && r <= 10 && c >= 7 && c <= 12) {
                    tile = T.CARPET;
                }

                // Door at bottom center
                if (r === this.MAP_ROWS - 1 && c >= 9 && c <= 10) {
                    tile = T.DOOR;
                }

                map[r][c] = tile;
            }
        }

        this.tileMap = map;
        this.solidTiles = new Set([T.WALL]);
    },

    _buildInteractables() {
        const ox = this.offsetX;
        const oy = this.offsetY;
        // Door to exit - positions include offset for screen-space interaction
        this.interactables = [
            {
                x: ox + 9.5 * 16 + 8,
                y: oy + (this.MAP_ROWS - 1) * 16 + 8,
                type: 'door',
                action: () => {
                    if (this.previousScene === 'farm') {
                        SceneManager.switchScene('farm', { x: 34 * 16, y: 14 * 16 });
                    } else {
                        SceneManager.switchScene('city', { x: 8 * 16, y: 34 * 16 });
                    }
                }
            }
        ];
    },

    onEnter(data) {
        if (data && data.from) {
            this.previousScene = data.from;
        }

        this.offsetX = (Game.width - this.MAP_COLS * 16) / 2;
        this.offsetY = (Game.height - this.MAP_ROWS * 16) / 2;

        this._buildMap();
        this._buildInteractables();

        // Start in center of room (in screen coords including offset)
        Player.setPosition(
            this.offsetX + (this.MAP_COLS / 2) * 16 - 16,
            this.offsetY + (this.MAP_ROWS / 2) * 16
        );
    },

    onExit() {},

    update(dt) {
        // Player operates in screen coords (offset already baked in)
        // But collision needs room-local tile map, so we translate the player bbox
        Player.update(dt, this.tileMap, this.solidTiles, this.offsetX, this.offsetY);
        Interaction.check(this.interactables);
        UI.update(dt);
    },

    render(ctx) {
        // Fill background with dark color
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, Game.width, Game.height);

        // Draw tile map at offset
        for (let r = 0; r < this.MAP_ROWS; r++) {
            for (let c = 0; c < this.MAP_COLS; c++) {
                const tile = this.tileMap[r][c];
                TileSprites.draw(ctx, this.tileNames[tile],
                    this.offsetX + c * 16, this.offsetY + r * 16);
            }
        }

        // Draw furniture
        ObjectSprites.draw(ctx, 'bed', this.offsetX + 2 * 16, this.offsetY + 2 * 16);
        ObjectSprites.draw(ctx, 'desk', this.offsetX + 14 * 16, this.offsetY + 2 * 16);
        ObjectSprites.draw(ctx, 'door', this.offsetX + 9 * 16, this.offsetY + (this.MAP_ROWS - 1) * 16);

        // Draw player (screen coords)
        Player.render(ctx);

        // Draw UI
        UI.render(ctx);
    }
};
