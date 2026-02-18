// Dragon Nest Lite - Effect Manager (Particles, Skill VFX, Hit Effects)
import * as THREE from 'three';

export class EffectManager {
    constructor(game) {
        this.game = game;
        this.effects = [];
        this.particles = [];
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
        // Large downward arc
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

        // Ground impact ring
        this.groundImpact(position, color, 2);
    }

    // --- Impact Effects ---

    groundImpact(position, color = 0xffaa44, radius = 1.5) {
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

    hitSpark(position, color = 0xffaa00) {
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
        // Expanding sphere
        const geo = new THREE.SphereGeometry(0.2, 8, 8);
        const mat = new THREE.MeshBasicMaterial({
            color, transparent: true, opacity: 0.7
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);
        this.game.scene.add(mesh);

        // Light flash
        const light = new THREE.PointLight(color, 5, 8);
        light.position.copy(position);
        this.game.scene.add(light);

        const effect = {
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
        };
        this.effects.push(effect);

        // Particles
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
        // Ice shards
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const shardGeo = new THREE.ConeGeometry(0.08, 0.5, 4);
            const shardMat = new THREE.MeshBasicMaterial({
                color: 0x88ccff, transparent: true, opacity: 0.8
            });
            const shard = new THREE.Mesh(shardGeo, shardMat);
            shard.position.copy(position);
            shard.position.y += 0.5;
            shard.rotation.z = Math.PI / 2;
            shard.rotation.y = angle;
            this.game.scene.add(shard);

            const dir = new THREE.Vector3(Math.cos(angle), 0.5, Math.sin(angle));
            this.effects.push({
                mesh: shard, elapsed: 0, duration: 0.6,
                update: (dt, e) => {
                    shard.position.add(dir.clone().multiplyScalar(radius * 2 * dt));
                    shardMat.opacity = 0.8 * (1 - e.elapsed / 0.6);
                }
            });
        }

        // Frost ground ring
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

    // --- Beam / Line Effects ---

    beam(startPos, direction, range = 10, color = 0xff44ff, width = 0.3) {
        const endPos = startPos.clone().add(direction.clone().multiplyScalar(range));
        const midPoint = startPos.clone().add(endPos).multiplyScalar(0.5);

        const geo = new THREE.CylinderGeometry(width, width, range, 8);
        const mat = new THREE.MeshBasicMaterial({
            color, transparent: true, opacity: 0.7
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(midPoint);
        mesh.position.y += 1;

        // Rotate to face direction
        const axis = new THREE.Vector3(0, 1, 0);
        const angle = Math.atan2(direction.x, direction.z);
        mesh.rotation.y = angle;
        mesh.rotation.z = Math.PI / 2;

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
