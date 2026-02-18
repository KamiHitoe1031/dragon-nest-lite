// Dragon Nest Lite - Input Manager
export class InputManager {
    constructor() {
        this.keys = {};
        this.mouseButtons = {};
        this.mousePosition = { x: 0, y: 0 };
        this.mouseDelta = { x: 0, y: 0 };
        this.isPointerLocked = false;
        this.skillSlotPressed = [false, false, false, false];
        this.justPressed = {};
        this.justReleased = {};
        this.scrollDelta = 0; // accumulated scroll for zoom

        this._bindEvents();
    }

    _bindEvents() {
        window.addEventListener('keydown', (e) => {
            // Prevent browser defaults for game keys
            if (e.code === 'Tab' || e.code === 'Space') {
                e.preventDefault();
            }
            if (!this.keys[e.code]) {
                this.justPressed[e.code] = true;
            }
            this.keys[e.code] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            this.justReleased[e.code] = true;
        });

        window.addEventListener('mousedown', (e) => {
            this.mouseButtons[e.button] = true;
            this.justPressed[`Mouse${e.button}`] = true;
        });

        window.addEventListener('mouseup', (e) => {
            this.mouseButtons[e.button] = false;
            this.justReleased[`Mouse${e.button}`] = true;
        });

        window.addEventListener('mousemove', (e) => {
            this.mousePosition.x = e.clientX;
            this.mousePosition.y = e.clientY;
            if (this.isPointerLocked) {
                this.mouseDelta.x += e.movementX;
                this.mouseDelta.y += e.movementY;
            }
        });

        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = !!document.pointerLockElement;
        });

        // Scroll wheel for camera zoom
        window.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.scrollDelta += e.deltaY;
        }, { passive: false });
    }

    isKeyDown(code) {
        return !!this.keys[code];
    }

    isKeyJustPressed(code) {
        return !!this.justPressed[code];
    }

    isMouseDown(button = 0) {
        return !!this.mouseButtons[button];
    }

    isMouseJustPressed(button = 0) {
        return !!this.justPressed[`Mouse${button}`];
    }

    getMovementInput() {
        let x = 0, z = 0;
        if (this.keys['KeyW'] || this.keys['ArrowUp']) z -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) z += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) x -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) x += 1;

        const len = Math.sqrt(x * x + z * z);
        if (len > 0) {
            x /= len;
            z /= len;
        }

        return { x, z };
    }

    getSkillSlotInput() {
        for (let i = 0; i < 4; i++) {
            if (this.justPressed[`Digit${i + 1}`]) {
                return i;
            }
        }
        return -1;
    }

    consumeMouseDelta() {
        const delta = { x: this.mouseDelta.x, y: this.mouseDelta.y };
        this.mouseDelta.x = 0;
        this.mouseDelta.y = 0;
        return delta;
    }

    consumeScrollDelta() {
        const delta = this.scrollDelta;
        this.scrollDelta = 0;
        return delta;
    }

    requestPointerLock(element) {
        element.requestPointerLock();
    }

    exitPointerLock() {
        document.exitPointerLock();
    }

    endFrame() {
        this.justPressed = {};
        this.justReleased = {};
    }
}
