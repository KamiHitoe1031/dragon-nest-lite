// Dragon Nest Lite - Enemy Entity
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { MathUtils } from '../utils/MathUtils.js';
import { ModelLoader } from '../utils/ModelLoader.js';

export class Enemy {
    constructor(game, data, position) {
        this.game = game;
        this.id = data.id;
        this.name = data.name;
        this.maxHP = data.hp;
        this.hp = this.maxHP;
        this.atk = data.atk;
        this.def = data.def;
        this.speed = data.speed;
        this.xpValue = data.xpValue;
        this.goldDrop = data.goldDrop;
        this.behavior = data.behavior;
        this.isBoss = data.isBoss || false;
        this.attackCooldown = data.attackCooldown || 2000;
        this.attackRange = data.attackRange || 2;
        this.detectionRange = data.detectionRange || 10;
        this.attackPatterns = data.attackPatterns || null;

        // State
        this.position = new THREE.Vector3(position[0], position[1], position[2]);
        this.spawnPosition = this.position.clone();
        this.rotation = 0;
        this.isDead = false;
        this.isAttacking = false;
        this.attackTimer = 0;
        this.currentAttackCooldown = 0;
        this.state = 'idle'; // idle, chase, attack, retreat, guard
        this.stateTimer = 0;
        this.knockbackVelocity = new THREE.Vector3();

        // Boss pattern
        this.currentPatternIndex = 0;
        this.patternCooldowns = {};

        // Visual
        this.mesh = null;
        this.hpBarGroup = null;

        // Debuffs
        this.debuffs = [];
        this.slowMultiplier = 1;
        this.isFrozen = false;
        this.frozenTimer = 0;
        this.isStunned = false;
        this.stunnedTimer = 0;

        // Death loot
        this.lootDropped = false;

        // Procedural animation
        this.walkCycle = Math.random() * Math.PI * 2;
        this.idleCycle = Math.random() * Math.PI * 2;

        // Bone animation
        this.bones = null;
        this.boneRestPose = {};
        this.hasBones = false;
    }

    init() {
        const typeMap = {
            'slime': 'SLIME',
            'goblin': 'GOBLIN',
            'skeleton': 'SKELETON',
            'dragon': 'DRAGON'
        };

        const type = typeMap[this.id] || 'SLIME';
        const scale = this.isBoss ? 1.5 : 1;
        this.mesh = ModelLoader.getModel(type, { scale });
        this.mesh.position.copy(this.position);

        // Discover skeleton bones for animation
        this._discoverBones();

        // HP bar above head
        this._createHPBar();

        return this.mesh;
    }

    _discoverBones() {
        const boneMap = {};
        const allBones = [];

        this.mesh.traverse(child => {
            if (child.isBone) {
                allBones.push(child);
                const n = child.name.toLowerCase();
                if (n.includes('hip') || n === 'root') boneMap.hips = child;
                else if (n.includes('spine02') || n.includes('spine2') || n.includes('spine_02')) { if (!boneMap.upperSpine) boneMap.upperSpine = child; }
                else if (n.includes('spine01') || n.includes('spine1') || n.includes('spine_01')) { if (!boneMap.spine) boneMap.spine = child; }
                else if (n === 'spine' || (n.includes('spine') && !n.includes('0') && !boneMap.spine)) boneMap.lowerSpine = child;
                else if ((n.includes('leftupleg') || n.includes('left_thigh') || n.includes('leftupperleg') || (n.includes('left') && n.includes('up') && n.includes('leg'))) && !boneMap.leftUpLeg) boneMap.leftUpLeg = child;
                else if ((n.includes('leftleg') || n.includes('left_shin') || n.includes('leftlowerleg')) && !n.includes('up') && !boneMap.leftLeg) boneMap.leftLeg = child;
                else if ((n.includes('rightupleg') || n.includes('right_thigh') || n.includes('rightupperleg') || (n.includes('right') && n.includes('up') && n.includes('leg'))) && !boneMap.rightUpLeg) boneMap.rightUpLeg = child;
                else if ((n.includes('rightleg') || n.includes('right_shin') || n.includes('rightlowerleg')) && !n.includes('up') && !boneMap.rightLeg) boneMap.rightLeg = child;
                else if ((n.includes('leftarm') || n.includes('left_upper_arm')) && !n.includes('fore') && !boneMap.leftArm) boneMap.leftArm = child;
                else if ((n.includes('rightarm') || n.includes('right_upper_arm')) && !n.includes('fore') && !boneMap.rightArm) boneMap.rightArm = child;
                else if ((n.includes('leftforearm') || n.includes('left_forearm')) && !boneMap.leftForeArm) boneMap.leftForeArm = child;
                else if ((n.includes('rightforearm') || n.includes('right_forearm')) && !boneMap.rightForeArm) boneMap.rightForeArm = child;
            }
        });

        const hasLegs = (boneMap.leftUpLeg || boneMap.leftLeg) && (boneMap.rightUpLeg || boneMap.rightLeg);
        if (allBones.length > 0 && hasLegs) {
            this.bones = boneMap;
            this.hasBones = true;
            for (const [key, bone] of Object.entries(boneMap)) {
                if (bone) this.boneRestPose[key] = bone.quaternion.clone();
            }
        }
    }

    _createHPBar() {
        this.hpBarGroup = new THREE.Group();

        const bgGeo = new THREE.PlaneGeometry(1, 0.1);
        const bgMat = new THREE.MeshBasicMaterial({ color: 0x333333, depthTest: false });
        const bg = new THREE.Mesh(bgGeo, bgMat);
        this.hpBarGroup.add(bg);

        const fillGeo = new THREE.PlaneGeometry(1, 0.1);
        const fillMat = new THREE.MeshBasicMaterial({ color: CONFIG.COLORS.ENEMY_HP, depthTest: false });
        this.hpFill = new THREE.Mesh(fillGeo, fillMat);
        this.hpBarGroup.add(this.hpFill);

        const height = this.isBoss ? 4 : 2;
        this.hpBarGroup.position.y = height;
        this.hpBarGroup.renderOrder = 999;
        this.mesh.add(this.hpBarGroup);
    }

    update(dt) {
        if (this.isDead) return;

        this._updateDebuffs(dt);

        if (this.isFrozen || this.isStunned) {
            this.currentAttackCooldown -= dt * 1000;
            this._updateMesh(dt);
            return;
        }

        // Apply knockback
        if (this.knockbackVelocity.lengthSq() > 0.1) {
            this.position.add(this.knockbackVelocity.clone().multiplyScalar(dt));
            this.knockbackVelocity.multiplyScalar(0.9);
        }

        // AI based on behavior type
        switch (this.behavior) {
            case 'chase': this._behaviorChase(dt); break;
            case 'rush_retreat': this._behaviorRushRetreat(dt); break;
            case 'guard_attack': this._behaviorGuardAttack(dt); break;
            case 'boss_dragon': this._behaviorBossDragon(dt); break;
            default: this._behaviorChase(dt);
        }

        this.currentAttackCooldown -= dt * 1000;
        this._updateMesh(dt);
    }

    _behaviorChase(dt) {
        const player = this.game.player;
        if (!player || player.isDead) return;

        const dist = MathUtils.distanceXZ(this.position, player.position);

        if (dist <= this.attackRange) {
            this._tryAttack(player);
        } else if (dist <= this.detectionRange) {
            this._moveToward(player.position, dt);
            this.state = 'chase';
        } else {
            this.state = 'idle';
        }
    }

    _behaviorRushRetreat(dt) {
        const player = this.game.player;
        if (!player || player.isDead) return;

        const dist = MathUtils.distanceXZ(this.position, player.position);

        if (this.state === 'retreat') {
            this.stateTimer -= dt;
            // Move away from player
            const dir = this.position.clone().sub(player.position).normalize();
            this.position.add(dir.multiplyScalar(this.speed * 0.1 * dt * this.slowMultiplier));
            this._faceDirection(dir.negate());

            if (this.stateTimer <= 0) {
                this.state = 'idle';
            }
        } else if (dist <= this.attackRange) {
            if (this._tryAttack(player)) {
                this.state = 'retreat';
                this.stateTimer = 1.5; // retreat for 1.5s
            }
        } else if (dist <= this.detectionRange) {
            this._moveToward(player.position, dt);
            this.state = 'chase';
        } else {
            this.state = 'idle';
        }
    }

    _behaviorGuardAttack(dt) {
        const player = this.game.player;
        if (!player || player.isDead) return;

        const dist = MathUtils.distanceXZ(this.position, player.position);

        if (this.state === 'guard') {
            this.stateTimer -= dt;
            // Face player but don't move
            this._faceTarget(player.position);

            if (this.stateTimer <= 0) {
                this.state = 'attack_ready';
            }
        } else if (this.state === 'attack_ready') {
            if (dist <= this.attackRange * 1.5) {
                this._tryAttack(player);
                this.state = 'idle';
            } else {
                this._moveToward(player.position, dt);
            }
        } else if (dist <= this.detectionRange) {
            if (dist <= this.attackRange * 2) {
                this.state = 'guard';
                this.stateTimer = 1.5; // guard for 1.5s
            } else {
                this._moveToward(player.position, dt);
            }
        } else {
            this.state = 'idle';
        }
    }

    _behaviorBossDragon(dt) {
        const player = this.game.player;
        if (!player || player.isDead) return;

        const dist = MathUtils.distanceXZ(this.position, player.position);

        // Rage phase: below 30% HP
        const isRaging = this.hp <= this.maxHP * 0.3;
        if (isRaging && !this._rageActivated) {
            this._rageActivated = true;
            this.game.audio.playSFX('sfx_dragon_roar');
            this.game.ui.showCenterMessage('Dragon is enraged!', 2000);
            this.game.ui.screenShake(12, 800);
            if (this.mesh) {
                this.mesh.traverse(child => {
                    if (child.isMesh && child.material) {
                        child.material.emissive = new THREE.Color(0x440000);
                    }
                });
            }
        }

        if (this.isAttacking) {
            this.attackTimer -= dt;
            if (this.attackTimer <= 0) {
                this.isAttacking = false;
            }
            return;
        }

        this._faceTarget(player.position);

        // Pick pattern: random instead of sequential cycling
        if (!this.attackPatterns || this.attackPatterns.length === 0) return;
        const pattern = this.attackPatterns[this.currentPatternIndex];
        if (!pattern) return;

        const cdMultiplier = isRaging ? 0.6 : 1;
        if (dist <= pattern.range && this.currentAttackCooldown <= 0) {
            this._executeBossAttack(pattern, player, isRaging);
            // Pick next pattern randomly (avoid repeating the same one)
            let next;
            do {
                next = Math.floor(Math.random() * this.attackPatterns.length);
            } while (next === this.currentPatternIndex && this.attackPatterns.length > 1);
            this.currentPatternIndex = next;
        } else if (dist > pattern.range) {
            const speedMult = isRaging ? 1.4 : 1;
            this._moveToward(player.position, dt * speedMult);
        }
    }

    _executeBossAttack(pattern, player, isRaging = false) {
        this.isAttacking = true;
        this.attackTimer = isRaging ? 0.7 : 1.0;
        this.currentAttackCooldown = pattern.cooldown * (isRaging ? 0.6 : 1);

        // Boss attack SFX
        const bossSfx = ['sfx_dragon_roar', 'sfx_dragon_breath', 'sfx_dragon_stomp'];
        this.game.audio.playSFX(bossSfx[this.currentPatternIndex % bossSfx.length]);

        let hitEnemies;
        if (pattern.aoeType === 'cone') {
            hitEnemies = MathUtils.isInCone(
                this.position,
                this._getDirection(),
                player.position,
                pattern.aoeAngle,
                pattern.range
            );
        } else if (pattern.aoeType === 'circle') {
            hitEnemies = MathUtils.isInCircle(this.position, player.position, pattern.range);
        } else {
            hitEnemies = MathUtils.distanceXZ(this.position, player.position) <= pattern.range;
        }

        if (hitEnemies) {
            const damageMult = isRaging ? 1.3 : 1;
            const damage = pattern.damage * damageMult * MathUtils.damageVariance();
            player.takeDamage(damage, this.position);
        }

        // Visual: enraged attacks are bigger
        if (this.mesh) {
            const scale = isRaging ? 1.3 : 1.2;
            this.mesh.scale.set(scale, 2 - scale, scale);
            setTimeout(() => {
                if (this.mesh) this.mesh.scale.set(1, 1, 1);
            }, 200);
        }

        // Screen shake on boss attacks
        this.game.ui.screenShake(isRaging ? 8 : 4, 300);
    }

    _tryAttack(player) {
        if (this.currentAttackCooldown > 0 || this.isAttacking) return false;

        this.isAttacking = true;
        this.attackTimer = 0.5;
        this.currentAttackCooldown = this.attackCooldown;

        // Enemy-specific attack SFX
        const sfxMap = { 'slime': 'sfx_slime_bounce', 'goblin': 'sfx_goblin_attack', 'skeleton': 'sfx_skeleton_rattle' };
        this.game.audio.playSFX(sfxMap[this.id] || 'sfx_hit_flesh');

        const damage = this.atk * MathUtils.damageVariance();
        const dist = MathUtils.distanceXZ(this.position, player.position);
        if (dist <= this.attackRange) {
            player.takeDamage(damage, this.position);
        }

        // Attack animation
        if (this.mesh) {
            this.mesh.scale.set(1.1, 0.9, 1.1);
            setTimeout(() => {
                if (this.mesh) this.mesh.scale.set(1, 1, 1);
            }, 150);
        }

        return true;
    }

    _moveToward(target, dt) {
        const dir = new THREE.Vector3().subVectors(target, this.position).normalize();
        dir.y = 0;
        const moveSpeed = this.speed * 0.1 * this.slowMultiplier;
        this.position.add(dir.multiplyScalar(moveSpeed * dt));
        this._faceTarget(target);
    }

    _faceTarget(target) {
        this.rotation = MathUtils.angleBetweenXZ(this.position, target);
    }

    _faceDirection(dir) {
        this.rotation = Math.atan2(dir.x, dir.z);
    }

    _getDirection() {
        return new THREE.Vector3(Math.sin(this.rotation), 0, Math.cos(this.rotation));
    }

    takeDamage(amount, isCritical = false) {
        if (this.isDead) return;

        const finalDamage = Math.max(1, Math.floor(amount - this.def * 0.3));
        this.hp -= finalDamage;

        this.game.audio.playSFX(isCritical ? 'sfx_hit_critical' : 'sfx_enemy_hit');

        // Show damage number
        const screenPos = this.game.worldToScreen(this.position);
        if (screenPos) {
            this.game.ui.showDamageNumber(
                screenPos.x + (Math.random() - 0.5) * 30,
                screenPos.y - 20,
                finalDamage,
                isCritical
            );
        }

        // Flash white
        if (this.mesh) {
            this.mesh.traverse(child => {
                if (child.isMesh && child.material) {
                    const origColor = child.material.color.clone();
                    child.material.color.set(0xffffff);
                    setTimeout(() => {
                        if (child.material) child.material.color.copy(origColor);
                    }, 80);
                }
            });
        }

        // Update HP bar
        if (this.hpFill) {
            const ratio = Math.max(0, this.hp / this.maxHP);
            this.hpFill.scale.x = ratio;
            this.hpFill.position.x = -(1 - ratio) * 0.5;
        }

        if (this.hp <= 0) {
            this.hp = 0;
            this.die();
        }
    }

    applyKnockback(direction, force) {
        this.knockbackVelocity.copy(direction).multiplyScalar(force);
    }

    applySlow(amount, duration) {
        this.slowMultiplier = 1 - amount;
        this.debuffs.push({ type: 'slow', value: amount, duration });
    }

    applyFreeze(duration) {
        this.isFrozen = true;
        this.frozenTimer = duration;
        if (this.mesh) {
            this.mesh.traverse(child => {
                if (child.isMesh && child.material) {
                    child.material._origColor = child.material.color.clone();
                    child.material.color.set(0x88ccff);
                }
            });
        }
    }

    applyStun(duration) {
        this.isStunned = true;
        this.stunnedTimer = duration;
    }

    _updateDebuffs(dt) {
        // Freeze
        if (this.isFrozen) {
            this.frozenTimer -= dt;
            if (this.frozenTimer <= 0) {
                this.isFrozen = false;
                if (this.mesh) {
                    this.mesh.traverse(child => {
                        if (child.isMesh && child.material && child.material._origColor) {
                            child.material.color.copy(child.material._origColor);
                        }
                    });
                }
            }
        }

        // Stun
        if (this.isStunned) {
            this.stunnedTimer -= dt;
            if (this.stunnedTimer <= 0) {
                this.isStunned = false;
            }
        }

        // Generic debuffs
        for (let i = this.debuffs.length - 1; i >= 0; i--) {
            this.debuffs[i].duration -= dt;
            if (this.debuffs[i].duration <= 0) {
                if (this.debuffs[i].type === 'slow') {
                    this.slowMultiplier = 1;
                }
                if (this.debuffs[i].type === 'atkDebuff') {
                    // Restore ATK by reversing the debuff
                    this.atk = Math.floor(this.atk / (1 - this.debuffs[i].value));
                }
                this.debuffs.splice(i, 1);
            }
        }
    }

    die() {
        this.isDead = true;
        this.state = 'dead';
        this.game.audio.playSFX('sfx_enemy_death');

        // Drop loot
        if (!this.lootDropped) {
            this.lootDropped = true;
            const gold = MathUtils.randomInt(this.goldDrop.min, this.goldDrop.max);
            this.game.player.gainGold(gold);
            this.game.player.gainExp(this.xpValue);
            this.game.audio.playSFX('sfx_gold_pickup');

            // Show loot popup
            const screenPos = this.game.worldToScreen(this.position);
            if (screenPos) {
                this.game.ui.showDamageNumber(screenPos.x, screenPos.y - 40, gold, false, false);
                // Show EXP gain in green
                setTimeout(() => {
                    const pos2 = this.game.worldToScreen(this.position);
                    if (pos2) {
                        this.game.ui.showDamageNumber(pos2.x, pos2.y - 60, this.xpValue, false, true);
                    }
                }, 200);
            }
        }

        // Death animation - shrink and fade
        if (this.mesh) {
            let timer = 0;
            const deathAnim = setInterval(() => {
                timer += 16;
                const scale = Math.max(0, 1 - timer / 500);
                if (this.mesh) {
                    this.mesh.scale.set(scale, scale, scale);
                }
                if (timer >= 500) {
                    clearInterval(deathAnim);
                    if (this.mesh) {
                        this.game.scene.remove(this.mesh);
                    }
                }
            }, 16);
        }
    }

    _updateMesh(dt) {
        if (!this.mesh || this.isDead) return;

        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = this.rotation;
        this.mesh.rotation.x = 0;
        this.mesh.scale.set(1, 1, 1);

        const isChasing = this.state === 'chase' || this.state === 'attack_ready';

        if (this.hasBones) {
            this._updateBoneAnimation(dt, isChasing);
        } else {
            this._updateFallbackAnimation(dt, isChasing);
        }

        // Make HP bar face camera
        if (this.hpBarGroup) {
            this.hpBarGroup.lookAt(this.game.camera.position);
        }
    }

    _updateBoneAnimation(dt, isChasing) {
        const b = this.bones;
        const rest = this.boneRestPose;
        const _euler = new THREE.Euler();
        const _quat = new THREE.Quaternion();

        const rotateBone = (key, rx, ry, rz) => {
            if (!b[key] || !rest[key]) return;
            _euler.set(rx, ry, rz);
            _quat.setFromEuler(_euler);
            b[key].quaternion.copy(rest[key]).multiply(_quat);
        };

        // Reset to rest pose
        for (const [key, bone] of Object.entries(b)) {
            if (bone && rest[key]) bone.quaternion.copy(rest[key]);
        }

        if (this.isFrozen) {
            return; // No animation when frozen
        }

        if (this.isAttacking) {
            // Attack lunge: lean forward, arms out
            rotateBone('spine', -0.15, 0, 0);
            rotateBone('leftArm', -0.5, 0, 0);
            rotateBone('rightArm', -0.5, 0, 0);
        } else if (isChasing) {
            // Walk cycle
            this.walkCycle += dt * 7;
            this.idleCycle = 0;
            const t = this.walkCycle;
            const sin = Math.sin(t);

            const legSwing = 0.4;
            rotateBone('leftUpLeg', sin * legSwing, 0, 0);
            rotateBone('rightUpLeg', -sin * legSwing, 0, 0);

            const kneeL = sin > 0 ? 0 : -sin * 0.4;
            const kneeR = -sin > 0 ? 0 : sin * 0.4;
            rotateBone('leftLeg', kneeL, 0, 0);
            rotateBone('rightLeg', kneeR, 0, 0);

            rotateBone('leftArm', -sin * 0.3, 0, 0);
            rotateBone('rightArm', sin * 0.3, 0, 0);

            rotateBone('spine', 0.04, sin * 0.03, 0);

            // Small hip bob
            if (b.hips) {
                b.hips.position.y = (b.hips.position.y || 0) + Math.abs(sin) * 0.02;
            }
        } else {
            // Idle breathing
            this.idleCycle += dt * 2.0;
            this.walkCycle = 0;
            const breath = Math.sin(this.idleCycle);

            rotateBone('spine', breath * 0.02, 0, 0);
            rotateBone('leftArm', 0, 0, breath * 0.02);
            rotateBone('rightArm', 0, 0, -breath * 0.02);
        }
    }

    _updateFallbackAnimation(dt, isChasing) {
        if (this.isFrozen) return;

        if (this.isAttacking) {
            // handled by scale bounce in _tryAttack
        } else if (isChasing) {
            this.walkCycle += dt * 10;
            this.idleCycle = 0;
            const bobY = Math.abs(Math.sin(this.walkCycle)) * 0.06;
            this.mesh.position.y = this.position.y + bobY;
            this.mesh.rotation.x = 0.05;
            const squash = 1 + Math.sin(this.walkCycle * 2) * 0.02;
            this.mesh.scale.set(squash, 1 / squash, squash);
        } else {
            this.idleCycle += dt * 2.0;
            this.walkCycle = 0;
            const breathe = Math.sin(this.idleCycle) * 0.015;
            this.mesh.scale.set(1 - breathe * 0.3, 1 + breathe, 1 - breathe * 0.3);
            this.mesh.position.y = this.position.y;
        }
    }
}
