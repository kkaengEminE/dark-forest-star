// Tile-based collision detection
const Collision = {
    TILE_SIZE: 16,

    // Check if a bounding box overlaps any solid tile
    // bbox: { x, y, w, h } in pixel coordinates
    // tileMap: 2D array, solidTiles: Set of solid tile IDs
    check(bbox, tileMap, solidTiles) {
        const ts = this.TILE_SIZE;
        const startCol = Math.floor(bbox.x / ts);
        const endCol = Math.floor((bbox.x + bbox.w - 1) / ts);
        const startRow = Math.floor(bbox.y / ts);
        const endRow = Math.floor((bbox.y + bbox.h - 1) / ts);

        for (let row = startRow; row <= endRow; row++) {
            for (let col = startCol; col <= endCol; col++) {
                if (row < 0 || col < 0 || !tileMap[row] || col >= tileMap[0].length) {
                    return true; // Out of bounds = solid
                }
                if (solidTiles.has(tileMap[row][col])) {
                    return true;
                }
            }
        }
        return false;
    },

    // Check proximity to a point (for interactions)
    nearPoint(px, py, pointX, pointY, radius) {
        const dx = px - pointX;
        const dy = py - pointY;
        return (dx * dx + dy * dy) < (radius * radius);
    }
};
