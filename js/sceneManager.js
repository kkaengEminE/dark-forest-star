// Scene Manager - handles scene switching with fade transitions
const SceneManager = {
    scenes: {},
    currentScene: null,
    currentName: '',

    // Fade transition state
    fading: false,
    fadeAlpha: 0,
    fadeDirection: 1, // 1 = fading out, -1 = fading in
    fadeSpeed: 3, // alpha per second
    pendingScene: null,
    pendingData: null,

    init() {
        this.scenes = {
            city: CityScene,
            farm: FarmScene,
            room: RoomScene,
            loading: LoadingScene
        };
        this.switchScene('city', { x: 400, y: 450 });
    },

    switchScene(name, data) {
        if (this.fading) return;

        if (!this.currentScene) {
            // First load - no fade
            this._activateScene(name, data);
            return;
        }

        // Start fade out
        this.fading = true;
        this.fadeAlpha = 0;
        this.fadeDirection = 1;
        this.pendingScene = name;
        this.pendingData = data;
    },

    _activateScene(name, data) {
        if (this.currentScene && this.currentScene.onExit) {
            this.currentScene.onExit();
        }

        this.currentName = name;
        this.currentScene = this.scenes[name];

        if (this.currentScene.onEnter) {
            this.currentScene.onEnter(data);
        }
    },

    update(dt) {
        if (this.fading) {
            this.fadeAlpha += this.fadeDirection * this.fadeSpeed * dt;

            if (this.fadeDirection === 1 && this.fadeAlpha >= 1) {
                // Fully black - switch scene
                this.fadeAlpha = 1;
                this._activateScene(this.pendingScene, this.pendingData);
                this.fadeDirection = -1;
            } else if (this.fadeDirection === -1 && this.fadeAlpha <= 0) {
                // Fade complete
                this.fadeAlpha = 0;
                this.fading = false;
                this.pendingScene = null;
                this.pendingData = null;
            }
        }

        if (this.currentScene && this.currentScene.update) {
            this.currentScene.update(dt);
        }
    },

    render(ctx) {
        if (this.currentScene && this.currentScene.render) {
            this.currentScene.render(ctx);
        }

        // Fade overlay
        if (this.fading && this.fadeAlpha > 0) {
            ctx.fillStyle = `rgba(0, 0, 0, ${this.fadeAlpha})`;
            ctx.fillRect(0, 0, Game.width, Game.height);
        }
    }
};
