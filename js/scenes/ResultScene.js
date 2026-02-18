// Dragon Nest Lite - Result Scene
import * as THREE from 'three';

export class ResultScene {
    constructor(game) {
        this.game = game;
        this.resultUI = null;
        this.bgGroup = null;
    }

    async enter(params = {}) {
        this.game.ui.hideHUD();
        this.game.ui.hideBossHP();
        this.game.ui.hideDungeonInfo();
        this.game.audio.playBGM('bgm_result');

        // Simple background
        this.bgGroup = new THREE.Group();
        const ambient = new THREE.AmbientLight(0x334455, 1.5);
        this.bgGroup.add(ambient);
        this.game.scene.add(this.bgGroup);

        // Camera
        this.game.camera.position.set(0, 5, 10);
        this.game.camera.lookAt(0, 0, 0);

        // Result UI
        this._createResultUI(params);
    }

    _createResultUI(params) {
        this.resultUI = document.createElement('div');
        this.resultUI.id = 'result-screen';

        const player = this.game.player;
        const minutes = Math.floor((params.time || 0) / 60);
        const seconds = (params.time || 0) % 60;

        this.resultUI.innerHTML = `
            <div id="result-content">
                <h1 id="result-title">${params.dungeonName || 'Dungeon'} Clear!</h1>
                <div id="result-stats">
                    <div class="result-row">
                        <span>Time:</span>
                        <span>${minutes}:${seconds.toString().padStart(2, '0')}</span>
                    </div>
                    <div class="result-row">
                        <span>SP Gained:</span>
                        <span>+${params.spGained || 0}</span>
                    </div>
                    <div class="result-row">
                        <span>Level:</span>
                        <span>${player.level}</span>
                    </div>
                    <div class="result-row">
                        <span>Gold:</span>
                        <span>${player.gold}</span>
                    </div>
                    <div class="result-row">
                        <span>Total SP:</span>
                        <span>${player.totalSpEarned}</span>
                    </div>
                </div>
                <button class="title-btn" id="btn-return-town">Return to Town</button>
            </div>
        `;
        document.body.appendChild(this.resultUI);

        document.getElementById('btn-return-town').addEventListener('click', () => {
            this.game.sceneManager.switchTo('town');
        });
    }

    update(dt) {
        // Nothing to update
    }

    async exit() {
        if (this.resultUI) {
            this.resultUI.remove();
            this.resultUI = null;
        }
        if (this.bgGroup) {
            this.game.scene.remove(this.bgGroup);
            this.bgGroup = null;
        }
    }
}
