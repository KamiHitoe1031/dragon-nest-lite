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

        // Create visual
        const geo = new THREE.SphereGeometry(0.15, 8, 8);
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(startPos);

        // Glow
        const glowGeo = new THREE.SphereGeometry(0.25, 8, 8);
        const glowMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3 });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        mesh.add(glow);

        this.game.scene.add(mesh);
        projectile.mesh = mesh;

        this.game.addProjectile(projectile);
    }

    _executeSkill(skillId, skillData, level) {
        const levelData = skillData.levels[level - 1];
        if (!levelData) return;

        const damage = this._calculateSkillDamage(skillData, levelData);
        const hits = levelData.hits || 1;
        const range = skillData.range || 3;

        const enemies = this.game.getEnemiesInRange(
            this.position,
            this._getAttackDirection(),
            range,
            skillData.aoeType || 'circle',
            skillData.aoeAngle || 360
        );

        // SFX from skill data
        if (skillData.sfx) this.game.audio.playSFX(skillData.sfx);

        // Visual effects based on skill type
        this._playSkillEffect(skillId, skillData, levelData, range);

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

            // Apply debuffs
            if (levelData.effect === 'burn' && !enemy.isDead) {
                this.game.combatSystem.applyBurn(enemy, levelData.burnDamage || damage * 0.1, levelData.burnDuration || 3);
            }
            if (levelData.effect === 'freeze' && !enemy.isDead) {
                enemy.applyFreeze(levelData.freezeDuration || 2);
            }
            if (levelData.effect === 'slow' && !enemy.isDead) {
                enemy.applySlow(levelData.slowAmount || 0.3, levelData.slowDuration || 3);
            }
        }
    }

    _playSkillEffect(skillId, skillData, levelData, range) {
        const fx = this.game.effects;
        const pos = this.position.clone();
        const dir = this._getAttackDirection();

        if (skillId.includes('fireball') || skillId.includes('fire')) {
            const targetPos = pos.clone().add(dir.clone().multiplyScalar(range));
            fx.explosion(targetPos, 0xff4400, range);
        } else if (skillId.includes('ice') || skillId.includes('frost') || skillId.includes('blizzard')) {
            fx.iceExplosion(pos.clone().add(dir.clone().multiplyScalar(2)), range);
        } else if (skillId.includes('gravity') || skillId.includes('black_hole') || skillId.includes('singularity')) {
            fx.blackHole(pos.clone().add(dir.clone().multiplyScalar(3)), range, 3);
        } else if (skillId.includes('beam') || skillId.includes('laser') || skillId.includes('linear')) {
            fx.beam(pos, dir, range, 0xff44ff, 0.3);
        } else if (skillId.includes('time') || skillId.includes('chrono') || skillId.includes('slow')) {
            fx.auraRing(pos, 0x88aaff, range, 3);
        } else if (skillId.includes('shield') || skillId.includes('barrier') || skillId.includes('ward')) {
            fx.buffAura(this, 0x44aaff, skillData.cooldown / 1000 || 10);
        } else {
            // Default: explosion at target
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
