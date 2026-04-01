// Main game entry point
const Game = {
    canvas: null,
    ctx: null,
    width: 800,
    height: 600,
    lastTime: 0,

    // Day/night cycle (120 seconds = full cycle)
    dayTimer: 0,
    dayCycleDuration: 120,
    nightAlpha: 0, // 0 = day, up to 0.5 = night

    init() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.ctx.imageSmoothingEnabled = false;

        Input.init();
        TileSprites.init();
        ObjectSprites.init();
        PlayerSprites.init();
        Player.init();
        SceneManager.init();

        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    },

    loop(timestamp) {
        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        // Cap delta time to avoid huge jumps
        const cappedDt = Math.min(dt, 0.05);

        this.update(cappedDt);
        this.render();

        requestAnimationFrame((t) => this.loop(t));
    },

    update(dt) {
        Input.update();
        SceneManager.update(dt);

        // Day/night cycle
        this.dayTimer += dt;
        // Use sine wave: 0→day, π→night, 2π→day
        const cycle = (this.dayTimer / this.dayCycleDuration) * Math.PI * 2;
        this.nightAlpha = Math.max(0, Math.sin(cycle)) * 0.45;
    },

    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);
        SceneManager.render(ctx);

        // Night overlay (skip for loading scene)
        if (this.nightAlpha > 0.01 && SceneManager.currentName !== 'loading') {
            ctx.fillStyle = `rgba(10, 10, 40, ${this.nightAlpha})`;
            ctx.fillRect(0, 0, this.width, this.height);

            // Lit windows in city during night
            if (SceneManager.currentName === 'city' && this.nightAlpha > 0.15) {
                ctx.fillStyle = `rgba(255, 255, 150, ${this.nightAlpha * 1.5})`;
                // TAX building windows
                for (let r = 9; r <= 13; r += 2) {
                    for (let c = 5; c <= 13; c += 3) {
                        ctx.fillRect(c * 16 + 4, r * 16 + 4, 8, 6);
                    }
                }
                // Building 1 windows
                for (let r = 7; r <= 13; r += 2) {
                    for (let c = 31; c <= 37; c += 3) {
                        ctx.fillRect(c * 16 + 4, r * 16 + 4, 8, 6);
                    }
                }
                // Building 2 windows
                for (let r = 26; r <= 32; r += 2) {
                    for (let c = 31; c <= 41; c += 3) {
                        ctx.fillRect(c * 16 + 4, r * 16 + 4, 8, 6);
                    }
                }
                // Bunny house windows
                ctx.fillRect(5 * 16 + 4, 29 * 16 + 4, 8, 6);
                ctx.fillRect(10 * 16 + 4, 29 * 16 + 4, 8, 6);
            }
        }
    }
};

window.addEventListener('load', () => Game.init());
