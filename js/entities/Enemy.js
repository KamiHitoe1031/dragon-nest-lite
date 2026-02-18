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

        // HP bar above head
        this._createHPBar();

        return this.mesh;
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
            this._updateMesh();
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
        this._updateMesh();
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
            this.position.add(dir.multiplyScalar(this.speed * 0.01 * dt * this.slowMultiplier));
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

        if (this.isAttacking) {
            this.attackTimer -= dt;
            if (this.attackTimer <= 0) {
                this.isAttacking = false;
                this.currentPatternIndex = (this.currentPatternIndex + 1) % this.attackPatterns.length;
            }
            return;
        }

        this._faceTarget(player.position);

        const pattern = this.attackPatterns[this.currentPatternIndex];
        if (!pattern) return;

        if (dist <= pattern.range && this.currentAttackCooldown <= 0) {
            this._executeBossAttack(pattern, player);
        } else if (dist > pattern.range) {
            this._moveToward(player.position, dt);
        }
    }

    _executeBossAttack(pattern, player) {
        this.isAttacking = true;
        this.attackTimer = 1.0;
        this.currentAttackCooldown = pattern.cooldown;

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
            const damage = pattern.damage * MathUtils.damageVariance();
            player.takeDamage(damage, this.position);
        }

        // Visual mesh scale for attack
        if (this.mesh) {
            this.mesh.scale.set(1.2, 0.8, 1.2);
            setTimeout(() => {
                if (this.mesh) this.mesh.scale.set(1, 1, 1);
            }, 200);
        }
    }

    _tryAttack(player) {
        if (this.currentAttackCooldown > 0 || this.isAttacking) return false;

        this.isAttacking = true;
        this.attackTimer = 0.5;
        this.currentAttackCooldown = this.attackCooldown;

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
        const moveSpeed = this.speed * 0.01 * this.slowMultiplier;
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
                this.debuffs.splice(i, 1);
            }
        }
    }

    die() {
        this.isDead = true;
        this.state = 'dead';

        // Drop loot
        if (!this.lootDropped) {
            this.lootDropped = true;
            const gold = MathUtils.randomInt(this.goldDrop.min, this.goldDrop.max);
            this.game.player.gainGold(gold);
            this.game.player.gainExp(this.xpValue);

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

    _updateMesh() {
        if (this.mesh && !this.isDead) {
            this.mesh.position.copy(this.position);
            this.mesh.rotation.y = this.rotation;

            // Make HP bar face camera
            if (this.hpBarGroup) {
                this.hpBarGroup.lookAt(this.game.camera.position);
            }
        }
    }
}
