// Dragon Nest Lite - Combat System
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { MathUtils } from '../utils/MathUtils.js';

export class CombatSystem {
    constructor(game) {
        this.game = game;
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
        let elapsed = 0;
        const timer = setInterval(() => {
            elapsed += tickInterval;
            if (elapsed > duration || enemy.isDead) {
                clearInterval(timer);
                return;
            }
            const damage = Math.floor(matkPerTick * MathUtils.damageVariance());
            enemy.takeDamage(damage, false);
        }, tickInterval * 1000);
    }
}
