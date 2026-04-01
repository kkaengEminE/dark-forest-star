// UI system - mode indicator, speech bubbles, prompts
const UI = {
    speechBubble: null,
    speechTimer: 0,
    interactionPrompt: null,

    showSpeechBubble(text, x, y, duration) {
        this.speechBubble = { text, x, y };
        this.speechTimer = duration || 3;
    },

    showPrompt(text, x, y) {
        this.interactionPrompt = { text, x, y };
    },

    clearPrompt() {
        this.interactionPrompt = null;
    },

    update(dt) {
        if (this.speechBubble) {
            this.speechTimer -= dt;
            if (this.speechTimer <= 0) {
                this.speechBubble = null;
            }
        }
    },

    render(ctx) {
        // Mode indicator
        this._renderModeIndicator(ctx);

        // Carrot counter
        this._renderCarrotCounter(ctx);

        // Speech bubble
        if (this.speechBubble) {
            this._renderSpeechBubble(ctx, this.speechBubble);
        }

        // Interaction prompt
        if (this.interactionPrompt) {
            this._renderPrompt(ctx, this.interactionPrompt);
        }
    },

    _renderModeIndicator(ctx) {
        const x = 10, y = 10;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(x, y, 120, 24);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, 120, 24);

        ctx.fillStyle = '#ffffff';
        ctx.font = '12px monospace';
        const mode = Player.isAnimalMode ? 'ANIMAL MODE' : 'CHARACTER MODE';
        const icon = Player.isAnimalMode ? '🐰' : '🧍';
        ctx.fillText(`${icon} ${mode}`, x + 4, y + 16);
    },

    _renderCarrotCounter(ctx) {
        if (typeof FarmScene !== 'undefined' && FarmScene.carrotsHarvested > 0) {
            const x = 10, y = 40;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(x, y, 100, 24);
            ctx.strokeStyle = '#ff8833';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, 100, 24);
            ctx.fillStyle = '#ff8833';
            ctx.font = '12px monospace';
            ctx.fillText(`🥕 x${FarmScene.carrotsHarvested}`, x + 4, y + 16);
        }
    },

    _renderSpeechBubble(ctx, bubble) {
        const padding = 8;
        ctx.font = '11px monospace';
        const metrics = ctx.measureText(bubble.text);
        const w = metrics.width + padding * 2;
        const h = 24;
        const bx = bubble.x - w / 2;
        const by = bubble.y - h - 10;

        // Bubble background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(bx, by, w, h);
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, w, h);

        // Arrow
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(bubble.x - 4, by + h);
        ctx.lineTo(bubble.x + 4, by + h);
        ctx.lineTo(bubble.x, by + h + 6);
        ctx.fill();
        ctx.strokeStyle = '#333333';
        ctx.beginPath();
        ctx.moveTo(bubble.x - 4, by + h);
        ctx.lineTo(bubble.x, by + h + 6);
        ctx.lineTo(bubble.x + 4, by + h);
        ctx.stroke();

        // Text
        ctx.fillStyle = '#333333';
        ctx.fillText(bubble.text, bx + padding, by + 16);
    },

    _renderPrompt(ctx, prompt) {
        ctx.font = '10px monospace';
        const text = prompt.text;
        const metrics = ctx.measureText(text);
        const w = metrics.width + 12;
        const h = 18;
        const px = prompt.x - w / 2;
        const py = prompt.y - 24;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(px, py, w, h);
        ctx.fillStyle = '#ffff88';
        ctx.fillText(text, px + 6, py + 13);
    }
};
