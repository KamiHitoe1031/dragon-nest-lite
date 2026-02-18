// Dragon Nest Lite - Town Scene
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { NPC } from '../entities/NPC.js';
import { ModelLoader } from '../utils/ModelLoader.js';

export class TownScene {
    constructor(game) {
        this.game = game;
        this.townGroup = null;
        this.npcs = [];
        this.dungeonSelectUI = null;
    }

    async enter(params = {}) {
        this.game.ui.showHUD();
        this.game.ui.hideDungeonInfo();
        this.game.ui.hideBossHP();
        this.game.isPaused = false;
        this.game.audio.playBGM('bgm_town');

        // Create town environment
        this.townGroup = new THREE.Group();

        // Ground
        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(CONFIG.TOWN_SIZE.width, CONFIG.TOWN_SIZE.depth),
            new THREE.MeshLambertMaterial({ color: CONFIG.PLACEHOLDER.GROUND_TOWN })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.townGroup.add(ground);

        // Cobblestone center
        const center = new THREE.Mesh(
            new THREE.PlaneGeometry(20, 20),
            new THREE.MeshLambertMaterial({ color: 0x887766 })
        );
        center.rotation.x = -Math.PI / 2;
        center.position.y = 0.01;
        center.receiveShadow = true;
        this.townGroup.add(center);

        // Lighting
        const ambient = new THREE.AmbientLight(0x667788, 1.2);
        this.townGroup.add(ambient);

        const sun = new THREE.DirectionalLight(0xffeedd, 1.5);
        sun.position.set(10, 20, 10);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.near = 0.5;
        sun.shadow.camera.far = 50;
        sun.shadow.camera.left = -25;
        sun.shadow.camera.right = 25;
        sun.shadow.camera.top = 25;
        sun.shadow.camera.bottom = -25;
        this.townGroup.add(sun);

        // Hemisphere light for softer shadows
        const hemiLight = new THREE.HemisphereLight(0x88aacc, 0x445533, 0.5);
        this.townGroup.add(hemiLight);

        // Decorative environment
        this._addTownDecorations();

        // NPCs
        this._spawnNPCs();

        this.game.scene.add(this.townGroup);

        // Place player
        this.game.player.position.set(0, 0, 0);
        if (!this.game.scene.children.includes(this.game.player.mesh)) {
            this.game.scene.add(this.game.player.mesh);
        }

        // Revive player if dead
        if (this.game.player.isDead) {
            this.game.player.revive();
        }

        // Update UI
        this._updateUI();

        // Save game when entering town
        this.game.saveGame();

        // Show controls hint on first visit
        if (!localStorage.getItem('dn_controls_shown')) {
            localStorage.setItem('dn_controls_shown', '1');
            this.game.ui.showControlsHint();
        }

        // Hint: visit Skill Master after Dungeon 1 first clear for specialization
        if (!this.game.player.specialization && this.game.player.dungeonsCleared['1'].cleared) {
            setTimeout(() => {
                this.game.ui.showCenterMessage('Talk to the Skill Master to choose your path!', 3000);
            }, 1000);
        }
    }

    _addTownDecorations() {
        // Houses
        const housePositions = [
            [-12, 0, -10], [12, 0, -10], [-12, 0, 10], [12, 0, 10]
        ];
        for (const pos of housePositions) {
            const house = ModelLoader.getEnvironmentModel('house');
            house.position.set(...pos);
            house.rotation.y = Math.atan2(-pos[0], -pos[2]);
            this.townGroup.add(house);
        }

        // Trees
        const treePositions = [
            [-8, 0, -15], [8, 0, -15], [-15, 0, 0], [15, 0, 0],
            [-8, 0, 15], [8, 0, 15], [-20, 0, -8], [20, 0, 8],
            [-18, 0, 12], [18, 0, -12]
        ];
        for (const pos of treePositions) {
            const s = 0.8 + Math.random() * 0.4;
            const tree = ModelLoader.getEnvironmentModel('tree', { scale: s });
            tree.position.set(...pos);
            this.townGroup.add(tree);
        }

        // Rocks
        const rockPositions = [
            [-5, 0, -18], [5, 0, 18], [-19, 0, -5], [19, 0, 5]
        ];
        for (const pos of rockPositions) {
            const rock = ModelLoader.getEnvironmentModel('rock');
            rock.position.set(...pos);
            this.townGroup.add(rock);
        }

        // Town boundary (invisible walls)
        const halfW = CONFIG.TOWN_SIZE.width / 2;
        const halfD = CONFIG.TOWN_SIZE.depth / 2;
        this.bounds = { minX: -halfW, maxX: halfW, minZ: -halfD, maxZ: halfD };
    }

    _spawnNPCs() {
        const npcData = [
            {
                id: 'blacksmith',
                name: 'Blacksmith',
                type: 'blacksmith',
                position: [-6, 0, -5],
                interactionRange: 3
            },
            {
                id: 'skillmaster',
                name: 'Skill Master',
                type: 'skillmaster',
                position: [6, 0, -5],
                interactionRange: 3
            },
            {
                id: 'potion',
                name: 'Potion Shop',
                type: 'potion',
                position: [-6, 0, 5],
                interactionRange: 3
            },
            {
                id: 'dungeon_gate',
                name: 'Dungeon Gate',
                type: 'dungeon_gate',
                position: [0, 0, -15],
                interactionRange: 4
            }
        ];

        for (const data of npcData) {
            const npc = new NPC(this.game, data);
            const mesh = npc.init();
            this.townGroup.add(mesh);
            this.npcs.push(npc);
        }
    }

    _updateUI() {
        const player = this.game.player;
        this.game.ui.updateHP(player.hp, player.maxHP);
        this.game.ui.updateMP(player.mp, player.maxMP);
        this.game.ui.updateGold(player.gold);
        this.game.ui.updateSP(player.skillPoints);
        this.game.ui.updatePlayerInfo(player.getDisplayName(), player.level);
        this.game.ui.updatePotionCount('hp', player.inventory.potion_hp);
        this.game.ui.updatePotionCount('mp', player.inventory.potion_mp);

        const expNeeded = CONFIG.EXP_PER_LEVEL[player.level] || 9999;
        this.game.ui.updateEXP(player.exp, expNeeded);
    }

    update(dt) {
        if (this.game.isPaused) return;

        // Update player
        this.game.player.update(dt);

        // Clamp player to bounds
        if (this.bounds) {
            const p = this.game.player.position;
            p.x = Math.max(this.bounds.minX + 1, Math.min(this.bounds.maxX - 1, p.x));
            p.z = Math.max(this.bounds.minZ + 1, Math.min(this.bounds.maxZ - 1, p.z));
        }

        // Update NPCs
        for (const npc of this.npcs) {
            npc.update(dt);
        }

        // Update camera
        this.game.updateCamera(dt);

        // Update HUD
        this._updateUI();

        // Skill slot cooldown display
        for (let i = 0; i < 4; i++) {
            const skillId = this.game.player.equippedSkills[i];
            if (skillId) {
                const skillData = this.game.getSkillData(skillId);
                const cd = this.game.player.skillCooldowns[skillId] || 0;
                const maxCd = skillData?.cooldown || 1;
                this.game.ui.updateSkillSlotCooldown(i, cd / maxCd);
            } else {
                this.game.ui.updateSkillSlotCooldown(i, 0);
            }
        }

        // Dismiss dialog on E key
        if (this.game.input.isKeyJustPressed('KeyE')) {
            const dialogPanel = document.getElementById('dialog-panel');
            if (dialogPanel && dialogPanel.style.display !== 'none') {
                const choicesEl = document.getElementById('dialog-choices');
                // Only auto-close if no choices are shown
                if (!choicesEl || choicesEl.children.length === 0) {
                    this.game.ui.hideDialog();
                }
            }
        }

        // Tab to open skill tree
        if (this.game.input.isKeyJustPressed('Tab')) {
            this.game.openSkillTree();
        }

        // Escape for menu
        if (this.game.input.isKeyJustPressed('Escape')) {
            if (this.game.skillSystem.isOpen) {
                this.game.skillSystem.close();
            } else {
                this.game.toggleMenu();
            }
        }
    }

    async exit() {
        // Remove NPCs
        this.npcs = [];

        // Remove town group
        if (this.townGroup) {
            this.game.scene.remove(this.townGroup);
            this.townGroup = null;
        }

        // Remove dungeon select UI
        if (this.dungeonSelectUI) {
            this.dungeonSelectUI.remove();
            this.dungeonSelectUI = null;
        }
    }
}
