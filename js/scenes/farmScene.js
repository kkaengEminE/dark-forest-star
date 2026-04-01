// Farm Scene - peaceful countryside with carrots, windmill, stream, cottage
const FarmScene = {
    TILE_SIZE: 16,
    MAP_COLS: 50,
    MAP_ROWS: 38,
    tileMap: [],
    interactables: [],
    carrotsHarvested: 0,
    carrotStates: [], // track which carrots are harvested

    T: {
        GRASS: 0,
        DIRT: 1,
        WATER: 2,
        FARM_DIRT: 3,
        BUILDING: 4,
        WALL: 5,
        ROOF: 6,
        DOOR: 7,
        SIDEWALK: 8,
    },

    solidTiles: null,

    tileNames: ['grass', 'dirt', 'water', 'farmDirt', 'building', 'wall', 'roof', 'door', 'sidewalk'],

    _buildMap() {
        const T = this.T;
        const map = [];

        for (let r = 0; r < this.MAP_ROWS; r++) {
            map[r] = [];
            for (let c = 0; c < this.MAP_COLS; c++) {
                let tile = T.GRASS;

                // Dirt paths
                if (r >= 18 && r <= 19 && c >= 0 && c <= 49) tile = T.DIRT;
                if (c >= 24 && c <= 25 && r >= 5 && r <= 35) tile = T.DIRT;

                // Stream (water) running vertically on the right
                if (c >= 40 && c <= 42 && r >= 0 && r <= 37) tile = T.WATER;

                // Carrot field (left area)
                if (r >= 8 && r <= 14 && c >= 4 && c <= 18) tile = T.FARM_DIRT;

                // --- Cottage (top-right, before stream) ---
                if (r >= 4 && r <= 6 && c >= 30 && c <= 38) tile = T.ROOF;
                if (r >= 7 && r <= 12 && c >= 30 && c <= 38) tile = T.BUILDING;
                if (r === 13 && c >= 30 && c <= 38) tile = T.WALL;
                // Cottage door
                if (r === 13 && c >= 33 && c <= 35) tile = T.DOOR;

                // Bus stop area (small sidewalk)
                if (r >= 17 && r <= 20 && c >= 2 && c <= 4) tile = T.SIDEWALK;

                map[r][c] = tile;
            }
        }

        this.tileMap = map;
        this.solidTiles = new Set([T.WATER, T.BUILDING, T.WALL, T.ROOF]);
    },

    _buildInteractables() {
        this.interactables = [
            // Bus stop
            {
                x: 3 * 16 + 8,
                y: 17 * 16 + 8,
                type: 'busStop',
                action: () => {
                    SceneManager.switchScene('loading', { destination: 'city' });
                }
            },
            // Cottage door
            {
                x: 34 * 16 + 8,
                y: 13 * 16 + 8,
                type: 'door',
                action: () => {
                    SceneManager.switchScene('room', { from: 'farm' });
                }
            }
        ];

        // Carrots in the field
        this._addCarrotInteractables();
    },

    _addCarrotInteractables() {
        // Initialize carrot states if empty
        if (this.carrotStates.length === 0) {
            for (let r = 0; r < 3; r++) {
                for (let c = 0; c < 7; c++) {
                    this.carrotStates.push(false); // false = not harvested
                }
            }
        }

        // Remove old carrot interactables
        this.interactables = this.interactables.filter(i => i.type !== 'carrot');

        let idx = 0;
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 7; c++) {
                if (!this.carrotStates[idx]) {
                    const carrotIdx = idx;
                    const cx = (5 + c * 2) * 16 + 8;
                    const cy = (9 + r * 2) * 16 + 8;
                    this.interactables.push({
                        x: cx,
                        y: cy,
                        type: 'carrot',
                        action: () => {
                            this.carrotStates[carrotIdx] = true;
                            this.carrotsHarvested++;
                            this._addCarrotInteractables(); // rebuild
                        }
                    });
                }
                idx++;
            }
        }
    },

    onEnter(data) {
        this._buildMap();
        this._buildInteractables();

        if (data && data.x !== undefined) {
            Player.setPosition(data.x, data.y);
        } else {
            Player.setPosition(5 * 16, 20 * 16);
        }
    },

    onExit() {},

    update(dt) {
        Player.update(dt, this.tileMap, this.solidTiles);
        Interaction.check(this.interactables);
        UI.update(dt);
    },

    render(ctx) {
        // Draw tile map
        for (let r = 0; r < this.MAP_ROWS; r++) {
            for (let c = 0; c < this.MAP_COLS; c++) {
                const tile = this.tileMap[r][c];
                TileSprites.draw(ctx, this.tileNames[tile], c * 16, r * 16);
            }
        }

        // Windmill
        ObjectSprites.draw(ctx, 'windmill', 20 * 16, 3 * 16);

        // Bus stop sign
        ObjectSprites.draw(ctx, 'busStop', 3 * 16, 16 * 16);

        // Cottage door
        ObjectSprites.draw(ctx, 'door', 33 * 16 + 8, 13 * 16);

        // Draw carrots
        let idx = 0;
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 7; c++) {
                const cx = (5 + c * 2) * 16;
                const cy = (9 + r * 2) * 16;
                if (this.carrotStates[idx]) {
                    ObjectSprites.draw(ctx, 'carrotEmpty', cx, cy);
                } else {
                    ObjectSprites.draw(ctx, 'carrot', cx, cy);
                }
                idx++;
            }
        }

        // Trees scattered around
        const treePositions = [
            [0, 2], [2, 0], [44, 3], [46, 1], [44, 28],
            [46, 30], [0, 25], [2, 30], [20, 22], [22, 28],
            [10, 22], [15, 30], [35, 22], [38, 28]
        ];
        for (const [c, r] of treePositions) {
            ObjectSprites.draw(ctx, 'tree', c * 16, r * 16);
        }

        // Draw player
        Player.render(ctx);

        // Draw UI
        UI.render(ctx);
    }
};
