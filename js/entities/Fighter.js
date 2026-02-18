// Dragon Nest Lite - Fighter (Warrior) Class
import { Player } from './Player.js';
import { CONFIG } from '../config.js';
import { MathUtils } from '../utils/MathUtils.js';

export class Fighter extends Player {
    constructor(game) {
        super(game, 'warrior');
        this.atk = CONFIG.PLAYER_BASE_ATK;
        this.def = CONFIG.PLAYER_BASE_DEF + 2; // Warriors get more DEF
        this.matk = 10;
        this.mdef = CONFIG.PLAYER_BASE_MDEF;
    }

    normalAttack() {
        // W1: Impact Punch (left click chain)
        this.isAttacking = true;
        this.comboStep++;
        const baseMultiplier = this.comboStep === 1 ? 1.0 : 1.2;

        const level = this.getSkillLevel('w_impact_punch');
        const multiplier = level > 0 ? (0.6 + level * 0.2) * baseMultiplier : baseMultiplier;

        this.attackTimer = 0.4;

        // Hit enemies in front
        const enemies = this.game.getEnemiesInRange(
            this.position,
            this._getAttackDirection(),
            2.5,
            'cone',
            60
        );

        for (const enemy of enemies) {
            const isCrit = Math.random() < CONFIG.CRITICAL_CHANCE;
            let damage = this.getEffectiveAtk() * multiplier * MathUtils.damageVariance();
            if (isCrit) damage *= CONFIG.CRITICAL_MULTIPLIER;
            enemy.takeDamage(Math.floor(damage), isCrit);

            // Hit spark effect
            this.game.effects.hitSpark(enemy.position, 0xffaa44);
        }

        // Slash arc effect
        this.game.effects.slashArc(this.position, this.rotation, 0xffffff, 0.8 + this.comboStep * 0.2);

        // Reset combo after 2 hits
        if (this.comboStep >= 2) {
            this.comboStep = 0;
        }

        // Visual feedback - simple mesh scale bounce
        if (this.mesh) {
            this.mesh.scale.set(1.1, 0.9, 1.1);
            setTimeout(() => {
                if (this.mesh) this.mesh.scale.set(1, 1, 1);
            }, 100);
        }
    }

    heavyAttack() {
        // W2: Heavy Slash (right click)
        this.isAttacking = true;
        this.attackTimer = 0.6;

        const level = this.getSkillLevel('w_heavy_slash');
        const multiplier = level > 0 ? (1.15 + level * 0.3) : 1.55;

        const enemies = this.game.getEnemiesInRange(
            this.position,
            this._getAttackDirection(),
            3,
            'cone',
            90
        );

        for (const enemy of enemies) {
            const isCrit = Math.random() < CONFIG.CRITICAL_CHANCE;
            let damage = this.getEffectiveAtk() * multiplier * MathUtils.damageVariance();
            if (isCrit) damage *= CONFIG.CRITICAL_MULTIPLIER;
            enemy.takeDamage(Math.floor(damage), isCrit);

            // Knockback
            const dir = enemy.position.clone().sub(this.position).normalize();
            enemy.applyKnockback(dir, 3);

            // Hit spark effect
            this.game.effects.hitSpark(enemy.position, 0xff6600);
        }

        // Heavy slash effect
        this.game.effects.heavySlash(this.position, this.rotation, 0xffaa44);

        if (this.mesh) {
            this.mesh.scale.set(1.15, 0.85, 1.15);
            setTimeout(() => {
                if (this.mesh) this.mesh.scale.set(1, 1, 1);
            }, 150);
        }
    }

    dodge() {
        super.dodge();
        // Ground impact at start position
        this.game.effects.groundImpact(this.position.clone(), 0xcc8844, 1);
    }

    _getDodgeCooldown() {
        const tumbleLevel = this.getSkillLevel('w_tumble');
        if (tumbleLevel === 0) return 4;
        return Math.max(2, 4 - tumbleLevel * 0.4);
    }

    _executeSkill(skillId, skillData, level) {
        const levelData = skillData.levels[level - 1];
        if (!levelData) return;

        const damage = this._calculateSkillDamage(skillData, levelData);
        const hits = levelData.hits || 1;
        const range = skillData.range || 3;

        // Find enemies in range
        const enemies = this.game.getEnemiesInRange(
            this.position,
            this._getAttackDirection(),
            range,
            skillData.aoeType || 'circle',
            skillData.aoeAngle || 360
        );

        // Visual effects based on skill type
        this._playSkillEffect(skillId, skillData, range);

        for (const enemy of enemies) {
            for (let h = 0; h < hits; h++) {
                setTimeout(() => {
                    if (!enemy.isDead) {
                        const isCrit = Math.random() < CONFIG.CRITICAL_CHANCE;
                        let dmg = damage * MathUtils.damageVariance();
                        if (isCrit) dmg *= CONFIG.CRITICAL_MULTIPLIER;
                        enemy.takeDamage(Math.floor(dmg), isCrit);
                        this.game.effects.hitSpark(enemy.position, 0xffaa00);
                    }
                }, h * 100);
            }
        }

        // Apply debuffs if applicable
        if (levelData.effect === 'stun' && enemies.length > 0) {
            for (const enemy of enemies) {
                enemy.applyStun(levelData.stunDuration || 1);
            }
        }
    }

    _playSkillEffect(skillId, skillData, range) {
        const fx = this.game.effects;
        const pos = this.position.clone();
        const dir = this._getAttackDirection();

        if (skillId.includes('rising_slash') || skillId.includes('moonlight')) {
            fx.slashArc(pos, this.rotation, 0x88ccff, 1.5);
            fx.groundImpact(pos, 0x88ccff, range);
        } else if (skillId.includes('eclipse') || skillId.includes('parrying')) {
            fx.heavySlash(pos, this.rotation, 0xffdd44);
        } else if (skillId.includes('cyclone') || skillId.includes('spinning')) {
            fx.groundImpact(pos, 0xff8844, range);
            fx.slashArc(pos, this.rotation, 0xff4400, 2);
            fx.slashArc(pos, this.rotation + Math.PI, 0xff4400, 2);
        } else if (skillId.includes('stomp') || skillId.includes('earthquake')) {
            fx.groundImpact(pos, 0x886644, range);
        } else if (skillId.includes('warcry') || skillId.includes('howl') || skillId.includes('battle_cry')) {
            fx.buffAura(this, 0xff8844, skillData.cooldown / 1000 || 10);
            fx.auraRing(pos, 0xff8844, range, 2);
        } else {
            // Default: slash arc
            fx.slashArc(pos, this.rotation, 0xffaa44, 1.2);
        }
    }

    _applyPassiveEffect(skillId, level) {
        if (skillId === 'w_physical_mastery') {
            this.maxHP = CONFIG.PLAYER_BASE_HP + (this.level - 1) * CONFIG.LEVEL_STAT_BONUS.hp;
            this.maxHP = Math.floor(this.maxHP * (1 + level * 0.05));
        } else if (skillId === 'w_mental_mastery') {
            this.maxMP = CONFIG.PLAYER_BASE_MP + (this.level - 1) * CONFIG.LEVEL_STAT_BONUS.mp;
            this.maxMP = Math.floor(this.maxMP * (1 + level * 0.05));
        }
    }

    getDisplayName() {
        if (this.specialization === 'swordmaster') return 'Sword Master';
        if (this.specialization === 'mercenary') return 'Mercenary';
        return 'Warrior';
    }
}
