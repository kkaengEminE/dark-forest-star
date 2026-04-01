// Procedural player sprites - bunny character in both modes
const PlayerSprites = {
    sprites: {},
    SPRITE_SIZE: 16,

    init() {
        // Character mode (2-legged) - 4 directions x 2 frames
        this.sprites.char = {
            down: [
                this._createCharFrame('down', 0),
                this._createCharFrame('down', 1)
            ],
            up: [
                this._createCharFrame('up', 0),
                this._createCharFrame('up', 1)
            ],
            left: [
                this._createCharFrame('left', 0),
                this._createCharFrame('left', 1)
            ],
            right: [
                this._createCharFrame('right', 0),
                this._createCharFrame('right', 1)
            ]
        };

        // Animal mode (4-legged) - 4 directions x 2 frames
        this.sprites.animal = {
            down: [
                this._createAnimalFrame('down', 0),
                this._createAnimalFrame('down', 1)
            ],
            up: [
                this._createAnimalFrame('up', 0),
                this._createAnimalFrame('up', 1)
            ],
            left: [
                this._createAnimalFrame('left', 0),
                this._createAnimalFrame('left', 1)
            ],
            right: [
                this._createAnimalFrame('right', 0),
                this._createAnimalFrame('right', 1)
            ]
        };
    },

    _createCharFrame(dir, frame) {
        const s = this.SPRITE_SIZE;
        const c = document.createElement('canvas');
        c.width = s;
        c.height = s;
        const ctx = c.getContext('2d');

        // Dwarf bunny - 2 legged (character mode)
        // White/cream colored bunny standing upright

        if (dir === 'down') {
            // Ears
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(4, 0, 2, 4);
            ctx.fillRect(10, 0, 2, 4);
            // Inner ears
            ctx.fillStyle = '#ffaaaa';
            ctx.fillRect(5, 1, 1, 2);
            ctx.fillRect(11, 1, 1, 2);
            // Head
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(3, 3, 10, 6);
            // Eyes
            ctx.fillStyle = '#ff3366';
            ctx.fillRect(5, 5, 2, 2);
            ctx.fillRect(9, 5, 2, 2);
            // Nose
            ctx.fillStyle = '#ffaaaa';
            ctx.fillRect(7, 7, 2, 1);
            // Body
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(4, 9, 8, 4);
            // Outfit (little vest)
            ctx.fillStyle = '#4488cc';
            ctx.fillRect(4, 9, 8, 3);
            // Legs
            ctx.fillStyle = '#ffffff';
            if (frame === 0) {
                ctx.fillRect(5, 13, 2, 3);
                ctx.fillRect(9, 13, 2, 3);
            } else {
                ctx.fillRect(4, 13, 2, 3);
                ctx.fillRect(10, 13, 2, 3);
            }
        } else if (dir === 'up') {
            // Ears
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(4, 0, 2, 4);
            ctx.fillRect(10, 0, 2, 4);
            // Head
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(3, 3, 10, 6);
            // Body
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(4, 9, 8, 4);
            ctx.fillStyle = '#4488cc';
            ctx.fillRect(4, 9, 8, 3);
            // Tail
            ctx.fillStyle = '#eeeeee';
            ctx.fillRect(7, 10, 2, 2);
            // Legs
            ctx.fillStyle = '#ffffff';
            if (frame === 0) {
                ctx.fillRect(5, 13, 2, 3);
                ctx.fillRect(9, 13, 2, 3);
            } else {
                ctx.fillRect(4, 13, 2, 3);
                ctx.fillRect(10, 13, 2, 3);
            }
        } else if (dir === 'left') {
            // Ear
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(5, 0, 2, 4);
            ctx.fillStyle = '#ffaaaa';
            ctx.fillRect(6, 1, 1, 2);
            // Head
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(3, 3, 8, 6);
            // Eye
            ctx.fillStyle = '#ff3366';
            ctx.fillRect(4, 5, 2, 2);
            // Nose
            ctx.fillStyle = '#ffaaaa';
            ctx.fillRect(3, 7, 1, 1);
            // Body
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(5, 9, 6, 4);
            ctx.fillStyle = '#4488cc';
            ctx.fillRect(5, 9, 6, 3);
            // Legs
            ctx.fillStyle = '#ffffff';
            if (frame === 0) {
                ctx.fillRect(6, 13, 2, 3);
                ctx.fillRect(9, 13, 2, 3);
            } else {
                ctx.fillRect(5, 13, 2, 3);
                ctx.fillRect(8, 13, 2, 3);
            }
        } else { // right
            // Ear
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(9, 0, 2, 4);
            ctx.fillStyle = '#ffaaaa';
            ctx.fillRect(9, 1, 1, 2);
            // Head
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(5, 3, 8, 6);
            // Eye
            ctx.fillStyle = '#ff3366';
            ctx.fillRect(10, 5, 2, 2);
            // Nose
            ctx.fillStyle = '#ffaaaa';
            ctx.fillRect(12, 7, 1, 1);
            // Body
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(5, 9, 6, 4);
            ctx.fillStyle = '#4488cc';
            ctx.fillRect(5, 9, 6, 3);
            // Legs
            ctx.fillStyle = '#ffffff';
            if (frame === 0) {
                ctx.fillRect(5, 13, 2, 3);
                ctx.fillRect(9, 13, 2, 3);
            } else {
                ctx.fillRect(6, 13, 2, 3);
                ctx.fillRect(10, 13, 2, 3);
            }
        }

        return c;
    },

    _createAnimalFrame(dir, frame) {
        const s = this.SPRITE_SIZE;
        const c = document.createElement('canvas');
        c.width = s;
        c.height = s;
        const ctx = c.getContext('2d');

        // Dwarf bunny - 4 legged (animal mode)
        // Horizontal bunny on all fours

        if (dir === 'down') {
            // Ears
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(4, 0, 2, 3);
            ctx.fillRect(10, 0, 2, 3);
            ctx.fillStyle = '#ffaaaa';
            ctx.fillRect(5, 1, 1, 1);
            ctx.fillRect(11, 1, 1, 1);
            // Head
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(3, 3, 10, 5);
            // Eyes
            ctx.fillStyle = '#ff3366';
            ctx.fillRect(5, 4, 2, 2);
            ctx.fillRect(9, 4, 2, 2);
            // Nose
            ctx.fillStyle = '#ffaaaa';
            ctx.fillRect(7, 6, 2, 1);
            // Body
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(3, 8, 10, 4);
            // Legs (all four)
            if (frame === 0) {
                ctx.fillRect(3, 12, 2, 3);
                ctx.fillRect(11, 12, 2, 3);
                ctx.fillRect(5, 12, 2, 2);
                ctx.fillRect(9, 12, 2, 2);
            } else {
                ctx.fillRect(4, 12, 2, 2);
                ctx.fillRect(10, 12, 2, 2);
                ctx.fillRect(3, 12, 2, 3);
                ctx.fillRect(11, 12, 2, 3);
            }
        } else if (dir === 'up') {
            // Ears
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(4, 0, 2, 3);
            ctx.fillRect(10, 0, 2, 3);
            // Head
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(3, 3, 10, 5);
            // Body
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(3, 8, 10, 4);
            // Tail
            ctx.fillStyle = '#eeeeee';
            ctx.fillRect(7, 11, 2, 2);
            // Legs
            if (frame === 0) {
                ctx.fillRect(3, 12, 2, 3);
                ctx.fillRect(11, 12, 2, 3);
            } else {
                ctx.fillRect(4, 12, 2, 3);
                ctx.fillRect(10, 12, 2, 3);
            }
        } else if (dir === 'left') {
            // Ear
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(2, 0, 2, 3);
            ctx.fillStyle = '#ffaaaa';
            ctx.fillRect(3, 1, 1, 1);
            // Head
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 3, 7, 5);
            // Eye
            ctx.fillStyle = '#ff3366';
            ctx.fillRect(2, 4, 2, 2);
            // Nose
            ctx.fillStyle = '#ffaaaa';
            ctx.fillRect(0, 6, 1, 1);
            // Body (elongated)
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(4, 4, 10, 5);
            // Tail
            ctx.fillStyle = '#eeeeee';
            ctx.fillRect(13, 4, 3, 3);
            // Legs
            if (frame === 0) {
                ctx.fillRect(4, 9, 2, 4);
                ctx.fillRect(8, 9, 2, 4);
                ctx.fillRect(12, 9, 2, 3);
            } else {
                ctx.fillRect(3, 9, 2, 3);
                ctx.fillRect(7, 9, 2, 4);
                ctx.fillRect(11, 9, 2, 4);
            }
        } else { // right
            // Ear
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(12, 0, 2, 3);
            ctx.fillStyle = '#ffaaaa';
            ctx.fillRect(12, 1, 1, 1);
            // Head
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(9, 3, 7, 5);
            // Eye
            ctx.fillStyle = '#ff3366';
            ctx.fillRect(12, 4, 2, 2);
            // Nose
            ctx.fillStyle = '#ffaaaa';
            ctx.fillRect(15, 6, 1, 1);
            // Body (elongated)
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(2, 4, 10, 5);
            // Tail
            ctx.fillStyle = '#eeeeee';
            ctx.fillRect(0, 4, 3, 3);
            // Legs
            if (frame === 0) {
                ctx.fillRect(4, 9, 2, 4);
                ctx.fillRect(8, 9, 2, 4);
                ctx.fillRect(12, 9, 2, 3);
            } else {
                ctx.fillRect(3, 9, 2, 3);
                ctx.fillRect(7, 9, 2, 4);
                ctx.fillRect(11, 9, 2, 4);
            }
        }

        return c;
    },

    getSprite(mode, direction, frame) {
        const modeKey = mode === 'animal' ? 'animal' : 'char';
        const sprites = this.sprites[modeKey];
        if (sprites && sprites[direction]) {
            return sprites[direction][frame % 2];
        }
        return this.sprites.char.down[0];
    }
};
