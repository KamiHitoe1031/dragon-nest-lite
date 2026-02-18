// Dragon Nest Lite - Title Scene
import * as THREE from 'three';

export class TitleScene {
    constructor(game) {
        this.game = game;
        this.titleGroup = null;
        this.titleUI = null;
    }

    async enter() {
        this.game.ui.hideHUD();
        this.game.audio.playBGM('bgm_title');

        // 3D background
        this.titleGroup = new THREE.Group();

        // Dark floor
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(100, 100),
            new THREE.MeshLambertMaterial({ color: 0x1a1a2e })
        );
        floor.rotation.x = -Math.PI / 2;
        this.titleGroup.add(floor);

        // Floating particles
        const particleGeo = new THREE.BufferGeometry();
        const positions = [];
        for (let i = 0; i < 200; i++) {
            positions.push(
                (Math.random() - 0.5) * 40,
                Math.random() * 15,
                (Math.random() - 0.5) * 40
            );
        }
        particleGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        const particles = new THREE.Points(
            particleGeo,
            new THREE.PointsMaterial({ color: 0x6644aa, size: 0.15, transparent: true, opacity: 0.6 })
        );
        this.titleGroup.add(particles);
        this.particles = particles;

        // Ambient light
        const ambient = new THREE.AmbientLight(0x333355, 1.5);
        this.titleGroup.add(ambient);

        const spotLight = new THREE.SpotLight(0x6644cc, 3, 30, Math.PI / 4);
        spotLight.position.set(0, 10, 5);
        this.titleGroup.add(spotLight);

        this.game.scene.add(this.titleGroup);

        // Camera position for title
        this.game.camera.position.set(0, 5, 12);
        this.game.camera.lookAt(0, 2, 0);

        // Title UI overlay
        this._createTitleUI();
    }

    _createTitleUI() {
        this.titleUI = document.createElement('div');
        this.titleUI.id = 'title-screen';
        this.titleUI.innerHTML = `
            <div id="title-content">
                <h1 id="game-title">Dragon Nest Lite</h1>
                <p id="game-subtitle">Browser 3D Action RPG</p>
                <div id="title-buttons">
                    <button class="title-btn" id="btn-new-game">New Game</button>
                    <button class="title-btn" id="btn-continue" style="display:none;">Continue</button>
                </div>
                <div id="char-select" style="display:none;">
                    <h2>Choose Your Class</h2>
                    <div id="char-options">
                        <div class="char-option" data-class="warrior">
                            <div class="char-icon warrior-icon"></div>
                            <h3>Warrior</h3>
                            <p>Melee fighter. Swords and brute strength.</p>
                        </div>
                        <div class="char-option" data-class="sorceress">
                            <div class="char-icon mage-icon"></div>
                            <h3>Sorceress</h3>
                            <p>Magic user. Fire, ice, and gravity.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(this.titleUI);

        // Check for save data
        const saveData = localStorage.getItem('dragon_nest_lite_save');
        if (saveData) {
            document.getElementById('btn-continue').style.display = 'block';
            document.getElementById('btn-continue').addEventListener('click', () => {
                this.game.loadSave(JSON.parse(saveData));
                this.game.sceneManager.switchTo('town');
            });
        }

        document.getElementById('btn-new-game').addEventListener('click', () => {
            document.getElementById('title-buttons').style.display = 'none';
            document.getElementById('char-select').style.display = 'block';
        });

        document.querySelectorAll('.char-option').forEach(option => {
            option.addEventListener('click', () => {
                const selectedClass = option.dataset.class;
                this.game.startNewGame(selectedClass);
                this.game.sceneManager.switchTo('town');
            });
        });
    }

    update(dt) {
        // Rotate particles slowly
        if (this.particles) {
            this.particles.rotation.y += dt * 0.1;
        }
    }

    async exit() {
        if (this.titleGroup) {
            this.game.scene.remove(this.titleGroup);
            this.titleGroup = null;
        }
        if (this.titleUI) {
            this.titleUI.remove();
            this.titleUI = null;
        }
    }
}
