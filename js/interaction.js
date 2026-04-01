// Interaction system - proximity-based object interactions
const Interaction = {
    INTERACT_RADIUS: 30,

    // Check interactions for current scene
    check(interactables) {
        const px = Player.getCenterX();
        const py = Player.getCenterY();
        let nearestInteractable = null;
        let nearestDist = Infinity;

        for (const obj of interactables) {
            const dist = Math.hypot(px - obj.x, py - obj.y);
            if (dist < this.INTERACT_RADIUS && dist < nearestDist) {
                nearestDist = dist;
                nearestInteractable = obj;
            }
        }

        if (nearestInteractable) {
            UI.showPrompt('Press Z', nearestInteractable.x, nearestInteractable.y);

            if (Input.wasPressed('KeyZ') || Input.wasPressed('Enter')) {
                nearestInteractable.action();
                return true;
            }
        } else {
            UI.clearPrompt();
        }

        return false;
    }
};
