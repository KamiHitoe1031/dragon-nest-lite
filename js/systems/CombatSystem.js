// Dragon Nest Lite - Combat System
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { MathUtils } from '../utils/MathUtils.js';

export class CombatSystem {
    constructor(game) {
        this.game = game;
        this.activeDOTs = [];
    }

    calculateDamage(attackerStat, skillMultiplier, defenderDef) {
        const rawDamage = attackerStat * skillMultiplier - defenderDef * 0.5;
        const variance = MathUtils.damageVariance();
        return Math.max(1, Math.floor(rawDamage * variance));
    }

    calculateCritical(damage) {
        if (Math.random() < CONFIG.CRITICAL_CHANCE) {
            return { damage: Math.floor(damage * CONFIG.CRITICAL_MULTIPLIER), isCrit: true };
        }
        return { damage, isCrit: false };
    }

    getEnemiesInArea(origin, direction, range, aoeType, aoeAngle = 60) {
        const enemies = this.game.getActiveEnemies();
        const result = [];

        for (const enemy of enemies) {
            if (enemy.isDead) continue;

            switch (aoeType) {
                case 'cone':
                    if (MathUtils.isInCone(origin, direction, enemy.position, aoeAngle, range)) {
                        result.push(enemy);
                    }
                    break;
                case 'circle':
                    if (MathUtils.isInCircle(origin, enemy.position, range)) {
                        result.push(enemy);
                    }
                    break;
                case 'line':
                    if (MathUtils.isInLine(origin, direction, enemy.position, range, 1.5)) {
                        result.push(enemy);
                    }
                    break;
                case 'point':
                case 'self':
                default:
                    if (MathUtils.isInCircle(origin, enemy.position, range)) {
                        result.push(enemy);
                    }
                    break;
            }
        }

        return result;
    }

    applyBurn(enemy, damagePerTick, duration) {
        this.applyBurnDOT(enemy, damagePerTick, duration, 1);
    }

    applyBurnDOT(enemy, matkPerTick, duration, tickInterval = 1) {
        this.activeDOTs.push({
            enemy,
            damagePerTick: matkPerTick,
            duration,
            tickInterval,
            elapsed: 0,
            tickTimer: 0
        });
    }

    updateDOTs(dt) {
        for (let i = this.activeDOTs.length - 1; i >= 0; i--) {
            const dot = this.activeDOTs[i];
            dot.elapsed += dt;
            dot.tickTimer += dt;

            if (dot.elapsed >= dot.duration || dot.enemy.isDead) {
                this.activeDOTs.splice(i, 1);
                continue;
            }

            if (dot.tickTimer >= dot.tickInterval) {
                dot.tickTimer -= dot.tickInterval;
                const damage = Math.floor(dot.damagePerTick * MathUtils.damageVariance());
                dot.enemy.takeDamage(damage, false);
            }
        }
    }

    clearDOTs() {
        this.activeDOTs = [];
    }
}
