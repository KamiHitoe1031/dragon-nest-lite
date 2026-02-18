// Dragon Nest Lite - Mage (Sorceress) Class
import * as THREE from 'three';
import { Player } from './Player.js';
import { CONFIG } from '../config.js';
import { MathUtils } from '../utils/MathUtils.js';

export class Mage extends Player {
    constructor(game) {
        super(game, 'sorceress');
        this.atk = 8;
        this.def = CONFIG.PLAYER_BASE_DEF - 2;
        this.matk = CONFIG.PLAYER_BASE_MATK;
        this.mdef = CONFIG.PLAYER_BASE_MDEF + 2;
        this.maxMP = CONFIG.PLAYER_BASE_MP + 10; // More MP
        this.mp = this.maxMP;
    }

    normalAttack() {
        // S1: Magic Missile (homing projectile)
        this._faceNearestEnemy();
        this.isAttacking = true;
        this.attackTimer = 0.3;

        const level = this.getSkillLevel('s_magic_missile');
        const multiplier = level > 0 ? (0.4 + level * 0.16) : 0.6;

        this.game.audio.playSFX('sfx_magic_cast');

        // Create projectile
        this._fireProjectile(
            this.getEffectiveMatk() * multiplier,
            12, // speed
            8,  // range
            0x44aaff,
            true // homing
        );

        if (this.mesh) {
            this.mesh.scale.set(1.05, 1.05, 1.05);
            setTimeout(() => {
                if (this.mesh) this.mesh.scale.set(1, 1, 1);
            }, 80);
        }
    }

    heavyAttack() {
        // S2: Void Blast (explosion in front)
        this._faceNearestEnemy();
        this.isAttacking = true;
        this.attackTimer = 0.5;

        const level = this.getSkillLevel('s_void_blast');
        const multiplier = level > 0 ? (1.0 + level * 0.28) : 1.4;

        const blastPos = this.position.clone().add(
            this._getAttackDirection().multiplyScalar(3)
        );

        const enemies = this.game.getEnemiesInRange(
            blastPos,
            this._getAttackDirection(),
            3,
            'circle',
            360
        );

        for (const enemy of enemies) {
            const isCrit = Math.random() < CONFIG.CRITICAL_CHANCE;
            let damage = this.getEffectiveMatk() * multiplier * MathUtils.damageVariance();
            if (isCrit) damage *= CONFIG.CRITICAL_MULTIPLIER;
            enemy.takeDamage(Math.floor(damage), isCrit);
        }

        // SFX + Visual effect
        this.game.audio.playSFX('sfx_dark_magic');
        this.game.effects.explosion(blastPos, 0x8844ff, 3);
    }

    dodge() {
        // S4: Teleport - instant blink
        const teleportLevel = this.getSkillLevel('s_teleport');
        const distance = 4 + (teleportLevel > 0 ? teleportLevel * 0.5 : 0);

        const input = this.game.input.getMovementInput();
        let dir;
        if (input.x !== 0 || input.z !== 0) {
            const cameraAngle = this.game.cameraAngle || 0;
            const sin = Math.sin(cameraAngle);
            const cos = Math.cos(cameraAngle);
            dir = new THREE.Vector3(
                input.x * cos + input.z * sin,
                0,
                -input.x * sin + input.z * cos
            ).normalize();
        } else {
            dir = this._getAttackDirection();
        }

        this.game.audio.playSFX('sfx_skill_teleport');
        // Teleport start effect
        this.game.effects.groundImpact(this.position.clone(), 0x8844ff, 1.5);

        // Instant teleport
        this.position.add(dir.multiplyScalar(distance));
        this.isInvincible = true;
        this.invincibleTimer = 0.3;
        this.dodgeCooldown = this._getDodgeCooldown();

        // Teleport arrival effect
        this.game.effects.groundImpact(this.position.clone(), 0x8844ff, 1.5);
    }

    _getDodgeCooldown() {
        const teleLevel = this.getSkillLevel('s_teleport');
        if (teleLevel === 0) return 5;
        return Math.max(2.5, 5 - teleLevel * 0.5);
    }

    // _fireProjectile is inherited from Player base class

    _executeSkill(skillId, skillData, level) {
        // Dispatch buff/debuff skills to base class handlers
        if (skillData.type === 'buff') {
            this._executeBuffSkill(skillId, skillData, level);
            return;
        }
        if (skillData.type === 'debuff') {
            this._executeDebuffSkill(skillId, skillData, level);
            return;
        }

        const levelData = skillData.levels[level - 1];
        if (!levelData) return;

        const damage = this._calculateSkillDamage(skillData, levelData);
        const hits = levelData.hits || 1;
        const range = skillData.range || 3;

        if (skillData.sfx) this.game.audio.playSFX(skillData.sfx);
        this._playSkillEffect(skillId, skillData, levelData, range);

        // DOT Zone skills (Poison Missile, Flame Wall, Summon Black Hole)
        if (levelData.dotDuration) {
            this._executeDOTZone(damage, range, levelData, skillData);
            return;
        }

        // Projectile skills (point AoE or has projectiles field)
        if (skillData.aoeType === 'point' || levelData.projectiles) {
            const numProjectiles = levelData.projectiles || 1;
            const color = skillId.includes('fire') || skillId.includes('flame') ? 0xff4400
                : skillId.includes('ice') || skillId.includes('frost') || skillId.includes('glacial') ? 0x88ccff
                : skillId.includes('gravity') || skillId.includes('nine_tail') ? 0x8844ff
                : 0x44aaff;
            const isHoming = skillId.includes('nine_tail') || skillId.includes('gravity');

            for (let p = 0; p < numProjectiles; p++) {
                setTimeout(() => {
                    this._fireProjectile(damage, 14, range, color, isHoming);
                }, p * 150);
            }
            // Apply status effects to nearby enemies for non-projectile aspects
            if (levelData.pullRadius) {
                const pullCenter = this.position.clone().add(this._getAttackDirection().multiplyScalar(range * 0.5));
                const pullEnemies = this.game.getEnemiesInRange(pullCenter, this._getAttackDirection(), levelData.pullRadius, 'circle', 360);
                for (const enemy of pullEnemies) {
                    if (!enemy.isDead) {
                        const pullDir = pullCenter.clone().sub(enemy.position).normalize();
                        enemy.applyKnockback(pullDir, 5);
                    }
                }
            }
            return;
        }

        // Spin skills: multi-hit circle AoE
        if (skillData.aoeType === 'circle' && hits >= 3) {
            this._executeSpinSkill(damage, hits, range, skillData, levelData);
            const enemies = this.game.getEnemiesInRange(this.position, this._getAttackDirection(), range, 'circle', 360);
            this._applySkillStatusEffects(enemies, damage, levelData);
            return;
        }

        // Standard: damage in area
        const enemies = this.game.getEnemiesInRange(
            this.position,
            this._getAttackDirection(),
            range,
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
                        this.game.effects.hitSpark(enemy.position, 0x8844ff);
                    }
                }, h * 100);
            }
        }

        // Apply status effects
        this._applySkillStatusEffects(enemies, damage, levelData);
    }

    /**
     * Place persistent damage zone at target location.
     */
    _executeDOTZone(damage, range, levelData, skillData) {
        const dir = this._getAttackDirection();
        const zonePos = this.position.clone().add(dir.clone().multiplyScalar(range * 0.4));
        const zoneDuration = (levelData.dotDuration || 3000) / 1000;
        const tickRate = (levelData.tickRate || 1000) / 1000;
        const zoneRange = Math.min(range * 0.4, 4);

        const zoneColor = skillData.id ? (
            skillData.id.includes('poison') ? 0x44aa44
            : skillData.id.includes('black_hole') ? 0x8844ff
            : 0xff4400
        ) : 0xff4400;

        this.game.effects.auraRing(zonePos, zoneColor, zoneRange, zoneDuration);

        let elapsed = 0;
        let tickTimer = 0;
        const zoneInterval = setInterval(() => {
            elapsed += 0.1;
            tickTimer += 0.1;

            if (elapsed >= zoneDuration) {
                clearInterval(zoneInterval);
                return;
            }

            if (tickTimer >= tickRate) {
                tickTimer -= tickRate;
                const enemies = this.game.getEnemiesInRange(
                    zonePos, dir, zoneRange, 'circle', 360
                );
                for (const enemy of enemies) {
                    if (!enemy.isDead) {
                        const isCrit = Math.random() < CONFIG.CRITICAL_CHANCE;
                        let dmg = damage * MathUtils.damageVariance();
                        if (isCrit) dmg *= CONFIG.CRITICAL_MULTIPLIER;
                        enemy.takeDamage(Math.floor(dmg), isCrit);
                    }
                }
                // Pull effect for Black Hole
                if (skillData.id && skillData.id.includes('black_hole')) {
                    const pullEnemies = this.game.getEnemiesInRange(zonePos, dir, zoneRange * 2, 'circle', 360);
                    for (const enemy of pullEnemies) {
                        if (!enemy.isDead) {
                            const pullDir = zonePos.clone().sub(enemy.position).normalize();
                            enemy.applyKnockback(pullDir, 3);
                        }
                    }
                }
            }
        }, 100);
    }

    _playSkillEffect(skillId, skillData, levelData, range) {
        const fx = this.game.effects;
        const pos = this.position.clone();
        const dir = this._getAttackDirection();

        if (skillId.includes('fireball') || skillId.includes('flame_spark')) {
            const targetPos = pos.clone().add(dir.clone().multiplyScalar(range * 0.6));
            fx.explosion(targetPos, 0xff4400, range * 0.5);
        } else if (skillId.includes('inferno') || skillId.includes('flame_wall')) {
            const targetPos = pos.clone().add(dir.clone().multiplyScalar(range * 0.4));
            fx.explosion(targetPos, 0xff4400, range * 0.4);
            fx.auraRing(targetPos, 0xff4400, range * 0.4, 3);
        } else if (skillId.includes('poison')) {
            const targetPos = pos.clone().add(dir.clone().multiplyScalar(range * 0.4));
            fx.explosion(targetPos, 0x44aa44, 3);
            fx.auraRing(targetPos, 0x44aa44, 3, 3);
        } else if (skillId.includes('ice') || skillId.includes('frost') || skillId.includes('glacial')) {
            fx.iceExplosion(pos.clone().add(dir.clone().multiplyScalar(2)), range * 0.5);
        } else if (skillId.includes('blizzard')) {
            fx.iceExplosion(pos.clone(), range);
            this.game.ui.screenShake(8, 500);
        } else if (skillId.includes('gravity') || skillId.includes('black_hole') || skillId.includes('singularity')) {
            fx.blackHole(pos.clone().add(dir.clone().multiplyScalar(3)), range * 0.5, 3);
            if (skillId.includes('singularity')) this.game.ui.screenShake(10, 600);
        } else if (skillId.includes('nine_tail')) {
            fx.explosion(pos.clone().add(dir.clone().multiplyScalar(2)), 0x8844ff, 2);
        } else if (skillId.includes('beam') || skillId.includes('laser') || skillId.includes('linear')) {
            fx.beam(pos, dir, range, 0xff44ff, 0.3);
        } else if (skillId.includes('phoenix')) {
            fx.explosion(pos.clone(), 0xff4400, range);
            fx.groundImpact(pos, 0xff4400, range);
            this.game.ui.screenShake(10, 600);
        } else if (skillId.includes('time_break')) {
            fx.auraRing(pos, 0x88aaff, range, 3);
            fx.explosion(pos.clone(), 0x88aaff, range);
            this.game.ui.screenShake(10, 600);
        } else if (skillId.includes('time') || skillId.includes('chrono') || skillId.includes('slow')) {
            fx.auraRing(pos, 0x88aaff, range, 3);
        } else if (skillId.includes('shield') || skillId.includes('barrier') || skillId.includes('ward')) {
            fx.buffAura(this, 0x44aaff, skillData.cooldown / 1000 || 10);
        } else {
            const targetPos = pos.clone().add(dir.clone().multiplyScalar(2));
            fx.explosion(targetPos, 0x8844ff, 2);
        }
    }

    _applyPassiveEffect(skillId, level) {
        if (skillId === 's_intelligence_mastery') {
            // MATK boost applied in getEffectiveMatk()
        } else if (skillId === 's_mind_conquer') {
            // MP regen boost applied in _handleMPRegen()
        }
    }

    getDisplayName() {
        if (this.specialization === 'elementalLord') return 'Elemental Lord';
        if (this.specialization === 'forceUser') return 'Force User';
        return 'Sorceress';
    }
}
