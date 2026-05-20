import * as THREE from 'three';

function createGlowMaterial(color, opacity = 0.6) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
}

export class RaceEffects {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'RaceEffects';

    this.sparkGeometry = new THREE.BoxGeometry(0.08, 0.08, 0.6);
    this.particleGeometry = new THREE.SphereGeometry(0.16, 8, 8);
    this.ringGeometry = new THREE.RingGeometry(0.8, 1.2, 24);
    this.shellGeometry = new THREE.SphereGeometry(1.8, 16, 16);

    this.particles = [];
    this.rings = [];
    this.shells = [];
  }

  clear() {
    for (const particle of this.particles) {
      particle.mesh.removeFromParent();
    }

    for (const ring of this.rings) {
      ring.mesh.removeFromParent();
    }

    for (const shell of this.shells) {
      shell.mesh.removeFromParent();
    }

    this.particles = [];
    this.rings = [];
    this.shells = [];
  }

  spawnBurst({
    position,
    direction = new THREE.Vector3(0, 0, 1),
    color = 0x7feeff,
    count = 10,
    speed = 20,
    spread = 0.8,
    life = 0.4,
    spark = false
  }) {
    const normal = direction.clone().normalize();

    for (let index = 0; index < count; index += 1) {
      const material = createGlowMaterial(color, spark ? 0.72 : 0.58);
      const mesh = new THREE.Mesh(
        spark ? this.sparkGeometry : this.particleGeometry,
        material
      );
      const velocity = normal.clone().multiplyScalar(speed * (0.7 + Math.random() * 0.6));
      velocity.x += (Math.random() * 2 - 1) * speed * spread;
      velocity.y += (Math.random() * 2 - 1) * speed * spread * 0.6;
      velocity.z += (Math.random() * 2 - 1) * speed * spread;
      mesh.position.copy(position);
      mesh.lookAt(position.clone().add(velocity));
      this.group.add(mesh);
      this.particles.push({
        mesh,
        material,
        velocity,
        drag: spark ? 2.8 : 4.2,
        gravity: spark ? 8 : 3.4,
        life,
        maxLife: life
      });
    }
  }

  spawnRing({
    position,
    color = 0x7feeff,
    life = 0.5,
    growth = 6,
    rotationX = -Math.PI / 2,
    yOffset = 0
  }) {
    const material = createGlowMaterial(color, 0.42);
    const mesh = new THREE.Mesh(this.ringGeometry, material);
    mesh.rotation.x = rotationX;
    mesh.position.copy(position);
    mesh.position.y += yOffset;
    this.group.add(mesh);
    this.rings.push({
      mesh,
      material,
      life,
      maxLife: life,
      growth
    });
  }

  spawnShieldShell(ship, color = 0x6cf6ff) {
    const material = createGlowMaterial(color, 0.28);
    const mesh = new THREE.Mesh(this.shellGeometry, material);
    mesh.position.copy(ship.root.position);
    this.group.add(mesh);
    this.shells.push({
      mesh,
      material,
      target: ship,
      life: 0.55,
      maxLife: 0.55,
      scale: 2.1
    });
  }

  spawnEmpWave(ship, color = 0x8dc2ff) {
    this.spawnRing({
      position: ship.root.position,
      color,
      life: 0.7,
      growth: 10,
      yOffset: -1.2
    });
    this.spawnBurst({
      position: ship.root.position.clone().setY(ship.root.position.y + 0.3),
      direction: new THREE.Vector3(0, 0.2, 1),
      color,
      count: 12,
      speed: 12,
      spread: 1.2,
      life: 0.36
    });
  }

  spawnGravityGlitch(ship, color = 0xca7cff) {
    this.spawnRing({
      position: ship.root.position,
      color,
      life: 0.82,
      growth: 7.5,
      rotationX: 0
    });
    this.spawnShieldShell(ship, color);
  }

  spawnMissileLock(target, color = 0xff6c6c) {
    this.spawnRing({
      position: target.root.position,
      color,
      life: 0.42,
      growth: 3.4,
      yOffset: 0.6
    });
  }

  spawnLaunchFlash(ship, color = ship?.config?.glow ?? 0x7feeff) {
    const position = ship.root.position.clone().add(new THREE.Vector3(0, 0, 3.2).applyQuaternion(ship.root.quaternion));
    this.spawnRing({
      position,
      color,
      life: 0.32,
      growth: 5.4
    });
    this.spawnBurst({
      position,
      direction: ship.getForward(new THREE.Vector3()).multiplyScalar(-1),
      color,
      count: 18,
      speed: 24,
      spread: 0.7,
      life: 0.34,
      spark: true
    });
  }

  spawnBoostBurst(ship, color = ship?.config?.trailColor ?? 0x6bd7ff) {
    const direction = ship.getForward(new THREE.Vector3()).multiplyScalar(-1);
    const position = ship.root.position.clone().add(direction.clone().multiplyScalar(2.2));
    this.spawnBurst({
      position,
      direction,
      color,
      count: 14,
      speed: 22,
      spread: 0.55,
      life: 0.3
    });
    this.spawnRing({
      position,
      color,
      life: 0.24,
      growth: 4.2
    });
  }

  spawnDriftScrape(ship, intensity = 1, color = 0xffd37c) {
    const direction = ship.getForward(new THREE.Vector3()).multiplyScalar(-1);
    const edgeOffset = Math.sign(ship.lateralOffset || 1) * 1.8;
    const position = ship.root.position.clone().add(new THREE.Vector3(edgeOffset, -1.1, 0));
    this.spawnBurst({
      position,
      direction,
      color,
      count: Math.round(4 + intensity * 3),
      speed: 10 + intensity * 4,
      spread: 0.35,
      life: 0.2,
      spark: true
    });
  }

  spawnImpact(ship, color = 0xffa167, intensity = 1) {
    this.spawnRing({
      position: ship.root.position,
      color,
      life: 0.22 + intensity * 0.12,
      growth: 4.8 + intensity * 1.8,
      yOffset: -0.6
    });
    this.spawnBurst({
      position: ship.root.position.clone(),
      direction: ship.getForward(new THREE.Vector3()),
      color,
      count: Math.round(6 + intensity * 6),
      speed: 8 + intensity * 6,
      spread: 1.1,
      life: 0.28 + intensity * 0.08
    });
  }

  update(deltaTime, time, graphics = {}) {
    const particlesEnabled = graphics.particles !== false;

    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      const particle = this.particles[index];
      particle.life -= deltaTime;

      if (particle.life <= 0 || !particlesEnabled) {
        particle.mesh.removeFromParent();
        this.particles.splice(index, 1);
        continue;
      }

      particle.velocity.multiplyScalar(Math.exp(-deltaTime * particle.drag));
      particle.velocity.y -= particle.gravity * deltaTime;
      particle.mesh.position.addScaledVector(particle.velocity, deltaTime);
      particle.material.opacity = (particle.life / particle.maxLife) * 0.72;
      particle.mesh.scale.setScalar(0.8 + (particle.life / particle.maxLife) * 0.4);
    }

    for (let index = this.rings.length - 1; index >= 0; index -= 1) {
      const ring = this.rings[index];
      ring.life -= deltaTime;

      if (ring.life <= 0 || !particlesEnabled) {
        ring.mesh.removeFromParent();
        this.rings.splice(index, 1);
        continue;
      }

      const alpha = ring.life / ring.maxLife;
      const scale = 1 + (1 - alpha) * ring.growth;
      ring.mesh.scale.setScalar(scale);
      ring.material.opacity = alpha * 0.42;
      ring.mesh.rotation.z += deltaTime * 0.8;
    }

    for (let index = this.shells.length - 1; index >= 0; index -= 1) {
      const shell = this.shells[index];
      shell.life -= deltaTime;

      if (shell.life <= 0 || !particlesEnabled) {
        shell.mesh.removeFromParent();
        this.shells.splice(index, 1);
        continue;
      }

      if (shell.target) {
        shell.mesh.position.copy(shell.target.root.position);
      }

      const alpha = shell.life / shell.maxLife;
      const pulse = 1 + Math.sin(time * 12 + index) * 0.05;
      shell.mesh.scale.setScalar((shell.scale + (1 - alpha) * 1.3) * pulse);
      shell.material.opacity = alpha * 0.22;
    }
  }
}
