// Dragon Nest Lite - Save Manager
import { CONFIG } from '../config.js';

export class SaveManager {
    constructor() {
        this.saveKey = CONFIG.SAVE_KEY;
    }

    save(data) {
        try {
            const json = JSON.stringify(data);
            localStorage.setItem(this.saveKey, json);
            return true;
        } catch (e) {
            console.error('Failed to save game:', e);
            return false;
        }
    }

    load() {
        try {
            const json = localStorage.getItem(this.saveKey);
            if (!json) return null;
            return JSON.parse(json);
        } catch (e) {
            console.error('Failed to load save:', e);
            return null;
        }
    }

    hasSave() {
        return localStorage.getItem(this.saveKey) !== null;
    }

    deleteSave() {
        localStorage.removeItem(this.saveKey);
    }

    getDefaultSave(classType) {
        return {
            selectedClass: classType,
            specialization: null,
            level: 1,
            exp: 0,
            gold: 0,
            skillPoints: 0,
            totalSpEarned: 0,
            skillLevels: {},
            equippedSkills: [null, null, null, null],
            stats: {
                maxHP: 100,
                maxMP: classType === 'sorceress' ? 60 : 50,
                atk: classType === 'warrior' ? 15 : 8,
                def: classType === 'warrior' ? 12 : 8,
                matk: classType === 'sorceress' ? 15 : 10,
                mdef: classType === 'sorceress' ? 10 : 8
            },
            weaponLevel: 0,
            dungeonsCleared: {
                '1': { cleared: false, clearCount: 0, bestTime: null },
                '2': { cleared: false, clearCount: 0, bestTime: null },
                '3': { cleared: false, clearCount: 0, bestTime: null }
            },
            inventory: {
                potion_hp: 3,
                potion_mp: 1
            }
        };
    }
}
