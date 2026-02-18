// Dragon Nest Lite - Effect Manager (Particles, Skill VFX, Hit Effects)
import * as THREE from 'three';

// Static effect texture paths
const FX_TEXTURES = {
    slash_arc:      'assets/textures/effects/fx_slash_arc.png',
    slash_heavy:    'assets/textures/effects/fx_slash_heavy.png',
    hit_spark:      'assets/textures/effects/fx_hit_spark.png',
    fireball:       'assets/textures/effects/fx_fireball.png',
    fire_explosion: 'assets/textures/effects/fx_fire_explosion.png',
    ice_shard:      'assets/textures/effects/fx_ice_shard.png',
    ice_explosion:  'assets/textures/effects/fx_ice_explosion.png',
    frost_ring:     'assets/textures/effects/fx_frost_ring.png',
    dark_orb:       'assets/textures/effects/fx_dark_orb.png',
    dark_explosion: 'assets/textures/effects/fx_dark_explosion.png',
    beam_magic:     'assets/textures/effects/fx_beam_magic.png',
    buff_aura:      'assets/textures/effects/fx_buff_aura.png',
    magic_circle:   'assets/textures/effects/fx_magic_circle.png',
    ground_impact:  'assets/textures/effects/fx_ground_impact.png',
};

// Sprite sheet definitions (4x4 grids, 16 frames each, black background)
const FX_SPRITE_SHEETS = {
    fire_explosion_sheet:  { path: 'assets/textures/effects/fx_fire_explosion_sheet.png', cols: 4, rows: 4, frames: 16 },
    hit_spark_sheet:       { path: 'assets/textures/effects/fx_hit_spark_sheet.png', cols: 4, rows: 4, frames: 16 },
    ice_explosion_sheet:   { path: 'assets/textures/effects/fx_ice_explosion_sheet.png', cols: 4, rows: 4, frames: 16 },
    dark_explosion_sheet:  { path: 'assets/textures/effects/fx_dark_explosion_sheet.png', cols: 4, rows: 4, frames: 16 },
    slash_arc_sheet:       { path: 'assets/textures/effects/fx_slash_arc_sheet.png', cols: 4, rows: 4, frames: 16 },
    ground_impact_sheet:   { path: 'assets/textures/effects/fx_ground_impact_sheet.png', cols: 4, rows: 4, frames: 16 },
};

// Map static texture keys to their sprite sheet upgrades
const SHEET_UPGRADES = {
    fire_explosion: 'fire_explosion_sheet',
    hit_spark:      'hit_spark_sheet',
    ice_explosion:  'ice_explosion_sheet',
    dark_explosion: 'dark_explosion_sheet',
    slash_arc:      'slash_arc_sheet',
    ground_impact:  'ground_impact_sheet',
};

export class EffectManager {
    // Shared texture cache
    static _texCache = new Map();
    static _texLoaded = false;

    constructor(game) {
        this.game = game;
        this.effects = [];
        this.particles = [];
    }

    /**
     * Preload all effect textures and sprite sheets. Call once at startup.
     */
    static async preloadTextures() {
        const loader = new THREE.TextureLoader();

        // Load static textures
        const staticPromises = Object.entries(FX_TEXTURES).map(([key, path]) => {
            return new Promise(resolve => {
                loader.load(path, tex => {
                    tex.colorSpace = THREE.SRGBColorSpace;
                    EffectManager._texCache.set(key, tex);
                    resolve();
                }, undefined, () => resolve());
            });
        });

        // Load sprite sheet textures
        const sheetPromises = Object.entries(FX_SPRITE_SHEETS).map(([key, def]) => {
            return new Promise(resolve => {
                loader.load(def.path, tex => {
                    tex.colorSpace = THREE.SRGBColorSpace;
                    tex.minFilter = THREE.LinearFilter;
                    tex.magFilter = THREE.LinearFilter;
                    EffectManager._texCache.set(key, tex);
                    resolve();
                }, undefined, () => resolve());
            });
        });

        await Promise.all([...staticPromises, ...sheetPromises]);
        EffectManager._texLoaded = true;
        const totalDefs = Object.keys(FX_TEXTURES).length + Object.keys(FX_SPRITE_SHEETS).length;
        console.log(`[EffectManager] Loaded ${EffectManager._texCache.size}/${totalDefs} effect textures`);
    }

    /** Get a cached effect texture or null */
    _getTex(key) {
        return EffectManager._texCache.get(key) || null;
    }

    /**
     * Create a billboard sprite with a texture.
     * Returns the Sprite, or null if texture not available.
     */
    _createSprite(texKey, size = 2, color = 0xffffff, opacity = 1) {
        const tex = this._getTex(texKey);
        if (!tex) return null;
        // Use premultiplied alpha + alphaTest to eliminate square borders
        // from AI-generated textures with semi-transparent edge pixels
        tex.premultiplyAlpha = true;
        tex.needsUpdate = true;
        const mat = new THREE.SpriteMaterial({
            map: tex,
            color,
            transparent: true,
            opacity,
            alphaTest: 0.08,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(size, size, 1);
        return sprite;
    }

    /**
     * Create an animated sprite from a sprite sheet.
     * Returns { sprite, sheetInfo } or null if sheet not available.
     */
    _createAnimatedSprite(sheetKey, size = 2, color = 0xffffff, opacity = 1) {
        const sheetDef = FX_SPRITE_SHEETS[sheetKey];
        if (!sheetDef) return null;
        const baseTex = this._getTex(sheetKey);
        if (!baseTex) return null;

        // Clone texture so each effect instance has independent UV offsets
        const tex = baseTex.clone();
        tex.needsUpdate = true;
        tex.repeat.set(1 / sheetDef.cols, 1 / sheetDef.rows);
        tex.offset.set(0, 1 - 1 / sheetDef.rows); // Frame 0 = top-left

        const mat = new THREE.SpriteMaterial({
            map: tex,
            color,
            transparent: true,
            opacity,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(size, size, 1);

        const sheetInfo = {
            texture: tex,
            cols: sheetDef.cols,
            rows: sheetDef.rows,
            frames: sheetDef.frames,
        };
        return { sprite, sheetInfo };
    }

    /**
     * Update sprite sheet frame based on normalized time (0-1).
     */
    _updateSpriteFrame(sheetInfo, normalizedTime) {
        const { texture, cols, rows, frames } = sheetInfo;
        const frameIndex = Math.min(Math.floor(normalizedTime * frames), frames - 1);
        const col = frameIndex % cols;
        const row = Math.floor(frameIndex / cols);
        texture.offset.set(col / cols, 1 - (row + 1) / rows);
    }

    /**
     * Try to create an animated sprite sheet sprite, falling back to static texture.
     * Returns { sprite, sheetInfo } (sheetInfo may be null for static).
     */
    _createEffectSprite(texKey, size = 2, color = 0xffffff, opacity = 1) {
        // Try sprite sheet upgrade first
        const sheetKey = SHEET_UPGRADES[texKey];
        if (sheetKey) {
            const result = this._createAnimatedSprite(sheetKey, size, color, opacity);
            if (result) return result;
        }
        // Fallback to static texture
        const sprite = this._createSprite(texKey, size, color, opacity);
        if (sprite) return { sprite, sheetInfo: null };
        return null;
    }

    update(dt) {
        // Update effects
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const effect = this.effects[i];
            effect.elapsed += dt;

            if (effect.update) {
                effect.update(dt, effect);
            }

            if (effect.elapsed >= effect.duration) {
                if (effect.mesh) {
                    // Remove from parent (works for both scene children and target.mesh children)
                    if (effect.mesh.parent) {
                        effect.mesh.parent.remove(effect.mesh);
                    } else {
                        this.game.scene.remove(effect.mesh);
                    }
                    // Clean up tracked extra lights
                    if (effect._extraLight) {
                        this.game.scene.remove(effect._extraLight);
                    }
                    effect.mesh.traverse(child => {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(m => m.dispose());
                            } else {
                                child.material.dispose();
                            }
                        }
                    });
                }
                this.effects.splice(i, 1);
            }
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.elapsed += dt;
            p.mesh.position.add(p.velocity.clone().multiplyScalar(dt));
            p.velocity.y += p.gravity * dt;

            const lifeRatio = p.elapsed / p.lifetime;
            p.mesh.material.opacity = 1 - lifeRatio;
            p.mesh.scale.setScalar(p.startScale * (1 - lifeRatio * 0.5));

            if (p.elapsed >= p.lifetime) {
                this.game.scene.remove(p.mesh);
                p.mesh.geometry.dispose();
                p.mesh.material.dispose();
                this.particles.splice(i, 1);
            }
        }
    }

    // --- Slash Effects ---

    slashArc(position, rotation, color = 0xffffff, scale = 1) {
        // Try animated sprite sheet, then static texture
        const result = this._createEffectSprite('slash_arc', 2.5 * scale, color, 0.9);
        if (result) {
            const { sprite, sheetInfo } = result;
            sprite.position.copy(position);
            sprite.position.y += 1;
            sprite.position.x += Math.sin(rotation) * 1.2;
            sprite.position.z += Math.cos(rotation) * 1.2;
            sprite.material.rotation = -rotation;
            this.game.scene.add(sprite);

            this.effects.push({
                mesh: sprite, elapsed: 0, duration: 0.35,
                update: (dt, e) => {
                    const t = e.elapsed / 0.35;
                    if (sheetInfo) this._updateSpriteFrame(sheetInfo, t);
                    sprite.scale.setScalar(2.5 * scale * (1 + t * 1.5));
                    sprite.material.opacity = 0.9 * (1 - t);
                }
            });
            return;
        }

        // Fallback: geometry-based
        const geo = new THREE.TorusGeometry(1.5 * scale, 0.05 * scale, 4, 16, Math.PI * 0.6);
        const mat = new THREE.MeshBasicMaterial({
            color, transparent: true, opacity: 0.8, side: THREE.DoubleSide
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);
        mesh.position.y += 1;
        mesh.rotation.y = rotation;
        mesh.rotation.x = -0.3;
        this.game.scene.add(mesh);

        this.effects.push({
            mesh, elapsed: 0, duration: 0.3,
            update: (dt, e) => {
                mesh.scale.setScalar(1 + e.elapsed * 3);
                mat.opacity = 0.8 - (e.elapsed / 0.3) * 0.8;
            }
        });
    }

    heavySlash(position, rotation, color = 0xffaa44) {
        // Try texture sprite
        const sprite = this._createSprite('slash_heavy', 3.5, color, 0.95);
        if (sprite) {
            sprite.position.copy(position);
            sprite.position.y += 1.2;
            sprite.position.x += Math.sin(rotation) * 1.5;
            sprite.position.z += Math.cos(rotation) * 1.5;
            sprite.material.rotation = -rotation;
            this.game.scene.add(sprite);

            this.effects.push({
                mesh: sprite, elapsed: 0, duration: 0.45,
                update: (dt, e) => {
                    const t = e.elapsed / 0.45;
                    sprite.scale.setScalar(3.5 * (1 + t * 0.8));
                    sprite.material.opacity = 0.95 * (1 - t);
                }
            });
        } else {
            // Fallback: geometry
            const geo = new THREE.TorusGeometry(2, 0.08, 4, 16, Math.PI * 0.8);
            const mat = new THREE.MeshBasicMaterial({
                color, transparent: true, opacity: 0.9, side: THREE.DoubleSide
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(position);
            mesh.position.y += 1.5;
            mesh.rotation.y = rotation;
            mesh.rotation.x = 0.5;
            this.game.scene.add(mesh);

            this.effects.push({
                mesh, elapsed: 0, duration: 0.4,
                update: (dt, e) => {
                    mesh.rotation.x += dt * 8;
                    mesh.scale.setScalar(1 + e.elapsed * 2);
                    mat.opacity = 0.9 - (e.elapsed / 0.4) * 0.9;
                }
            });
        }

        this.groundImpact(position, color, 2);
    }

    // --- Impact Effects ---

    groundImpact(position, color = 0xffaa44, radius = 1.5) {
        const result = this._createEffectSprite('ground_impact', radius * 2, color, 0.7);
        if (result) {
            const { sprite: impactSprite, sheetInfo } = result;
            impactSprite.position.copy(position);
            impactSprite.position.y = 0.15;
            this.game.scene.add(impactSprite);

            this.effects.push({
                mesh: impactSprite, elapsed: 0, duration: 0.5,
                update: (dt, e) => {
                    const t = e.elapsed / 0.5;
                    if (sheetInfo) this._updateSpriteFrame(sheetInfo, t);
                    impactSprite.scale.setScalar(radius * 2 * (0.3 + t * 1.2));
                    impactSprite.material.opacity = 0.7 * (1 - t);
                }
            });
            return;
        }

        // Fallback
        const geo = new THREE.RingGeometry(0.1, radius, 16);
        const mat = new THREE.MeshBasicMaterial({
            color, transparent: true, opacity: 0.6, side: THREE.DoubleSide
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);
        mesh.position.y = 0.05;
        mesh.rotation.x = -Math.PI / 2;
        this.game.scene.add(mesh);

        this.effects.push({
            mesh, elapsed: 0, duration: 0.5,
            update: (dt, e) => {
                const t = e.elapsed / 0.5;
                mesh.scale.setScalar(0.3 + t * 1.5);
                mat.opacity = 0.6 * (1 - t);
            }
        });
    }

    punchImpact(position, color = 0xffaa44, scale = 1) {
        // Radial shockwave burst for fist/punch attacks
        const result = this._createEffectSprite('hit_spark', 2.5 * scale, color, 0.9);
        if (result) {
            const { sprite, sheetInfo } = result;
            sprite.position.copy(position);
            sprite.position.y += 1;
            sprite.material.rotation = Math.random() * Math.PI * 2;
            this.game.scene.add(sprite);

            this.effects.push({
                mesh: sprite, elapsed: 0, duration: 0.35,
                update: (dt, e) => {
                    const t = e.elapsed / 0.35;
                    if (sheetInfo) this._updateSpriteFrame(sheetInfo, t);
                    sprite.scale.setScalar(2.5 * scale * (0.3 + t * 1.5));
                    sprite.material.opacity = 0.9 * (1 - t * t);
                }
            });
        } else {
            // Geometry fallback: expanding ring
            const geo = new THREE.TorusGeometry(0.8 * scale, 0.08 * scale, 8, 16);
            const mat = new THREE.MeshBasicMaterial({
                color, transparent: true, opacity: 0.8, side: THREE.DoubleSide
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(position);
            mesh.position.y += 1;
            mesh.rotation.x = Math.PI / 2;
            this.game.scene.add(mesh);

            this.effects.push({
                mesh, elapsed: 0, duration: 0.35,
                update: (dt, e) => {
                    const t = e.elapsed / 0.35;
                    mesh.scale.setScalar(1 + t * 3);
                    mat.opacity = 0.8 * (1 - t);
                }
            });
        }

        // Burst particles outward
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            this.spawnParticle(
                position.clone().add(new THREE.Vector3(0, 1, 0)),
                new THREE.Vector3(Math.cos(angle) * 3, 0.5 + Math.random(), Math.sin(angle) * 3),
                color, 0.08, 0.3
            );
        }
    }

    hitSpark(position, color = 0xffaa00) {
        const result = this._createEffectSprite('hit_spark', 1.5, color, 0.9);
        if (result) {
            const { sprite, sheetInfo } = result;
            sprite.position.copy(position);
            sprite.position.y += 0.8;
            sprite.material.rotation = Math.random() * Math.PI * 2;
            this.game.scene.add(sprite);

            this.effects.push({
                mesh: sprite, elapsed: 0, duration: 0.25,
                update: (dt, e) => {
                    const t = e.elapsed / 0.25;
                    if (sheetInfo) this._updateSpriteFrame(sheetInfo, t);
                    sprite.scale.setScalar(1.5 * (0.5 + t * 1.5));
                    sprite.material.opacity = 0.9 * (1 - t);
                }
            });
        }

        // Always spawn particles for extra juice
        for (let i = 0; i < 6; i++) {
            this.spawnParticle(
                position.clone().add(new THREE.Vector3(
                    (Math.random() - 0.5) * 0.5,
                    0.5 + Math.random() * 0.5,
                    (Math.random() - 0.5) * 0.5
                )),
                new THREE.Vector3(
                    (Math.random() - 0.5) * 4,
                    2 + Math.random() * 3,
                    (Math.random() - 0.5) * 4
                ),
                color, 0.15, 0.4
            );
        }
    }

    // --- Magic Effects ---

    fireball(position, direction, speed = 12, range = 10, color = 0xff4400) {
        const group = new THREE.Group();

        // Core
        const core = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xffaa00 })
        );
        group.add(core);

        // Glow
        const glow = new THREE.Mesh(
            new THREE.SphereGeometry(0.35, 8, 8),
            new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4 })
        );
        group.add(glow);

        // Light
        const light = new THREE.PointLight(color, 2, 5);
        group.add(light);

        group.position.copy(position);
        group.position.y += 1;
        this.game.scene.add(group);

        const dir = direction.clone().normalize();
        let traveled = 0;

        this.effects.push({
            mesh: group, elapsed: 0, duration: range / speed,
            update: (dt, e) => {
                group.position.add(dir.clone().multiplyScalar(speed * dt));
                traveled += speed * dt;

                // Spin and pulse
                glow.scale.setScalar(1 + Math.sin(e.elapsed * 15) * 0.2);

                // Trail particles
                if (Math.random() < 0.5) {
                    this.spawnParticle(
                        group.position.clone(),
                        new THREE.Vector3((Math.random() - 0.5) * 1, Math.random() * 1, (Math.random() - 0.5) * 1),
                        color, 0.1, 0.3
                    );
                }

                // Hit check
                const enemies = this.game.getActiveEnemies();
                for (const enemy of enemies) {
                    const dist = group.position.distanceTo(enemy.position);
                    if (dist < 1.2) {
                        e.duration = 0; // Kill effect
                        this.explosion(group.position.clone(), color, 2);
                        break;
                    }
                }
            }
        });
    }

    explosion(position, color = 0xff4400, radius = 2) {
        // Determine if fire or dark explosion based on color
        const isFireColor = (color & 0xff0000) > (color & 0x0000ff);
        const texKey = isFireColor ? 'fire_explosion' : 'dark_explosion';
        const result = this._createEffectSprite(texKey, radius * 2.5, color, 0.9);

        if (result) {
            const { sprite, sheetInfo } = result;
            sprite.position.copy(position);
            sprite.position.y += 0.5;
            this.game.scene.add(sprite);

            const light = new THREE.PointLight(color, 5, 8);
            light.position.copy(position);
            this.game.scene.add(light);

            this.effects.push({
                mesh: sprite, elapsed: 0, duration: 0.5,
                _extraLight: light,
                update: (dt, e) => {
                    const t = e.elapsed / 0.5;
                    if (sheetInfo) this._updateSpriteFrame(sheetInfo, t);
                    sprite.scale.setScalar(radius * 2.5 * (0.3 + t * 1.2));
                    sprite.material.opacity = 0.9 * (1 - t * t);
                    if (!sheetInfo) sprite.material.rotation += dt * 2;
                    light.intensity = 5 * (1 - t);
                    if (t >= 1) {
                        this.game.scene.remove(light);
                        e._extraLight = null;
                    }
                }
            });
        } else {
            // Fallback: expanding sphere
            const geo = new THREE.SphereGeometry(0.2, 8, 8);
            const mat = new THREE.MeshBasicMaterial({
                color, transparent: true, opacity: 0.7
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(position);
            this.game.scene.add(mesh);

            const light = new THREE.PointLight(color, 5, 8);
            light.position.copy(position);
            this.game.scene.add(light);

            this.effects.push({
                mesh, elapsed: 0, duration: 0.4,
                _extraLight: light,
                update: (dt, e) => {
                    const t = e.elapsed / 0.4;
                    mesh.scale.setScalar(radius * t * 3);
                    mat.opacity = 0.7 * (1 - t);
                    light.intensity = 5 * (1 - t);
                    if (t >= 1) {
                        this.game.scene.remove(light);
                        e._extraLight = null;
                    }
                }
            });
        }

        // Particles always
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            this.spawnParticle(
                position.clone(),
                new THREE.Vector3(Math.cos(angle) * 3, 1 + Math.random() * 2, Math.sin(angle) * 3),
                color, 0.12, 0.6
            );
        }
    }

    iceExplosion(position, radius = 2) {
        // Animated ice explosion burst
        const result = this._createEffectSprite('ice_explosion', radius * 3, 0xaaddff, 0.85);
        if (result) {
            const { sprite: burstSprite, sheetInfo } = result;
            burstSprite.position.copy(position);
            burstSprite.position.y += 0.8;
            this.game.scene.add(burstSprite);

            this.effects.push({
                mesh: burstSprite, elapsed: 0, duration: 0.6,
                update: (dt, e) => {
                    const t = e.elapsed / 0.6;
                    if (sheetInfo) this._updateSpriteFrame(sheetInfo, t);
                    burstSprite.scale.setScalar(radius * 3 * (0.4 + t * 0.8));
                    burstSprite.material.opacity = 0.85 * (1 - t);
                    if (!sheetInfo) burstSprite.material.rotation += dt;
                }
            });
        }

        // Ice shard sprites flying outward
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const shardSprite = this._createSprite('ice_shard', 0.6, 0x88ccff, 0.8);
            const shardMesh = shardSprite || (() => {
                const geo = new THREE.ConeGeometry(0.08, 0.5, 4);
                const mat = new THREE.MeshBasicMaterial({
                    color: 0x88ccff, transparent: true, opacity: 0.8
                });
                const m = new THREE.Mesh(geo, mat);
                m.rotation.z = Math.PI / 2;
                m.rotation.y = angle;
                return m;
            })();

            shardMesh.position.copy(position);
            shardMesh.position.y += 0.5;
            this.game.scene.add(shardMesh);

            const dir = new THREE.Vector3(Math.cos(angle), 0.5, Math.sin(angle));
            this.effects.push({
                mesh: shardMesh, elapsed: 0, duration: 0.6,
                update: (dt, e) => {
                    shardMesh.position.add(dir.clone().multiplyScalar(radius * 2 * dt));
                    if (shardMesh.material) {
                        shardMesh.material.opacity = 0.8 * (1 - e.elapsed / 0.6);
                    }
                }
            });
        }

        // Frost ground ring (textured or fallback)
        const frostRing = this._createSprite('frost_ring', radius * 2.5, 0x88ccff, 0.5);
        if (frostRing) {
            frostRing.position.copy(position);
            frostRing.position.y = 0.1;
            // Force flat by using a plane instead of sprite for ground effect
            this.game.scene.add(frostRing);

            this.effects.push({
                mesh: frostRing, elapsed: 0, duration: 1.2,
                update: (dt, e) => {
                    frostRing.material.opacity = 0.5 * (1 - e.elapsed / 1.2);
                    frostRing.material.rotation -= dt * 0.5;
                }
            });
        } else {
            const ringGeo = new THREE.RingGeometry(0.1, radius, 16);
            const ringMat = new THREE.MeshBasicMaterial({
                color: 0x88ccff, transparent: true, opacity: 0.5, side: THREE.DoubleSide
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.position.copy(position);
            ring.position.y = 0.05;
            ring.rotation.x = -Math.PI / 2;
            this.game.scene.add(ring);

            this.effects.push({
                mesh: ring, elapsed: 0, duration: 1.0,
                update: (dt, e) => {
                    ringMat.opacity = 0.5 * (1 - e.elapsed / 1.0);
                }
            });
        }
    }

    // --- Beam / Line Effects ---

    beam(startPos, direction, range = 10, color = 0xff44ff, width = 0.3) {
        const dir = direction.clone().normalize();
        const start = startPos.clone();
        start.y += 1;
        const endPos = start.clone().add(dir.clone().multiplyScalar(range));
        const midPoint = start.clone().add(endPos).multiplyScalar(0.5);

        const geo = new THREE.CylinderGeometry(width, width, range, 8);
        const mat = new THREE.MeshBasicMaterial({
            color, transparent: true, opacity: 0.7
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(midPoint);

        // Use quaternion to orient cylinder along direction vector
        const up = new THREE.Vector3(0, 1, 0);
        const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
        mesh.quaternion.copy(quat);

        this.game.scene.add(mesh);

        this.effects.push({
            mesh, elapsed: 0, duration: 0.5,
            update: (dt, e) => {
                mat.opacity = 0.7 * (1 - e.elapsed / 0.5);
                mesh.scale.x = 1 + e.elapsed * 2;
            }
        });
    }

    // --- Area Effects ---

    auraRing(position, color = 0x44ff44, radius = 3, duration = 5) {
        const geo = new THREE.RingGeometry(radius - 0.1, radius, 32);
        const mat = new THREE.MeshBasicMaterial({
            color, transparent: true, opacity: 0.4, side: THREE.DoubleSide
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);
        mesh.position.y = 0.05;
        mesh.rotation.x = -Math.PI / 2;
        this.game.scene.add(mesh);

        this.effects.push({
            mesh, elapsed: 0, duration,
            update: (dt, e) => {
                mesh.rotation.z += dt;
                mat.opacity = 0.4 * (1 - (e.elapsed / duration) * 0.5);
                mesh.position.copy(position);
                mesh.position.y = 0.05;
            }
        });
    }

    blackHole(position, radius = 3, duration = 3) {
        const geo = new THREE.SphereGeometry(0.5, 16, 16);
        const mat = new THREE.MeshBasicMaterial({
            color: 0x220044, transparent: true, opacity: 0.8
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);
        mesh.position.y = 1;
        this.game.scene.add(mesh);

        // Outer ring
        const ringGeo = new THREE.TorusGeometry(radius, 0.1, 8, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x8844ff, transparent: true, opacity: 0.5
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        mesh.add(ring);

        this.effects.push({
            mesh, elapsed: 0, duration,
            update: (dt, e) => {
                ring.rotation.z += dt * 3;
                mesh.scale.setScalar(1 + Math.sin(e.elapsed * 5) * 0.1);
                // Distortion particles
                if (Math.random() < 0.3) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = radius * (0.5 + Math.random() * 0.5);
                    this.spawnParticle(
                        position.clone().add(new THREE.Vector3(
                            Math.cos(angle) * dist, 0.5, Math.sin(angle) * dist
                        )),
                        new THREE.Vector3(-Math.cos(angle) * 2, 0.5, -Math.sin(angle) * 2),
                        0x8844ff, 0.08, 0.5
                    );
                }
            }
        });
    }

    // --- Buff Effects ---

    buffAura(target, color = 0x44ff44, duration = 10) {
        const geo = new THREE.TorusGeometry(0.8, 0.05, 8, 32);
        const mat = new THREE.MeshBasicMaterial({
            color, transparent: true, opacity: 0.5
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = Math.PI / 2;
        mesh.position.y = 0.1;

        if (target.mesh) {
            target.mesh.add(mesh);
        }

        this.effects.push({
            mesh, elapsed: 0, duration,
            update: (dt, e) => {
                mesh.rotation.z += dt * 2;
                mat.opacity = 0.5 * (1 - (e.elapsed / duration) * 0.3);
                // Periodic particles upward
                if (Math.random() < 0.1) {
                    const worldPos = new THREE.Vector3();
                    mesh.getWorldPosition(worldPos);
                    this.spawnParticle(
                        worldPos.add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 0, (Math.random() - 0.5) * 0.8)),
                        new THREE.Vector3(0, 1.5, 0),
                        color, 0.06, 0.8
                    );
                }
            }
        });
    }

    // --- Level Up ---

    levelUp(position) {
        // Rising particles
        for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2;
            this.spawnParticle(
                position.clone().add(new THREE.Vector3(Math.cos(angle) * 1, 0, Math.sin(angle) * 1)),
                new THREE.Vector3(Math.cos(angle) * 0.5, 3 + Math.random() * 2, Math.sin(angle) * 0.5),
                0xffdd44, 0.1, 1.5
            );
        }

        // Light pillar
        const pillarGeo = new THREE.CylinderGeometry(0.8, 0.8, 6, 16, 1, true);
        const pillarMat = new THREE.MeshBasicMaterial({
            color: 0xffdd44, transparent: true, opacity: 0.3, side: THREE.DoubleSide
        });
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.copy(position);
        pillar.position.y = 3;
        this.game.scene.add(pillar);

        this.effects.push({
            mesh: pillar, elapsed: 0, duration: 1.5,
            update: (dt, e) => {
                pillarMat.opacity = 0.3 * (1 - e.elapsed / 1.5);
                pillar.scale.x = 1 + e.elapsed * 0.5;
                pillar.scale.z = 1 + e.elapsed * 0.5;
            }
        });
    }

    // --- Particle System ---

    spawnParticle(position, velocity, color, size = 0.1, lifetime = 0.5) {
        const geo = new THREE.SphereGeometry(size, 4, 4);
        const mat = new THREE.MeshBasicMaterial({
            color, transparent: true, opacity: 1
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);
        this.game.scene.add(mesh);

        this.particles.push({
            mesh,
            velocity: velocity.clone(),
            gravity: -5,
            lifetime,
            elapsed: 0,
            startScale: 1
        });
    }

    // --- Cleanup ---

    dispose() {
        for (const e of this.effects) {
            if (e.mesh) {
                // Remove from parent (works for both scene children and target.mesh children)
                if (e.mesh.parent) {
                    e.mesh.parent.remove(e.mesh);
                } else {
                    this.game.scene.remove(e.mesh);
                }
                e.mesh.traverse(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(m => m.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                });
            }
            // Remove tracked extra lights
            if (e._extraLight) {
                this.game.scene.remove(e._extraLight);
            }
        }
        for (const p of this.particles) {
            this.game.scene.remove(p.mesh);
            if (p.mesh.geometry) p.mesh.geometry.dispose();
            if (p.mesh.material) p.mesh.material.dispose();
        }
        this.effects = [];
        this.particles = [];
    }
}
