// Dragon Nest Lite - Model Loader (GLB preloading + Placeholder fallback)
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CONFIG } from '../config.js';

// Model definitions: type -> { path, targetHeight }
const CHARACTER_MODELS = {
    'WARRIOR':        { path: 'assets/models/fighter.glb',        targetHeight: 1.8 },
    'MAGE':           { path: 'assets/models/mage.glb',           targetHeight: 1.8 },
    'SLIME':          { path: 'assets/models/enemy_slime.glb',    targetHeight: 0.8 },
    'GOBLIN':         { path: 'assets/models/enemy_goblin.glb',   targetHeight: 1.3 },
    'SKELETON':       { path: 'assets/models/enemy_skeleton.glb', targetHeight: 1.5 },
    'DRAGON':         { path: 'assets/models/boss_dragon.glb',    targetHeight: 3.5 },
    'NPC_BLACKSMITH': { path: 'assets/models/npc_blacksmith.glb', targetHeight: 1.8 },
    'NPC_SKILLMASTER':{ path: 'assets/models/npc_skillmaster.glb',targetHeight: 1.8 },
    'NPC_POTION':     { path: 'assets/models/npc_potion.glb',     targetHeight: 1.8 },
};

const ENVIRONMENT_MODELS = {
    'tree':   { paths: ['assets/models/env_tree_01.glb', 'assets/models/env_tree_02.glb', 'assets/models/env_tree_03.glb'], targetHeight: 3.0 },
    'rock':   { paths: ['assets/models/env_rock_01.glb', 'assets/models/env_rock_02.glb'], targetHeight: 0.8 },
    'house':  { paths: ['assets/models/env_house_01.glb', 'assets/models/env_house_02.glb'], targetHeight: 2.5 },
    'chest':  { path: 'assets/models/item_chest.glb',    targetHeight: 0.5 },
    'pillar': { path: 'assets/models/env_ruins_pillar.glb', targetHeight: 3.0 },
    'door':   { path: 'assets/models/env_door.glb',      targetHeight: 2.5 },
};

export class ModelLoader {
    // Shared cache: key -> { scene, animations, naturalHeight }
    static _cache = new Map();
    static _loader = null;
    static _preloaded = false;

    constructor() {
        this.loader = new GLTFLoader();
        this.cache = new Map();
        this.mixers = new Map();
    }

    static _getLoader() {
        if (!ModelLoader._loader) {
            ModelLoader._loader = new GLTFLoader();
        }
        return ModelLoader._loader;
    }

    /**
     * Preload all GLB models. Call once at startup.
     * Returns a progress callback-style promise.
     */
    static async preloadAll(onProgress) {
        const loader = ModelLoader._getLoader();
        const allPaths = new Set();

        // Collect character model paths
        for (const def of Object.values(CHARACTER_MODELS)) {
            allPaths.add(def.path);
        }

        // Collect environment model paths
        for (const def of Object.values(ENVIRONMENT_MODELS)) {
            if (def.paths) {
                def.paths.forEach(p => allPaths.add(p));
            } else {
                allPaths.add(def.path);
            }
        }

        const pathArray = [...allPaths];
        let loaded = 0;
        const total = pathArray.length;

        const loadOne = async (path) => {
            try {
                const gltf = await new Promise((resolve, reject) => {
                    loader.load(path, resolve, undefined, reject);
                });

                // Compute bounding box for natural height
                const box = new THREE.Box3().setFromObject(gltf.scene);
                const size = box.getSize(new THREE.Vector3());
                const naturalHeight = size.y;

                // Center the model at bottom (y=0)
                const center = box.getCenter(new THREE.Vector3());
                gltf.scene.position.set(-center.x, -box.min.y, -center.z);

                // Enable shadows on all meshes
                gltf.scene.traverse(child => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                ModelLoader._cache.set(path, {
                    scene: gltf.scene,
                    animations: gltf.animations,
                    naturalHeight
                });

                console.log(`[ModelLoader] Loaded: ${path} (height: ${naturalHeight.toFixed(2)})`);
            } catch (e) {
                console.warn(`[ModelLoader] Failed to load: ${path}`, e.message || e);
            }

            loaded++;
            if (onProgress) onProgress(loaded, total);
        };

        // Load in batches of 4 to avoid overwhelming the browser
        const batchSize = 4;
        for (let i = 0; i < pathArray.length; i += batchSize) {
            const batch = pathArray.slice(i, i + batchSize);
            await Promise.all(batch.map(loadOne));
        }

        ModelLoader._preloaded = true;
        console.log(`[ModelLoader] Preload complete: ${ModelLoader._cache.size}/${total} models loaded`);
    }

    /**
     * Clone a cached GLB model, scaled to target height.
     * Returns a THREE.Group or null if not cached.
     */
    static _cloneCached(path, targetHeight, extraScale = 1) {
        const cached = ModelLoader._cache.get(path);
        if (!cached) return null;

        // Create a wrapper group
        const group = new THREE.Group();
        const clone = cached.scene.clone();

        // Deep clone materials to avoid shared state issues
        clone.traverse(child => {
            if (child.isMesh && child.material) {
                child.material = child.material.clone();
            }
        });

        // Scale to target height (guard against zero-height models)
        const safeHeight = Math.max(cached.naturalHeight, 0.01);
        const scale = (targetHeight / safeHeight) * extraScale;
        clone.scale.set(scale, scale, scale);
        // Also need to rescale the position offset
        clone.position.multiplyScalar(scale);

        group.add(clone);
        group.userData.isGLB = true;
        group.userData.animations = cached.animations;

        return group;
    }

    /**
     * Get a character/enemy/NPC model. Returns GLB if cached, placeholder otherwise.
     * @param {string} type - WARRIOR, MAGE, SLIME, GOBLIN, SKELETON, DRAGON, NPC_BLACKSMITH, etc.
     * @param {object} options - { scale: number }
     */
    static getModel(type, options = {}) {
        const scale = options.scale || 1;
        const def = CHARACTER_MODELS[type];

        if (def) {
            const model = ModelLoader._cloneCached(def.path, def.targetHeight, scale);
            if (model) return model;
        }

        // Fallback to placeholder
        return ModelLoader.createPlaceholder(type, options);
    }

    /**
     * Get an environment model. Returns GLB if cached, placeholder otherwise.
     * For types with multiple variants (tree, rock, house), picks randomly.
     * @param {string} type - tree, rock, house, chest, pillar, door
     * @param {object} options - { scale: number }
     */
    static getEnvironmentModel(type, options = {}) {
        const scale = options.scale || 1;
        const def = ENVIRONMENT_MODELS[type];

        if (def) {
            let path;
            if (def.paths) {
                // Pick a random variant
                path = def.paths[Math.floor(Math.random() * def.paths.length)];
            } else {
                path = def.path;
            }

            const model = ModelLoader._cloneCached(path, def.targetHeight, scale);
            if (model) return model;
        }

        // Fallback to placeholder
        return ModelLoader.createEnvironmentPlaceholder(type, options);
    }

    // ========= Legacy instance methods (kept for compatibility) =========

    async loadModel(key, path) {
        if (this.cache.has(key)) {
            return this.cloneCached(key);
        }

        try {
            const gltf = await new Promise((resolve, reject) => {
                this.loader.load(
                    path,
                    resolve,
                    undefined,
                    reject
                );
            });

            this.cache.set(key, {
                scene: gltf.scene,
                animations: gltf.animations
            });

            return {
                model: gltf.scene,
                animations: gltf.animations,
                mixer: new THREE.AnimationMixer(gltf.scene)
            };
        } catch (e) {
            console.warn(`Model ${key} not found at ${path}, using placeholder`);
            return null;
        }
    }

    cloneCached(key) {
        const cached = this.cache.get(key);
        const clonedScene = cached.scene.clone();
        return {
            model: clonedScene,
            animations: cached.animations,
            mixer: new THREE.AnimationMixer(clonedScene)
        };
    }

    // ========= Placeholder factories (fallback when GLB not available) =========

    static createPlaceholder(type, options = {}) {
        const group = new THREE.Group();
        const color = CONFIG.PLACEHOLDER[type] || 0x888888;
        const scale = options.scale || 1;

        switch (type) {
            case 'WARRIOR': {
                const body = new THREE.Mesh(
                    new THREE.CapsuleGeometry(0.35 * scale, 0.7 * scale, 4, 8),
                    new THREE.MeshLambertMaterial({ color })
                );
                body.position.y = 0.9 * scale;
                group.add(body);
                const head = new THREE.Mesh(
                    new THREE.SphereGeometry(0.35 * scale, 8, 8),
                    new THREE.MeshLambertMaterial({ color: 0xffccaa })
                );
                head.position.y = 1.6 * scale;
                group.add(head);
                const sword = new THREE.Mesh(
                    new THREE.BoxGeometry(0.08 * scale, 0.8 * scale, 0.04 * scale),
                    new THREE.MeshLambertMaterial({ color: 0xaaaacc })
                );
                sword.position.set(0.5 * scale, 1.0 * scale, 0);
                sword.rotation.z = -0.3;
                group.add(sword);
                break;
            }
            case 'MAGE': {
                const robe = new THREE.Mesh(
                    new THREE.ConeGeometry(0.4 * scale, 1.0 * scale, 8),
                    new THREE.MeshLambertMaterial({ color })
                );
                robe.position.y = 0.5 * scale;
                group.add(robe);
                const mageHead = new THREE.Mesh(
                    new THREE.SphereGeometry(0.3 * scale, 8, 8),
                    new THREE.MeshLambertMaterial({ color: 0xffccaa })
                );
                mageHead.position.y = 1.3 * scale;
                group.add(mageHead);
                const hat = new THREE.Mesh(
                    new THREE.ConeGeometry(0.3 * scale, 0.5 * scale, 8),
                    new THREE.MeshLambertMaterial({ color: 0x4422aa })
                );
                hat.position.y = 1.8 * scale;
                group.add(hat);
                const staff = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.03 * scale, 0.03 * scale, 1.2 * scale),
                    new THREE.MeshLambertMaterial({ color: 0x664422 })
                );
                staff.position.set(0.45 * scale, 0.8 * scale, 0);
                staff.rotation.z = -0.15;
                group.add(staff);
                const orb = new THREE.Mesh(
                    new THREE.SphereGeometry(0.08 * scale, 8, 8),
                    new THREE.MeshLambertMaterial({ color: 0x44aaff, emissive: 0x2266aa })
                );
                orb.position.set(0.42 * scale, 1.4 * scale, 0);
                group.add(orb);
                break;
            }
            case 'SLIME': {
                const slimeBody = new THREE.Mesh(
                    new THREE.SphereGeometry(0.5 * scale, 8, 8),
                    new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.8 })
                );
                slimeBody.scale.y = 0.7;
                slimeBody.position.y = 0.35 * scale;
                group.add(slimeBody);
                const eyeGeo = new THREE.SphereGeometry(0.06 * scale, 6, 6);
                const eyeMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
                const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
                leftEye.position.set(-0.15 * scale, 0.4 * scale, 0.35 * scale);
                group.add(leftEye);
                const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
                rightEye.position.set(0.15 * scale, 0.4 * scale, 0.35 * scale);
                group.add(rightEye);
                break;
            }
            case 'GOBLIN': {
                const gobBody = new THREE.Mesh(
                    new THREE.CapsuleGeometry(0.25 * scale, 0.4 * scale, 4, 8),
                    new THREE.MeshLambertMaterial({ color: 0x558833 })
                );
                gobBody.position.y = 0.6 * scale;
                group.add(gobBody);
                const gobHead = new THREE.Mesh(
                    new THREE.SphereGeometry(0.25 * scale, 8, 8),
                    new THREE.MeshLambertMaterial({ color: 0x669944 })
                );
                gobHead.position.y = 1.1 * scale;
                group.add(gobHead);
                const club = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.06 * scale, 0.04 * scale, 0.5 * scale),
                    new THREE.MeshLambertMaterial({ color: 0x553311 })
                );
                club.position.set(0.35 * scale, 0.7 * scale, 0);
                club.rotation.z = -0.5;
                group.add(club);
                break;
            }
            case 'SKELETON': {
                const skelBody = new THREE.Mesh(
                    new THREE.CapsuleGeometry(0.25 * scale, 0.5 * scale, 4, 8),
                    new THREE.MeshLambertMaterial({ color })
                );
                skelBody.position.y = 0.7 * scale;
                group.add(skelBody);
                const skull = new THREE.Mesh(
                    new THREE.SphereGeometry(0.22 * scale, 8, 8),
                    new THREE.MeshLambertMaterial({ color: 0xeeeecc })
                );
                skull.position.y = 1.2 * scale;
                group.add(skull);
                const skelSword = new THREE.Mesh(
                    new THREE.BoxGeometry(0.06 * scale, 0.7 * scale, 0.03 * scale),
                    new THREE.MeshLambertMaterial({ color: 0x888899 })
                );
                skelSword.position.set(0.4 * scale, 0.8 * scale, 0);
                skelSword.rotation.z = -0.3;
                group.add(skelSword);
                break;
            }
            case 'DRAGON': {
                const dragonScale = scale * 2;
                const dragonBody = new THREE.Mesh(
                    new THREE.CapsuleGeometry(0.6 * dragonScale, 1.0 * dragonScale, 4, 8),
                    new THREE.MeshLambertMaterial({ color })
                );
                dragonBody.position.y = 1.2 * dragonScale;
                dragonBody.rotation.x = 0.3;
                group.add(dragonBody);
                const dragonHead = new THREE.Mesh(
                    new THREE.SphereGeometry(0.5 * dragonScale, 8, 8),
                    new THREE.MeshLambertMaterial({ color: 0xdd4444 })
                );
                dragonHead.position.set(0, 2.0 * dragonScale, -0.5 * dragonScale);
                group.add(dragonHead);
                const wingGeo = new THREE.PlaneGeometry(1.5 * dragonScale, 0.8 * dragonScale);
                const wingMat = new THREE.MeshLambertMaterial({ color: 0xaa2222, side: THREE.DoubleSide });
                const leftWing = new THREE.Mesh(wingGeo, wingMat);
                leftWing.position.set(-1.0 * dragonScale, 1.5 * dragonScale, 0);
                leftWing.rotation.z = 0.5;
                group.add(leftWing);
                const rightWing = new THREE.Mesh(wingGeo, wingMat);
                rightWing.position.set(1.0 * dragonScale, 1.5 * dragonScale, 0);
                rightWing.rotation.z = -0.5;
                group.add(rightWing);
                break;
            }
            default: {
                const genericBody = new THREE.Mesh(
                    new THREE.CapsuleGeometry(0.3 * scale, 0.6 * scale, 4, 8),
                    new THREE.MeshLambertMaterial({ color })
                );
                genericBody.position.y = 0.8 * scale;
                group.add(genericBody);
                const genericHead = new THREE.Mesh(
                    new THREE.SphereGeometry(0.25 * scale, 8, 8),
                    new THREE.MeshLambertMaterial({ color: 0xffccaa })
                );
                genericHead.position.y = 1.35 * scale;
                group.add(genericHead);
                break;
            }
        }

        group.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        return group;
    }

    static createEnvironmentPlaceholder(type, options = {}) {
        const group = new THREE.Group();
        const scale = options.scale || 1;

        switch (type) {
            case 'tree': {
                const trunk = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.15 * scale, 0.2 * scale, 1.5 * scale),
                    new THREE.MeshLambertMaterial({ color: 0x664422 })
                );
                trunk.position.y = 0.75 * scale;
                group.add(trunk);
                const leaves = new THREE.Mesh(
                    new THREE.SphereGeometry(0.8 * scale, 6, 6),
                    new THREE.MeshLambertMaterial({ color: 0x228833 })
                );
                leaves.position.y = 2.0 * scale;
                group.add(leaves);
                break;
            }
            case 'rock': {
                const rock = new THREE.Mesh(
                    new THREE.DodecahedronGeometry(0.5 * scale, 0),
                    new THREE.MeshLambertMaterial({ color: 0x777766 })
                );
                rock.position.y = 0.3 * scale;
                rock.rotation.set(0.2, 0.5, 0.1);
                group.add(rock);
                break;
            }
            case 'house': {
                const walls = new THREE.Mesh(
                    new THREE.BoxGeometry(2 * scale, 1.5 * scale, 2 * scale),
                    new THREE.MeshLambertMaterial({ color: 0xaa9977 })
                );
                walls.position.y = 0.75 * scale;
                group.add(walls);
                const roof = new THREE.Mesh(
                    new THREE.ConeGeometry(1.6 * scale, 1.0 * scale, 4),
                    new THREE.MeshLambertMaterial({ color: 0x993322 })
                );
                roof.position.y = 2.0 * scale;
                roof.rotation.y = Math.PI / 4;
                group.add(roof);
                break;
            }
            case 'chest': {
                const chestBox = new THREE.Mesh(
                    new THREE.BoxGeometry(0.6 * scale, 0.4 * scale, 0.4 * scale),
                    new THREE.MeshLambertMaterial({ color: 0x886633 })
                );
                chestBox.position.y = 0.2 * scale;
                group.add(chestBox);
                const lid = new THREE.Mesh(
                    new THREE.BoxGeometry(0.62 * scale, 0.1 * scale, 0.42 * scale),
                    new THREE.MeshLambertMaterial({ color: 0xccaa44 })
                );
                lid.position.y = 0.45 * scale;
                group.add(lid);
                break;
            }
            case 'pillar': {
                const pillar = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.3 * scale, 0.35 * scale, 3 * scale, 8),
                    new THREE.MeshLambertMaterial({ color: 0x998877 })
                );
                pillar.position.y = 1.5 * scale;
                group.add(pillar);
                break;
            }
            case 'door': {
                const doorFrame = new THREE.Mesh(
                    new THREE.BoxGeometry(1.5 * scale, 2.5 * scale, 0.2 * scale),
                    new THREE.MeshLambertMaterial({ color: 0x554433 })
                );
                doorFrame.position.y = 1.25 * scale;
                group.add(doorFrame);
                break;
            }
            default: {
                const box = new THREE.Mesh(
                    new THREE.BoxGeometry(scale, scale, scale),
                    new THREE.MeshLambertMaterial({ color: 0x888888 })
                );
                box.position.y = scale / 2;
                group.add(box);
            }
        }

        group.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        return group;
    }
}
