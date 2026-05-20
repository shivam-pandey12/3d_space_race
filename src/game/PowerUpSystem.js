import * as THREE from 'three';

const ITEM_DEFS = {
  'speed-burst': {
    label: 'Speed Burst',
    color: 0xffb248
  },
  shield: {
    label: 'Shield',
    color: 0x6cf6ff
  },
  emp: {
    label: 'EMP Blast',
    color: 0x8dc2ff
  },
  missile: {
    label: 'Missile',
    color: 0xff6c6c
  },
  'gravity-glitch': {
    label: 'Gravity Glitch',
    color: 0xca7cff
  }
};

const ITEM_TYPES = Object.keys(ITEM_DEFS);

export class PowerUpSystem {
  constructor(track, callbacks = {}) {
    this.track = track;
    this.callbacks = callbacks;
    this.group = new THREE.Group();
    this.group.name = 'PowerUpSystem';

    this.pickups = [];
    this.projectiles = [];
    this.pulses = [];
    this.tempFrame = this.track.createFrameState();
    this.tempTargetPosition = new THREE.Vector3();
    this.tempDirection = new THREE.Vector3();
    this.pulseGeometry = new THREE.RingGeometry(1.8, 2.4, 32);

    this.createPickups();
  }

  getItemLabel(itemType) {
    return itemType ? ITEM_DEFS[itemType].label : 'Empty';
  }

  getItemColor(itemType) {
    return ITEM_DEFS[itemType].color;
  }

  createPickups() {
    for (let index = 0; index < this.track.pickupSpawns.length; index += 1) {
      const spawn = this.track.pickupSpawns[index];
      const pickup = this.createPickup(spawn, index);
      this.pickups.push(pickup);
      this.group.add(pickup.mesh);
    }
  }

  createPickup(spawn, index) {
    const mesh = new THREE.Group();
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.92
    });
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.48
    });

    const core = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.15, 0),
      coreMaterial
    );
    mesh.add(core);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.9, 0.16, 10, 32),
      ringMaterial
    );
    ring.rotation.x = Math.PI / 2;
    mesh.add(ring);

    const pickup = {
      spawn,
      mesh,
      core,
      ring,
      coreMaterial,
      ringMaterial,
      active: true,
      itemType: this.randomItem(),
      respawnTimer: 0,
      bobPhase: index * 1.37,
      rotationSpeed: 0.9 + index * 0.08
    };

    this.setPickupType(pickup, pickup.itemType);
    return pickup;
  }

  randomItem() {
    return ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
  }

  setPickupType(pickup, itemType) {
    pickup.itemType = itemType;
    pickup.coreMaterial.color.setHex(ITEM_DEFS[itemType].color);
    pickup.ringMaterial.color.setHex(ITEM_DEFS[itemType].color);
  }

  update(deltaTime, time) {
    this.updatePickups(deltaTime, time);
    this.updateProjectiles(deltaTime);
    this.updatePulses(deltaTime);
  }

  updatePickups(deltaTime, time) {
    for (const pickup of this.pickups) {
      if (pickup.active) {
        this.track.getFrame(pickup.spawn.progress, this.tempFrame);
        pickup.mesh.position.copy(this.tempFrame.point)
          .addScaledVector(this.tempFrame.right, pickup.spawn.laneOffset)
          .addScaledVector(this.tempFrame.up, this.track.hoverHeight + 2.4 + Math.sin(time * 2.6 + pickup.bobPhase) * 0.35);
        pickup.mesh.rotation.y += deltaTime * pickup.rotationSpeed;
        pickup.mesh.rotation.z = Math.sin(time * 1.8 + pickup.bobPhase) * 0.22;
        pickup.mesh.visible = true;
      } else {
        pickup.respawnTimer -= deltaTime;

        if (pickup.respawnTimer <= 0) {
          pickup.active = true;
          this.setPickupType(pickup, this.randomItem());
        }

        pickup.mesh.visible = false;
      }
    }
  }

  updateProjectiles(deltaTime) {
    for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
      const projectile = this.projectiles[index];

      if (!projectile.target) {
        projectile.mesh.removeFromParent();
        this.projectiles.splice(index, 1);
        continue;
      }

      projectile.life -= deltaTime;

      const targetPosition = projectile.target.getPosition(this.tempTargetPosition);
      const direction = this.tempDirection.copy(targetPosition).sub(projectile.mesh.position);
      const distance = direction.length();

      if (distance < 2.8 || projectile.life <= 0) {
        if (projectile.target.applyMissileHit()) {
          this.spawnPulse(projectile.target.root.position, 0xff6c6c, 5.6);
          this.callbacks.onEvent?.('missile-impact', {
            user: projectile.user,
            target: projectile.target
          });
        }

        projectile.mesh.removeFromParent();
        this.projectiles.splice(index, 1);
        continue;
      }

      direction.normalize();
      projectile.mesh.position.addScaledVector(direction, projectile.speed * deltaTime);
      projectile.mesh.lookAt(projectile.target.root.position);
    }
  }

  updatePulses(deltaTime) {
    for (let index = this.pulses.length - 1; index >= 0; index -= 1) {
      const pulse = this.pulses[index];
      pulse.life -= deltaTime;

      if (pulse.life <= 0) {
        pulse.mesh.removeFromParent();
        this.pulses.splice(index, 1);
        continue;
      }

      const alpha = pulse.life / pulse.maxLife;
      const scale = 1 + (1 - alpha) * pulse.growth;
      pulse.mesh.scale.setScalar(scale);
      pulse.material.opacity = alpha * 0.45;
    }
  }

  spawnPulse(position, color, growth = 4.4) {
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(
      this.pulseGeometry,
      material
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(position).setY(position.y - 1.4);

    this.group.add(mesh);
    this.pulses.push({
      mesh,
      material,
      life: 0.7,
      maxLife: 0.7,
      growth
    });
  }

  spawnMissile(user, target) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 12, 12),
      new THREE.MeshBasicMaterial({
        color: ITEM_DEFS.missile.color
      })
    );
    mesh.position.copy(user.root.position);
    this.group.add(mesh);
    this.projectiles.push({
      mesh,
      user,
      target,
      speed: 115,
      life: 2.3
    });
  }

  checkPickupCollection(ship) {
    for (const pickup of this.pickups) {
      if (!pickup.active) {
        continue;
      }

      if (ship.root.position.distanceTo(pickup.mesh.position) < 4.8) {
        pickup.active = false;
        pickup.respawnTimer = 6 + Math.random() * 3;

        if (ship.giveItem(pickup.itemType)) {
          this.callbacks.onEvent?.('pickup', {
            ship,
            kind: 'item',
            itemType: pickup.itemType
          });
          return {
            type: 'item',
            itemType: pickup.itemType,
            label: ITEM_DEFS[pickup.itemType].label
          };
        }

        ship.addBoostEnergy(12);
        this.callbacks.onEvent?.('pickup', {
          ship,
          kind: 'energy',
          itemType: pickup.itemType
        });
        return {
          type: 'energy',
          label: `${ITEM_DEFS[pickup.itemType].label} converted to boost`
        };
      }
    }

    return null;
  }

  findTargetAhead(user, racers, maxGap = 0.12) {
    let target = null;
    let smallestGap = Number.POSITIVE_INFINITY;

    for (const rival of racers) {
      if (rival === user) {
        continue;
      }

      const gap = rival.distance - user.distance;

      if (gap > 0 && gap < maxGap && gap < smallestGap) {
        smallestGap = gap;
        target = rival;
      }
    }

    return target;
  }

  useItem(user, racers) {
    const itemType = user.consumeItem();

    if (!itemType) {
      return null;
    }

    if (itemType === 'speed-burst') {
      user.activateBurst(1.55, 24, 2.1);
      user.addBoostEnergy(8);
      this.spawnPulse(user.root.position, ITEM_DEFS[itemType].color, 4.8);
      this.callbacks.onEvent?.('use-item', { itemType, user });
      return { message: 'Speed Burst!' };
    }

    if (itemType === 'shield') {
      user.activateShield(6);
      this.spawnPulse(user.root.position, ITEM_DEFS[itemType].color, 4.2);
      this.callbacks.onEvent?.('use-item', { itemType, user });
      return { message: 'Shield Online' };
    }

    if (itemType === 'emp') {
      let affectedCount = 0;

      for (const rival of racers) {
        if (rival === user) {
          continue;
        }

        if (rival.root.position.distanceTo(user.root.position) < 24 && rival.applyEmp(2.8, 0.72)) {
          affectedCount += 1;
        }
      }

      this.spawnPulse(user.root.position, ITEM_DEFS[itemType].color, 6.2);
      this.callbacks.onEvent?.('use-item', { itemType, user, affectedCount });
      return { message: affectedCount > 0 ? `EMP Hit x${affectedCount}` : 'EMP Burst' };
    }

    if (itemType === 'missile') {
      const target = this.findTargetAhead(user, racers);

      if (!target) {
        user.giveItem(itemType);
        return null;
      }

      this.spawnMissile(user, target);
      this.callbacks.onEvent?.('use-item', { itemType, user, target });
      return { message: 'Missile Away' };
    }

    if (itemType === 'gravity-glitch') {
      const target = this.findTargetAhead(user, racers, 0.09);

      if (!target) {
        user.giveItem(itemType);
        return null;
      }

      if (target.applyGravityGlitch(3.4)) {
        this.spawnPulse(target.root.position, ITEM_DEFS[itemType].color, 5.4);
      }

      this.callbacks.onEvent?.('use-item', { itemType, user, target });
      return { message: 'Gravity Glitch' };
    }

    return null;
  }
}
