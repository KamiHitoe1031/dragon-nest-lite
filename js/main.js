// Dragon Nest Lite - Main Entry Point
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { SceneManager } from './scenes/SceneManager.js';
import { TitleScene } from './scenes/TitleScene.js';
import { TownScene } from './scenes/TownScene.js';
import { DungeonScene } from './scenes/DungeonScene.js';
import { ResultScene } from './scenes/ResultScene.js';
import { InputManager } from './systems/InputManager.js';
import { UIManager } from './systems/UIManager.js';
import { AudioManager } from './systems/AudioManager.js';
import { SaveManager } from './systems/SaveManager.js';
import { SkillSystem } from './systems/SkillSystem.js';
import { CombatSystem } from './systems/CombatSystem.js';
import { EffectManager } from './systems/EffectManager.js';
import { Fighter } from './entities/Fighter.js';
import { Mage } from './entities/Mage.js';
import { MathUtils } from './utils/MathUtils.js';
import { ModelLoader } from './utils/ModelLoader.js';

class Game {
    constructor() {
        // Three.js core
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();

        // Systems
        this.input = new InputManager();
        this.ui = new UIManager();
        this.audio = new AudioManager();
        this.saveManager = new SaveManager();
        this.sceneManager = new SceneManager(this);
        this.skillSystem = new SkillSystem(this);
        this.combatSystem = new CombatSystem(this);
        this.effects = new EffectManager(this);

        // Game state
        this.player = null;
        this.isPaused = false;
        this.isMenuOpen = false;
        this.nearbyNPC = null;

        // Camera
        this.cameraAngle = 0;
        this.cameraTargetPos = new THREE.Vector3();

        // Projectiles
        this.projectiles = [];

        // Data
        this.skillsData = null;
        this.enemiesData = null;
        this.dungeonsData = null;
        this.itemsData = null;

        // Dungeon select UI
        this.dungeonSelectUI = null;
    }

    async init() {
        // Three.js setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);
        this.scene.fog = new THREE.Fog(0x1a1a2e, 30, 80);

        this.camera = new THREE.PerspectiveCamera(
            CONFIG.CAMERA_FOV,
            window.innerWidth / window.innerHeight,
            CONFIG.CAMERA_NEAR,
            CONFIG.CAMERA_FAR
        );
        this.camera.position.set(
            CONFIG.CAMERA_OFFSET.x,
            CONFIG.CAMERA_OFFSET.y,
            CONFIG.CAMERA_OFFSET.z
        );

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        document.body.appendChild(this.renderer.domElement);

        // Resize handler
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Right-click menu prevention
        this.renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

        // Load game data
        await this._loadGameData();

        // Preload 3D models (GLB)
        const loadingBar = document.getElementById('loading-bar');
        const loadingText = document.getElementById('loading-text');
        await ModelLoader.preloadAll((loaded, total) => {
            const pct = Math.floor((loaded / total) * 100);
            if (loadingBar) loadingBar.style.width = `${pct}%`;
            if (loadingText) loadingText.textContent = `Loading models... ${loaded}/${total}`;
        });

        // Hide loading screen
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) loadingScreen.style.display = 'none';

        // Audio init on first click
        this.renderer.domElement.addEventListener('click', () => {
            this.audio.init();
            this.audio.resume();
        }, { once: true });

        // Register scenes
        this.sceneManager.register('title', new TitleScene(this));
        this.sceneManager.register('town', new TownScene(this));
        this.sceneManager.register('dungeon', new DungeonScene(this));
        this.sceneManager.register('result', new ResultScene(this));

        // Start at title
        await this.sceneManager.switchTo('title');

        // Menu button handlers
        this._setupMenuHandlers();

        // Start game loop
        this._gameLoop();
    }

    async _loadGameData() {
        try {
            const [skills, enemies, dungeons, items] = await Promise.all([
                fetch('js/data/skills.json').then(r => r.json()),
                fetch('js/data/enemies.json').then(r => r.json()),
                fetch('js/data/dungeons.json').then(r => r.json()),
                fetch('js/data/items.json').then(r => r.json())
            ]);
            this.skillsData = skills;
            this.enemiesData = enemies;
            this.dungeonsData = dungeons;
            this.itemsData = items;
        } catch (e) {
            console.error('Failed to load game data:', e);
            // Create minimal fallback data
            this.skillsData = { warrior: { base: [] }, sorceress: { base: [] }, ultimateRule: {} };
            this.enemiesData = [];
            this.dungeonsData = {};
            this.itemsData = { consumables: [], weaponUpgrade: { costPerLevel: [100], atkBonusPerLevel: 5, matkBonusPerLevel: 5, maxLevel: 5 } };
        }
    }

    _setupMenuHandlers() {
        document.getElementById('btn-resume')?.addEventListener('click', () => this.toggleMenu());
        document.getElementById('btn-save')?.addEventListener('click', () => {
            this.saveGame();
            this.ui.showCenterMessage('Game Saved!', 1000);
        });
        document.getElementById('btn-title')?.addEventListener('click', () => {
            this.toggleMenu();
            this.sceneManager.switchTo('title');
        });
    }

    _gameLoop() {
        requestAnimationFrame(() => this._gameLoop());

        const dt = Math.min(this.clock.getDelta(), 0.05); // Cap at 50ms

        if (!this.isPaused) {
            this.sceneManager.update(dt);
            this.effects.update(dt);
        }

        this.renderer.render(this.scene, this.camera);
        this.input.endFrame();
    }

    // --- Player Management ---

    async startNewGame(classType) {
        if (classType === 'warrior') {
            this.player = new Fighter(this);
        } else {
            this.player = new Mage(this);
        }
        await this.player.init();
    }

    loadSave(saveData) {
        if (saveData.selectedClass === 'warrior') {
            this.player = new Fighter(this);
        } else {
            this.player = new Mage(this);
        }
        this.player.init();
        this.player.loadFromSave(saveData);
    }

    saveGame() {
        if (this.player) {
            this.saveManager.save(this.player.toSaveData());
        }
    }

    // --- Camera ---

    updateCamera(dt) {
        if (!this.player) return;

        // Mouse rotation (right-click drag or pointer lock)
        if (this.input.isMouseDown(2) || this.input.isPointerLocked) {
            const delta = this.input.consumeMouseDelta();
            this.cameraAngle -= delta.x * 0.003;
        }

        // Calculate camera position
        const offset = CONFIG.CAMERA_OFFSET;
        const cos = Math.cos(this.cameraAngle);
        const sin = Math.sin(this.cameraAngle);

        const targetX = this.player.position.x + offset.x * cos - offset.z * sin;
        const targetY = this.player.position.y + offset.y;
        const targetZ = this.player.position.z + offset.x * sin + offset.z * cos;

        this.cameraTargetPos.set(targetX, targetY, targetZ);

        // Smooth follow
        this.camera.position.lerp(this.cameraTargetPos, CONFIG.CAMERA_LERP_SPEED);

        // Look at player
        const lookTarget = this.player.position.clone();
        lookTarget.y += CONFIG.CAMERA_LOOK_OFFSET.y;
        this.camera.lookAt(lookTarget);
    }

    // --- Combat Helpers ---

    getEnemiesInRange(origin, direction, range, aoeType, aoeAngle) {
        return this.combatSystem.getEnemiesInArea(origin, direction, range, aoeType, aoeAngle);
    }

    getActiveEnemies() {
        const currentScene = this.sceneManager.currentScene;
        if (currentScene && currentScene.enemies) {
            return currentScene.enemies.filter(e => !e.isDead);
        }
        return [];
    }

    // --- Projectile Management ---

    addProjectile(projectile) {
        this.projectiles.push(projectile);
    }

    updateProjectiles(dt) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            if (!proj.alive) {
                if (proj.mesh) this.scene.remove(proj.mesh);
                this.projectiles.splice(i, 1);
                continue;
            }

            // Homing behavior
            if (proj.homing) {
                const enemies = this.getActiveEnemies();
                let closest = null;
                let closestDist = Infinity;
                for (const enemy of enemies) {
                    const dist = MathUtils.distanceXZ(proj.position, enemy.position);
                    if (dist < closestDist) {
                        closestDist = dist;
                        closest = enemy;
                    }
                }
                if (closest && closestDist < 15) {
                    const toTarget = new THREE.Vector3().subVectors(closest.position, proj.position);
                    toTarget.y = 0;
                    toTarget.normalize();
                    proj.direction.lerp(toTarget, 0.05);
                    proj.direction.normalize();
                }
            }

            // Move
            proj.position.add(proj.direction.clone().multiplyScalar(proj.speed * dt));
            proj.distanceTraveled += proj.speed * dt;

            // Update mesh
            if (proj.mesh) {
                proj.mesh.position.copy(proj.position);
            }

            // Check range
            if (proj.distanceTraveled >= proj.range) {
                proj.alive = false;
                continue;
            }

            // Check enemy collision
            const enemies = this.getActiveEnemies();
            for (const enemy of enemies) {
                const dist = MathUtils.distanceXZ(proj.position, enemy.position);
                if (dist < 1) {
                    const isCrit = Math.random() < CONFIG.CRITICAL_CHANCE;
                    let dmg = proj.damage * MathUtils.damageVariance();
                    if (isCrit) dmg *= CONFIG.CRITICAL_MULTIPLIER;
                    enemy.takeDamage(Math.floor(dmg), isCrit);
                    proj.alive = false;
                    break;
                }
            }
        }
    }

    clearProjectiles() {
        for (const proj of this.projectiles) {
            if (proj.mesh) this.scene.remove(proj.mesh);
        }
        this.projectiles = [];
    }

    // --- Skill Data Helpers ---

    getSkillData(skillId) {
        if (!this.skillsData) return null;

        for (const classKey of ['warrior', 'sorceress']) {
            const classData = this.skillsData[classKey];
            if (!classData) continue;

            // Check base
            if (classData.base) {
                const found = classData.base.find(s => s.id === skillId);
                if (found) return found;
            }

            // Check specializations
            for (const [specKey, specData] of Object.entries(classData)) {
                if (specKey === 'base') continue;
                if (typeof specData !== 'object') continue;

                for (const [colKey, skills] of Object.entries(specData)) {
                    if (!Array.isArray(skills)) continue;
                    const found = skills.find(s => s.id === skillId);
                    if (found) return found;
                }
            }
        }
        return null;
    }

    getSkillsByColumn(classType, specialization, column) {
        const classData = this.skillsData?.[classType];
        if (!classData) return [];

        if (column === 'base') return classData.base || [];

        if (specialization && classData[specialization]) {
            for (const [colKey, skills] of Object.entries(classData[specialization])) {
                if (colKey === column && Array.isArray(skills)) return skills;
            }
        }

        return [];
    }

    getAllSkillIds(classType, specialization) {
        const ids = [];
        const classData = this.skillsData?.[classType];
        if (!classData) return ids;

        if (classData.base) {
            for (const s of classData.base) ids.push(s.id);
        }

        if (specialization && classData[specialization]) {
            for (const [colKey, skills] of Object.entries(classData[specialization])) {
                if (Array.isArray(skills)) {
                    for (const s of skills) ids.push(s.id);
                }
            }
        }

        return ids;
    }

    // --- UI Helpers ---

    openSkillTree() {
        this.skillSystem.open();
    }

    openDungeonSelect() {
        if (this.dungeonSelectUI) return;

        this.isPaused = true;

        this.dungeonSelectUI = document.createElement('div');
        this.dungeonSelectUI.id = 'dungeon-select';
        this.dungeonSelectUI.innerHTML = `
            <div id="dungeon-select-content">
                <h2>Select Dungeon</h2>
                <div id="dungeon-list"></div>
                <button class="title-btn" id="btn-close-dungeon-select">Close</button>
            </div>
        `;
        document.body.appendChild(this.dungeonSelectUI);

        const listEl = document.getElementById('dungeon-list');
        for (const [key, dungeon] of Object.entries(this.dungeonsData)) {
            const cleared = this.player.dungeonsCleared[dungeon.id]?.cleared;
            const clearCount = this.player.dungeonsCleared[dungeon.id]?.clearCount || 0;
            const bestTime = this.player.dungeonsCleared[dungeon.id]?.bestTime;

            // Lock dungeon 2 until dungeon 1 is cleared, dungeon 3 until dungeon 2 cleared
            let locked = false;
            if (dungeon.id === 2 && !this.player.dungeonsCleared['1']?.cleared) locked = true;
            if (dungeon.id === 3 && !this.player.dungeonsCleared['2']?.cleared) locked = true;

            const card = document.createElement('div');
            card.className = `dungeon-card ${locked ? 'locked' : ''} ${cleared ? 'cleared' : ''}`;
            card.innerHTML = `
                <h3>${dungeon.name}</h3>
                <p>${dungeon.rooms.length} rooms</p>
                <p>SP: ${cleared ? dungeon.repeatClearSP : dungeon.firstClearSP}</p>
                ${cleared ? `<p>Best: ${Math.floor(bestTime/60)}:${(bestTime%60).toString().padStart(2,'0')} | Clears: ${clearCount}</p>` : ''}
                ${locked ? '<p class="locked-text">LOCKED</p>' : ''}
            `;

            if (!locked) {
                card.addEventListener('click', () => {
                    this.closeDungeonSelect();
                    this.sceneManager.switchTo('dungeon', { dungeonId: key });
                });
            }

            listEl.appendChild(card);
        }

        document.getElementById('btn-close-dungeon-select').addEventListener('click', () => {
            this.closeDungeonSelect();
        });
    }

    closeDungeonSelect() {
        if (this.dungeonSelectUI) {
            this.dungeonSelectUI.remove();
            this.dungeonSelectUI = null;
        }
        this.isPaused = false;
    }

    toggleMenu() {
        if (this.isMenuOpen) {
            this.ui.hideMenu();
            this.isPaused = false;
            this.isMenuOpen = false;
        } else {
            this.ui.showMenu();
            this.isPaused = true;
            this.isMenuOpen = true;
        }
    }

    onPlayerDeath() {
        // Show death overlay
        let deathOverlay = document.getElementById('death-overlay');
        if (!deathOverlay) {
            deathOverlay = document.createElement('div');
            deathOverlay.id = 'death-overlay';
            deathOverlay.innerHTML = '<h1>You Died</h1>';
            document.body.appendChild(deathOverlay);
        }
        deathOverlay.style.display = 'flex';

        // Clean up effects
        this.effects.dispose();

        setTimeout(() => {
            deathOverlay.style.display = 'none';
            this.sceneManager.switchTo('town');
        }, 2500);
    }

    // --- Utility ---

    worldToScreen(worldPos) {
        const vector = worldPos.clone();
        vector.project(this.camera);

        if (vector.z > 1) return null; // Behind camera

        return {
            x: (vector.x * 0.5 + 0.5) * window.innerWidth,
            y: (-vector.y * 0.5 + 0.5) * window.innerHeight
        };
    }
}

// --- Start ---
const game = new Game();
game.init().catch(console.error);
