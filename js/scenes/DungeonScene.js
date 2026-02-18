// Dragon Nest Lite - Dungeon Scene
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Enemy } from '../entities/Enemy.js';
import { ModelLoader } from '../utils/ModelLoader.js';
import { MathUtils } from '../utils/MathUtils.js';

export class DungeonScene {
    constructor(game) {
        this.game = game;
        this.dungeonGroup = null;
        this.enemies = [];
        this.currentRoomIndex = 0;
        this.rooms = [];
        this.dungeonId = null;
        this.dungeonData = null;
        this.roomGroup = null;
        this.doorMesh = null;
        this.doorLocked = true;
        this.chestMesh = null;
        this.chestOpened = false;
        this.startTime = 0;
        this.isComplete = false;
    }

    async enter(params = {}) {
        this.minimap = null;
        this.minimapCtx = null;
        this.dungeonId = params.dungeonId || 'dungeon_1';
        this.dungeonData = this.game.dungeonsData[this.dungeonId];

        if (!this.dungeonData) {
            console.error(`Dungeon ${this.dungeonId} not found`);
            this.game.sceneManager.switchTo('town');
            return;
        }

        this.game.ui.showHUD();
        this.game.isPaused = false;
        this.currentRoomIndex = 0;

        // BGM based on dungeon theme
        const bgmMap = {
            'forest_cave': 'bgm_dungeon_forest',
            'ruins': 'bgm_dungeon_ruins',
            'boss_lair': 'bgm_boss'
        };
        this.dungeonBGM = bgmMap[this.dungeonData.theme] || 'bgm_dungeon_forest';
        this.game.audio.playBGM(this.dungeonBGM);

        // Ambient SFX based on dungeon theme
        const ambientMap = {
            'forest_cave': 'sfx_ambient_cave',
            'ruins': 'sfx_ambient_ruins',
            'boss_lair': 'sfx_ambient_ruins'
        };
        this.game.audio.playAmbient(ambientMap[this.dungeonData.theme] || 'sfx_ambient_cave');
        this.isComplete = false;
        this.startTime = Date.now();
        this.enemies = [];

        // Set dungeon background
        const bgTex = ModelLoader.getTexture('bg_dungeon');
        if (bgTex) {
            bgTex.repeat.set(1, 1);
            this.game.scene.background = bgTex;
        } else {
            this.game.scene.background = new THREE.Color(0x1a1a2e);
        }

        // Create dungeon container
        this.dungeonGroup = new THREE.Group();

        // Dungeon lighting - bright enough to see clearly
        const ambient = new THREE.AmbientLight(0x667788, 2.0);
        this.dungeonGroup.add(ambient);

        // Hemisphere light for natural fill (sky color + ground bounce)
        const hemiLight = new THREE.HemisphereLight(0x8899aa, 0x443322, 1.0);
        this.dungeonGroup.add(hemiLight);

        const torchColor = this.dungeonData.theme === 'forest_cave' ? 0x88aa66 : 0xffaa44;
        const pointLight1 = new THREE.PointLight(torchColor, 3.0, 35);
        pointLight1.position.set(-5, 5, -5);
        this.dungeonGroup.add(pointLight1);

        const pointLight2 = new THREE.PointLight(torchColor, 3.0, 35);
        pointLight2.position.set(5, 5, 5);
        this.dungeonGroup.add(pointLight2);

        // Player follows a spotlight - bright and wide
        this.playerLight = new THREE.PointLight(0xffffff, 1.5, 20);
        this.playerLight.position.set(0, 4, 0);
        this.dungeonGroup.add(this.playerLight);

        this.game.scene.add(this.dungeonGroup);

        // Load first room
        this._loadRoom(0);

        // Place player at room entrance (near south wall)
        this.game.player.position.set(0, 0, this.dungeonData.rooms[0].size.depth / 2 - 2);
        if (this.game.player.isDead) {
            this.game.player.revive();
        }
        if (!this.game.scene.children.includes(this.game.player.mesh)) {
            this.game.scene.add(this.game.player.mesh);
        }

        // Create minimap
        this._createMinimap();

        // Show dungeon name
        this.game.ui.showCenterMessage(this.dungeonData.name, 2000);
    }

    _createMinimap() {
        let container = document.getElementById('minimap');
        if (!container) {
            container = document.createElement('div');
            container.id = 'minimap';
            document.body.appendChild(container);
        }
        container.innerHTML = '';
        container.style.display = 'block';

        const canvas = document.createElement('canvas');
        canvas.width = 120;
        canvas.height = 120;
        container.appendChild(canvas);
        this.minimap = canvas;
        this.minimapCtx = canvas.getContext('2d');
    }

    _updateMinimap() {
        if (!this.minimapCtx) return;
        const ctx = this.minimapCtx;
        const w = 120, h = 120;
        const roomData = this.dungeonData.rooms[this.currentRoomIndex];
        if (!roomData) return;

        const scaleX = w / roomData.size.width;
        const scaleZ = h / roomData.size.depth;
        const scale = Math.min(scaleX, scaleZ) * 0.8;
        const offsetX = w / 2;
        const offsetZ = h / 2;

        ctx.clearRect(0, 0, w, h);

        // Room background
        ctx.fillStyle = 'rgba(40,35,25,0.8)';
        const rw = roomData.size.width * scale;
        const rh = roomData.size.depth * scale;
        ctx.fillRect(offsetX - rw/2, offsetZ - rh/2, rw, rh);

        // Enemies (red dots)
        for (const enemy of this.enemies) {
            if (enemy.isDead) continue;
            const ex = offsetX + enemy.position.x * scale;
            const ez = offsetZ + enemy.position.z * scale;
            ctx.fillStyle = enemy.isBoss ? '#ff4400' : '#cc3333';
            ctx.beginPath();
            ctx.arc(ex, ez, enemy.isBoss ? 4 : 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Door (green/red square)
        if (this.doorMesh) {
            const dx = offsetX + this.doorMesh.position.x * scale;
            const dz = offsetZ + this.doorMesh.position.z * scale;
            ctx.fillStyle = this.doorLocked ? '#884422' : '#44aa44';
            ctx.fillRect(dx - 3, dz - 3, 6, 6);
        }

        // Player (white triangle)
        const px = offsetX + this.game.player.position.x * scale;
        const pz = offsetZ + this.game.player.position.z * scale;
        const pr = this.game.player.rotation;

        ctx.fillStyle = '#44ddff';
        ctx.beginPath();
        ctx.moveTo(px + Math.sin(pr) * 4, pz + Math.cos(pr) * 4);
        ctx.lineTo(px + Math.sin(pr + 2.4) * 3, pz + Math.cos(pr + 2.4) * 3);
        ctx.lineTo(px + Math.sin(pr - 2.4) * 3, pz + Math.cos(pr - 2.4) * 3);
        ctx.closePath();
        ctx.fill();
    }

    _disposeGroup(group) {
        group.traverse(child => {
            if (child.isMesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (child.material.map) child.material.map.dispose();
                    child.material.dispose();
                }
            }
        });
    }

    _loadRoom(index) {
        // Clear previous room and free GPU resources
        if (this.roomGroup) {
            this._disposeGroup(this.roomGroup);
            this.dungeonGroup.remove(this.roomGroup);
        }

        // Clear enemies
        for (const enemy of this.enemies) {
            if (enemy.mesh && !enemy.isDead) {
                this.game.scene.remove(enemy.mesh);
            }
        }
        this.enemies = [];

        const roomData = this.dungeonData.rooms[index];
        if (!roomData) return;

        this.roomGroup = new THREE.Group();
        this.doorLocked = roomData.exitDoor?.locked ?? true;
        this.chestOpened = false;

        // Coordinate offset: JSON positions are (0,0)→(width,depth), room is centered
        const halfW = roomData.size.width / 2;
        const halfD = roomData.size.depth / 2;
        const offsetPos = (pos) => [pos[0] - halfW, pos[1], pos[2] - halfD];

        // Floor with dungeon texture
        const floorRepeatX = Math.ceil(roomData.size.width / 4);
        const floorRepeatZ = Math.ceil(roomData.size.depth / 4);
        const floorTex = ModelLoader.getTexture('dungeon_floor', floorRepeatX, floorRepeatZ);
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(roomData.size.width, roomData.size.depth),
            new THREE.MeshLambertMaterial(floorTex ? { map: floorTex } : { color: CONFIG.PLACEHOLDER.GROUND_DUNGEON })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.roomGroup.add(floor);

        // Walls with texture
        this._createWalls(roomData.size);

        // Props (with collision data)
        this.propColliders = [];
        if (roomData.props) {
            const propRadii = { rock: 1.0, tree: 0.8, pillar: 0.7, barrel: 0.6 };
            for (const prop of roomData.props) {
                const propType = prop.type || 'rock';
                const propMesh = ModelLoader.getEnvironmentModel(propType);
                const p = offsetPos(prop.position);
                propMesh.position.set(p[0], p[1], p[2]);
                this.roomGroup.add(propMesh);
                this.propColliders.push({
                    x: p[0], z: p[2],
                    radius: propRadii[propType] || 0.8
                });
            }
        }

        // Exit door
        if (roomData.exitDoor) {
            this.doorMesh = ModelLoader.getEnvironmentModel('door');
            const dp = offsetPos(roomData.exitDoor.position);
            this.doorMesh.position.set(dp[0], dp[1], dp[2]);
            // Red = locked, green = open
            this._updateDoorColor();
            this.roomGroup.add(this.doorMesh);
        } else {
            this.doorMesh = null;
        }

        // Chest
        if (roomData.chest) {
            this.chestMesh = ModelLoader.getEnvironmentModel('chest');
            const cp = offsetPos(roomData.chest.position);
            this.chestMesh.position.set(cp[0], cp[1], cp[2]);
            this.chestMesh.visible = false; // Show after room clear
            this.roomGroup.add(this.chestMesh);
        } else {
            this.chestMesh = null;
        }

        this.dungeonGroup.add(this.roomGroup);

        // Spawn enemies
        if (roomData.enemies) {
            for (const enemySpawn of roomData.enemies) {
                const enemyData = this.game.enemiesData.find(e => e.id === enemySpawn.type);
                if (enemyData) {
                    const centeredPos = offsetPos(enemySpawn.position);
                    const enemy = new Enemy(this.game, enemyData, centeredPos);
                    const mesh = enemy.init();
                    this.game.scene.add(mesh);
                    this.enemies.push(enemy);
                }
            }
        }

        // Boss HP bar + boss BGM
        const boss = this.enemies.find(e => e.isBoss);
        if (boss) {
            this.game.ui.showBossHP(boss.name, boss.hp, boss.maxHP);
            this.game.audio.playSFX('sfx_boss_intro');
            this.game.audio.playBGM('bgm_boss');
        } else {
            this.game.ui.hideBossHP();
        }

        // Update UI
        this.game.ui.updateDungeonInfo(
            index,
            this.dungeonData.rooms.length,
            this.enemies.length
        );
    }

    _createWalls(size) {
        const wallHeight = 3;
        const wallThickness = 0.5;
        const wallTexN = ModelLoader.getTexture('ruins_wall', Math.ceil(size.width / 3), 1);
        const wallTexS = ModelLoader.getTexture('ruins_wall', Math.ceil(size.width / 3), 1);
        const wallTexE = ModelLoader.getTexture('ruins_wall', Math.ceil(size.depth / 3), 1);
        const wallTexW = ModelLoader.getTexture('ruins_wall', Math.ceil(size.depth / 3), 1);
        const wallMat = new THREE.MeshLambertMaterial({ color: CONFIG.PLACEHOLDER.WALL });

        // North wall
        const northWall = new THREE.Mesh(
            new THREE.BoxGeometry(size.width, wallHeight, wallThickness),
            wallTexN ? new THREE.MeshLambertMaterial({ map: wallTexN }) : wallMat
        );
        northWall.position.set(0, wallHeight / 2, -size.depth / 2);
        this.roomGroup.add(northWall);

        // South wall
        const southWall = new THREE.Mesh(
            new THREE.BoxGeometry(size.width, wallHeight, wallThickness),
            wallTexS ? new THREE.MeshLambertMaterial({ map: wallTexS }) : wallMat
        );
        southWall.position.set(0, wallHeight / 2, size.depth / 2);
        this.roomGroup.add(southWall);

        // East wall
        const eastWall = new THREE.Mesh(
            new THREE.BoxGeometry(wallThickness, wallHeight, size.depth),
            wallTexE ? new THREE.MeshLambertMaterial({ map: wallTexE }) : wallMat
        );
        eastWall.position.set(size.width / 2, wallHeight / 2, 0);
        this.roomGroup.add(eastWall);

        // West wall
        const westWall = new THREE.Mesh(
            new THREE.BoxGeometry(wallThickness, wallHeight, size.depth),
            wallTexW ? new THREE.MeshLambertMaterial({ map: wallTexW }) : wallMat
        );
        westWall.position.set(-size.width / 2, wallHeight / 2, 0);
        this.roomGroup.add(westWall);
    }

    _updateDoorColor() {
        if (this.doorMesh) {
            this.doorMesh.traverse(child => {
                if (child.isMesh) {
                    child.material = child.material.clone();
                    child.material.color.set(this.doorLocked ? 0x884422 : 0x44aa44);
                    if (!this.doorLocked) {
                        child.material.emissive = new THREE.Color(0x224411);
                    }
                }
            });
        }
    }

    update(dt) {
        if (this.game.isPaused || this.isComplete) return;

        // Update player
        this.game.player.update(dt);

        // Clamp player to room
        this._clampPlayerToRoom();

        // Update player light
        if (this.playerLight) {
            this.playerLight.position.copy(this.game.player.position);
            this.playerLight.position.y = 3;
        }

        // Update enemies
        let aliveCount = 0;
        for (const enemy of this.enemies) {
            enemy.update(dt);
            if (!enemy.isDead) aliveCount++;

            // Update boss HP
            if (enemy.isBoss && !enemy.isDead) {
                this.game.ui.updateBossHP(enemy.hp, enemy.maxHP);
            }
        }

        // Update projectiles
        this.game.updateProjectiles(dt);

        // Update DOTs (burn, etc.)
        this.game.combatSystem.updateDOTs(dt);

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

        // Check room clear
        if (aliveCount === 0 && this.enemies.length > 0 && this.doorLocked) {
            this._onRoomCleared();
        }

        // Check door interaction
        if (this.doorMesh && !this.doorLocked) {
            const doorPos = this.doorMesh.position;
            const dist = MathUtils.distanceXZ(this.game.player.position, doorPos);
            if (dist < 2) {
                this._goToNextRoom();
            }
        }

        // Check chest interaction
        if (this.chestMesh && this.chestMesh.visible && !this.chestOpened) {
            const chestPos = this.chestMesh.position;
            const dist = MathUtils.distanceXZ(this.game.player.position, chestPos);
            if (dist < 2 && this.game.input.isKeyJustPressed('KeyE')) {
                this._openChest();
            }
        }

        // Update camera
        this.game.updateCamera(dt);

        // Update HUD
        const player = this.game.player;
        this.game.ui.updateHP(player.hp, player.maxHP);
        this.game.ui.updateMP(player.mp, player.maxMP);
        this.game.ui.updateGold(player.gold);
        this.game.ui.updateDungeonInfo(
            this.currentRoomIndex,
            this.dungeonData.rooms.length,
            aliveCount
        );

        const expNeeded = CONFIG.EXP_PER_LEVEL[player.level] || 9999;
        this.game.ui.updateEXP(player.exp, expNeeded);

        // Update minimap
        this._updateMinimap();

        // Tab for skill tree
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

    _clampPlayerToRoom() {
        const roomData = this.dungeonData.rooms[this.currentRoomIndex];
        if (!roomData) return;

        const p = this.game.player.position;
        const halfW = roomData.size.width / 2 - 1;
        const halfD = roomData.size.depth / 2 - 1;
        p.x = Math.max(-halfW, Math.min(halfW, p.x));
        p.z = Math.max(-halfD, Math.min(halfD, p.z));

        // Prop collision: push player out of props
        const playerRadius = 0.5;
        if (this.propColliders) {
            for (const prop of this.propColliders) {
                const dx = p.x - prop.x;
                const dz = p.z - prop.z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                const minDist = playerRadius + prop.radius;
                if (dist < minDist && dist > 0.001) {
                    const pushFactor = (minDist - dist) / dist;
                    p.x += dx * pushFactor;
                    p.z += dz * pushFactor;
                }
            }
        }
    }

    _onRoomCleared() {
        this.doorLocked = false;
        this._updateDoorColor();
        this.game.audio.playSFX('sfx_door_open');

        // Show chest
        if (this.chestMesh) {
            this.chestMesh.visible = true;
        }

        this.game.ui.showCenterMessage('Room Cleared!', 1500);

        // Check if last room (dungeon clear)
        const roomData = this.dungeonData.rooms[this.currentRoomIndex];
        if (!roomData.exitDoor) {
            this._onDungeonCleared();
        }
    }

    _goToNextRoom() {
        this.currentRoomIndex++;
        if (this.currentRoomIndex >= this.dungeonData.rooms.length) {
            // Should not happen if design is correct
            this._onDungeonCleared();
            return;
        }

        // Reset player position near south wall of next room
        const nextRoom = this.dungeonData.rooms[this.currentRoomIndex];
        if (nextRoom) {
            this.game.player.position.set(0, 0, nextRoom.size.depth / 2 - 2);
        }
        this._loadRoom(this.currentRoomIndex);
    }

    _openChest() {
        this.chestOpened = true;
        this.game.audio.playSFX('sfx_chest_open');
        const roomData = this.dungeonData.rooms[this.currentRoomIndex];
        if (roomData.chest && roomData.chest.rewards) {
            const rewards = roomData.chest.rewards;
            if (rewards.gold) {
                const gold = MathUtils.randomInt(rewards.gold[0], rewards.gold[1]);
                this.game.player.gainGold(gold);
                this.game.ui.showCenterMessage(`+${gold} Gold!`, 1500);
            }
        }

        // Visual - scale down chest
        if (this.chestMesh) {
            this.chestMesh.scale.set(1.2, 0.5, 1.2);
        }
    }

    _onDungeonCleared() {
        this.isComplete = true;
        const player = this.game.player;
        const dungeonKey = this.dungeonData.id.toString();
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);

        // Award SP
        let spReward = 0;
        if (!player.dungeonsCleared[dungeonKey].cleared) {
            // First clear
            spReward = this.dungeonData.firstClearSP;
            player.dungeonsCleared[dungeonKey].cleared = true;
        } else {
            spReward = this.dungeonData.repeatClearSP;
        }
        player.dungeonsCleared[dungeonKey].clearCount++;

        const prevBest = player.dungeonsCleared[dungeonKey].bestTime;
        if (!prevBest || elapsed < prevBest) {
            player.dungeonsCleared[dungeonKey].bestTime = elapsed;
        }

        player.gainSP(spReward);

        // Switch to result scene
        setTimeout(() => {
            this.game.sceneManager.switchTo('result', {
                dungeonName: this.dungeonData.name,
                time: elapsed,
                spGained: spReward,
                goldGained: 0, // tracked separately through enemies
                isFirstClear: player.dungeonsCleared[dungeonKey].clearCount === 1
            });
        }, 1500);

        this.game.audio.playSFX('sfx_dungeon_clear');
        this.game.ui.showCenterMessage('Dungeon Cleared!', 1500);
    }

    async exit() {
        // Clean up enemies
        for (const enemy of this.enemies) {
            if (enemy.mesh) {
                this.game.scene.remove(enemy.mesh);
            }
        }
        this.enemies = [];

        // Clean up projectiles
        this.game.clearProjectiles();

        // Clean up DOTs
        this.game.combatSystem.clearDOTs();

        // Clean up effects
        this.game.effects.dispose();

        // Remove minimap
        const minimapEl = document.getElementById('minimap');
        if (minimapEl) minimapEl.style.display = 'none';
        this.minimap = null;
        this.minimapCtx = null;

        // Remove dungeon group and free GPU resources
        if (this.dungeonGroup) {
            this._disposeGroup(this.dungeonGroup);
            this.game.scene.remove(this.dungeonGroup);
            this.dungeonGroup = null;
        }

        this.roomGroup = null;
        this.doorMesh = null;
        this.chestMesh = null;

        // Remove player mesh from scene (will be re-added on next scene enter)
        if (this.game.player?.mesh) {
            this.game.scene.remove(this.game.player.mesh);
        }

        // Stop ambient sounds
        this.game.audio.stopAmbient();

        // Reset background
        this.game.scene.background = new THREE.Color(0x1a1a2e);
    }
}
