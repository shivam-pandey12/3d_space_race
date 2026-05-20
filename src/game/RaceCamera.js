import * as THREE from 'three';

function smoothstep(value) {
  return value * value * (3 - 2 * value);
}

function easeInOutCubic(value) {
  if (value < 0.5) {
    return 4 * value * value * value;
  }

  return 1 - ((-2 * value + 2) ** 3) / 2;
}

export class RaceCamera {
  constructor(camera) {
    this.camera = camera;
    this.elapsed = 0;
    this.previousSpeed = 0;
    this.wasBoosting = false;
    this.shakeStrength = 0;
    this.shakeTarget = new THREE.Vector3();
    this.shakeCurrent = new THREE.Vector3();
    this.shakeRetargetTimer = 0;
    this.boostBurst = 0;

    this.currentPosition = new THREE.Vector3();
    this.currentLookAt = new THREE.Vector3();
    this.targetPosition = new THREE.Vector3();
    this.targetLookAt = new THREE.Vector3();
    this.followPosition = new THREE.Vector3();
    this.followLookAt = new THREE.Vector3();
    this.localOffset = new THREE.Vector3();
    this.forward = new THREE.Vector3();
    this.shakeOffset = new THREE.Vector3();

    this.frameA = {
      point: new THREE.Vector3(),
      tangent: new THREE.Vector3(),
      right: new THREE.Vector3(),
      up: new THREE.Vector3()
    };
    this.frameB = {
      point: new THREE.Vector3(),
      tangent: new THREE.Vector3(),
      right: new THREE.Vector3(),
      up: new THREE.Vector3()
    };
    this.graphicsSettings = {
      cameraShake: true
    };
  }

  setGraphicsSettings(settings = {}) {
    this.graphicsSettings = {
      ...this.graphicsSettings,
      ...settings
    };
  }

  triggerPunch(strength = 0.08, boostBurst = 0.18) {
    if (this.graphicsSettings.cameraShake === false) {
      return;
    }

    this.shakeStrength = Math.max(this.shakeStrength, strength);
    this.boostBurst = Math.max(this.boostBurst, boostBurst);
  }

  snapBehind(ship) {
    this.computeFollowTargets(ship, this.followPosition, this.followLookAt, 0.88);
    this.currentPosition.copy(this.followPosition);
    this.currentLookAt.copy(this.followLookAt);
    this.previousSpeed = ship.speed;
    this.wasBoosting = ship.boosting;
    this.shakeStrength = 0;
    this.shakeCurrent.set(0, 0, 0);
    this.shakeTarget.set(0, 0, 0);
    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentLookAt);
  }

  snapShowcase(track, ship, orbitOffset = 0) {
    this.computeShowcaseTargets(track, ship, this.elapsed + orbitOffset, this.followPosition, this.followLookAt);
    this.currentPosition.copy(this.followPosition);
    this.currentLookAt.copy(this.followLookAt);
    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentLookAt);
  }

  updateShowcase(deltaTime, time, track, ship, orbitOffset = 0) {
    this.elapsed += deltaTime;
    this.resetShake(ship);
    this.computeShowcaseTargets(track, ship, time * 0.55 + orbitOffset * Math.PI * 2, this.followPosition, this.followLookAt);
    this.targetPosition.copy(this.followPosition);
    this.targetLookAt.copy(this.followLookAt);
    this.apply(deltaTime, 1 - Math.exp(-deltaTime * 3.4), 52, 0);
  }

  updateIntro(deltaTime, time, track, ship, alpha) {
    this.elapsed += deltaTime;
    this.resetShake(ship);

    const flyAlpha = Math.min(alpha / 0.74, 1);
    const cinematicProgress = THREE.MathUtils.euclideanModulo(
      0.05 + easeInOutCubic(flyAlpha) * 0.9,
      1
    );

    track.getFrame(cinematicProgress, this.frameA);
    track.getFrame(cinematicProgress + 0.035, this.frameB);

    this.targetPosition.copy(this.frameA.point)
      .addScaledVector(this.frameA.right, 18 + Math.sin(time * 0.5) * 7)
      .addScaledVector(this.frameA.up, 10 + Math.cos(time * 0.35) * 2.4)
      .addScaledVector(this.frameA.tangent, -16);
    this.targetLookAt.copy(this.frameB.point).addScaledVector(this.frameB.up, 2.4);

    if (alpha > 0.68) {
      const blend = smoothstep((alpha - 0.68) / 0.32);
      this.computeFollowTargets(ship, this.followPosition, this.followLookAt, 0.82);
      this.targetPosition.lerp(this.followPosition, blend);
      this.targetLookAt.lerp(this.followLookAt, blend);
    }

    this.apply(deltaTime, 1 - Math.exp(-deltaTime * 2.8), 56, 0);
  }

  updateCountdown(deltaTime, ship) {
    this.elapsed += deltaTime;
    this.resetShake(ship);
    this.computeFollowTargets(ship, this.followPosition, this.followLookAt, 0.86);
    this.targetPosition.copy(this.followPosition);
    this.targetLookAt.copy(this.followLookAt);
    this.apply(deltaTime, 1 - Math.exp(-deltaTime * 5.2), 60 + ship.getSpeedRatio() * 3, 0);
  }

  updateRace(deltaTime, ship) {
    this.elapsed += deltaTime;
    const speedRatio = ship.getSpeedRatio();
    const speedDelta = ship.speed - this.previousSpeed;
    const positiveAcceleration = THREE.MathUtils.clamp(
      Math.max(0, speedDelta) / Math.max(1, ship.config.acceleration * deltaTime * 1.8),
      0,
      1
    );

    if (ship.boosting && !this.wasBoosting) {
      this.boostBurst = 1;
    }

    this.previousSpeed = ship.speed;
    this.wasBoosting = ship.boosting;
    this.boostBurst = Math.max(0, this.boostBurst - deltaTime * 2.6);

    const targetShakeStrength =
      this.graphicsSettings.cameraShake === false
        ? 0
        : Math.max(0, speedRatio - 0.36) * 0.12 +
          positiveAcceleration * 0.085 +
          (ship.boosting ? 0.075 : 0) +
          this.boostBurst * 0.11 +
          ship.trackStrain * 0.18 +
          ship.nearMissFlash * 0.18 +
          ship.hazardFlashTimer * 0.18 +
          ship.impactFlashTimer * 0.22;
    const shakeBlend = 1 - Math.exp(-deltaTime * (targetShakeStrength > this.shakeStrength ? 9 : 3.4));
    this.shakeStrength = THREE.MathUtils.lerp(this.shakeStrength, targetShakeStrength, shakeBlend);

    const targetFov =
      60 +
      speedRatio * 13 +
      positiveAcceleration * 1.8 +
      (ship.boosting ? 7.2 : 0) +
      this.boostBurst * 4.4 +
      (ship.surgeTimer > 0 ? 3.4 : 0);

    this.computeFollowTargets(ship, this.followPosition, this.followLookAt, 1);
    this.targetPosition.copy(this.followPosition);
    this.targetLookAt.copy(this.followLookAt);

    this.apply(deltaTime, 1 - Math.exp(-deltaTime * 6), targetFov, this.shakeStrength);
  }

  computeShowcaseTargets(track, ship, orbitPhase, targetPosition, targetLookAt) {
    track.getFrame(ship.progress + 0.012, this.frameA);
    track.getFrame(ship.progress + 0.06, this.frameB);

    const orbitRadius = 15.5 + Math.sin(orbitPhase * 0.6) * 2.4;
    const lateral = Math.sin(orbitPhase) * orbitRadius;
    const trailing = -11.5 - Math.cos(orbitPhase) * 4.8;
    const height = 6.6 + Math.cos(orbitPhase * 1.3) * 1.2;

    targetPosition.copy(this.frameA.point)
      .addScaledVector(this.frameA.right, lateral)
      .addScaledVector(this.frameA.up, height)
      .addScaledVector(this.frameA.tangent, trailing);
    targetLookAt.copy(ship.root.position)
      .lerp(this.frameB.point, 0.32)
      .addScaledVector(this.frameA.up, 1.8);
  }

  computeFollowTargets(ship, targetPosition, targetLookAt, distanceScale) {
    const speedRatio = ship.getSpeedRatio();
    ship.getForward(this.forward);

    this.localOffset.set(
      0,
      5.8 + speedRatio * 2.2 + (ship.boosting ? 0.5 : 0),
      -(12.8 + speedRatio * 5 + (ship.boosting ? 3.2 : 0)) * distanceScale
    );

    targetPosition.copy(this.localOffset)
      .applyQuaternion(ship.root.quaternion)
      .add(ship.root.position);
    targetLookAt.copy(ship.root.position)
      .addScaledVector(this.forward, 11 + speedRatio * 8.5 + (ship.boosting ? 3.4 : 0));
    targetLookAt.y += 1.3;
  }

  resetShake(ship) {
    this.previousSpeed = ship.speed;
    this.wasBoosting = ship.boosting;
    this.boostBurst = Math.max(0, this.boostBurst - 0.06);
    this.shakeStrength = THREE.MathUtils.lerp(this.shakeStrength, 0, 0.22);
    this.shakeTarget.set(0, 0, 0);
  }

  apply(deltaTime, smoothing, fov, shakeStrength) {
    this.currentPosition.lerp(this.targetPosition, smoothing);
    this.currentLookAt.lerp(this.targetLookAt, smoothing);

    this.shakeRetargetTimer -= deltaTime;

    if (this.shakeRetargetTimer <= 0) {
      this.shakeRetargetTimer = 0.045;

      if (shakeStrength > 0.001) {
        this.shakeTarget.set(
          (Math.random() * 2 - 1) * 0.7,
          (Math.random() * 2 - 1) * 0.46,
          (Math.random() * 2 - 1) * 0.54
        );
      } else {
        this.shakeTarget.set(0, 0, 0);
      }
    }

    this.shakeCurrent.lerp(this.shakeTarget, 1 - Math.exp(-deltaTime * 18));
    this.shakeOffset.copy(this.shakeCurrent).multiplyScalar(shakeStrength);

    this.camera.position.copy(this.currentPosition).add(this.shakeOffset);
    this.camera.lookAt(this.currentLookAt);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, fov, smoothing);
    this.camera.updateProjectionMatrix();
  }
}
