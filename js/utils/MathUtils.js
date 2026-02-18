// Dragon Nest Lite - Math Utilities
import * as THREE from 'three';

export class MathUtils {
    static clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    static lerp(a, b, t) {
        return a + (b - a) * t;
    }

    static lerpVector3(out, a, b, t) {
        out.x = this.lerp(a.x, b.x, t);
        out.y = this.lerp(a.y, b.y, t);
        out.z = this.lerp(a.z, b.z, t);
        return out;
    }

    static distanceXZ(a, b) {
        const dx = a.x - b.x;
        const dz = a.z - b.z;
        return Math.sqrt(dx * dx + dz * dz);
    }

    static angleBetweenXZ(from, to) {
        return Math.atan2(to.x - from.x, to.z - from.z);
    }

    static randomRange(min, max) {
        return min + Math.random() * (max - min);
    }

    static randomInt(min, max) {
        return Math.floor(this.randomRange(min, max + 1));
    }

    static isInCone(origin, direction, target, angle, range) {
        // Project onto XZ plane to avoid Y-position mismatch
        const toTarget = new THREE.Vector3(target.x - origin.x, 0, target.z - origin.z);
        const dist = toTarget.length();
        if (dist > range) return false;
        if (dist < 0.001) return true; // on top of origin

        toTarget.normalize();
        const dirXZ = new THREE.Vector3(direction.x, 0, direction.z).normalize();
        const dot = dirXZ.dot(toTarget);
        const halfAngle = (angle * Math.PI) / 360;
        return dot >= Math.cos(halfAngle);
    }

    static isInCircle(origin, target, range) {
        return this.distanceXZ(origin, target) <= range;
    }

    static isInLine(origin, direction, target, range, width = 1) {
        // Project onto XZ plane
        const toTarget = new THREE.Vector3(target.x - origin.x, 0, target.z - origin.z);
        const dirXZ = new THREE.Vector3(direction.x, 0, direction.z).normalize();
        const dot = toTarget.dot(dirXZ);
        if (dot < 0 || dot > range) return false;

        const projected = dirXZ.clone().multiplyScalar(dot);
        const perpDist = toTarget.sub(projected).length();
        return perpDist <= width;
    }

    static damageVariance() {
        return 0.9 + Math.random() * 0.2;
    }
}
