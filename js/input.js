// Input handler - tracks keyboard state
const Input = {
    keys: {},
    justPressed: {},
    _previousKeys: {},

    init() {
        window.addEventListener('keydown', (e) => {
            e.preventDefault();
            this.keys[e.code] = true;
        });
        window.addEventListener('keyup', (e) => {
            e.preventDefault();
            this.keys[e.code] = false;
        });
    },

    update() {
        for (const key in this.keys) {
            this.justPressed[key] = this.keys[key] && !this._previousKeys[key];
        }
        Object.assign(this._previousKeys, this.keys);
    },

    isDown(code) {
        return !!this.keys[code];
    },

    wasPressed(code) {
        return !!this.justPressed[code];
    }
};
