// Dragon Nest Lite - Skill System (Skill Tree UI + Logic + Equip)
import { CONFIG } from '../config.js';

export class SkillSystem {
    constructor(game) {
        this.game = game;
        this.isOpen = false;
        this.currentTab = 'base';
        this.equipMode = false;
        this.equipSlotIndex = -1;
    }

    /**
     * Resolve skill icon name to asset path.
     * Strips class-specialization prefixes (sm_, mc_, el_, fu_) to match actual filenames.
     */
    static getIconPath(iconName) {
        if (!iconName) return '';
        const stripped = iconName.replace(/^icon_(sm|mc|el|fu)_/, 'icon_');
        return `assets/ui/${stripped}.png`;
    }

    open() {
        this.isOpen = true;
        this.game.isPaused = true;
        this.equipMode = false;
        this.game.ui.showSkillTree();
        this._renderSkillTree();

        // Close button
        document.getElementById('skill-tree-close').onclick = () => this.close();
    }

    close() {
        this.isOpen = false;
        this.equipMode = false;
        this.game.isPaused = false;
        this.game.ui.hideSkillTree();
    }

    // Enter equip mode: user clicks a skill slot, then clicks a skill to assign
    enterEquipMode(slotIndex) {
        this.equipMode = true;
        this.equipSlotIndex = slotIndex;
        this._renderSkillTree();
    }

    exitEquipMode() {
        this.equipMode = false;
        this.equipSlotIndex = -1;
        this._renderSkillTree();
    }

    _renderSkillTree() {
        const player = this.game.player;
        const skillsData = this.game.skillsData;
        const classData = skillsData[player.classType];
        if (!classData) return;

        // Update SP display
        document.getElementById('st-sp-remaining').textContent = player.skillPoints;

        // Render equip slots
        this._renderEquipSlots(player);

        // Render tabs
        const tabsEl = document.getElementById('skill-tree-tabs');
        tabsEl.innerHTML = '';

        const tabs = this._getTabs(player);
        for (const tab of tabs) {
            const tabBtn = document.createElement('button');
            tabBtn.className = `st-tab ${tab.id === this.currentTab ? 'active' : ''}`;
            tabBtn.textContent = tab.name;
            tabBtn.disabled = tab.locked;
            if (tab.locked) tabBtn.classList.add('locked');
            tabBtn.onclick = () => {
                this.currentTab = tab.id;
                this._renderSkillTree();
            };
            tabsEl.appendChild(tabBtn);
        }

        // Render skill columns
        const columnsEl = document.getElementById('skill-tree-columns');
        columnsEl.innerHTML = '';

        const columns = this._getColumns(player, this.currentTab);
        for (const column of columns) {
            const colEl = document.createElement('div');
            colEl.className = 'st-column';

            const colHeader = document.createElement('div');
            colHeader.className = 'st-column-header';
            colHeader.textContent = column.name;
            colEl.appendChild(colHeader);

            for (const skill of column.skills) {
                const skillEl = this._createSkillNode(skill, player);
                colEl.appendChild(skillEl);
            }

            columnsEl.appendChild(colEl);
        }

        // Update title
        const title = document.getElementById('skill-tree-title');
        const displayTab = tabs.find(t => t.id === this.currentTab);
        if (this.equipMode) {
            title.textContent = `Select skill for Slot ${this.equipSlotIndex + 1}`;
        } else {
            title.textContent = displayTab ? displayTab.name : 'Skill Tree';
        }
    }

    _renderEquipSlots(player) {
        let slotsContainer = document.getElementById('st-equip-slots');
        if (!slotsContainer) {
            // Create equip slots area in skill tree
            const header = document.getElementById('skill-tree-header');
            slotsContainer = document.createElement('div');
            slotsContainer.id = 'st-equip-slots';
            header.parentElement.insertBefore(slotsContainer, document.getElementById('skill-tree-content'));
        }

        slotsContainer.innerHTML = '<div class="st-equip-label">Skill Slots:</div>';
        const slotsRow = document.createElement('div');
        slotsRow.className = 'st-equip-row';

        for (let i = 0; i < CONFIG.MAX_SKILL_SLOTS; i++) {
            const slotEl = document.createElement('div');
            slotEl.className = `st-equip-slot ${this.equipMode && this.equipSlotIndex === i ? 'selecting' : ''}`;

            const skillId = player.equippedSkills[i];
            const skillData = skillId ? this.game.getSkillData(skillId) : null;

            slotEl.innerHTML = `
                <span class="st-equip-key">${i + 1}</span>
                <span class="st-equip-name">${skillData ? skillData.name : 'Empty'}</span>
                ${skillId ? '<button class="st-equip-remove">&times;</button>' : ''}
            `;

            // Click to enter equip mode
            slotEl.addEventListener('click', (e) => {
                if (e.target.classList.contains('st-equip-remove')) {
                    // Remove skill from slot
                    player.equippedSkills[i] = null;
                    this.game.ui.setSkillSlotIcon(i, '');
                    this._renderSkillTree();
                    return;
                }
                if (this.equipMode && this.equipSlotIndex === i) {
                    this.exitEquipMode();
                } else {
                    this.enterEquipMode(i);
                }
            });

            slotsRow.appendChild(slotEl);
        }

        slotsContainer.appendChild(slotsRow);

        // Reset skills button
        const resetBtn = document.createElement('button');
        resetBtn.className = 'st-reset-btn';
        resetBtn.textContent = 'Reset All SP';
        resetBtn.onclick = () => this._resetSkills(player);
        slotsContainer.appendChild(resetBtn);
    }

    _resetSkills(player) {
        // Refund all SP
        let refund = 0;
        for (const skillId in player.skillLevels) {
            const skillData = this.game.getSkillData(skillId);
            if (skillData) {
                refund += player.skillLevels[skillId] * skillData.spPerLevel;
            }
        }
        player.skillLevels = {};
        player.skillPoints += refund;
        player.equippedSkills = [null, null, null, null];

        // Clear HUD skill slot names
        for (let i = 0; i < CONFIG.MAX_SKILL_SLOTS; i++) {
            this.game.ui.setSkillSlotIcon(i, '');
        }

        this.game.ui.showCenterMessage(`Reset! Refunded ${refund} SP`, 2000);
        this._renderSkillTree();
    }

    _getTabs(player) {
        const tabs = [{ id: 'base', name: 'Base Skills', locked: false }];

        if (player.classType === 'warrior') {
            tabs.push({
                id: 'swordmaster',
                name: 'Sword Master',
                locked: player.specialization !== null && player.specialization !== 'swordmaster'
            });
            tabs.push({
                id: 'mercenary',
                name: 'Mercenary',
                locked: player.specialization !== null && player.specialization !== 'mercenary'
            });
        } else {
            tabs.push({
                id: 'elementalLord',
                name: 'Elemental Lord',
                locked: player.specialization !== null && player.specialization !== 'elementalLord'
            });
            tabs.push({
                id: 'forceUser',
                name: 'Force User',
                locked: player.specialization !== null && player.specialization !== 'forceUser'
            });
        }

        return tabs;
    }

    _getColumns(player, tab) {
        const skillsData = this.game.skillsData;
        const classData = skillsData[player.classType];
        if (!classData) return [];

        if (tab === 'base') {
            const baseSkills = classData.base || [];
            return [{ name: 'Base', skills: baseSkills }];
        }

        const specData = classData[tab];
        if (!specData) return [];

        const columns = [];
        for (const [colName, skills] of Object.entries(specData)) {
            const displayName = this._getColumnDisplayName(colName);
            columns.push({ name: displayName, skills: skills || [] });
        }

        return columns;
    }

    _getColumnDisplayName(colName) {
        const names = {
            blade: 'Blade (Physical)',
            wave: 'Wave (Magic Sword)',
            devastation: 'Devastation (AoE)',
            warcry: 'Warcry (Buff)',
            flame: 'Flame (Fire)',
            frost: 'Frost (Ice)',
            gravity: 'Gravity (Dark)',
            chrono: 'Chrono (Time)'
        };
        return names[colName] || colName;
    }

    _createSkillNode(skill, player) {
        const el = document.createElement('div');
        el.className = 'st-skill-node';

        const currentLevel = player.getSkillLevel(skill.id);
        const maxLevel = skill.maxLevel;
        const canLearn = this._canLearn(skill, player);
        const isMaxed = currentLevel >= maxLevel;
        const isUltimate = skill.treeSpRequirement !== null && skill.treeSpRequirement !== undefined;
        const isEquipped = player.equippedSkills.includes(skill.id);
        const isEquippable = skill.type === 'active' || skill.type === 'buff' || skill.type === 'debuff';

        if (isMaxed) el.classList.add('maxed');
        else if (canLearn) el.classList.add('available');
        else el.classList.add('locked');
        if (isUltimate) el.classList.add('ultimate');
        if (isEquipped) el.classList.add('equipped');

        // In equip mode, highlight equipable skills
        if (this.equipMode && isEquippable && currentLevel > 0) {
            el.classList.add('equipable');
        }

        const iconPath = SkillSystem.getIconPath(skill.icon);
        el.innerHTML = `
            <div class="st-skill-icon" title="${skill.name}" style="${iconPath ? `background-image:url('${iconPath}');background-size:cover;background-position:center;` : ''}">
                ${isUltimate && !iconPath ? '&#9733;' : ''}
                ${isEquipped ? '<span class="equip-badge">E</span>' : ''}
            </div>
            <div class="st-skill-info">
                <div class="st-skill-name">${skill.name}</div>
                <div class="st-skill-level">Lv. ${currentLevel} / ${maxLevel}</div>
                <div class="st-skill-cost">SP: ${skill.spPerLevel}/Lv</div>
                ${skill.type === 'active' && currentLevel > 0 ? '<div class="st-skill-type-tag">Active</div>' : ''}
                ${skill.type === 'buff' && currentLevel > 0 ? '<div class="st-skill-type-tag buff">Buff</div>' : ''}
                ${skill.type === 'debuff' && currentLevel > 0 ? '<div class="st-skill-type-tag debuff">Debuff</div>' : ''}
                ${skill.type === 'passive' && currentLevel > 0 ? '<div class="st-skill-type-tag passive">Passive</div>' : ''}
            </div>
            <div class="st-skill-buttons">
                <button class="st-btn-add" ${canLearn && !isMaxed ? '' : 'disabled'}>+</button>
                ${isEquippable && currentLevel > 0 && !this.equipMode ? '<button class="st-btn-equip">Equip</button>' : ''}
            </div>
        `;

        // Tooltip on hover
        el.addEventListener('mouseenter', (e) => {
            this._showTooltip(skill, player, e);
        });
        el.addEventListener('mouseleave', () => {
            this._hideTooltip();
        });

        // Add SP button
        const addBtn = el.querySelector('.st-btn-add');
        if (addBtn) {
            addBtn.onclick = (e) => {
                e.stopPropagation();
                if (player.learnSkill(skill.id)) {
                    this.game.audio.playSFX('sfx_skill_learn');
                    this._renderSkillTree();
                }
            };
        }

        // Equip button (outside equip mode)
        const equipBtn = el.querySelector('.st-btn-equip');
        if (equipBtn) {
            equipBtn.onclick = (e) => {
                e.stopPropagation();
                this._quickEquip(skill, player);
            };
        }

        // Click to assign in equip mode
        if (this.equipMode) {
            el.addEventListener('click', () => {
                if (isEquippable && currentLevel > 0) {
                    this._assignToSlot(skill, player);
                }
            });
        }

        return el;
    }

    _quickEquip(skill, player) {
        // Find first empty slot, or replace last
        let slotIndex = player.equippedSkills.indexOf(null);
        if (slotIndex === -1) slotIndex = 3; // Replace last slot

        // Check if already equipped
        const existingIndex = player.equippedSkills.indexOf(skill.id);
        if (existingIndex >= 0) {
            // Unequip
            player.equippedSkills[existingIndex] = null;
            this.game.ui.setSkillSlotIcon(existingIndex, '');
            this._renderSkillTree();
            return;
        }

        player.equippedSkills[slotIndex] = skill.id;
        this.game.ui.setSkillSlotIcon(slotIndex, skill.name, SkillSystem.getIconPath(skill.icon));
        this._renderSkillTree();
    }

    _assignToSlot(skill, player) {
        if (this.equipSlotIndex < 0 || this.equipSlotIndex >= CONFIG.MAX_SKILL_SLOTS) return;

        // Remove from other slot if already equipped
        const existingIndex = player.equippedSkills.indexOf(skill.id);
        if (existingIndex >= 0) {
            player.equippedSkills[existingIndex] = null;
            this.game.ui.setSkillSlotIcon(existingIndex, '');
        }

        player.equippedSkills[this.equipSlotIndex] = skill.id;
        this.game.ui.setSkillSlotIcon(this.equipSlotIndex, skill.name, SkillSystem.getIconPath(skill.icon));
        this.game.audio.playSFX('sfx_equip');
        this.exitEquipMode();
    }

    _canLearn(skill, player) {
        if (player.skillPoints < skill.spPerLevel) return false;
        if (player.getSkillLevel(skill.id) >= skill.maxLevel) return false;

        // Specialization lock: non-base skills require matching specialization
        if (skill.column !== 'base') {
            if (!player.specialization) return false;
            const columnSpec = this.game.getColumnSpecialization(player.classType, skill.column);
            if (columnSpec && columnSpec !== player.specialization) return false;
        }

        // Prerequisite
        if (skill.prerequisite) {
            const preReqLevel = player.getSkillLevel(skill.prerequisite.skillId);
            if (preReqLevel < skill.prerequisite.level) return false;
        }

        // Tree SP requirement (ultimates)
        if (skill.treeSpRequirement) {
            const columnSP = this._calcColumnSP(skill.column, player);
            if (columnSP < skill.treeSpRequirement) return false;
        }

        return true;
    }

    _calcColumnSP(column, player) {
        let total = 0;
        const skills = this.game.getSkillsByColumn(player.classType, player.specialization, column);
        for (const s of skills) {
            total += player.getSkillLevel(s.id) * s.spPerLevel;
        }
        return total;
    }

    _showTooltip(skill, player, event) {
        const tooltip = document.getElementById('skill-tooltip');
        if (!tooltip) return;

        const currentLevel = player.getSkillLevel(skill.id);
        const levelData = skill.levels ? skill.levels[Math.max(0, currentLevel - 1)] : null;
        const nextLevelData = skill.levels && currentLevel < skill.maxLevel ? skill.levels[currentLevel] : null;

        let html = `<div class="tooltip-title">${skill.name}</div>`;
        html += `<div class="tooltip-type">${skill.type} | ${skill.column}</div>`;

        if (levelData && currentLevel > 0) {
            html += `<div class="tooltip-current">Current (Lv.${currentLevel}): ${levelData.description || ''}</div>`;
            if (skill.cooldown) html += `<div>Cooldown: ${skill.cooldown / 1000}s</div>`;
            if (skill.mpCost) html += `<div>MP Cost: ${skill.mpCost}</div>`;
        }

        if (nextLevelData) {
            html += `<div class="tooltip-next">Next (Lv.${currentLevel + 1}): ${nextLevelData.description || ''}</div>`;
            html += `<div>SP Cost: ${skill.spPerLevel}</div>`;
        }

        if (skill.prerequisite) {
            const preSkill = this.game.getSkillData(skill.prerequisite.skillId);
            const preReqMet = player.getSkillLevel(skill.prerequisite.skillId) >= skill.prerequisite.level;
            html += `<div class="tooltip-prereq ${preReqMet ? 'met' : 'unmet'}">
                Requires: ${preSkill?.name || skill.prerequisite.skillId} Lv.${skill.prerequisite.level}
            </div>`;
        }

        if (skill.treeSpRequirement) {
            const columnSP = this._calcColumnSP(skill.column, player);
            const met = columnSP >= skill.treeSpRequirement;
            html += `<div class="tooltip-prereq ${met ? 'met' : 'unmet'}">
                Column SP: ${columnSP}/${skill.treeSpRequirement}
            </div>`;
        }

        // Equip mode hint
        if (this.equipMode && (skill.type === 'active' || skill.type === 'buff' || skill.type === 'debuff') && currentLevel > 0) {
            html += `<div class="tooltip-equip-hint">Click to equip in Slot ${this.equipSlotIndex + 1}</div>`;
        }

        tooltip.innerHTML = html;
        tooltip.style.display = 'block';
        tooltip.style.left = `${event.clientX + 15}px`;
        tooltip.style.top = `${event.clientY - 10}px`;
    }

    _hideTooltip() {
        const tooltip = document.getElementById('skill-tooltip');
        if (tooltip) tooltip.style.display = 'none';
    }
}
