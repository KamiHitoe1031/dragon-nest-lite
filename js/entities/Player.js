// Dragon Nest Lite - Player Base Class
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { MathUtils } from '../utils/MathUtils.js';
import { ModelLoader } from '../utils/ModelLoader.js';

export class Player {
    constructor(game, classType) {
        this.game = game;
        this.classType = classType; // 'warrior' or 'sorceress'

        // Stats
        this.level = 1;
        this.exp = 0;
        this.maxHP = CONFIG.PLAYER_BASE_HP;
        this.hp = this.maxHP;
        this.maxMP = CONFIG.PLAYER_BASE_MP;
        this.mp = this.maxMP;
        this.atk = CONFIG.PLAYER_BASE_ATK;
        this.def = CONFIG.PLAYER_BASE_DEF;
        this.matk = CONFIG.PLAYER_BASE_MATK;
        this.mdef = CONFIG.PLAYER_BASE_MDEF;
        this.gold = 0;
        this.skillPoints = 0;
        this.totalSpEarned = 0;
        this.specialization = null;
        this.weaponLevel = 0;

        // Skill state
        this.skillLevels = {};
        this.equippedSkills = [null, null, null, null];
        this.skillCooldowns = {};

        // Inventory
        this.inventory = { potion_hp: 3, potion_mp: 1 };

        // Dungeon progress
        this.dungeonsCleared = {
            '1': { cleared: false, clearCount: 0, bestTime: null },
            '2': { cleared: false, clearCount: 0, bestTime: null },
            '3': { cleared: false, clearCount: 0, bestTime: null }
        };

        // Movement
        this.position = new THREE.Vector3(0, 0, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.rotation = 0; // Y-axis rotation
        this.moveSpeed = CONFIG.PLAYER_MOVE_SPEED;
        this.isMoving = false;
        this.moveDirection = new THREE.Vector3();

        // Combat state
        this.isAttacking = false;
        this.attackTimer = 0;
        this.comboStep = 0;
        this.isInvincible = false;
        this.invincibleTimer = 0;
        this.isDead = false;
        this.isUsingSkill = false;
        this.activeSkillTimer = 0;

        // Dodge
        this.isDodging = false;
        this.dodgeTimer = 0;
        this.dodgeCooldown = 0;
        this.dodgeDirection = new THREE.Vector3();

        // MP regeneration
        this.mpRegenRate = 2; // per second
        this.mpRegenTimer = 0;

        // Buffs
        this.buffs = [];

        // 3D
        this.mesh = null;
        this.mixer = null;
        this.animations = {};
        this.currentAnim = '';

        // Procedural animation state
        this.walkCycle = 0;
        this.idleCycle = 0;
        this.animBaseY = 0; // stored base Y for bobbing

        // Shadow
        this.shadow = null;
    }

    async init() {
        const type = this.classType === 'warrior' ? 'WARRIOR' : 'MAGE';
        this.mesh = ModelLoader.getModel(type);
        this.mesh.position.copy(this.position);

        // Add circle shadow under feet
        const shadowGeo = new THREE.CircleGeometry(0.5, 16);
        const shadowMat = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.3,
            depthWrite: false
        });
        this.shadow = new THREE.Mesh(shadowGeo, shadowMat);
        this.shadow.rotation.x = -Math.PI / 2;
        this.shadow.position.y = 0.01;
        this.mesh.add(this.shadow);

        return this.mesh;
    }

    update(dt) {
        if (this.isDead) return;

        this._handleMovement(dt);
        this._handleCombat(dt);
        this._handleCooldowns(dt);
        this._handleBuffs(dt);
        this._handleMPRegen(dt);
        this._updateInvincibility(dt);
        this._updateDodge(dt);
        this._updateMesh(dt);
    }

    _handleMovement(dt) {
        if (this.isAttacking || this.isUsingSkill || this.isDodging) return;

        const input = this.game.input.getMovementInput();
        this.isMoving = input.x !== 0 || input.z !== 0;

        if (this.isMoving) {
            // Calculate movement direction based on camera
            const cameraAngle = this.game.cameraAngle || 0;
            const sin = Math.sin(cameraAngle);
            const cos = Math.cos(cameraAngle);

            this.moveDirection.x = input.x * cos + input.z * sin;
            this.moveDirection.z = -input.x * sin + input.z * cos;
            this.moveDirection.normalize();

            // Update position
            this.position.x += this.moveDirection.x * this.moveSpeed * dt;
            this.position.z += this.moveDirection.z * this.moveSpeed * dt;

            // Update rotation to face movement direction
            const targetRotation = Math.atan2(this.moveDirection.x, this.moveDirection.z);
            this.rotation = this._lerpAngle(this.rotation, targetRotation, CONFIG.PLAYER_ROTATION_SPEED * dt);
        }
    }

    _handleCombat(dt) {
        // Attack timer
        if (this.isAttacking) {
            this.attackTimer -= dt;
            if (this.attackTimer <= 0) {
                this.isAttacking = false;
                this.comboStep = 0;
            }
        }

        // Skill timer
        if (this.isUsingSkill) {
            this.activeSkillTimer -= dt;
            if (this.activeSkillTimer <= 0) {
                this.isUsingSkill = false;
            }
        }

        // Left click - normal attack
        if (this.game.input.isMouseJustPressed(0) && !this.isAttacking && !this.isUsingSkill && !this.isDodging) {
            this.normalAttack();
        }

        // Right click - heavy attack
        if (this.game.input.isMouseJustPressed(2) && !this.isAttacking && !this.isUsingSkill && !this.isDodging) {
            this.heavyAttack();
        }

        // Space - dodge
        if (this.game.input.isKeyJustPressed('Space') && !this.isDodging && this.dodgeCooldown <= 0) {
            this.dodge();
        }

        // Skill slots 1-4
        const slotIndex = this.game.input.getSkillSlotInput();
        if (slotIndex >= 0 && !this.isAttacking && !this.isUsingSkill && !this.isDodging) {
            this.useSkillSlot(slotIndex);
        }

        // Potions
        if (this.game.input.isKeyJustPressed('KeyQ')) {
            this.usePotion('potion_hp');
        }
        if (this.game.input.isKeyJustPressed('KeyE') && !this.game.nearbyNPC) {
            this.usePotion('potion_mp');
        }
    }

    normalAttack() {
        // Override in subclass
    }

    heavyAttack() {
        // Override in subclass
    }

    dodge() {
        const dodgeCd = this.getSkillLevel('w_tumble') > 0 || this.getSkillLevel('s_teleport') > 0
            ? this._getDodgeCooldown() : 4;

        this.isDodging = true;
        this.isInvincible = true;
        this.dodgeTimer = 0.4; // dodge duration
        this.invincibleTimer = 0.5;
        this.dodgeCooldown = dodgeCd;

        // Dodge in movement direction or forward
        const input = this.game.input.getMovementInput();
        if (input.x !== 0 || input.z !== 0) {
            const cameraAngle = this.game.cameraAngle || 0;
            const sin = Math.sin(cameraAngle);
            const cos = Math.cos(cameraAngle);
            this.dodgeDirection.set(
                input.x * cos + input.z * sin,
                0,
                -input.x * sin + input.z * cos
            ).normalize();
        } else {
            this.dodgeDirection.set(
                Math.sin(this.rotation),
                0,
                Math.cos(this.rotation)
            );
        }
    }

    _getDodgeCooldown() {
        return 4; // Override in subclass
    }

    _updateDodge(dt) {
        if (this.isDodging) {
            this.dodgeTimer -= dt;
            const dodgeSpeed = 20;
            this.position.x += this.dodgeDirection.x * dodgeSpeed * dt;
            this.position.z += this.dodgeDirection.z * dodgeSpeed * dt;

            if (this.dodgeTimer <= 0) {
                this.isDodging = false;
            }
        }
        if (this.dodgeCooldown > 0) {
            this.dodgeCooldown -= dt;
        }
    }

    _handleCooldowns(dt) {
        for (const skillId in this.skillCooldowns) {
            if (this.skillCooldowns[skillId] > 0) {
                this.skillCooldowns[skillId] -= dt * 1000;
                if (this.skillCooldowns[skillId] < 0) {
                    this.skillCooldowns[skillId] = 0;
                }
            }
        }
    }

    _handleBuffs(dt) {
        for (let i = this.buffs.length - 1; i >= 0; i--) {
            this.buffs[i].duration -= dt;
            if (this.buffs[i].duration <= 0) {
                this._removeBuff(this.buffs[i]);
                this.buffs.splice(i, 1);
            }
        }
    }

    _handleMPRegen(dt) {
        this.mpRegenTimer += dt;
        if (this.mpRegenTimer >= 1) {
            this.mpRegenTimer = 0;
            const regenRate = this.mpRegenRate * (1 + this.getSkillLevel('s_mind_conquer') * 0.1);
            this.mp = Math.min(this.maxMP, this.mp + regenRate);
        }
    }

    _updateInvincibility(dt) {
        if (this.isInvincible) {
            this.invincibleTimer -= dt;
            if (this.invincibleTimer <= 0) {
                this.isInvincible = false;
            }
        }
    }

    _updateMesh(dt) {
        if (!this.mesh) return;

        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = this.rotation;

        // Procedural animation
        if (this.isDodging) {
            // Dodge: flatten and spin
            this.mesh.rotation.x = 0;
        } else if (this.isAttacking || this.isUsingSkill) {
            // Attack: handled by subclass scale bounce, reset lean
            this.mesh.rotation.x = 0;
            this.walkCycle = 0;
        } else if (this.isMoving) {
            // Walking/running animation
            this.walkCycle += dt * 12;
            this.idleCycle = 0;

            // Vertical bob
            const bobY = Math.abs(Math.sin(this.walkCycle)) * 0.08;
            this.mesh.position.y = this.position.y + bobY;

            // Slight forward lean
            this.mesh.rotation.x = 0.06;

            // Subtle squash/stretch sync with steps
            const squash = 1 + Math.sin(this.walkCycle * 2) * 0.02;
            this.mesh.scale.set(squash, 1 / squash, squash);
        } else {
            // Idle breathing
            this.idleCycle += dt * 2.5;
            this.walkCycle = 0;

            const breathe = Math.sin(this.idleCycle) * 0.015;
            this.mesh.scale.set(1 - breathe * 0.5, 1 + breathe, 1 - breathe * 0.5);
            this.mesh.rotation.x = 0;
            this.mesh.position.y = this.position.y;
        }

        // Flash effect during invincibility
        if (this.isInvincible) {
            const visible = Math.floor(Date.now() / 100) % 2 === 0;
            this.mesh.visible = visible;
        } else {
            this.mesh.visible = true;
        }
    }

    takeDamage(amount, attackerPos = null) {
        if (this.isInvincible || this.isDead) return 0;

        const finalDamage = Math.max(1, Math.floor(amount - this.getEffectiveDef() * 0.5));
        this.hp -= finalDamage;
        this.game.audio.playSFX('sfx_player_hurt');

        // Invincibility frames
        this.isInvincible = true;
        this.invincibleTimer = CONFIG.INVINCIBILITY_FRAMES / 1000;

        // Screen shake
        this.game.ui.screenShake(3, 150);

        if (this.hp <= 0) {
            this.hp = 0;
            this.die();
        }

        return finalDamage;
    }

    heal(amount) {
        this.hp = Math.min(this.maxHP, this.hp + amount);
    }

    die() {
        this.isDead = true;
        this.game.audio.playSFX('sfx_player_death');
        this.game.onPlayerDeath();
    }

    revive() {
        this.isDead = false;
        this.hp = this.maxHP;
        this.mp = this.maxMP;
        this.isInvincible = false;
        this.isAttacking = false;
        this.isUsingSkill = false;
        this.isDodging = false;
    }

    usePotion(type) {
        if (!this.inventory[type] || this.inventory[type] <= 0) return;

        if (type === 'potion_hp' && this.hp < this.maxHP) {
            this.inventory[type]--;
            this.heal(50);
            this.game.audio.playSFX('sfx_potion_drink');
            this.game.ui.updatePotionCount('hp', this.inventory.potion_hp);
        } else if (type === 'potion_mp' && this.mp < this.maxMP) {
            this.inventory[type]--;
            this.mp = Math.min(this.maxMP, this.mp + 30);
            this.game.audio.playSFX('sfx_potion_drink');
            this.game.ui.updatePotionCount('mp', this.inventory.potion_mp);
        }
    }

    useSkillSlot(index) {
        const skillId = this.equippedSkills[index];
        if (!skillId) return;

        const skillData = this.game.getSkillData(skillId);
        if (!skillData) return;

        const level = this.getSkillLevel(skillId);
        if (level <= 0) return;

        // Check cooldown
        if (this.skillCooldowns[skillId] > 0) return;

        // Check MP
        if (skillData.mpCost && this.mp < skillData.mpCost) return;

        // Use skill
        this.mp -= skillData.mpCost || 0;
        this.skillCooldowns[skillId] = skillData.cooldown;
        this.isUsingSkill = true;
        this.activeSkillTimer = 0.5; // skill animation time

        // Execute skill effect
        this._executeSkill(skillId, skillData, level);

        // Ultimate shared cooldown
        if (skillData.treeSpRequirement) {
            this._applyUltimateCooldown(skillId, skillData);
        }
    }

    _executeSkill(skillId, skillData, level) {
        // Override in subclass for specific effects
        const levelData = skillData.levels[level - 1];
        if (!levelData) return;

        const damage = this._calculateSkillDamage(skillData, levelData);
        const hits = levelData.hits || 1;

        // Find enemies in range
        const enemies = this.game.getEnemiesInRange(
            this.position,
            this._getAttackDirection(),
            skillData.range || 3,
            skillData.aoeType || 'circle',
            skillData.aoeAngle || 360
        );

        for (const enemy of enemies) {
            for (let h = 0; h < hits; h++) {
                setTimeout(() => {
                    if (!enemy.isDead) {
                        const isCrit = Math.random() < CONFIG.CRITICAL_CHANCE;
                        let dmg = damage * MathUtils.damageVariance();
                        if (isCrit) dmg *= CONFIG.CRITICAL_MULTIPLIER;
                        enemy.takeDamage(Math.floor(dmg), isCrit);
                    }
                }, h * 100);
            }
        }
    }

    _calculateSkillDamage(skillData, levelData) {
        const isPhysical = skillData.damageType !== 'magical';
        const baseStat = isPhysical ? this.getEffectiveAtk() : this.getEffectiveMatk();
        return baseStat * (levelData.damageMultiplier || 1);
    }

    _applyUltimateCooldown(usedSkillId, usedSkillData) {
        // If using an ultimate, put other ultimate on cooldown too
        const allSkills = this.game.getAllSkillIds(this.classType, this.specialization);
        for (const sid of allSkills) {
            const sdata = this.game.getSkillData(sid);
            if (sdata && sdata.treeSpRequirement && sid !== usedSkillId && this.getSkillLevel(sid) > 0) {
                this.skillCooldowns[sid] = sdata.cooldown;
            }
        }
    }

    _getAttackDirection() {
        return new THREE.Vector3(
            Math.sin(this.rotation),
            0,
            Math.cos(this.rotation)
        );
    }

    getSkillLevel(skillId) {
        return this.skillLevels[skillId] || 0;
    }

    learnSkill(skillId) {
        if (this.skillPoints <= 0) return false;
        const skillData = this.game.getSkillData(skillId);
        if (!skillData) return false;

        const currentLevel = this.getSkillLevel(skillId);
        if (currentLevel >= skillData.maxLevel) return false;

        // Check prerequisites
        if (!this._checkPrerequisite(skillData)) return false;
        if (!this._checkTreeSpRequirement(skillData)) return false;

        // Check SP cost
        if (this.skillPoints < skillData.spPerLevel) return false;

        this.skillLevels[skillId] = currentLevel + 1;
        this.skillPoints -= skillData.spPerLevel;

        // Apply passive effects
        if (skillData.type === 'passive') {
            this._applyPassiveEffect(skillId, currentLevel + 1);
        }

        return true;
    }

    _checkPrerequisite(skillData) {
        if (!skillData.prerequisite) return true;
        const preReqLevel = this.getSkillLevel(skillData.prerequisite.skillId);
        return preReqLevel >= skillData.prerequisite.level;
    }

    _checkTreeSpRequirement(skillData) {
        if (!skillData.treeSpRequirement) return true;
        const columnSP = this._calcColumnSP(skillData.column);
        return columnSP >= skillData.treeSpRequirement;
    }

    _calcColumnSP(column) {
        let total = 0;
        const allSkills = this.game.getSkillsByColumn(this.classType, this.specialization, column);
        for (const skill of allSkills) {
            const level = this.getSkillLevel(skill.id);
            total += level * skill.spPerLevel;
        }
        return total;
    }

    _applyPassiveEffect(skillId, level) {
        // Override in subclass
    }

    _removeBuff(buff) {
        // Override in subclass
    }

    getEffectiveAtk() {
        let atk = this.atk + this.weaponLevel * 5;
        for (const buff of this.buffs) {
            if (buff.stat === 'atk') atk *= (1 + buff.value);
        }
        return atk;
    }

    getEffectiveMatk() {
        let matk = this.matk + this.weaponLevel * 5;
        const intMastery = this.getSkillLevel('s_intelligence_mastery');
        if (intMastery > 0) matk *= (1 + intMastery * 0.05);
        for (const buff of this.buffs) {
            if (buff.stat === 'matk') matk *= (1 + buff.value);
        }
        return matk;
    }

    getEffectiveDef() {
        let def = this.def;
        for (const buff of this.buffs) {
            if (buff.stat === 'def') def *= (1 + buff.value);
        }
        return def;
    }

    gainExp(amount) {
        this.exp += amount;
        while (this.level < CONFIG.EXP_PER_LEVEL.length) {
            const needed = CONFIG.EXP_PER_LEVEL[this.level] || 9999;
            if (this.exp < needed) break;
            this.exp -= needed;
            this.levelUp();
        }
    }

    levelUp() {
        this.level++;
        this.maxHP += CONFIG.LEVEL_STAT_BONUS.hp;
        this.maxMP += CONFIG.LEVEL_STAT_BONUS.mp;
        this.atk += CONFIG.LEVEL_STAT_BONUS.atk;
        this.def += CONFIG.LEVEL_STAT_BONUS.def;
        this.matk += CONFIG.LEVEL_STAT_BONUS.matk;
        this.mdef += CONFIG.LEVEL_STAT_BONUS.mdef;
        this.hp = this.maxHP;
        this.mp = this.maxMP;

        this.game.audio.playSFX('sfx_level_up');
        this.game.ui.showCenterMessage(`Level Up! Lv.${this.level}`, 2000);

        // Level up visual effect
        if (this.game.effects) {
            this.game.effects.levelUp(this.position);
        }
    }

    gainSP(amount) {
        this.skillPoints += amount;
        this.totalSpEarned += amount;
    }

    gainGold(amount) {
        this.gold += amount;
    }

    toSaveData() {
        return {
            selectedClass: this.classType,
            specialization: this.specialization,
            level: this.level,
            exp: this.exp,
            gold: this.gold,
            skillPoints: this.skillPoints,
            totalSpEarned: this.totalSpEarned,
            skillLevels: { ...this.skillLevels },
            equippedSkills: [...this.equippedSkills],
            stats: {
                maxHP: this.maxHP,
                maxMP: this.maxMP,
                atk: this.atk,
                def: this.def,
                matk: this.matk,
                mdef: this.mdef
            },
            weaponLevel: this.weaponLevel,
            dungeonsCleared: JSON.parse(JSON.stringify(this.dungeonsCleared)),
            inventory: { ...this.inventory }
        };
    }

    loadFromSave(data) {
        this.specialization = data.specialization;
        this.level = data.level;
        this.exp = data.exp;
        this.gold = data.gold;
        this.skillPoints = data.skillPoints;
        this.totalSpEarned = data.totalSpEarned;
        this.skillLevels = { ...data.skillLevels };
        this.equippedSkills = [...data.equippedSkills];
        this.maxHP = data.stats.maxHP;
        this.maxMP = data.stats.maxMP;
        this.atk = data.stats.atk;
        this.def = data.stats.def;
        this.matk = data.stats.matk;
        this.mdef = data.stats.mdef;
        this.hp = this.maxHP;
        this.mp = this.maxMP;
        this.weaponLevel = data.weaponLevel;
        this.dungeonsCleared = JSON.parse(JSON.stringify(data.dungeonsCleared));
        this.inventory = { ...data.inventory };
    }

    _lerpAngle(a, b, t) {
        let diff = b - a;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        return a + diff * t;
    }
}
