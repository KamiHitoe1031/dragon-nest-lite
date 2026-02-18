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
        this.shield = null; // { hp, maxHp } for damage absorption (Elemental Shield)

        // 3D
        this.mesh = null;
        this.mixer = null;
        this.animations = {};
        this.currentAnim = '';

        // Procedural animation state
        this.walkCycle = 0;
        this.idleCycle = 0;

        // Bone animation
        this.bones = null;       // { hips, spine, leftUpLeg, leftLeg, rightUpLeg, rightLeg, leftArm, rightArm, ... }
        this.boneRestPose = {};  // bone name -> Quaternion (original rest rotation)
        this.hasBones = false;

        // Shadow
        this.shadow = null;
    }

    async init() {
        const type = this.classType === 'warrior' ? 'WARRIOR' : 'MAGE';
        this.mesh = ModelLoader.getModel(type);
        this.mesh.position.copy(this.position);

        // Discover skeleton bones for animation
        this._discoverBones();

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

        // Attach programmatic weapon to right hand
        this._createWeapon();

        return this.mesh;
    }

    /**
     * Create a simple procedural weapon and attach it to the right forearm/hand bone.
     */
    _createWeapon() {
        const attachBone = this.bones?.rightForeArm || this.bones?.rightArm;

        if (this.classType === 'warrior') {
            // Great sword
            const blade = new THREE.Mesh(
                new THREE.BoxGeometry(0.06, 0.5, 0.02),
                new THREE.MeshLambertMaterial({ color: 0xccccdd, emissive: 0x222233 })
            );
            blade.position.y = -0.35;
            const guard = new THREE.Mesh(
                new THREE.BoxGeometry(0.12, 0.02, 0.04),
                new THREE.MeshLambertMaterial({ color: 0x886633 })
            );
            guard.position.y = -0.08;
            const handle = new THREE.Mesh(
                new THREE.CylinderGeometry(0.015, 0.015, 0.1, 6),
                new THREE.MeshLambertMaterial({ color: 0x553311 })
            );
            handle.position.y = -0.02;

            const swordGroup = new THREE.Group();
            swordGroup.add(blade, guard, handle);
            swordGroup.name = 'weapon';

            if (attachBone) {
                attachBone.add(swordGroup);
            } else {
                swordGroup.position.set(0.3, 0.3, 0);
                this.mesh.add(swordGroup);
            }
        } else {
            // Staff
            const shaft = new THREE.Mesh(
                new THREE.CylinderGeometry(0.015, 0.02, 0.7, 6),
                new THREE.MeshLambertMaterial({ color: 0x663311 })
            );
            shaft.position.y = -0.35;
            const orb = new THREE.Mesh(
                new THREE.SphereGeometry(0.04, 8, 6),
                new THREE.MeshLambertMaterial({ color: 0x4488ff, emissive: 0x2244aa })
            );
            orb.position.y = -0.68;

            const staffGroup = new THREE.Group();
            staffGroup.add(shaft, orb);
            staffGroup.name = 'weapon';

            if (attachBone) {
                attachBone.add(staffGroup);
            } else {
                staffGroup.position.set(0.3, 0.3, 0);
                this.mesh.add(staffGroup);
            }
        }
    }

    /**
     * Search the model hierarchy for skeleton bones.
     * Supports multiple naming conventions (Mixamo, Meshy, generic).
     */
    _discoverBones() {
        const boneMap = {};
        const allBones = [];

        this.mesh.traverse(child => {
            if (child.isBone) {
                allBones.push(child);
                const n = child.name.toLowerCase();
                // Map common bone names to our slots
                // Order matters: check specific names before generic 'spine'
                if (n.includes('hip') || n === 'root') boneMap.hips = child;
                else if (n.includes('spine02') || n.includes('spine2') || n.includes('spine_02')) { if (!boneMap.upperSpine) boneMap.upperSpine = child; }
                else if (n.includes('spine01') || n.includes('spine1') || n.includes('spine_01')) { if (!boneMap.spine) boneMap.spine = child; }
                else if (n === 'spine' || (n.includes('spine') && !n.includes('0') && !boneMap.spine)) boneMap.lowerSpine = child;
                else if (n.includes('head') && !n.includes('end') && !n.includes('front')) boneMap.head = child;

                // Left leg
                else if ((n.includes('leftupleg') || n.includes('left_thigh') || n.includes('lefthip') || n.includes('leftupperleg') || (n.includes('left') && n.includes('up') && n.includes('leg'))) && !boneMap.leftUpLeg) boneMap.leftUpLeg = child;
                else if ((n.includes('leftleg') || n.includes('left_shin') || n.includes('leftlowerleg') || n.includes('left_calf')) && !n.includes('up') && !boneMap.leftLeg) boneMap.leftLeg = child;
                else if ((n.includes('leftfoot') || n.includes('left_foot')) && !boneMap.leftFoot) boneMap.leftFoot = child;

                // Right leg
                else if ((n.includes('rightupleg') || n.includes('right_thigh') || n.includes('righthip') || n.includes('rightupperleg') || (n.includes('right') && n.includes('up') && n.includes('leg'))) && !boneMap.rightUpLeg) boneMap.rightUpLeg = child;
                else if ((n.includes('rightleg') || n.includes('right_shin') || n.includes('rightlowerleg') || n.includes('right_calf')) && !n.includes('up') && !boneMap.rightLeg) boneMap.rightLeg = child;
                else if ((n.includes('rightfoot') || n.includes('right_foot')) && !boneMap.rightFoot) boneMap.rightFoot = child;

                // Left arm
                else if ((n.includes('leftarm') || n.includes('left_upper_arm') || n.includes('leftshoulder')) && !n.includes('fore') && !boneMap.leftArm) boneMap.leftArm = child;
                else if ((n.includes('leftforearm') || n.includes('left_forearm') || n.includes('left_lower_arm')) && !boneMap.leftForeArm) boneMap.leftForeArm = child;

                // Right arm
                else if ((n.includes('rightarm') || n.includes('right_upper_arm') || n.includes('rightshoulder')) && !n.includes('fore') && !boneMap.rightArm) boneMap.rightArm = child;
                else if ((n.includes('rightforearm') || n.includes('right_forearm') || n.includes('right_lower_arm')) && !boneMap.rightForeArm) boneMap.rightForeArm = child;
            }
        });

        // Need at minimum hip + one leg pair to enable bone animation
        const hasLegs = (boneMap.leftUpLeg || boneMap.leftLeg) && (boneMap.rightUpLeg || boneMap.rightLeg);
        if (allBones.length > 0 && hasLegs) {
            this.bones = boneMap;
            this.hasBones = true;

            // Save rest pose quaternions for all mapped bones
            for (const [key, bone] of Object.entries(boneMap)) {
                if (bone) {
                    this.boneRestPose[key] = bone.quaternion.clone();
                }
            }
            console.log(`[Player] Bone animation enabled (${allBones.length} bones, mapped: ${Object.keys(boneMap).join(', ')})`);
        } else {
            this.hasBones = false;
            if (allBones.length > 0) {
                console.log(`[Player] Found ${allBones.length} bones but couldn't map legs. Names: ${allBones.map(b => b.name).join(', ')}`);
            } else {
                console.log('[Player] No bones found, using mesh-based animation fallback');
            }
        }
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
        // CD reduction from Time Acceleration buff
        let cdMultiplier = 1;
        for (const buff of this.buffs) {
            if (buff.stat === 'cdReduction') cdMultiplier += buff.value;
        }

        for (const skillId in this.skillCooldowns) {
            if (this.skillCooldowns[skillId] > 0) {
                this.skillCooldowns[skillId] -= dt * 1000 * cdMultiplier;
                if (this.skillCooldowns[skillId] < 0) {
                    this.skillCooldowns[skillId] = 0;
                }
            }
        }
    }

    _handleBuffs(dt) {
        for (let i = this.buffs.length - 1; i >= 0; i--) {
            const buff = this.buffs[i];
            buff.duration -= dt;

            // HP regen buff (Fortress)
            if (buff.stat === 'hpRegen') {
                this.hp = Math.min(this.maxHP, this.hp + this.maxHP * buff.value * dt);
            }

            if (buff.duration <= 0) {
                this._removeBuff(buff);
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
        this.mesh.scale.set(1, 1, 1);
        this.mesh.rotation.x = 0;

        if (this.hasBones) {
            this._updateBoneAnimation(dt);
        } else {
            this._updateMeshFallbackAnimation(dt);
        }

        // Flash effect during invincibility
        if (this.isInvincible) {
            this.mesh.visible = Math.floor(Date.now() / 100) % 2 === 0;
        } else {
            this.mesh.visible = true;
        }
    }

    /**
     * Bone-based animation: rotate skeleton bones for walk/idle/attack.
     */
    _updateBoneAnimation(dt) {
        const b = this.bones;
        const rest = this.boneRestPose;
        const _euler = new THREE.Euler();
        const _quat = new THREE.Quaternion();

        // Helper: apply additive rotation to bone from its rest pose
        const rotateBone = (key, rx, ry, rz) => {
            if (!b[key] || !rest[key]) return;
            _euler.set(rx, ry, rz);
            _quat.setFromEuler(_euler);
            b[key].quaternion.copy(rest[key]).multiply(_quat);
        };

        // Reset all bones to rest pose first
        for (const [key, bone] of Object.entries(b)) {
            if (bone && rest[key]) {
                bone.quaternion.copy(rest[key]);
            }
        }

        if (this.isDodging) {
            // No special bone pose during dodge
        } else if (this.isAttacking || this.isUsingSkill) {
            this.walkCycle = 0;
            // Animated attack: swing weapon based on attack progress
            const totalTime = this.isAttacking ? CONFIG.ATTACK_DURATION || 0.4 : 0.5;
            const elapsed = totalTime - (this.isAttacking ? this.attackTimer : this.activeSkillTimer);
            const t = Math.min(1, Math.max(0, elapsed / totalTime));

            if (this.classType === 'warrior') {
                // Sword swing: wind up (0-0.3), slash (0.3-0.7), follow through (0.7-1.0)
                if (t < 0.3) {
                    // Wind up: raise sword arm back
                    const p = t / 0.3;
                    rotateBone('spine', -0.1 * p, 0.2 * p, 0);
                    rotateBone('upperSpine', 0, 0.15 * p, 0);
                    rotateBone('rightArm', -1.2 * p, 0, 0.4 * p);
                    rotateBone('rightForeArm', -0.5 * p, 0, 0);
                    rotateBone('leftArm', -0.3 * p, 0, -0.2 * p);
                    rotateBone('leftUpLeg', -0.15 * p, 0, 0);
                    rotateBone('rightUpLeg', 0.1 * p, 0, 0);
                } else if (t < 0.7) {
                    // Slash forward: swing arm down
                    const p = (t - 0.3) / 0.4;
                    rotateBone('spine', -0.1 + 0.2 * p, 0.2 - 0.5 * p, 0);
                    rotateBone('upperSpine', 0, 0.15 - 0.35 * p, 0);
                    rotateBone('rightArm', -1.2 + 1.8 * p, 0, 0.4 - 0.8 * p);
                    rotateBone('rightForeArm', -0.5 + 0.3 * p, 0, 0);
                    rotateBone('leftArm', -0.3, 0, -0.2 + 0.1 * p);
                    rotateBone('leftUpLeg', -0.15, 0, 0);
                    rotateBone('rightUpLeg', 0.1 - 0.2 * p, 0, 0);
                } else {
                    // Follow through: arms settle
                    const p = (t - 0.7) / 0.3;
                    rotateBone('spine', 0.1 * (1 - p), -0.3 * (1 - p), 0);
                    rotateBone('upperSpine', 0, -0.2 * (1 - p), 0);
                    rotateBone('rightArm', 0.6 * (1 - p), 0, -0.4 * (1 - p));
                    rotateBone('rightForeArm', -0.2 * (1 - p), 0, 0);
                    rotateBone('leftArm', -0.3 * (1 - p), 0, -0.1 * (1 - p));
                }
            } else {
                // Mage: staff cast - raise staff overhead (0-0.4), thrust forward (0.4-0.7), settle (0.7-1.0)
                if (t < 0.4) {
                    const p = t / 0.4;
                    rotateBone('spine', -0.15 * p, 0, 0);
                    rotateBone('upperSpine', -0.1 * p, 0, 0);
                    rotateBone('rightArm', -1.5 * p, 0, 0.3 * p);
                    rotateBone('rightForeArm', -0.8 * p, 0, 0);
                    rotateBone('leftArm', -0.8 * p, 0, -0.2 * p);
                    rotateBone('leftForeArm', -0.4 * p, 0, 0);
                } else if (t < 0.7) {
                    const p = (t - 0.4) / 0.3;
                    rotateBone('spine', -0.15 + 0.3 * p, 0, 0);
                    rotateBone('upperSpine', -0.1 + 0.2 * p, 0, 0);
                    rotateBone('rightArm', -1.5 + 2.0 * p, 0, 0.3 - 0.3 * p);
                    rotateBone('rightForeArm', -0.8 + 0.6 * p, 0, 0);
                    rotateBone('leftArm', -0.8 + 0.6 * p, 0, -0.2 + 0.1 * p);
                    rotateBone('leftForeArm', -0.4 + 0.2 * p, 0, 0);
                } else {
                    const p = (t - 0.7) / 0.3;
                    rotateBone('spine', 0.15 * (1 - p), 0, 0);
                    rotateBone('upperSpine', 0.1 * (1 - p), 0, 0);
                    rotateBone('rightArm', 0.5 * (1 - p), 0, 0);
                    rotateBone('rightForeArm', -0.2 * (1 - p), 0, 0);
                    rotateBone('leftArm', -0.2 * (1 - p), 0, -0.1 * (1 - p));
                }
            }
        } else if (this.isMoving) {
            // --- Walk cycle ---
            this.walkCycle += dt * 8; // cycle speed
            this.idleCycle = 0;
            const t = this.walkCycle;
            const sin = Math.sin(t);
            const cos = Math.cos(t);

            // Hips: subtle vertical bob
            if (b.hips) {
                const bobY = Math.abs(sin) * 0.03;
                b.hips.position.y = (b.hips.position.y || 0) + bobY;
            }

            // Upper legs: swing forward/backward (opposite sides)
            const legSwing = 0.45;
            rotateBone('leftUpLeg', sin * legSwing, 0, 0);
            rotateBone('rightUpLeg', -sin * legSwing, 0, 0);

            // Lower legs: bend knee on back swing
            const kneeL = sin > 0 ? 0 : -sin * 0.5;
            const kneeR = -sin > 0 ? 0 : sin * 0.5;
            rotateBone('leftLeg', kneeL, 0, 0);
            rotateBone('rightLeg', kneeR, 0, 0);

            // Feet: counter-rotate to stay flat
            rotateBone('leftFoot', -sin * 0.15, 0, 0);
            rotateBone('rightFoot', sin * 0.15, 0, 0);

            // Arms: swing opposite to legs
            const armSwing = 0.35;
            rotateBone('leftArm', -sin * armSwing, 0, 0);
            rotateBone('rightArm', sin * armSwing, 0, 0);
            rotateBone('leftForeArm', -0.15, 0, 0);
            rotateBone('rightForeArm', -0.15, 0, 0);

            // Spine: slight counter-twist
            rotateBone('spine', 0.03, sin * 0.04, 0);
            rotateBone('lowerSpine', 0.02, sin * 0.02, 0);
            rotateBone('upperSpine', 0.01, sin * 0.02, 0);
        } else {
            // --- Idle breathing ---
            this.idleCycle += dt * 2.5;
            this.walkCycle = 0;
            const breath = Math.sin(this.idleCycle);

            // Spine: gentle breathing expand
            rotateBone('spine', breath * 0.02, 0, 0);
            rotateBone('lowerSpine', breath * 0.01, 0, 0);

            // Arms: slight resting sway
            rotateBone('leftArm', 0, 0, breath * 0.02);
            rotateBone('rightArm', 0, 0, -breath * 0.02);
        }
    }

    /**
     * Mesh-based fallback animation when no bones are found.
     */
    _updateMeshFallbackAnimation(dt) {
        if (this.isDodging) {
            return;
        } else if (this.isAttacking || this.isUsingSkill) {
            this.walkCycle = 0;
        } else if (this.isMoving) {
            this.walkCycle += dt * 12;
            this.idleCycle = 0;

            const bobY = Math.abs(Math.sin(this.walkCycle)) * 0.08;
            this.mesh.position.y = this.position.y + bobY;
            this.mesh.rotation.x = 0.06;

            const squash = 1 + Math.sin(this.walkCycle * 2) * 0.02;
            this.mesh.scale.set(squash, 1 / squash, squash);
        } else {
            this.idleCycle += dt * 2.5;
            this.walkCycle = 0;

            const breathe = Math.sin(this.idleCycle) * 0.015;
            this.mesh.scale.set(1 - breathe * 0.5, 1 + breathe, 1 - breathe * 0.5);
            this.mesh.position.y = this.position.y;
        }
    }

    takeDamage(amount, attackerPos = null) {
        if (this.isInvincible || this.isDead) return 0;

        let finalDamage = Math.max(1, Math.floor(amount - this.getEffectiveDef() * 0.5));

        // Shield absorption (Elemental Shield)
        if (this.shield && this.shield.hp > 0) {
            if (finalDamage <= this.shield.hp) {
                this.shield.hp -= finalDamage;
                return 0;
            } else {
                finalDamage -= Math.floor(this.shield.hp);
                this.shield = null;
            }
        }

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
        this.buffs = [];
        this.shield = null;
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

        // Auto-face nearest enemy before skill execution
        this._faceNearestEnemy(skillData.range || 10);

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

    /**
     * Execute a self-buff skill. Reads buff properties from levelData.
     */
    _executeBuffSkill(skillId, skillData, level) {
        const levelData = skillData.levels[level - 1];
        if (!levelData) return;

        if (skillData.sfx) this.game.audio.playSFX(skillData.sfx);
        const duration = (levelData.duration || 10000) / 1000;

        // Iron Skin: DEF buff
        if (levelData.defBonus) {
            this.buffs.push({ id: skillId, stat: 'def', value: levelData.defBonus, duration });
            this.game.effects.buffAura(this, 0x886644, duration);
        }
        // Battle Howl: ATK buff
        if (levelData.atkBuff) {
            this.buffs.push({ id: skillId, stat: 'atk', value: levelData.atkBuff, duration });
            this.game.effects.buffAura(this, 0xff8844, duration);
            this.game.effects.auraRing(this.position, 0xff8844, 3, 2);
        }
        // Time Acceleration: CD reduction
        if (levelData.cdReduction) {
            this.buffs.push({ id: skillId, stat: 'cdReduction', value: levelData.cdReduction, duration });
            this.game.effects.buffAura(this, 0x88aaff, duration);
        }
        // Elemental Shield: damage absorption
        if (levelData.shieldMultiplier) {
            const shieldHP = this.getEffectiveMatk() * levelData.shieldMultiplier;
            this.shield = { hp: shieldHP, maxHp: shieldHP };
            this.game.effects.buffAura(this, 0x44aaff, 30);
        }
        // Fortress: invincibility + DEF + HP regen
        if (levelData.invincibleDuration) {
            const invDur = levelData.invincibleDuration / 1000;
            this.isInvincible = true;
            this.invincibleTimer = invDur;
            if (levelData.defAura) {
                this.buffs.push({ id: skillId, stat: 'def', value: levelData.defAura, duration: invDur });
            }
            if (levelData.hpRegenPerSec) {
                this.buffs.push({ id: skillId + '_regen', stat: 'hpRegen', value: levelData.hpRegenPerSec, duration: invDur });
            }
            this.game.effects.buffAura(this, 0xffdd44, invDur);
            this.game.effects.auraRing(this.position, 0xffdd44, 5, 2);
        }

        this.game.ui.showCenterMessage(skillData.nameEN || skillData.name, 1000);
    }

    /**
     * Execute a debuff skill targeting enemies in area.
     */
    _executeDebuffSkill(skillId, skillData, level) {
        const levelData = skillData.levels[level - 1];
        if (!levelData) return;

        if (skillData.sfx) this.game.audio.playSFX(skillData.sfx);

        const range = skillData.range || 8;
        const enemies = this.game.getEnemiesInRange(
            this.position,
            this._getAttackDirection(),
            range,
            skillData.aoeType || 'circle',
            skillData.aoeAngle || 360
        );

        const duration = (levelData.duration || levelData.stopDuration || 5000) / 1000;

        for (const enemy of enemies) {
            if (enemy.isDead) continue;
            // Slow Area
            if (levelData.slowPercent) {
                enemy.applySlow(levelData.slowPercent, duration);
            }
            // Time Stop
            if (levelData.stopDuration) {
                enemy.applyStun(levelData.stopDuration / 1000);
                enemy.applyFreeze(levelData.stopDuration / 1000);
            }
            // Taunting Howl: ATK debuff
            if (levelData.atkDebuff) {
                enemy.debuffs.push({ type: 'atkDebuff', value: levelData.atkDebuff, duration });
                enemy.atk = Math.floor(enemy.atk * (1 - levelData.atkDebuff));
            }
        }

        // Visual
        this.game.effects.auraRing(this.position, 0x88aaff, range, Math.min(duration, 3));
        this.game.ui.showCenterMessage(skillData.nameEN || skillData.name, 1000);
    }

    /**
     * Dash skill: move player forward, damage enemies along path.
     */
    _executeDashSkill(damage, hits, range, skillData, levelData) {
        const dir = this._getAttackDirection();
        const startPos = this.position.clone();
        const dashDistance = range;
        const dashDuration = 0.3;
        let elapsed = 0;

        this.isUsingSkill = true;
        this.isInvincible = true;
        this.invincibleTimer = dashDuration;
        this.activeSkillTimer = dashDuration;

        // Super armor from Howling Charge
        if (levelData.superArmorDuration) {
            this.isInvincible = true;
            this.invincibleTimer = levelData.superArmorDuration / 1000;
        }

        const hitEnemies = new Set();
        const dashInterval = setInterval(() => {
            elapsed += 0.016;
            const t = Math.min(1, elapsed / dashDuration);

            this.position.copy(startPos).add(dir.clone().multiplyScalar(dashDistance * t));

            const enemies = this.game.getEnemiesInRange(
                this.position, dir, 2, 'circle', 360
            );
            for (const enemy of enemies) {
                if (!hitEnemies.has(enemy) && !enemy.isDead) {
                    hitEnemies.add(enemy);
                    for (let h = 0; h < hits; h++) {
                        setTimeout(() => {
                            if (!enemy.isDead) {
                                const isCrit = Math.random() < CONFIG.CRITICAL_CHANCE;
                                let dmg = damage * MathUtils.damageVariance();
                                if (isCrit) dmg *= CONFIG.CRITICAL_MULTIPLIER;
                                enemy.takeDamage(Math.floor(dmg), isCrit);
                                this.game.effects.hitSpark(enemy.position, 0xffaa00);
                            }
                        }, h * 80);
                    }
                    const kb = enemy.position.clone().sub(this.position).normalize();
                    enemy.applyKnockback(kb, 3);
                }
            }

            if (t >= 1) clearInterval(dashInterval);
        }, 16);
    }

    _isDashSkill(skillId, skillData) {
        return skillData.aoeType === 'line' && (
            skillId.includes('dash') || skillId.includes('charge') || skillId.includes('line_drive')
        );
    }

    /**
     * Spin skill: deal damage in ticks around player.
     */
    _executeSpinSkill(damage, hits, range, skillData, levelData) {
        this.activeSkillTimer = hits * 0.15;
        for (let h = 0; h < hits; h++) {
            setTimeout(() => {
                const enemies = this.game.getEnemiesInRange(
                    this.position, this._getAttackDirection(), range, 'circle', 360
                );
                for (const enemy of enemies) {
                    if (!enemy.isDead) {
                        const isCrit = Math.random() < CONFIG.CRITICAL_CHANCE;
                        let dmg = damage * MathUtils.damageVariance();
                        if (isCrit) dmg *= CONFIG.CRITICAL_MULTIPLIER;
                        enemy.takeDamage(Math.floor(dmg), isCrit);
                        this.game.effects.hitSpark(enemy.position, 0xffaa00);
                    }
                }
                // Spinning visual
                this.game.effects.slashArc(this.position, this.rotation + h * 0.8, 0xffaa44, 1.5);
            }, h * 150);
        }
    }

    /**
     * Apply status effects from levelData to hit enemies.
     */
    _applySkillStatusEffects(enemies, damage, levelData) {
        for (const enemy of enemies) {
            if (enemy.isDead) continue;
            if (levelData.slowDuration) {
                enemy.applySlow(0.3, levelData.slowDuration);
            }
            if (levelData.freezeDuration && levelData.freezeDuration > 0) {
                enemy.applyFreeze(levelData.freezeDuration / 1000);
            }
            if (levelData.stunDuration) {
                enemy.applyStun(levelData.stunDuration / 1000);
            }
            if (levelData.burnDuration) {
                this.game.combatSystem.applyBurn(enemy, damage * 0.15, levelData.burnDuration / 1000);
            }
            if (levelData.stopDuration) {
                enemy.applyStun(levelData.stopDuration / 1000);
                enemy.applyFreeze(levelData.stopDuration / 1000);
            }
            if (levelData.pullRadius) {
                const pullCenter = this.position.clone().add(this._getAttackDirection().multiplyScalar(3));
                const pullDir = pullCenter.clone().sub(enemy.position).normalize();
                enemy.applyKnockback(pullDir, 5);
            }
        }
    }

    /**
     * Fire a projectile. Shared by Mage (spells) and Fighter (magic sword skills).
     */
    _fireProjectile(damage, speed, range, color, homing = false) {
        const dir = this._getAttackDirection();
        const startPos = this.position.clone();
        startPos.y += 1;

        const projectile = {
            position: startPos.clone(),
            direction: dir.clone(),
            speed,
            damage,
            range,
            distanceTraveled: 0,
            homing,
            color,
            alive: true
        };

        const geo = new THREE.SphereGeometry(0.15, 8, 8);
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(startPos);

        const glowGeo = new THREE.SphereGeometry(0.25, 8, 8);
        const glowMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3 });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        mesh.add(glow);

        this.game.scene.add(mesh);
        projectile.mesh = mesh;
        this.game.addProjectile(projectile);
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

    /**
     * Auto-face the nearest enemy before attacking.
     * If no enemy in range, face toward mouse ground position (if available)
     * or keep current rotation.
     */
    _faceNearestEnemy(maxRange = 10) {
        const enemies = this.game.getActiveEnemies ? this.game.getActiveEnemies() : [];
        let closest = null;
        let closestDist = Infinity;

        for (const enemy of enemies) {
            if (enemy.isDead) continue;
            const dist = MathUtils.distanceXZ(this.position, enemy.position);
            if (dist < closestDist && dist <= maxRange) {
                closestDist = dist;
                closest = enemy;
            }
        }

        if (closest) {
            this.rotation = MathUtils.angleBetweenXZ(this.position, closest.position);
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

        // Specialization lock: non-base skills require matching specialization
        if (skillData.column !== 'base') {
            if (!this.specialization) return false;
            const columnSpec = this.game.getColumnSpecialization(this.classType, skillData.column);
            if (columnSpec && columnSpec !== this.specialization) return false;
        }

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
