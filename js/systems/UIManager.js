// Dragon Nest Lite - UI Manager
import { CONFIG } from '../config.js';

export class UIManager {
    constructor() {
        this.elements = {};
        this._createHUD();
        this._createSkillTreeUI();
        this._createDialogUI();
        this._createDamageNumberContainer();
        this._createControlsHint();
        this._createMenuUI();
    }

    _createHUD() {
        const hud = document.createElement('div');
        hud.id = 'hud';
        hud.innerHTML = `
            <div id="hud-top-left">
                <div id="player-info">
                    <div id="player-name" class="hud-text">Warrior Lv.1</div>
                    <div class="bar-container">
                        <div id="hp-bar" class="bar hp-bar">
                            <div id="hp-bar-fill" class="bar-fill hp-fill"></div>
                            <span id="hp-text" class="bar-text">100 / 100</span>
                        </div>
                    </div>
                    <div class="bar-container">
                        <div id="mp-bar" class="bar mp-bar">
                            <div id="mp-bar-fill" class="bar-fill mp-fill"></div>
                            <span id="mp-text" class="bar-text">50 / 50</span>
                        </div>
                    </div>
                    <div id="exp-bar-container" class="bar-container">
                        <div id="exp-bar" class="bar exp-bar">
                            <div id="exp-bar-fill" class="bar-fill exp-fill"></div>
                            <span id="exp-text" class="bar-text">0 / 100</span>
                        </div>
                    </div>
                </div>
            </div>
            <div id="hud-bottom-center">
                <div id="skill-slots">
                    <div class="skill-slot" data-slot="0"><span class="key-hint">1</span><div class="cd-overlay"></div></div>
                    <div class="skill-slot" data-slot="1"><span class="key-hint">2</span><div class="cd-overlay"></div></div>
                    <div class="skill-slot" data-slot="2"><span class="key-hint">3</span><div class="cd-overlay"></div></div>
                    <div class="skill-slot" data-slot="3"><span class="key-hint">4</span><div class="cd-overlay"></div></div>
                </div>
                <div id="potion-slots">
                    <div class="potion-slot" data-type="hp"><span class="key-hint">Q</span><span class="potion-count">3</span></div>
                    <div class="potion-slot" data-type="mp"><span class="key-hint">E</span><span class="potion-count">1</span></div>
                </div>
            </div>
            <div id="hud-top-right">
                <div id="gold-display">
                    <span id="gold-icon">&#9733;</span>
                    <span id="gold-amount">0</span>
                </div>
                <div id="sp-display">
                    <span>SP:</span>
                    <span id="sp-amount">0</span>
                </div>
                <div id="dungeon-info" style="display:none;">
                    <span id="room-display">Room 1/3</span>
                    <span id="enemy-count">Enemies: 0</span>
                </div>
            </div>
            <div id="boss-hp" style="display:none;">
                <div id="boss-name">Dragon</div>
                <div class="bar-container boss-bar-container">
                    <div id="boss-hp-bar" class="bar boss-bar">
                        <div id="boss-hp-fill" class="bar-fill boss-fill"></div>
                        <span id="boss-hp-text" class="bar-text">500 / 500</span>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(hud);
        this.elements.hud = hud;
    }

    _createSkillTreeUI() {
        const skillTree = document.createElement('div');
        skillTree.id = 'skill-tree-panel';
        skillTree.style.display = 'none';
        skillTree.innerHTML = `
            <div id="skill-tree-header">
                <h2 id="skill-tree-title">Skill Tree</h2>
                <div id="skill-tree-tabs"></div>
                <div id="skill-tree-sp">SP: <span id="st-sp-remaining">0</span></div>
                <button id="skill-tree-close">&times;</button>
            </div>
            <div id="skill-tree-content">
                <div id="skill-tree-columns"></div>
            </div>
            <div id="skill-tooltip" style="display:none;"></div>
        `;
        document.body.appendChild(skillTree);
        this.elements.skillTree = skillTree;
    }

    _createDialogUI() {
        const dialog = document.createElement('div');
        dialog.id = 'dialog-panel';
        dialog.style.display = 'none';
        dialog.innerHTML = `
            <div id="dialog-portrait"></div>
            <div id="dialog-content">
                <div id="dialog-speaker"></div>
                <div id="dialog-text"></div>
                <div id="dialog-choices"></div>
            </div>
            <div id="dialog-continue">Press E to continue</div>
        `;
        document.body.appendChild(dialog);
        this.elements.dialog = dialog;
    }

    _createDamageNumberContainer() {
        const container = document.createElement('div');
        container.id = 'damage-numbers';
        document.body.appendChild(container);
        this.elements.damageNumbers = container;
    }

    _createControlsHint() {
        const hint = document.createElement('div');
        hint.id = 'controls-hint';
        hint.innerHTML = `
            <div id="controls-content">
                <h3>Controls</h3>
                <div class="ctrl-row"><span>WASD</span><span>Move</span></div>
                <div class="ctrl-row"><span>Left Click</span><span>Normal Attack</span></div>
                <div class="ctrl-row"><span>Right Click</span><span>Heavy Attack</span></div>
                <div class="ctrl-row"><span>1-4</span><span>Skills</span></div>
                <div class="ctrl-row"><span>Space</span><span>Dodge</span></div>
                <div class="ctrl-row"><span>E</span><span>Interact</span></div>
                <div class="ctrl-row"><span>Q / E</span><span>HP / MP Potion</span></div>
                <div class="ctrl-row"><span>Tab</span><span>Skill Tree</span></div>
                <div class="ctrl-row"><span>Esc</span><span>Menu</span></div>
                <p id="controls-dismiss">Click to dismiss</p>
            </div>
        `;
        hint.style.display = 'none';
        hint.addEventListener('click', () => {
            hint.style.display = 'none';
        });
        document.body.appendChild(hint);
        this.elements.controlsHint = hint;
    }

    showControlsHint() {
        if (this.elements.controlsHint) {
            this.elements.controlsHint.style.display = 'flex';
        }
    }

    _createMenuUI() {
        const menu = document.createElement('div');
        menu.id = 'game-menu';
        menu.style.display = 'none';
        menu.innerHTML = `
            <div id="menu-overlay">
                <h1 id="menu-title">Paused</h1>
                <button class="menu-btn" id="btn-resume">Resume</button>
                <button class="menu-btn" id="btn-save">Save Game</button>
                <button class="menu-btn" id="btn-title">Return to Title</button>
            </div>
        `;
        document.body.appendChild(menu);
        this.elements.menu = menu;
    }

    updateHP(current, max) {
        const fill = document.getElementById('hp-bar-fill');
        const text = document.getElementById('hp-text');
        if (fill) fill.style.width = `${(current / max) * 100}%`;
        if (text) text.textContent = `${Math.floor(current)} / ${max}`;
    }

    updateMP(current, max) {
        const fill = document.getElementById('mp-bar-fill');
        const text = document.getElementById('mp-text');
        if (fill) fill.style.width = `${(current / max) * 100}%`;
        if (text) text.textContent = `${Math.floor(current)} / ${max}`;
    }

    updateEXP(current, needed) {
        const fill = document.getElementById('exp-bar-fill');
        const text = document.getElementById('exp-text');
        if (fill) fill.style.width = `${(current / needed) * 100}%`;
        if (text) text.textContent = `${current} / ${needed}`;
    }

    updatePlayerInfo(name, level) {
        const el = document.getElementById('player-name');
        if (el) el.textContent = `${name} Lv.${level}`;
    }

    updateGold(amount) {
        const el = document.getElementById('gold-amount');
        if (el) el.textContent = amount;
    }

    updateSP(amount) {
        const el = document.getElementById('sp-amount');
        if (el) el.textContent = amount;
    }

    updateSkillSlotCooldown(slotIndex, ratio) {
        const slots = document.querySelectorAll('.skill-slot');
        const slot = slots[slotIndex];
        if (slot) {
            const overlay = slot.querySelector('.cd-overlay');
            if (overlay) {
                overlay.style.height = `${ratio * 100}%`;
                overlay.style.display = ratio > 0 ? 'block' : 'none';
            }
        }
    }

    setSkillSlotIcon(slotIndex, skillName, iconPath = '') {
        const slots = document.querySelectorAll('.skill-slot');
        const slot = slots[slotIndex];
        if (slot) {
            slot.setAttribute('data-skill-name', skillName || '');
            if (iconPath) {
                slot.style.backgroundImage = `url('${iconPath}')`;
                slot.style.backgroundSize = 'cover';
                slot.style.backgroundPosition = 'center';
            } else {
                slot.style.backgroundImage = '';
            }
        }
    }

    updatePotionCount(type, count) {
        const slot = document.querySelector(`.potion-slot[data-type="${type}"]`);
        if (slot) {
            const countEl = slot.querySelector('.potion-count');
            if (countEl) countEl.textContent = count;
        }
    }

    updateDungeonInfo(roomIndex, totalRooms, enemyCount) {
        const info = document.getElementById('dungeon-info');
        const room = document.getElementById('room-display');
        const enemies = document.getElementById('enemy-count');
        if (info) info.style.display = 'block';
        if (room) room.textContent = `Room ${roomIndex + 1}/${totalRooms}`;
        if (enemies) enemies.textContent = `Enemies: ${enemyCount}`;
    }

    hideDungeonInfo() {
        const info = document.getElementById('dungeon-info');
        if (info) info.style.display = 'none';
    }

    showBossHP(name, hp, maxHp) {
        const el = document.getElementById('boss-hp');
        if (el) el.style.display = 'block';
        const nameEl = document.getElementById('boss-name');
        if (nameEl) nameEl.textContent = name;
        this.updateBossHP(hp, maxHp);
    }

    updateBossHP(hp, maxHp) {
        const fill = document.getElementById('boss-hp-fill');
        const text = document.getElementById('boss-hp-text');
        if (fill) fill.style.width = `${(hp / maxHp) * 100}%`;
        if (text) text.textContent = `${Math.floor(hp)} / ${maxHp}`;
    }

    hideBossHP() {
        const el = document.getElementById('boss-hp');
        if (el) el.style.display = 'none';
    }

    showDamageNumber(x, y, damage, isCritical = false, isHeal = false) {
        const el = document.createElement('div');
        el.className = 'damage-number';
        if (isCritical) el.classList.add('critical');
        if (isHeal) el.classList.add('heal');
        el.textContent = (isHeal ? '+' : '') + Math.floor(damage);
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        this.elements.damageNumbers.appendChild(el);

        setTimeout(() => el.remove(), 1000);
    }

    showDialog(speaker, text, choices = null) {
        const panel = this.elements.dialog;
        panel.style.display = 'flex';
        document.getElementById('dialog-speaker').textContent = speaker;
        document.getElementById('dialog-text').textContent = text;

        const choicesEl = document.getElementById('dialog-choices');
        choicesEl.innerHTML = '';

        if (choices) {
            document.getElementById('dialog-continue').style.display = 'none';
            choices.forEach((choice, i) => {
                const btn = document.createElement('button');
                btn.className = 'dialog-choice';
                btn.textContent = choice.text;
                btn.onclick = () => {
                    this.hideDialog();
                    if (choice.callback) choice.callback();
                };
                choicesEl.appendChild(btn);
            });
        } else {
            document.getElementById('dialog-continue').style.display = 'block';
        }
    }

    hideDialog() {
        this.elements.dialog.style.display = 'none';
    }

    showHUD() {
        this.elements.hud.style.display = 'block';
    }

    hideHUD() {
        this.elements.hud.style.display = 'none';
    }

    showSkillTree() {
        this.elements.skillTree.style.display = 'flex';
    }

    hideSkillTree() {
        this.elements.skillTree.style.display = 'none';
    }

    showMenu() {
        this.elements.menu.style.display = 'flex';
    }

    hideMenu() {
        this.elements.menu.style.display = 'none';
    }

    showCenterMessage(text, duration = 2000) {
        let msg = document.getElementById('center-message');
        if (!msg) {
            msg = document.createElement('div');
            msg.id = 'center-message';
            document.body.appendChild(msg);
        }
        msg.textContent = text;
        msg.style.display = 'block';
        msg.style.opacity = '1';

        setTimeout(() => {
            msg.style.opacity = '0';
            setTimeout(() => { msg.style.display = 'none'; }, 500);
        }, duration);
    }

    screenShake(intensity = 5, duration = 200) {
        const canvas = document.querySelector('canvas');
        if (!canvas) return;
        const originalTransform = canvas.style.transform;
        let elapsed = 0;
        const interval = setInterval(() => {
            elapsed += 16;
            if (elapsed >= duration) {
                canvas.style.transform = originalTransform;
                clearInterval(interval);
                return;
            }
            const x = (Math.random() - 0.5) * intensity;
            const y = (Math.random() - 0.5) * intensity;
            canvas.style.transform = `translate(${x}px, ${y}px)`;
        }, 16);
    }
}
