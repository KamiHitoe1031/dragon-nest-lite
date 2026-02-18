// Dragon Nest Lite - NPC Entity
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { ModelLoader } from '../utils/ModelLoader.js';
import { MathUtils } from '../utils/MathUtils.js';

export class NPC {
    constructor(game, data) {
        this.game = game;
        this.id = data.id;
        this.name = data.name;
        this.type = data.type; // 'blacksmith', 'skillmaster', 'potion', 'dungeon_gate'
        this.position = new THREE.Vector3(data.position[0], data.position[1], data.position[2]);
        this.interactionRange = data.interactionRange || 3;
        this.dialogs = data.dialogs || [];

        this.mesh = null;
        this.nameLabel = null;
        this.interactIcon = null;
    }

    init() {
        const typeMap = {
            'blacksmith': 'NPC_BLACKSMITH',
            'skillmaster': 'NPC_SKILLMASTER',
            'potion': 'NPC_POTION',
            'dungeon_gate': null
        };

        const placeholderType = typeMap[this.type];

        if (this.type === 'dungeon_gate') {
            this.mesh = ModelLoader.getEnvironmentModel('door');
        } else {
            this.mesh = ModelLoader.getModel(placeholderType || 'NPC_BLACKSMITH');
        }

        this.mesh.position.copy(this.position);

        // Name label (floating text using sprite)
        this._createNameLabel();

        // Interact hint icon
        this._createInteractIcon();

        return this.mesh;
    }

    _createNameLabel() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, 256, 64);
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#ffdd44';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, 128, 40);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
        this.nameLabel = new THREE.Sprite(spriteMat);
        this.nameLabel.position.y = 2.5;
        this.nameLabel.scale.set(2, 0.5, 1);
        this.mesh.add(this.nameLabel);
    }

    _createInteractIcon() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.font = 'bold 40px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText('E', 32, 45);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
        this.interactIcon = new THREE.Sprite(spriteMat);
        this.interactIcon.position.y = 3.0;
        this.interactIcon.scale.set(0.5, 0.5, 1);
        this.interactIcon.visible = false;
        this.mesh.add(this.interactIcon);
    }

    update(dt) {
        if (!this.game.player) return;

        const dist = MathUtils.distanceXZ(this.position, this.game.player.position);
        const inRange = dist <= this.interactionRange;

        if (this.interactIcon) {
            this.interactIcon.visible = inRange;
            // Bob animation
            if (inRange) {
                this.interactIcon.position.y = 3.0 + Math.sin(Date.now() * 0.003) * 0.15;
            }
        }

        if (inRange && this.game.input.isKeyJustPressed('KeyE')) {
            this.interact();
        }

        // Face player when nearby
        if (inRange && this.type !== 'dungeon_gate') {
            const angle = MathUtils.angleBetweenXZ(this.position, this.game.player.position);
            this.mesh.rotation.y = angle;
        }
    }

    interact() {
        switch (this.type) {
            case 'blacksmith':
                this._interactBlacksmith();
                break;
            case 'skillmaster':
                this._interactSkillMaster();
                break;
            case 'potion':
                this._interactPotionShop();
                break;
            case 'dungeon_gate':
                this._interactDungeonGate();
                break;
        }
    }

    _interactBlacksmith() {
        const player = this.game.player;
        const itemsData = this.game.itemsData;
        const nextLevel = player.weaponLevel + 1;
        const costs = itemsData.weaponUpgrade.costPerLevel;

        if (nextLevel > costs.length) {
            this.game.ui.showDialog('Blacksmith', 'Your weapon is at maximum level! Impressive!');
            return;
        }

        const cost = costs[nextLevel - 1];
        this.game.ui.showDialog('Blacksmith', `Upgrade weapon to Lv.${nextLevel}? Cost: ${cost} Gold\n(Current: Lv.${player.weaponLevel}, ATK/MATK +${player.weaponLevel * 5})`, [
            {
                text: `Upgrade (${cost}G)`,
                callback: () => {
                    if (player.gold >= cost) {
                        player.gold -= cost;
                        player.weaponLevel = nextLevel;
                        this.game.ui.showCenterMessage(`Weapon upgraded to Lv.${nextLevel}!`, 1500);
                        this.game.ui.updateGold(player.gold);
                    } else {
                        this.game.ui.showCenterMessage('Not enough gold!', 1500);
                    }
                }
            },
            { text: 'Cancel', callback: () => {} }
        ]);
    }

    _interactSkillMaster() {
        const player = this.game.player;

        // Check if specialization selection needed
        if (!player.specialization && player.dungeonsCleared['1'].cleared) {
            this._showSpecializationChoice();
            return;
        }

        // Open skill tree
        this.game.openSkillTree();
    }

    _showSpecializationChoice() {
        const player = this.game.player;
        let options;

        if (player.classType === 'warrior') {
            options = [
                {
                    text: 'Sword Master - Combo DPS',
                    callback: () => {
                        player.specialization = 'swordmaster';
                        this.game.ui.showCenterMessage('You chose the path of Sword Master!', 2500);
                    }
                },
                {
                    text: 'Mercenary - AoE Tank',
                    callback: () => {
                        player.specialization = 'mercenary';
                        this.game.ui.showCenterMessage('You chose the path of Mercenary!', 2500);
                    }
                }
            ];
        } else {
            options = [
                {
                    text: 'Elemental Lord - Fire & Ice DPS',
                    callback: () => {
                        player.specialization = 'elementalLord';
                        this.game.ui.showCenterMessage('You chose the path of Elemental Lord!', 2500);
                    }
                },
                {
                    text: 'Force User - Gravity & Time',
                    callback: () => {
                        player.specialization = 'forceUser';
                        this.game.ui.showCenterMessage('You chose the path of Force User!', 2500);
                    }
                }
            ];
        }

        this.game.ui.showDialog(
            'Skill Master',
            'The time has come to choose your path. This decision will shape your destiny. Choose wisely, young warrior.',
            options
        );
    }

    _interactPotionShop() {
        const player = this.game.player;
        this.game.ui.showDialog('Potion Merchant', 'Welcome! What would you like to buy?', [
            {
                text: 'HP Potion (50G)',
                callback: () => {
                    if (player.gold >= 50) {
                        player.gold -= 50;
                        player.inventory.potion_hp++;
                        this.game.ui.updateGold(player.gold);
                        this.game.ui.updatePotionCount('hp', player.inventory.potion_hp);
                        this.game.ui.showCenterMessage('Bought HP Potion!', 1000);
                    } else {
                        this.game.ui.showCenterMessage('Not enough gold!', 1000);
                    }
                }
            },
            {
                text: 'MP Potion (30G)',
                callback: () => {
                    if (player.gold >= 30) {
                        player.gold -= 30;
                        player.inventory.potion_mp++;
                        this.game.ui.updateGold(player.gold);
                        this.game.ui.updatePotionCount('mp', player.inventory.potion_mp);
                        this.game.ui.showCenterMessage('Bought MP Potion!', 1000);
                    } else {
                        this.game.ui.showCenterMessage('Not enough gold!', 1000);
                    }
                }
            },
            { text: 'Leave', callback: () => {} }
        ]);
    }

    _interactDungeonGate() {
        this.game.openDungeonSelect();
    }
}
