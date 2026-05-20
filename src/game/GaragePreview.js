import * as THREE from 'three';
import { RacingShip } from './RacingShip.js';

function disposeMaterial(material) {
  if (material && typeof material.dispose === 'function') {
    material.dispose();
  }
}

function disposeObject3D(root) {
  if (!root) {
    return;
  }

  root.traverse((object) => {
    if (object.geometry && typeof object.geometry.dispose === 'function') {
      object.geometry.dispose();
    }

    if (Array.isArray(object.material)) {
      object.material.forEach(disposeMaterial);
    } else {
      disposeMaterial(object.material);
    }
  });
}

export class GaragePreview {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.domElement.className = 'meta-ui__garage-canvas';
    this.renderer.domElement.style.touchAction = 'none';

    this.previewRoot = new THREE.Group();
    this.hangarRoot = new THREE.Group();
    this.scene.add(this.hangarRoot);
    this.scene.add(this.previewRoot);

    this.ambientLight = new THREE.AmbientLight(0xbfd7ff, 1.12);
    this.scene.add(this.ambientLight);

    this.keyLight = new THREE.DirectionalLight(0xd7f3ff, 1.6);
    this.keyLight.position.set(6, 7, 8);
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.DirectionalLight(0x7ce7ff, 1.1);
    this.rimLight.position.set(-8, 3, -5);
    this.scene.add(this.rimLight);

    this.glowLight = new THREE.PointLight(0x7ce7ff, 1.3, 30, 2);
    this.glowLight.position.set(-3.4, 0.4, 0);
    this.scene.add(this.glowLight);

    this.fillGlowLight = new THREE.PointLight(0xffc780, 0.9, 28, 2);
    this.fillGlowLight.position.set(4.5, 1.5, 3);
    this.scene.add(this.fillGlowLight);

    this.dockArms = [];
    this.drones = [];
    this.lightBands = [];
    this.buildHangarBay();

    this.ship = null;
    this.host = null;
    this.frameId = 0;
    this.lastTime = 0;
    this.lastSignature = '';
    this.lastWidth = 0;
    this.lastHeight = 0;
    this.dragging = false;
    this.activePointerId = null;
    this.lastPointerX = 0;
    this.lastPointerY = 0;
    this.rotationYaw = -0.88;
    this.rotationPitch = -0.18;
    this.spinVelocityYaw = 0;
    this.spinVelocityPitch = 0;

    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handleWheel = this.handleWheel.bind(this);
    this.loop = this.loop.bind(this);

    this.renderer.domElement.addEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.addEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.addEventListener('pointerup', this.handlePointerUp);
    this.renderer.domElement.addEventListener('pointercancel', this.handlePointerUp);
    this.renderer.domElement.addEventListener('pointerleave', this.handlePointerUp);
    this.renderer.domElement.addEventListener('wheel', this.handleWheel, { passive: false });
  }

  buildHangarBay() {
    const bayMaterial = new THREE.MeshStandardMaterial({
      color: 0x101825,
      emissive: 0x091320,
      emissiveIntensity: 0.34,
      metalness: 0.78,
      roughness: 0.18
    });
    const accentMaterial = new THREE.MeshBasicMaterial({
      color: 0x8feeff,
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(9.4, 10.8, 0.34, 36),
      bayMaterial
    );
    floor.position.set(0, -1.82, 0.4);
    this.hangarRoot.add(floor);

    const floorDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(6.2, 6.6, 0.06, 30),
      new THREE.MeshBasicMaterial({
        color: 0x9df6ff,
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    floorDisc.position.set(0, -1.62, 0.8);
    this.hangarRoot.add(floorDisc);
    this.lightBands.push({ material: floorDisc.material, baseOpacity: 0.16, speed: 1.6, phase: 0 });

    const reflectionSweep = new THREE.Mesh(
      new THREE.PlaneGeometry(11.5, 2.2),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.08,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    reflectionSweep.rotation.x = -Math.PI * 0.5;
    reflectionSweep.position.set(0, -1.58, 1.4);
    this.reflectionSweep = reflectionSweep;
    this.hangarRoot.add(reflectionSweep);

    const rearArch = new THREE.Mesh(
      new THREE.TorusGeometry(8.4, 0.24, 14, 48, Math.PI),
      bayMaterial
    );
    rearArch.position.set(0, 2.8, -4.8);
    rearArch.rotation.x = Math.PI * 0.5;
    this.hangarRoot.add(rearArch);

    const rearGlow = new THREE.Mesh(
      new THREE.TorusGeometry(8.4, 0.08, 10, 48, Math.PI),
      accentMaterial
    );
    rearGlow.position.copy(rearArch.position);
    rearGlow.rotation.copy(rearArch.rotation);
    this.hangarRoot.add(rearGlow);
    this.lightBands.push({ material: rearGlow.material, baseOpacity: 0.24, speed: 1.2, phase: 0.9 });

    for (const side of [-1, 1]) {
      const armRoot = new THREE.Group();
      armRoot.position.set(side * 5.8, 0.5, 0.6);

      const base = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 3.6, 1.8),
        bayMaterial
      );
      base.position.y = -0.4;
      armRoot.add(base);

      const armA = new THREE.Mesh(
        new THREE.BoxGeometry(0.54, 0.54, 4.8),
        bayMaterial
      );
      armA.position.set(side * -0.6, 1.8, 0.4);
      armA.rotation.y = side * -0.48;
      armRoot.add(armA);

      const armB = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.42, 3.2),
        bayMaterial
      );
      armB.position.set(side * -1.84, 2.6, 1.3);
      armB.rotation.y = side * -0.28;
      armRoot.add(armB);

      const tipGlow = new THREE.Mesh(
        new THREE.SphereGeometry(0.24, 12, 12),
        new THREE.MeshBasicMaterial({
          color: side > 0 ? 0xffcb86 : 0x8defff,
          transparent: true,
          opacity: 0.6,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      );
      tipGlow.position.set(side * -2.6, 2.72, 2.48);
      armRoot.add(tipGlow);
      this.lightBands.push({ material: tipGlow.material, baseOpacity: 0.6, speed: 2.3, phase: side > 0 ? 0.8 : 0.1 });

      this.hangarRoot.add(armRoot);
      this.dockArms.push({ root: armRoot, armA, armB, side });
    }

    for (let index = 0; index < 3; index += 1) {
      const drone = new THREE.Group();
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 12, 12),
        new THREE.MeshStandardMaterial({
          color: 0x152032,
          emissive: index % 2 === 0 ? 0x7fe7ff : 0xffbd7d,
          emissiveIntensity: 0.88,
          metalness: 0.7,
          roughness: 0.2
        })
      );
      drone.add(core);

      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(0.48, 0.05, 8, 20),
        new THREE.MeshBasicMaterial({
          color: index % 2 === 0 ? 0x7fe7ff : 0xffbd7d,
          transparent: true,
          opacity: 0.42,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      );
      halo.rotation.x = Math.PI * 0.5;
      drone.add(halo);
      this.lightBands.push({ material: halo.material, baseOpacity: 0.42, speed: 2.4, phase: index * 0.7 });

      drone.position.set(-2.6 + index * 2.7, 2.4 + index * 0.4, -1.4 + index * 0.8);
      this.hangarRoot.add(drone);
      this.drones.push({ root: drone, phase: index * 1.7, radius: 1.4 + index * 0.3, height: drone.position.y });
    }
  }

  mount(host) {
    if (!host) {
      this.unmount();
      return;
    }

    if (this.host !== host) {
      this.unmount();
      this.host = host;
      this.host.replaceChildren(this.renderer.domElement);
      this.lastWidth = 0;
      this.lastHeight = 0;
    }

    this.ensureRunning();
    this.resize();
  }

  unmount() {
    if (this.host && this.renderer.domElement.parentElement === this.host) {
      this.host.replaceChildren();
    }

    this.host = null;
    this.stop();
  }

  dispose() {
    this.unmount();
    this.clearShip();
    this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.removeEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.removeEventListener('pointerup', this.handlePointerUp);
    this.renderer.domElement.removeEventListener('pointercancel', this.handlePointerUp);
    this.renderer.domElement.removeEventListener('pointerleave', this.handlePointerUp);
    this.renderer.domElement.removeEventListener('wheel', this.handleWheel);
    this.renderer.dispose();
  }

  setShip(config, signature = '') {
    const nextSignature = signature || JSON.stringify(config);

    if (this.ship && nextSignature === this.lastSignature) {
      return;
    }

    this.lastSignature = nextSignature;
    this.clearShip();

    this.ship = new RacingShip(config);
    this.ship.speed = this.ship.config.maxSpeed * 0.34;
    this.ship.boosting = false;
    this.ship.drifting = false;
    this.ship.visual.rotation.y = this.ship.visualYawOffset;
    this.previewRoot.add(this.ship.root);
    this.applyGarageLighting(config.advancedVisuals);
    this.fitCamera();
    this.renderFrame(performance.now() * 0.001, 0.016);
  }

  applyGarageLighting(advancedVisuals = {}) {
    this.ambientLight.color.setHex(advancedVisuals?.ambient ?? 0xbfd7ff);
    this.keyLight.color.setHex(advancedVisuals?.key ?? 0xd7f3ff);
    this.rimLight.color.setHex(advancedVisuals?.rim ?? 0x7ce7ff);
  }

  clearShip() {
    if (!this.ship) {
      return;
    }

    this.previewRoot.remove(this.ship.root);
    disposeObject3D(this.ship.root);
    this.ship = null;
  }

  fitCamera() {
    if (!this.ship) {
      return;
    }

    const box = new THREE.Box3().setFromObject(this.ship.root);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 1);

    this.ship.root.position.sub(center);
    this.ship.root.position.y -= size.y * 0.04;
    this.camera.position.set(0, maxDim * 0.22, maxDim * 1.72);
    this.camera.lookAt(0, 0, 0);
    this.camera.near = 0.1;
    this.camera.far = maxDim * 10;
    this.camera.updateProjectionMatrix();
  }

  resetView() {
    this.rotationYaw = -0.88;
    this.rotationPitch = -0.18;
    this.spinVelocityYaw = 0;
    this.spinVelocityPitch = 0;
    this.fitCamera();
  }

  nudgeOrbit(direction = 1) {
    const sign = Number(direction) < 0 ? -1 : 1;
    this.spinVelocityYaw += sign * 0.055;
  }

  nudgeZoom(direction = 1) {
    if (!this.ship) {
      return;
    }

    const sign = Number(direction) < 0 ? -1 : 1;
    this.camera.position.z = THREE.MathUtils.clamp(
      this.camera.position.z + sign * 0.85,
      5.2,
      16
    );
  }

  ensureRunning() {
    if (this.frameId || !this.host) {
      return;
    }

    this.lastTime = performance.now();
    this.frameId = window.requestAnimationFrame(this.loop);
  }

  stop() {
    if (!this.frameId) {
      return;
    }

    window.cancelAnimationFrame(this.frameId);
    this.frameId = 0;
  }

  loop(now) {
    this.frameId = 0;

    if (!this.host) {
      return;
    }

    const deltaTime = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this.resize();
    this.renderFrame(now * 0.001, deltaTime);
    this.frameId = window.requestAnimationFrame(this.loop);
  }

  renderFrame(time, deltaTime) {
    this.spinVelocityYaw *= Math.exp(-deltaTime * 7);
    this.spinVelocityPitch *= Math.exp(-deltaTime * 7);
    this.rotationYaw += this.spinVelocityYaw;
    this.rotationPitch = THREE.MathUtils.clamp(
      this.rotationPitch + this.spinVelocityPitch,
      -0.78,
      0.38
    );

    this.previewRoot.rotation.x = this.rotationPitch;
    this.previewRoot.rotation.y = this.rotationYaw;

    for (const band of this.lightBands) {
      band.material.opacity = band.baseOpacity + Math.sin(time * band.speed + band.phase) * band.baseOpacity * 0.22;
    }

    for (const arm of this.dockArms) {
      arm.armA.rotation.y = arm.side * (-0.46 + Math.sin(time * 0.8 + arm.side) * 0.05);
      arm.armB.rotation.y = arm.side * (-0.24 + Math.cos(time * 1.1 + arm.side) * 0.06);
    }

    for (const drone of this.drones) {
      drone.root.position.x = Math.cos(time * 0.7 + drone.phase) * drone.radius;
      drone.root.position.y = drone.height + Math.sin(time * 1.2 + drone.phase) * 0.26;
      drone.root.position.z = -1.2 + Math.sin(time * 0.9 + drone.phase) * 1.8;
      drone.root.rotation.y = time * 0.8 + drone.phase;
    }

    if (this.reflectionSweep) {
      this.reflectionSweep.position.x = Math.sin(time * 0.45) * 2.8;
      this.reflectionSweep.material.opacity = 0.06 + Math.sin(time * 0.9) * 0.02;
    }

    if (this.ship) {
      const hover = Math.sin(time * 1.8 + this.ship.idlePhase) * 0.08;
      this.ship.speed = this.ship.config.maxSpeed * 0.34;
      this.ship.visual.rotation.x = -0.06 + Math.sin(time * 1.9) * 0.018;
      this.ship.visual.rotation.z = Math.sin(time * 1.4 + 0.2) * 0.02;
      this.ship.visual.rotation.y = this.ship.visualYawOffset;
      this.ship.visual.position.y = hover;
      this.ship.updateVisualEffects(deltaTime, time, 0.18);
      this.glowLight.color.setHex(this.ship.config.glow);
      this.fillGlowLight.color.setHex(this.ship.config.trailColor);
    }

    this.renderer.render(this.scene, this.camera);
  }

  resize() {
    if (!this.host) {
      return;
    }

    const width = Math.max(1, Math.floor(this.host.clientWidth));
    const height = Math.max(1, Math.floor(this.host.clientHeight));

    if (width === this.lastWidth && height === this.lastHeight) {
      return;
    }

    this.lastWidth = width;
    this.lastHeight = height;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  handlePointerDown(event) {
    this.dragging = true;
    this.activePointerId = event.pointerId;
    this.lastPointerX = event.clientX;
    this.lastPointerY = event.clientY;
    this.renderer.domElement.classList.add('is-dragging');
    this.renderer.domElement.setPointerCapture?.(event.pointerId);
  }

  handlePointerMove(event) {
    if (!this.dragging || event.pointerId !== this.activePointerId) {
      return;
    }

    const deltaX = event.clientX - this.lastPointerX;
    const deltaY = event.clientY - this.lastPointerY;

    this.lastPointerX = event.clientX;
    this.lastPointerY = event.clientY;
    this.rotationYaw += deltaX * 0.012;
    this.rotationPitch = THREE.MathUtils.clamp(
      this.rotationPitch + deltaY * 0.008,
      -0.78,
      0.38
    );
    this.spinVelocityYaw = deltaX * 0.0009;
    this.spinVelocityPitch = deltaY * 0.0004;
  }

  handlePointerUp(event) {
    if (event.pointerId !== this.activePointerId) {
      return;
    }

    this.dragging = false;
    this.activePointerId = null;
    this.renderer.domElement.classList.remove('is-dragging');
    this.renderer.domElement.releasePointerCapture?.(event.pointerId);
  }

  handleWheel(event) {
    if (!this.ship) {
      return;
    }

    event.preventDefault();
    const nextZ = THREE.MathUtils.clamp(
      this.camera.position.z + event.deltaY * 0.01,
      5.2,
      16
    );
    this.camera.position.z = nextZ;
  }
}
