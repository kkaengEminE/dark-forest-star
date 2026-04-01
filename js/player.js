// Player - bunny character with dual mode
const Player = {
    x: 400,
    y: 300,
    width: 16,
    height: 16,

    // Collision box (smaller, at feet) - in scaled pixel space
    collisionBox: { offsetX: 4, offsetY: 20, w: 24, h: 12 },

    direction: 'down',
    isAnimalMode: false,
    speed: 2,
    normalSpeed: 2,
    animalSpeed: 3,

    // Animation
    animFrame: 0,
    animTimer: 0,
    animSpeed: 0.15, // seconds per frame
    isMoving: false,

    // Mode switch animation
    switchTimer: 0,
    isSwitching: false,

    // Scale for rendering
    scale: 2,

    init() {
        this.x = 400;
        this.y = 300;
        this.direction = 'down';
        this.isAnimalMode = false;
        this.speed = this.normalSpeed;
    },

    update(dt, tileMap, solidTiles, mapOffsetX, mapOffsetY) {
        mapOffsetX = mapOffsetX || 0;
        mapOffsetY = mapOffsetY || 0;

        // Mode switching
        if (Input.wasPressed('Space') && !this.isSwitching) {
            this.isSwitching = true;
            this.switchTimer = 0.3;
            this.isAnimalMode = !this.isAnimalMode;
            this.speed = this.isAnimalMode ? this.animalSpeed : this.normalSpeed;
        }

        if (this.isSwitching) {
            this.switchTimer -= dt;
            if (this.switchTimer <= 0) {
                this.isSwitching = false;
            }
        }

        // Movement
        let dx = 0, dy = 0;
        this.isMoving = false;

        if (Input.isDown('ArrowLeft') || Input.isDown('KeyA')) { dx = -1; this.direction = 'left'; }
        if (Input.isDown('ArrowRight') || Input.isDown('KeyD')) { dx = 1; this.direction = 'right'; }
        if (Input.isDown('ArrowUp') || Input.isDown('KeyW')) { dy = -1; this.direction = 'up'; }
        if (Input.isDown('ArrowDown') || Input.isDown('KeyS')) { dy = 1; this.direction = 'down'; }

        if (dx !== 0 || dy !== 0) {
            this.isMoving = true;

            // Normalize diagonal movement
            if (dx !== 0 && dy !== 0) {
                const len = Math.sqrt(2);
                dx /= len;
                dy /= len;
            }

            const moveX = dx * this.speed;
            const moveY = dy * this.speed;

            // Axis-separated collision
            // Convert screen coords to map-local coords for collision check
            const cb = this.collisionBox;

            // Try X movement
            const newX = this.x + moveX;
            const bboxX = {
                x: newX + cb.offsetX - mapOffsetX,
                y: this.y + cb.offsetY - mapOffsetY,
                w: cb.w,
                h: cb.h
            };
            if (!Collision.check(bboxX, tileMap, solidTiles)) {
                this.x = newX;
            }

            // Try Y movement
            const newY = this.y + moveY;
            const bboxY = {
                x: this.x + cb.offsetX - mapOffsetX,
                y: newY + cb.offsetY - mapOffsetY,
                w: cb.w,
                h: cb.h
            };
            if (!Collision.check(bboxY, tileMap, solidTiles)) {
                this.y = newY;
            }
        }

        // Animation
        if (this.isMoving) {
            this.animTimer += dt;
            if (this.animTimer >= this.animSpeed) {
                this.animTimer -= this.animSpeed;
                this.animFrame = (this.animFrame + 1) % 2;
            }
        } else {
            this.animFrame = 0;
            this.animTimer = 0;
        }
    },

    render(ctx) {
        const mode = this.isAnimalMode ? 'animal' : 'char';
        const sprite = PlayerSprites.getSprite(mode, this.direction, this.animFrame);

        const drawW = this.width * this.scale;
        const drawH = this.height * this.scale;

        ctx.save();

        // Switch animation - flash/scale effect
        if (this.isSwitching) {
            const progress = this.switchTimer / 0.3;
            const pulse = 1 + Math.sin(progress * Math.PI) * 0.3;
            const centerX = this.x + drawW / 2;
            const centerY = this.y + drawH / 2;
            ctx.translate(centerX, centerY);
            ctx.scale(pulse, pulse);
            ctx.globalAlpha = 0.5 + progress * 0.5;
            ctx.drawImage(sprite, 0, 0, this.width, this.height,
                -drawW / 2, -drawH / 2, drawW, drawH);
        } else {
            ctx.drawImage(sprite, 0, 0, this.width, this.height,
                this.x, this.y, drawW, drawH);
        }

        ctx.restore();
    },

    // Get center position for interaction checks
    getCenterX() { return this.x + (this.width * this.scale) / 2; },
    getCenterY() { return this.y + (this.height * this.scale) / 2; },

    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }
};
