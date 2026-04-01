// Procedural tile sprites - all drawn with fillRect on offscreen canvases
const TileSprites = {
    tiles: {},
    TILE_SIZE: 16,

    init() {
        this.tiles.grass = this._createTile((ctx, s) => {
            ctx.fillStyle = '#4a8c3f';
            ctx.fillRect(0, 0, s, s);
            // Grass details
            ctx.fillStyle = '#5a9c4f';
            ctx.fillRect(2, 3, 1, 2);
            ctx.fillRect(7, 1, 1, 2);
            ctx.fillRect(12, 5, 1, 2);
            ctx.fillRect(4, 10, 1, 2);
            ctx.fillRect(10, 11, 1, 2);
            ctx.fillRect(14, 8, 1, 2);
        });

        this.tiles.dirt = this._createTile((ctx, s) => {
            ctx.fillStyle = '#8B7355';
            ctx.fillRect(0, 0, s, s);
            ctx.fillStyle = '#9B8365';
            ctx.fillRect(3, 2, 2, 1);
            ctx.fillRect(10, 7, 2, 1);
            ctx.fillRect(6, 12, 1, 1);
        });

        this.tiles.road = this._createTile((ctx, s) => {
            ctx.fillStyle = '#555566';
            ctx.fillRect(0, 0, s, s);
            ctx.fillStyle = '#4a4a5a';
            ctx.fillRect(0, 0, s, 1);
            ctx.fillRect(0, s - 1, s, 1);
        });

        this.tiles.sidewalk = this._createTile((ctx, s) => {
            ctx.fillStyle = '#aaaaaa';
            ctx.fillRect(0, 0, s, s);
            ctx.fillStyle = '#999999';
            ctx.fillRect(0, 0, s, 1);
            ctx.fillRect(0, 0, 1, s);
            ctx.fillRect(8, 0, 1, s);
            ctx.fillRect(0, 8, s, 1);
        });

        this.tiles.water = this._createTile((ctx, s) => {
            ctx.fillStyle = '#3366aa';
            ctx.fillRect(0, 0, s, s);
            ctx.fillStyle = '#4477bb';
            ctx.fillRect(2, 4, 4, 1);
            ctx.fillRect(8, 9, 5, 1);
            ctx.fillRect(1, 13, 3, 1);
        });

        this.tiles.wall = this._createTile((ctx, s) => {
            ctx.fillStyle = '#777788';
            ctx.fillRect(0, 0, s, s);
            ctx.fillStyle = '#666677';
            ctx.fillRect(0, 0, s, 1);
            ctx.fillRect(0, 8, s, 1);
            ctx.fillRect(0, 0, 1, s);
            ctx.fillRect(8, 0, 1, s);
        });

        this.tiles.building = this._createTile((ctx, s) => {
            ctx.fillStyle = '#6a6a7a';
            ctx.fillRect(0, 0, s, s);
            // Window
            ctx.fillStyle = '#aaddff';
            ctx.fillRect(4, 4, 8, 6);
            ctx.fillStyle = '#88bbdd';
            ctx.fillRect(4, 4, 8, 1);
            ctx.fillRect(4, 4, 1, 6);
            ctx.fillRect(8, 4, 1, 6);
        });

        this.tiles.roof = this._createTile((ctx, s) => {
            ctx.fillStyle = '#884444';
            ctx.fillRect(0, 0, s, s);
            ctx.fillStyle = '#773333';
            ctx.fillRect(0, 0, s, 2);
        });

        this.tiles.floor = this._createTile((ctx, s) => {
            ctx.fillStyle = '#c4a882';
            ctx.fillRect(0, 0, s, s);
            ctx.fillStyle = '#b49872';
            ctx.fillRect(0, 0, 1, s);
            ctx.fillRect(0, 0, s, 1);
            ctx.fillRect(8, 0, 1, s);
            ctx.fillRect(0, 8, s, 1);
        });

        this.tiles.carpet = this._createTile((ctx, s) => {
            ctx.fillStyle = '#aa4444';
            ctx.fillRect(0, 0, s, s);
            ctx.fillStyle = '#cc6644';
            ctx.fillRect(1, 1, s - 2, s - 2);
            ctx.fillStyle = '#aa4444';
            ctx.fillRect(3, 3, s - 6, s - 6);
        });

        this.tiles.farmDirt = this._createTile((ctx, s) => {
            ctx.fillStyle = '#7a6040';
            ctx.fillRect(0, 0, s, s);
            // Furrows
            ctx.fillStyle = '#6a5030';
            ctx.fillRect(0, 3, s, 2);
            ctx.fillRect(0, 10, s, 2);
        });
    },

    _createTile(drawFn) {
        const c = document.createElement('canvas');
        c.width = this.TILE_SIZE;
        c.height = this.TILE_SIZE;
        const ctx = c.getContext('2d');
        drawFn(ctx, this.TILE_SIZE);
        return c;
    },

    draw(ctx, tileName, x, y) {
        const tile = this.tiles[tileName];
        if (tile) {
            ctx.drawImage(tile, x, y);
        }
    }
};
