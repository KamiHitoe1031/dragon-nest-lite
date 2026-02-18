// Dragon Nest Lite - Scene Manager
export class SceneManager {
    constructor(game) {
        this.game = game;
        this.scenes = {};
        this.currentScene = null;
        this.currentSceneName = '';
    }

    register(name, scene) {
        this.scenes[name] = scene;
    }

    async switchTo(name, params = {}) {
        if (this.currentScene) {
            await this.currentScene.exit();
        }

        this.currentSceneName = name;
        this.currentScene = this.scenes[name];

        if (!this.currentScene) {
            console.error(`Scene "${name}" not registered`);
            return;
        }

        await this.currentScene.enter(params);
    }

    update(dt) {
        if (this.currentScene) {
            this.currentScene.update(dt);
        }
    }
}
