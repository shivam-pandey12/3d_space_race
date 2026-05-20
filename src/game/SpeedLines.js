import * as THREE from 'three';

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

export class SpeedLines {
  constructor(count = 64) {
    this.group = new THREE.Group();
    this.group.name = 'SpeedLines';
    this.group.visible = false;

    this.positions = new Float32Array(count * 6);
    this.colors = new Float32Array(count * 6);
    this.lines = Array.from({ length: count }, () => this.createLine());
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    this.material = new THREE.LineBasicMaterial({
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
      toneMapped: false
    });

    this.mesh = new THREE.LineSegments(this.geometry, this.material);
    this.mesh.frustumCulled = false;
    this.group.add(this.mesh);

    this.opacity = 0;
    this.seedLines(true);
  }

  createLine() {
    return {
      angle: 0,
      radius: 0,
      depth: 0,
      length: 0,
      drift: 0,
      color: new THREE.Color()
    };
  }

  seedLines(initial = false) {
    for (const line of this.lines) {
      this.resetLine(line, initial);
    }

    this.writeGeometry(0.45, false);
  }

  resetLine(line, initial = false) {
    line.angle = Math.random() * Math.PI * 2;
    line.radius = randomRange(3.4, 10.8);
    line.depth = initial ? randomRange(-78, -12) : randomRange(-92, -66);
    line.length = randomRange(4.5, 12);
    line.drift = randomRange(0.82, 1.28);

    const mix = Math.random();
    line.color.setRGB(
      0.72 + mix * 0.26,
      0.86 + mix * 0.12,
      1
    );
  }

  update(deltaTime, camera, ship, active) {
    this.group.position.copy(camera.position);
    this.group.quaternion.copy(camera.quaternion);

    if (!active || !ship) {
      this.opacity = THREE.MathUtils.lerp(this.opacity, 0, 1 - Math.exp(-deltaTime * 4));
      this.material.opacity = this.opacity;
      this.group.visible = this.opacity > 0.01;
      return;
    }

    const speedRatio = ship.getSpeedRatio();
    const targetOpacity =
      THREE.MathUtils.clamp((speedRatio - 0.4) / 0.6, 0, 1) * 0.5 +
      (ship.boosting ? 0.18 : 0) +
      (ship.surgeTimer > 0 ? 0.08 : 0);

    this.opacity = THREE.MathUtils.lerp(
      this.opacity,
      targetOpacity,
      1 - Math.exp(-deltaTime * (targetOpacity > this.opacity ? 7 : 3.2))
    );
    this.material.opacity = this.opacity;
    this.group.visible = this.opacity > 0.01;

    if (!this.group.visible) {
      return;
    }

    const travelSpeed =
      28 +
      speedRatio * 210 +
      (ship.boosting ? 120 : 0) +
      (ship.surgeTimer > 0 ? 55 : 0);

    for (const line of this.lines) {
      line.depth += travelSpeed * line.drift * deltaTime;
      line.angle += deltaTime * 0.08 * line.drift;

      if (line.depth > -4) {
        this.resetLine(line, false);
      }
    }

    this.writeGeometry(speedRatio, ship.boosting);
  }

  writeGeometry(speedRatio, boosting) {
    for (let index = 0; index < this.lines.length; index += 1) {
      const line = this.lines[index];
      const base = index * 6;
      const radiusScale = boosting ? 1.08 : 1;
      const x = Math.cos(line.angle) * line.radius * 1.18 * radiusScale;
      const y = Math.sin(line.angle) * line.radius * 0.72 * radiusScale;
      const length = line.length * (0.9 + speedRatio * 1.25 + (boosting ? 0.42 : 0));

      this.positions[base] = x;
      this.positions[base + 1] = y;
      this.positions[base + 2] = line.depth;
      this.positions[base + 3] = x;
      this.positions[base + 4] = y;
      this.positions[base + 5] = line.depth + length;

      this.colors[base] = line.color.r * 0.85;
      this.colors[base + 1] = line.color.g * 0.88;
      this.colors[base + 2] = line.color.b;
      this.colors[base + 3] = line.color.r;
      this.colors[base + 4] = line.color.g;
      this.colors[base + 5] = line.color.b;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
