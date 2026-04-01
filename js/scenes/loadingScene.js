// Loading Scene - bus transition cutscene
const LoadingScene = {
    timer: 0,
    duration: 2,
    destination: 'farm',
    busX: -80,
    dotTimer: 0,
    dots: '',

    onEnter(data) {
        this.destination = (data && data.destination) || 'farm';
        this.timer = 0;
        this.busX = -80;
        this.dotTimer = 0;
        this.dots = '';
    },

    onExit() {},

    update(dt) {
        this.timer += dt;

        // Animate bus
        this.busX = -80 + (this.timer / this.duration) * (Game.width + 160);

        // Animate dots
        this.dotTimer += dt;
        if (this.dotTimer > 0.4) {
            this.dotTimer = 0;
            this.dots = this.dots.length >= 3 ? '' : this.dots + '.';
        }

        // Switch scene when done
        if (this.timer >= this.duration) {
            const entryData = this.destination === 'farm'
                ? { x: 5 * 16, y: 20 * 16 }
                : { x: 400, y: 300 };
            SceneManager.switchScene(this.destination, entryData);
        }
    },

    render(ctx) {
        // Black background
        ctx.fillStyle = '#111122';
        ctx.fillRect(0, 0, Game.width, Game.height);

        // Stars
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 30; i++) {
            // Pseudo-random positions based on index
            const sx = ((i * 137 + 50) % Game.width);
            const sy = ((i * 97 + 30) % (Game.height / 2));
            ctx.fillRect(sx, sy, 1, 1);
        }

        // Road
        ctx.fillStyle = '#555566';
        ctx.fillRect(0, Game.height / 2 + 20, Game.width, 60);
        // Road lines
        ctx.fillStyle = '#ffff88';
        for (let x = 0; x < Game.width; x += 40) {
            const lineX = (x - this.timer * 200) % Game.width;
            if (lineX > 0) {
                ctx.fillRect(lineX, Game.height / 2 + 47, 20, 4);
            }
        }

        // Bus
        ctx.save();
        ctx.translate(this.busX, Game.height / 2 - 12);
        ObjectSprites.draw(ctx, 'bus', 0, 0);
        ctx.restore();

        // Text
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px monospace';
        ctx.textAlign = 'center';

        const destName = this.destination === 'farm' ? '농장' : '도시';
        ctx.fillText(`${destName}(으)로 이동 중${this.dots}`, Game.width / 2, Game.height / 2 + 120);

        ctx.font = '12px monospace';
        ctx.fillStyle = '#888888';
        ctx.fillText('버스를 타고 이동 중...', Game.width / 2, Game.height / 2 + 145);

        ctx.textAlign = 'left';
    }
};
