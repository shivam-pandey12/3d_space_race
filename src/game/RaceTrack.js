import * as THREE from 'three';

const WORLD_UP = new THREE.Vector3(0, 1, 0);

export class RaceTrack {
  constructor(definition) {
    this.definition = definition;
    this.group = new THREE.Group();
    this.group.name = `RaceTrack:${definition.id}`;

    this.themeId = definition.themeId ?? 'megacity-orbit';
    this.themeName = definition.themeName ?? definition.name;
    this.halfWidth = definition.halfWidth ?? 7.2 * 6;
    this.hoverHeight = 1.8;
    this.zoneVisuals = [];
    this.shortcutVisuals = [];
    this.socketMaterials = [];
    this.themePulseMaterials = [];
    this.themeRotators = [];
    this.themeFloaters = [];
    this.tempPointA = new THREE.Vector3();
    this.tempPointB = new THREE.Vector3();
    this.tempTangentA = new THREE.Vector3();
    this.tempTangentB = new THREE.Vector3();
    this.tempFrame = this.createFrameState();
    this.tempMatrix = new THREE.Matrix4();
    this.tempLeft = new THREE.Vector3();
    this.tempRight = new THREE.Vector3();
    this.mapBounds = { minX: 0, maxX: 1, minZ: 0, maxZ: 1 };
    this.mapPoints = [];

    this.curve = new THREE.CatmullRomCurve3(
      definition.points.map((point) => new THREE.Vector3(...point)),
      true,
      'centripetal',
      0.18
    );

    this.length = this.curve.getLength();
    this.surfaceSegments = THREE.MathUtils.clamp(Math.round(this.length * 0.34), 540, 1800);
    this.sectorSplits = [...(definition.sectorSplits ?? [1 / 3, 2 / 3])]
      .map((value) => this.getWrappedProgress(value))
      .sort((valueA, valueB) => valueA - valueB);
    this.boostPads = definition.boostPads.map((item) => ({ ...item }));
    this.slowZones = definition.slowZones.map((item) => ({ ...item }));
    this.hazardZones = definition.hazardZones.map((item) => ({ ...item }));
    this.pickupSpawns = definition.pickupSpawns.map((item) => ({ ...item }));
    this.shortcutZones = (definition.shortcutZones ?? []).map((item) => ({
      ...item,
      startProgress: this.getWrappedProgress(item.startProgress ?? item.progress ?? 0),
      endProgress: this.getWrappedProgress(item.endProgress ?? item.progress ?? 0)
    }));
    this.palette = definition.palette;
    this.themeVisuals = this.getThemeVisuals();

    this.build();
    this.buildMapProjection();
  }

  createFrameState() {
    return {
      point: new THREE.Vector3(),
      tangent: new THREE.Vector3(),
      right: new THREE.Vector3(),
      up: new THREE.Vector3()
    };
  }

  getThemeVisuals() {
    const defaults = {
      surfaceColor: 0x16253b,
      emissiveIntensity: 1.65,
      guideWidth: 7.2,
      shellOpacity: 0.05,
      ringOpacity: 0.34,
      edgeOpacity: 0.72
    };

    const themes = {
      'megacity-orbit': {
        surfaceColor: 0x081422,
        emissiveIntensity: 1.85,
        guideWidth: 7.8,
        shellOpacity: 0.08,
        ringOpacity: 0.36,
        edgeOpacity: 0.82
      },
      'asteroid-refinery': {
        surfaceColor: 0x23160f,
        emissiveIntensity: 1.56,
        guideWidth: 6.8,
        shellOpacity: 0.06,
        ringOpacity: 0.28,
        edgeOpacity: 0.72
      },
      'shattered-ringworld': {
        surfaceColor: 0x12091b,
        emissiveIntensity: 1.92,
        guideWidth: 7.4,
        shellOpacity: 0.07,
        ringOpacity: 0.3,
        edgeOpacity: 0.76
      },
      'solar-storm-corridor': {
        surfaceColor: 0x241106,
        emissiveIntensity: 2.05,
        guideWidth: 8.4,
        shellOpacity: 0.09,
        ringOpacity: 0.3,
        edgeOpacity: 0.84
      },
      'eclipse-palace-ring': {
        surfaceColor: 0x110f16,
        emissiveIntensity: 1.94,
        guideWidth: 8.2,
        shellOpacity: 0.07,
        ringOpacity: 0.26,
        edgeOpacity: 0.8
      },
      'aurora-vault-garden': {
        surfaceColor: 0xf2eef6,
        emissiveIntensity: 1.48,
        guideWidth: 7.1,
        shellOpacity: 0.06,
        ringOpacity: 0.24,
        edgeOpacity: 0.68
      },
      'crimson-nebula': {
        surfaceColor: 0x190611,
        emissiveIntensity: 2.15,
        guideWidth: 5.4,
        shellOpacity: 0.11,
        ringOpacity: 0.22,
        edgeOpacity: 0.88
      },
      'solar-glass-cathedral': {
        surfaceColor: 0x2b2112,
        emissiveIntensity: 1.72,
        guideWidth: 9.2,
        shellOpacity: 0.07,
        ringOpacity: 0.3,
        edgeOpacity: 0.78
      },
      'obsidian-palace': {
        surfaceColor: 0x080713,
        emissiveIntensity: 1.98,
        guideWidth: 6.2,
        shellOpacity: 0.08,
        ringOpacity: 0.2,
        edgeOpacity: 0.82
      },
      'hypernova-spine': {
        surfaceColor: 0x170826,
        emissiveIntensity: 2.32,
        guideWidth: 6.6,
        shellOpacity: 0.12,
        ringOpacity: 0.18,
        edgeOpacity: 0.9
      }
    };

    return {
      ...defaults,
      ...(themes[this.themeId] ?? {})
    };
  }

  build() {
    this.addGlowShell();
    this.addTrackSurface();
    this.addEdgeLights();
    this.addGuideRings();
    this.addThemeEnvironment();
    this.addSectorMarkers();
    this.addStartGate();
    this.addInteractionZones();
    this.addShortcutZones();
    this.addPickupSockets();
  }

  addGlowShell() {
    const shell = new THREE.Mesh(
      new THREE.TubeGeometry(this.curve, this.surfaceSegments, this.halfWidth + 1.3, 18, true),
      new THREE.MeshBasicMaterial({
        color: this.palette.shell,
        transparent: true,
        opacity: this.themeVisuals.shellOpacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );

    this.registerThemePulse(shell.material, {
      opacityBase: this.themeVisuals.shellOpacity,
      opacityAmplitude: this.themeId === 'solar-storm-corridor' ? 0.035 : 0.016,
      speed: this.themeId === 'solar-storm-corridor' ? 2.8 : 1.5
    });
    this.group.add(shell);
  }

  addTrackSurface() {
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: this.themeVisuals.surfaceColor,
      emissive: this.palette.shell,
      emissiveIntensity: this.themeVisuals.emissiveIntensity,
      metalness: 0.44,
      roughness: 0.28,
      side: THREE.DoubleSide
    });
    const guideMaterial = new THREE.MeshBasicMaterial({
      color: this.palette.guide,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide
    });

    const trackSurface = new THREE.Mesh(
      this.createRibbonGeometry(this.halfWidth * 2, -0.16),
      baseMaterial
    );
    this.group.add(trackSurface);

    const guideStrip = new THREE.Mesh(
      this.createRibbonGeometry(this.themeVisuals.guideWidth, 0.08),
      guideMaterial
    );
    this.group.add(guideStrip);

    const glowLattice = new THREE.Mesh(
      this.createRibbonGeometry(this.halfWidth * 1.72, 0.02),
      new THREE.MeshBasicMaterial({
        color: this.palette.edge,
        transparent: true,
        opacity: 0.08,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    this.registerThemePulse(glowLattice.material, {
      opacityBase: 0.08,
      opacityAmplitude: 0.025,
      speed: 1.8
    });
    this.group.add(glowLattice);
  }

  addEdgeLights() {
    const railMaterial = new THREE.MeshBasicMaterial({
      color: this.palette.edge,
      transparent: true,
      opacity: this.themeVisuals.edgeOpacity,
      side: THREE.DoubleSide
    });

    const leftRail = new THREE.Mesh(
      this.createRibbonGeometry(0.68, 0.2, -this.halfWidth + 0.34),
      railMaterial
    );
    this.group.add(leftRail);

    const rightRail = new THREE.Mesh(
      this.createRibbonGeometry(0.68, 0.2, this.halfWidth - 0.34),
      railMaterial.clone()
    );
    this.group.add(rightRail);

    const beaconGeometry = new THREE.BoxGeometry(1, 1, 1);
    const beaconMaterial = new THREE.MeshBasicMaterial({
      color: this.palette.edge,
      transparent: true,
      opacity: 0.88
    });

    for (let index = 0; index < 72; index += 1) {
      const progress = index / 72;

      this.getFrame(progress, this.tempFrame);

      const left = new THREE.Mesh(beaconGeometry, beaconMaterial);
      left.position.copy(this.tempFrame.point)
        .addScaledVector(this.tempFrame.right, -this.halfWidth - 0.9)
        .addScaledVector(this.tempFrame.up, 0.65);
      left.scale.set(0.45, 0.65, 2.2);
      this.tempMatrix.makeBasis(
        this.tempFrame.right,
        this.tempFrame.up,
        this.tempFrame.tangent
      );
      left.quaternion.setFromRotationMatrix(this.tempMatrix);
      this.group.add(left);

      const right = left.clone();
      right.position.copy(this.tempFrame.point)
        .addScaledVector(this.tempFrame.right, this.halfWidth + 0.9)
        .addScaledVector(this.tempFrame.up, 0.65);
      this.group.add(right);
    }

    this.registerThemePulse(railMaterial, {
      opacityBase: this.themeVisuals.edgeOpacity,
      opacityAmplitude: 0.08,
      speed: 2.1
    });
  }

  addGuideRings() {
    const ringGeometry = new THREE.TorusGeometry(this.halfWidth + 2.2, 0.22, 10, 56);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: this.palette.guide,
      transparent: true,
      opacity: this.themeVisuals.ringOpacity
    });

    for (let index = 0; index < 10; index += 1) {
      const progress = (index / 10 + 0.08) % 1;

      this.getFrame(progress, this.tempFrame);

      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.position.copy(this.tempFrame.point).addScaledVector(this.tempFrame.up, 0.7);
      this.tempMatrix.makeBasis(
        this.tempFrame.right,
        this.tempFrame.up,
        this.tempFrame.tangent
      );
      ring.quaternion.setFromRotationMatrix(this.tempMatrix);
      this.group.add(ring);
    }

    this.registerThemePulse(ringMaterial, {
      opacityBase: this.themeVisuals.ringOpacity,
      opacityAmplitude: 0.08,
      speed: this.themeId === 'megacity-orbit' ? 1.7 : 1.15
    });
  }

  addSectorMarkers() {
    const ringGeometry = new THREE.TorusGeometry(this.halfWidth + 0.9, 0.14, 10, 42);
    const beamGeometry = new THREE.BoxGeometry(0.32, 5.2, 0.32);

    for (let index = 0; index < this.sectorSplits.length; index += 1) {
      const progress = this.sectorSplits[index];
      this.getFrame(progress, this.tempFrame);

      const ring = new THREE.Mesh(
        ringGeometry,
        new THREE.MeshBasicMaterial({
          color: this.palette.edge,
          transparent: true,
          opacity: 0.22
        })
      );
      ring.position.copy(this.tempFrame.point).addScaledVector(this.tempFrame.up, 0.56);
      this.tempMatrix.makeBasis(
        this.tempFrame.right,
        this.tempFrame.up,
        this.tempFrame.tangent
      );
      ring.quaternion.setFromRotationMatrix(this.tempMatrix);
      this.group.add(ring);

      const leftBeam = new THREE.Mesh(
        beamGeometry,
        new THREE.MeshBasicMaterial({
          color: this.palette.guide,
          transparent: true,
          opacity: 0.58
        })
      );
      leftBeam.position.copy(this.tempFrame.point)
        .addScaledVector(this.tempFrame.right, -this.halfWidth - 1.2)
        .addScaledVector(this.tempFrame.up, 2.7);
      leftBeam.quaternion.setFromRotationMatrix(this.tempMatrix);
      this.group.add(leftBeam);

      const rightBeam = leftBeam.clone();
      rightBeam.position.copy(this.tempFrame.point)
        .addScaledVector(this.tempFrame.right, this.halfWidth + 1.2)
        .addScaledVector(this.tempFrame.up, 2.7);
      this.group.add(rightBeam);
    }
  }

  addStartGate() {
    const gate = new THREE.Group();
    const pylonMaterial = new THREE.MeshStandardMaterial({
      color: this.palette.start,
      emissive: this.palette.start,
      emissiveIntensity: 1.6,
      metalness: 0.25,
      roughness: 0.25
    });

    this.getFrame(0, this.tempFrame);
    gate.position.copy(this.tempFrame.point);

    const leftPylon = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 8.5, 1.3),
      pylonMaterial
    );
    leftPylon.position.set(-this.halfWidth - 1.7, 4.2, 0);
    gate.add(leftPylon);

    const rightPylon = leftPylon.clone();
    rightPylon.position.set(this.halfWidth + 1.7, 4.2, 0);
    gate.add(rightPylon);

    const crossBeam = new THREE.Mesh(
      new THREE.BoxGeometry(this.halfWidth * 2 + 4.7, 0.65, 1.1),
      pylonMaterial
    );
    crossBeam.position.set(0, 8.25, 0);
    gate.add(crossBeam);

    const startStrip = new THREE.Mesh(
      new THREE.BoxGeometry(this.halfWidth * 2 + 1.6, 0.08, 2.6),
      new THREE.MeshBasicMaterial({
        color: 0xd8fdff,
        transparent: true,
        opacity: 0.85
      })
    );
    startStrip.position.set(0, 0.18, 0);
    gate.add(startStrip);

    this.tempMatrix.makeBasis(
      this.tempFrame.right,
      this.tempFrame.up,
      this.tempFrame.tangent
    );
    gate.quaternion.setFromRotationMatrix(this.tempMatrix);
    this.group.add(gate);
  }

  addInteractionZones() {
    for (const zone of this.boostPads) {
      this.addZoneMesh(zone, {
        ...this.palette.boost,
        yOffset: 0.16
      });
    }

    for (const zone of this.slowZones) {
      this.addZoneMesh(zone, {
        ...this.palette.slow,
        yOffset: 0.12
      });
    }

    for (const zone of this.hazardZones) {
      this.addZoneMesh(zone, {
        ...this.palette.hazard,
        yOffset: 0.14
      });
    }
  }

  addShortcutZones() {
    for (const zone of this.shortcutZones) {
      this.addShortcutMesh(zone);
    }
  }

  addZoneMesh(zone, options) {
    const material = new THREE.MeshStandardMaterial({
      color: options.color,
      emissive: options.emissive,
      emissiveIntensity: 1.4,
      metalness: 0.12,
      roughness: 0.38,
      transparent: true,
      opacity: options.opacity
    });

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(zone.width * 2, 0.18, zone.length),
      material
    );

    this.getFrame(zone.progress, this.tempFrame);
    mesh.position.copy(this.tempFrame.point)
      .addScaledVector(this.tempFrame.right, zone.laneOffset)
      .addScaledVector(this.tempFrame.up, options.yOffset);
    this.tempMatrix.makeBasis(
      this.tempFrame.right,
      this.tempFrame.up,
      this.tempFrame.tangent
    );
    mesh.quaternion.setFromRotationMatrix(this.tempMatrix);
    this.group.add(mesh);

    zone.material = material;
    zone.baseOpacity = options.opacity;
    zone.mesh = mesh;
    this.zoneVisuals.push(zone);
  }

  addShortcutMesh(zone) {
    const totalDistance = Math.max(8, this.getProgressRangeDistance(zone.startProgress, zone.endProgress));
    const segmentCount = THREE.MathUtils.clamp(Math.round(totalDistance / 18), 4, 10);
    const segmentLength = totalDistance / segmentCount;
    const material = new THREE.MeshStandardMaterial({
      color: this.palette.guide,
      emissive: this.palette.edge,
      emissiveIntensity: 1.15,
      metalness: 0.08,
      roughness: 0.28,
      transparent: true,
      opacity: 0.38
    });

    zone.material = material;
    zone.baseOpacity = material.opacity;
    zone.meshes = [];

    for (let index = 0; index < segmentCount; index += 1) {
      const progress = this.lerpProgress(
        zone.startProgress,
        zone.endProgress,
        (index + 0.5) / segmentCount
      );
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(zone.width * 2, 0.12, segmentLength * 1.06),
        material
      );

      this.getFrame(progress, this.tempFrame);
      mesh.position.copy(this.tempFrame.point)
        .addScaledVector(this.tempFrame.right, zone.laneOffset)
        .addScaledVector(this.tempFrame.up, 0.22);
      this.tempMatrix.makeBasis(
        this.tempFrame.right,
        this.tempFrame.up,
        this.tempFrame.tangent
      );
      mesh.quaternion.setFromRotationMatrix(this.tempMatrix);
      this.group.add(mesh);
      zone.meshes.push(mesh);
    }

    this.shortcutVisuals.push(zone);
  }

  addPickupSockets() {
    for (const spawn of this.pickupSpawns) {
      const material = new THREE.MeshBasicMaterial({
        color: 0xe4fbff,
        transparent: true,
        opacity: 0.3
      });

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.5, 0.1, 10, 24),
        material
      );

      this.getFrame(spawn.progress, this.tempFrame);
      ring.position.copy(this.tempFrame.point)
        .addScaledVector(this.tempFrame.right, spawn.laneOffset)
        .addScaledVector(this.tempFrame.up, 0.3);
      this.tempMatrix.makeBasis(
        this.tempFrame.right,
        this.tempFrame.up,
        this.tempFrame.tangent
      );
      ring.quaternion.setFromRotationMatrix(this.tempMatrix);

      this.group.add(ring);
      this.socketMaterials.push(material);
    }
  }

  registerThemePulse(material, {
    opacityBase = null,
    opacityAmplitude = 0,
    emissiveBase = null,
    emissiveAmplitude = 0,
    speed = 1,
    phase = Math.random() * Math.PI * 2
  } = {}) {
    this.themePulseMaterials.push({
      material,
      opacityBase,
      opacityAmplitude,
      emissiveBase,
      emissiveAmplitude,
      speed,
      phase
    });
  }

  registerThemeRotator(object, speed = 0.2, axis = 'y', phase = 0) {
    this.themeRotators.push({ object, speed, axis, phase });
  }

  registerThemeFloater(object, amplitude = 1, speed = 1, axis = 'y', phase = 0) {
    this.themeFloaters.push({
      object,
      amplitude,
      speed,
      axis,
      phase,
      basePosition: object.position.clone()
    });
  }

  createAlignedThemeGroup(progress, lateralOffset, upOffset = 0) {
    this.getFrame(progress, this.tempFrame);
    const group = new THREE.Group();
    group.position.copy(this.tempFrame.point)
      .addScaledVector(this.tempFrame.right, lateralOffset)
      .addScaledVector(this.tempFrame.up, upOffset);
    this.tempMatrix.makeBasis(
      this.tempFrame.right,
      this.tempFrame.up,
      this.tempFrame.tangent
    );
    group.quaternion.setFromRotationMatrix(this.tempMatrix);
    return group;
  }

  isSceneryClearOfStart(progress, clearance = 0.1) {
    const wrapped = this.getWrappedProgress(progress);
    return Math.min(wrapped, 1 - wrapped) >= clearance;
  }

  addThemeEnvironment() {
    if (this.themeId === 'asteroid-refinery') {
      this.addAsteroidRefineryWorld();
      return;
    }

    if (this.themeId === 'shattered-ringworld') {
      this.addShatteredRingworldWorld();
      return;
    }

    if (this.themeId === 'solar-storm-corridor') {
      this.addSolarStormWorld();
      return;
    }

    if (this.themeId === 'eclipse-palace-ring') {
      this.addEclipsePalaceRingWorld();
      return;
    }

    if (this.themeId === 'aurora-vault-garden') {
      this.addAuroraVaultGardenWorld();
      return;
    }

    if (this.themeId === 'crimson-nebula') {
      this.addCrimsonNebulaWorld();
      return;
    }

    if (this.themeId === 'solar-glass-cathedral') {
      this.addSolarGlassCathedralWorld();
      return;
    }

    if (this.themeId === 'obsidian-palace') {
      this.addObsidianPalaceWorld();
      return;
    }

    if (this.themeId === 'hypernova-spine') {
      this.addHypernovaSpineWorld();
      return;
    }

    this.addMegacityOrbitWorld();
  }

  addCrimsonNebulaWorld() {
    const ribMaterial = new THREE.MeshStandardMaterial({
      color: 0x35101f,
      emissive: this.palette.hazard.emissive,
      emissiveIntensity: 0.42,
      metalness: 0.58,
      roughness: 0.22
    });
    const dustMaterial = new THREE.MeshBasicMaterial({
      color: this.palette.guide,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    for (let index = 0; index < 14; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const progress = (index / 14 + 0.025) % 1;
      if (!this.isSceneryClearOfStart(progress, 0.11)) {
        continue;
      }
      const gate = this.createAlignedThemeGroup(progress, side * (this.halfWidth + 7 + (index % 3) * 2), 0.8);

      const rib = new THREE.Mesh(
        new THREE.TorusGeometry(5.6 + (index % 3) * 0.9, 0.18, 8, 28, Math.PI * 0.72),
        ribMaterial
      );
      rib.position.set(side * -1.2, 5.4, 0);
      rib.rotation.set(Math.PI * 0.46, side * 0.42, side * 0.12);
      gate.add(rib);

      const shard = new THREE.Mesh(
        new THREE.ConeGeometry(1.4 + (index % 2) * 0.5, 7 + (index % 4), 5),
        ribMaterial
      );
      shard.position.set(side * 2.4, 2.6 + (index % 3), (index % 2 === 0 ? -1 : 1) * 1.2);
      shard.rotation.z = side * 0.28;
      gate.add(shard);

      const dustSail = new THREE.Mesh(
        new THREE.PlaneGeometry(16 + (index % 4) * 2, 6.5),
        dustMaterial.clone()
      );
      dustSail.position.set(side * 4.5, 7.2, 0);
      dustSail.rotation.y = side * -0.55;
      gate.add(dustSail);
      this.registerThemeFloater(dustSail, 0.8, 0.45 + index * 0.02, 'y', index);

      this.group.add(gate);
    }
  }

  addSolarGlassCathedralWorld() {
    const prismMaterial = new THREE.MeshStandardMaterial({
      color: 0xfff1cf,
      emissive: this.palette.guide,
      emissiveIntensity: 0.36,
      metalness: 0.8,
      roughness: 0.05,
      transparent: true,
      opacity: 0.74
    });
    const goldMaterial = new THREE.MeshStandardMaterial({
      color: 0xe8b85a,
      emissive: this.palette.boost.emissive,
      emissiveIntensity: 0.42,
      metalness: 0.74,
      roughness: 0.12
    });
    const glassRibbon = new THREE.MeshBasicMaterial({
      color: this.palette.edge,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    for (let index = 0; index < 12; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const progress = (index / 12 + 0.035) % 1;
      if (!this.isSceneryClearOfStart(progress, 0.11)) {
        continue;
      }
      const court = this.createAlignedThemeGroup(progress, side * (this.halfWidth + 15 + (index % 2) * 5), 3.2);

      const tower = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 9 + (index % 4) * 1.4, 2.4),
        prismMaterial
      );
      tower.position.y = tower.geometry.parameters.height * 0.5;
      tower.rotation.z = side * 0.12;
      court.add(tower);

      const bridgeArch = new THREE.Mesh(
        new THREE.TorusGeometry(7.8, 0.12, 10, 42, Math.PI * 0.78),
        glassRibbon.clone()
      );
      bridgeArch.position.set(side * -1.8, 8.2, 0);
      bridgeArch.rotation.set(Math.PI * 0.5, side * 0.46, 0);
      court.add(bridgeArch);

      const mirrorPanel = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 5.6),
        glassRibbon.clone()
      );
      mirrorPanel.position.set(side * 5.2, 5.4, 1.4);
      mirrorPanel.rotation.y = side * -0.68;
      court.add(mirrorPanel);
      this.registerThemeFloater(mirrorPanel, 0.7, 0.55, 'y', index * 0.7);

      const crown = new THREE.Mesh(
        new THREE.ConeGeometry(1.4, 2.8, 6),
        goldMaterial
      );
      crown.position.set(0, tower.geometry.parameters.height + 2, 0);
      court.add(crown);

      this.group.add(court);
    }
  }

  addObsidianPalaceWorld() {
    const blackStone = new THREE.MeshStandardMaterial({
      color: 0x090711,
      emissive: 0x24194a,
      emissiveIntensity: 0.34,
      metalness: 0.9,
      roughness: 0.08
    });
    const violetGlass = new THREE.MeshBasicMaterial({
      color: this.palette.guide,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    for (let index = 0; index < 16; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const progress = (index / 16 + 0.02) % 1;
      if (!this.isSceneryClearOfStart(progress, 0.11)) {
        continue;
      }
      const pavilion = this.createAlignedThemeGroup(progress, side * (this.halfWidth + 11 + (index % 4) * 2), 0.6);

      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(1.2, 1.8, 8.5 + (index % 5) * 1.2, 6),
        blackStone
      );
      pillar.position.y = pillar.geometry.parameters.height * 0.5;
      pavilion.add(pillar);

      const bladeGate = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 10 + (index % 3) * 1.2, 2.2),
        blackStone
      );
      bladeGate.position.set(side * -3.2, 5.2, 0);
      bladeGate.rotation.z = side * 0.2;
      pavilion.add(bladeGate);

      const sigil = new THREE.Mesh(
        new THREE.RingGeometry(2.2, 2.7, 28),
        violetGlass.clone()
      );
      sigil.position.set(0, 6.8, 0.4);
      sigil.rotation.x = Math.PI * 0.5;
      pavilion.add(sigil);
      this.registerThemeRotator(sigil, side * 0.18, 'z', index);

      this.group.add(pavilion);
    }
  }

  addHypernovaSpineWorld() {
    const spineMaterial = new THREE.MeshStandardMaterial({
      color: 0x180b25,
      emissive: this.palette.shell,
      emissiveIntensity: 0.52,
      metalness: 0.82,
      roughness: 0.14
    });
    const novaMaterial = new THREE.MeshBasicMaterial({
      color: this.palette.boost.color,
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    for (let index = 0; index < 18; index += 1) {
      const progress = (index / 18 + 0.018) % 1;
      if (!this.isSceneryClearOfStart(progress, 0.12)) {
        continue;
      }
      const side = index % 2 === 0 ? -1 : 1;
      const ribGroup = this.createAlignedThemeGroup(progress, 0, 1.1);

      const leftRib = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 9 + (index % 4) * 1.5, 1.2),
        spineMaterial
      );
      leftRib.position.set(-this.halfWidth - 3.2, leftRib.geometry.parameters.height * 0.5, 0);
      leftRib.rotation.z = -0.22;
      ribGroup.add(leftRib);

      const rightRib = leftRib.clone();
      rightRib.position.x *= -1;
      rightRib.rotation.z *= -1;
      ribGroup.add(rightRib);

      const coil = new THREE.Mesh(
        new THREE.TorusGeometry(this.halfWidth * 0.36 + (index % 3) * 1.1, 0.1, 8, 36),
        novaMaterial.clone()
      );
      coil.position.set(0, 5.4 + (index % 3), 0);
      coil.rotation.set(Math.PI * 0.5, side * 0.16, 0);
      ribGroup.add(coil);
      this.registerThemeRotator(coil, side * (0.16 + index * 0.004), 'z', index * 0.3);

      const flare = new THREE.Mesh(
        new THREE.PlaneGeometry(14, 4.5),
        novaMaterial.clone()
      );
      flare.position.set(side * (this.halfWidth + 34), 11 + (index % 4), 0);
      flare.rotation.y = side * -0.58;
      ribGroup.add(flare);
      this.registerThemeFloater(flare, 1.2, 0.6, 'y', index);

      this.group.add(ribGroup);
    }
  }

  addMegacityOrbitWorld() {
    const towerMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a1321,
      emissive: this.palette.shell,
      emissiveIntensity: 0.44,
      metalness: 0.88,
      roughness: 0.18
    });
    const windowMaterial = new THREE.MeshBasicMaterial({
      color: this.palette.guide,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const billboardMaterial = new THREE.MeshBasicMaterial({
      color: this.palette.edge,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.registerThemePulse(windowMaterial, {
      opacityBase: 0.4,
      opacityAmplitude: 0.14,
      speed: 2.6
    });
    this.registerThemePulse(billboardMaterial, {
      opacityBase: 0.22,
      opacityAmplitude: 0.08,
      speed: 1.6
    });

    for (let index = 0; index < 20; index += 1) {
      const side = index % 2 === 0 ? 1 : -1;
      const cluster = this.createAlignedThemeGroup(
        (index / 20 + 0.025) % 1,
        side * (this.halfWidth + 24 + (index % 3) * 4),
        -1.2
      );

      for (let towerIndex = 0; towerIndex < 4; towerIndex += 1) {
        const height = 6 + towerIndex * 3.6 + (index % 4) * 1.1;
        const tower = new THREE.Mesh(
          new THREE.BoxGeometry(2.1, height, 2.1 + towerIndex * 0.35),
          towerMaterial
        );
        tower.position.set(
          (towerIndex - 1.5) * 2.8,
          height * 0.5,
          (towerIndex % 2 === 0 ? -1 : 1) * 2.2
        );
        cluster.add(tower);

        const windowBand = new THREE.Mesh(
          new THREE.BoxGeometry(1.6, Math.max(1.4, height * 0.16), 1.8 + towerIndex * 0.28),
          windowMaterial
        );
        windowBand.position.copy(tower.position).setY(height * 0.64);
        cluster.add(windowBand);
      }

      if (index % 3 === 0) {
        const billboard = new THREE.Mesh(
          new THREE.PlaneGeometry(10, 4),
          billboardMaterial
        );
        billboard.position.set(side * -1.6, 8.4, 0);
        billboard.rotation.y = side > 0 ? -Math.PI * 0.5 : Math.PI * 0.5;
        cluster.add(billboard);
      }

      this.group.add(cluster);
    }

    for (let index = 0; index < 7; index += 1) {
      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(this.halfWidth + 25 + (index % 2) * 5, 0.18, 10, 54, Math.PI * 0.6),
        new THREE.MeshBasicMaterial({
          color: this.palette.guide,
          transparent: true,
          opacity: 0.18,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      );
      this.getFrame((index / 7 + 0.08) % 1, this.tempFrame);
      halo.position.copy(this.tempFrame.point).addScaledVector(this.tempFrame.up, 15 + (index % 3) * 3.8);
      this.tempMatrix.makeBasis(
        this.tempFrame.right,
        this.tempFrame.up,
        this.tempFrame.tangent
      );
      halo.quaternion.setFromRotationMatrix(this.tempMatrix);
      halo.rotation.z = Math.PI * 0.45;
      this.group.add(halo);
      this.registerThemeRotator(halo, 0.12 + index * 0.01, 'z', index * 0.2);
    }
  }

  addAsteroidRefineryWorld() {
    const rockMaterial = new THREE.MeshStandardMaterial({
      color: 0x47382a,
      emissive: 0x1a1008,
      emissiveIntensity: 0.2,
      metalness: 0.1,
      roughness: 0.92
    });
    const refineryMaterial = new THREE.MeshStandardMaterial({
      color: 0x261911,
      emissive: this.palette.boost.emissive,
      emissiveIntensity: 0.42,
      metalness: 0.74,
      roughness: 0.32
    });
    const refineryGlow = new THREE.MeshBasicMaterial({
      color: this.palette.boost.color,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.registerThemePulse(refineryGlow, {
      opacityBase: 0.3,
      opacityAmplitude: 0.1,
      speed: 2.2
    });

    for (let index = 0; index < 16; index += 1) {
      const side = index % 2 === 0 ? 1 : -1;
      const rig = this.createAlignedThemeGroup(
        (index / 16 + 0.04) % 1,
        side * (this.halfWidth + 18 + (index % 3) * 4),
        2.8 + (index % 3) * 1.4
      );
      const asteroid = new THREE.Mesh(
        new THREE.IcosahedronGeometry(3 + (index % 3) * 1.1, 0),
        rockMaterial
      );
      asteroid.scale.set(1, 0.8 + (index % 2) * 0.24, 1.18);
      rig.add(asteroid);

      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.5, 7.5),
        refineryMaterial
      );
      arm.position.set(0, 0.8, -4.6);
      rig.add(arm);

      const tower = new THREE.Mesh(
        new THREE.BoxGeometry(1.3, 6.6 + (index % 4) * 1.6, 1.3),
        refineryMaterial
      );
      tower.position.set(3.8, tower.geometry.parameters.height * 0.5 - 1.4, 1.2);
      rig.add(tower);

      const spinner = new THREE.Mesh(
        new THREE.TorusGeometry(2.8, 0.18, 8, 32),
        refineryGlow
      );
      spinner.position.set(-3.4, 1.2, 1.6);
      spinner.rotation.x = Math.PI * 0.5;
      rig.add(spinner);
      this.registerThemeRotator(spinner, 0.6 + index * 0.03, 'z', index * 0.4);

      const exhaust = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.8, 4.8, 10, 1, true),
        refineryGlow.clone()
      );
      exhaust.position.set(3.8, 0.8, 4.2);
      exhaust.rotation.x = Math.PI * 0.5;
      rig.add(exhaust);
      this.registerThemePulse(exhaust.material, {
        opacityBase: 0.26,
        opacityAmplitude: 0.08,
        speed: 2.8
      });

      this.group.add(rig);
      this.registerThemeFloater(rig, 0.9, 0.6 + index * 0.03, 'y', index * 0.45);
    }
  }

  addShatteredRingworldWorld() {
    const fragmentMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1322,
      emissive: this.palette.guide,
      emissiveIntensity: 0.4,
      metalness: 0.8,
      roughness: 0.2
    });
    const fractureGlow = new THREE.MeshBasicMaterial({
      color: this.palette.edge,
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.registerThemePulse(fractureGlow, {
      opacityBase: 0.24,
      opacityAmplitude: 0.08,
      speed: 1.9
    });

    for (let index = 0; index < 12; index += 1) {
      const side = index % 2 === 0 ? 1 : -1;
      const fragment = this.createAlignedThemeGroup(
        (index / 12 + 0.03) % 1,
        side * (this.halfWidth + 30 + (index % 2) * 6),
        10 + (index % 3) * 3
      );

      const arc = new THREE.Mesh(
        new THREE.TorusGeometry(8.5 + (index % 3), 0.7, 10, 36, Math.PI * (0.35 + (index % 3) * 0.08)),
        fragmentMaterial
      );
      arc.rotation.y = side > 0 ? Math.PI * 0.42 : -Math.PI * 0.42;
      arc.rotation.z = Math.PI * 0.2;
      fragment.add(arc);

      for (let shardIndex = 0; shardIndex < 3; shardIndex += 1) {
        const shard = new THREE.Mesh(
          new THREE.BoxGeometry(1.2, 3.4 + shardIndex, 2.6),
          fragmentMaterial
        );
        shard.position.set(
          (shardIndex - 1) * 3.6,
          -2.2 + shardIndex,
          (shardIndex % 2 === 0 ? -1 : 1) * 2.4
        );
        shard.rotation.set(0.3 * shardIndex, 0.18 * shardIndex, 0.22 * (shardIndex - 1));
        fragment.add(shard);
      }

      const crack = new THREE.Mesh(
        new THREE.PlaneGeometry(8, 2.4),
        fractureGlow
      );
      crack.position.set(0, 0.2, 0);
      crack.rotation.x = Math.PI * 0.4;
      fragment.add(crack);

      this.group.add(fragment);
      this.registerThemeRotator(fragment, 0.08 + index * 0.01, 'y', index * 0.2);
      this.registerThemeFloater(fragment, 1.2, 0.45 + index * 0.02, 'y', index * 0.35);
    }
  }

  addSolarStormWorld() {
    const pylonMaterial = new THREE.MeshStandardMaterial({
      color: 0x2c1308,
      emissive: this.palette.boost.emissive,
      emissiveIntensity: 0.52,
      metalness: 0.64,
      roughness: 0.28
    });
    const plasmaMaterial = new THREE.MeshBasicMaterial({
      color: this.palette.boost.color,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.registerThemePulse(plasmaMaterial, {
      opacityBase: 0.28,
      opacityAmplitude: 0.12,
      speed: 3.2
    });

    for (let index = 0; index < 18; index += 1) {
      const side = index % 2 === 0 ? 1 : -1;
      const gate = this.createAlignedThemeGroup(
        (index / 18 + 0.015) % 1,
        side * (this.halfWidth + 6.2),
        1.2
      );

      const pylon = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 9 + (index % 4) * 1.8, 1.1),
        pylonMaterial
      );
      pylon.position.y = pylon.geometry.parameters.height * 0.5;
      gate.add(pylon);

      const sail = new THREE.Mesh(
        new THREE.PlaneGeometry(8, 12),
        plasmaMaterial
      );
      sail.position.set(side * 2.4, 5.8, 0);
      sail.rotation.y = side > 0 ? -Math.PI * 0.38 : Math.PI * 0.38;
      sail.rotation.z = side > 0 ? -0.12 : 0.12;
      gate.add(sail);

      const arc = new THREE.Mesh(
        new THREE.TorusGeometry(5.6, 0.18, 8, 32, Math.PI * 0.68),
        plasmaMaterial.clone()
      );
      arc.position.set(side * -1.4, 8.8, 0);
      arc.rotation.y = side > 0 ? Math.PI * 0.45 : -Math.PI * 0.45;
      gate.add(arc);
      this.registerThemePulse(arc.material, {
        opacityBase: 0.24,
        opacityAmplitude: 0.12,
        speed: 3.6
      });

      this.group.add(gate);
      this.registerThemeFloater(gate, 0.4, 0.7 + index * 0.03, 'y', index * 0.3);
    }

    for (let index = 0; index < 9; index += 1) {
      const ribbon = new THREE.Mesh(
        new THREE.PlaneGeometry(24, 8),
        plasmaMaterial.clone()
      );
      this.getFrame((index / 9 + 0.06) % 1, this.tempFrame);
      ribbon.position.copy(this.tempFrame.point)
        .addScaledVector(this.tempFrame.right, (index % 2 === 0 ? 1 : -1) * (this.halfWidth + 22))
        .addScaledVector(this.tempFrame.up, 14 + (index % 3) * 3);
      this.tempMatrix.makeBasis(
        this.tempFrame.right,
        this.tempFrame.up,
        this.tempFrame.tangent
      );
      ribbon.quaternion.setFromRotationMatrix(this.tempMatrix);
      ribbon.rotation.z = (index % 2 === 0 ? 1 : -1) * Math.PI * 0.2;
      this.group.add(ribbon);
      this.registerThemePulse(ribbon.material, {
        opacityBase: 0.16,
        opacityAmplitude: 0.08,
        speed: 2.4 + index * 0.18
      });
    }
  }

  addEclipsePalaceRingWorld() {
    const spireMaterial = new THREE.MeshStandardMaterial({
      color: 0x141119,
      emissive: 0x6fdff2,
      emissiveIntensity: 0.26,
      metalness: 0.92,
      roughness: 0.12
    });
    const goldMaterial = new THREE.MeshStandardMaterial({
      color: 0xe5c27a,
      emissive: 0xb88b34,
      emissiveIntensity: 0.44,
      metalness: 0.84,
      roughness: 0.16
    });
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: this.palette.guide,
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.registerThemePulse(glowMaterial, {
      opacityBase: 0.24,
      opacityAmplitude: 0.08,
      speed: 1.4
    });

    for (let index = 0; index < 16; index += 1) {
      const side = index % 2 === 0 ? 1 : -1;
      const pavilion = this.createAlignedThemeGroup(
        (index / 16 + 0.03) % 1,
        side * (this.halfWidth + 22 + (index % 3) * 4),
        1.4 + (index % 2) * 1.8
      );

      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(2.8, 3.5, 1.2, 8),
        goldMaterial
      );
      pavilion.add(base);

      for (let spireIndex = 0; spireIndex < 3; spireIndex += 1) {
        const height = 9 + spireIndex * 3.2 + (index % 4) * 0.8;
        const spire = new THREE.Mesh(
          new THREE.BoxGeometry(1.5 - spireIndex * 0.18, height, 1.5 - spireIndex * 0.18),
          spireMaterial
        );
        spire.position.set(
          (spireIndex - 1) * 3.4,
          height * 0.5 + 0.6,
          (spireIndex % 2 === 0 ? -1 : 1) * 1.6
        );
        pavilion.add(spire);

        const cap = new THREE.Mesh(
          new THREE.ConeGeometry(0.86 - spireIndex * 0.08, 2.2, 6),
          goldMaterial
        );
        cap.position.copy(spire.position).setY(spire.position.y + height * 0.5 + 0.9);
        pavilion.add(cap);
      }

      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(5.6, 0.18, 10, 36, Math.PI * 0.56),
        glowMaterial
      );
      arch.position.set(0, 8.8, 0);
      arch.rotation.x = Math.PI * 0.5;
      pavilion.add(arch);

      const chandelierStem = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 3.4, 0.18),
        goldMaterial
      );
      chandelierStem.position.set(0, 6.2, 0);
      pavilion.add(chandelierStem);

      const chandelier = new THREE.Mesh(
        new THREE.TorusGeometry(1.6, 0.08, 8, 24),
        glowMaterial.clone()
      );
      chandelier.position.set(0, 4.4, 0);
      chandelier.rotation.x = Math.PI * 0.5;
      pavilion.add(chandelier);
      this.registerThemePulse(chandelier.material, {
        opacityBase: 0.26,
        opacityAmplitude: 0.08,
        speed: 1.8
      });

      this.group.add(pavilion);
      this.registerThemeFloater(pavilion, 0.5, 0.4 + index * 0.02, 'y', index * 0.36);
    }

    for (let index = 0; index < 8; index += 1) {
      const disc = new THREE.Mesh(
        new THREE.RingGeometry(8 + (index % 2) * 2.4, 10.8 + (index % 2) * 2.8, 40),
        new THREE.MeshBasicMaterial({
          color: index % 2 === 0 ? this.palette.edge : this.palette.guide,
          transparent: true,
          opacity: index % 2 === 0 ? 0.16 : 0.12,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide
        })
      );
      this.getFrame((index / 8 + 0.1) % 1, this.tempFrame);
      disc.position.copy(this.tempFrame.point)
        .addScaledVector(this.tempFrame.right, (index % 2 === 0 ? 1 : -1) * (this.halfWidth + 30))
        .addScaledVector(this.tempFrame.up, 18 + (index % 3) * 3.8);
      this.tempMatrix.makeBasis(
        this.tempFrame.right,
        this.tempFrame.up,
        this.tempFrame.tangent
      );
      disc.quaternion.setFromRotationMatrix(this.tempMatrix);
      disc.rotation.z = Math.PI * 0.5;
      this.group.add(disc);
      this.registerThemeRotator(disc, 0.06 + index * 0.01, 'z', index * 0.26);
      this.registerThemePulse(disc.material, {
        opacityBase: index % 2 === 0 ? 0.16 : 0.12,
        opacityAmplitude: 0.05,
        speed: 0.9 + index * 0.08
      });
    }
  }

  addAuroraVaultGardenWorld() {
    const pearlMaterial = new THREE.MeshStandardMaterial({
      color: 0xf4edf7,
      emissive: 0x99fff0,
      emissiveIntensity: 0.16,
      metalness: 0.56,
      roughness: 0.14
    });
    const prismMaterial = new THREE.MeshStandardMaterial({
      color: 0xf7f8ff,
      emissive: this.palette.guide,
      emissiveIntensity: 0.4,
      metalness: 0.74,
      roughness: 0.08
    });
    const ribbonMaterial = new THREE.MeshBasicMaterial({
      color: this.palette.guide,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.registerThemePulse(ribbonMaterial, {
      opacityBase: 0.22,
      opacityAmplitude: 0.1,
      speed: 2.2
    });

    for (let index = 0; index < 14; index += 1) {
      const side = index % 2 === 0 ? 1 : -1;
      const court = this.createAlignedThemeGroup(
        (index / 14 + 0.04) % 1,
        side * (this.halfWidth + 18 + (index % 3) * 3),
        4 + (index % 3) * 1.8
      );

      const dais = new THREE.Mesh(
        new THREE.CylinderGeometry(2.2, 3.2, 1, 8),
        pearlMaterial
      );
      court.add(dais);

      for (let prismIndex = 0; prismIndex < 3; prismIndex += 1) {
        const prism = new THREE.Mesh(
          new THREE.BoxGeometry(1.2, 5.2 + prismIndex * 1.8, 1.2),
          prismMaterial
        );
        prism.position.set(
          (prismIndex - 1) * 2.8,
          prism.geometry.parameters.height * 0.5 + 0.4,
          (prismIndex % 2 === 0 ? -1 : 1) * 1.6
        );
        prism.rotation.z = (prismIndex - 1) * 0.14;
        court.add(prism);
      }

      const canopy = new THREE.Mesh(
        new THREE.PlaneGeometry(8.6, 4.8),
        ribbonMaterial
      );
      canopy.position.set(0, 8.8, 0);
      canopy.rotation.x = Math.PI * 0.5;
      court.add(canopy);

      const lightRibbon = new THREE.Mesh(
        new THREE.TorusGeometry(3.4, 0.12, 8, 28, Math.PI * 0.72),
        ribbonMaterial.clone()
      );
      lightRibbon.position.set(0, 6.2, 0);
      lightRibbon.rotation.y = side > 0 ? Math.PI * 0.38 : -Math.PI * 0.38;
      court.add(lightRibbon);
      this.registerThemePulse(lightRibbon.material, {
        opacityBase: 0.24,
        opacityAmplitude: 0.08,
        speed: 2.5
      });

      this.group.add(court);
      this.registerThemeFloater(court, 0.9, 0.55 + index * 0.02, 'y', index * 0.42);
      this.registerThemeRotator(court, 0.04 + index * 0.006, 'y', index * 0.18);
    }

    for (let index = 0; index < 10; index += 1) {
      const ribbon = new THREE.Mesh(
        new THREE.PlaneGeometry(18, 5),
        ribbonMaterial.clone()
      );
      this.getFrame((index / 10 + 0.02) % 1, this.tempFrame);
      ribbon.position.copy(this.tempFrame.point)
        .addScaledVector(this.tempFrame.right, (index % 2 === 0 ? 1 : -1) * (this.halfWidth + 20))
        .addScaledVector(this.tempFrame.up, 15 + (index % 3) * 2.6);
      this.tempMatrix.makeBasis(
        this.tempFrame.right,
        this.tempFrame.up,
        this.tempFrame.tangent
      );
      ribbon.quaternion.setFromRotationMatrix(this.tempMatrix);
      ribbon.rotation.z = (index % 2 === 0 ? 1 : -1) * Math.PI * 0.28;
      this.group.add(ribbon);
      this.registerThemePulse(ribbon.material, {
        opacityBase: 0.18,
        opacityAmplitude: 0.08,
        speed: 2 + index * 0.16
      });
    }
  }

  createRibbonGeometry(width, yOffset, lateralOffset = 0) {
    const rowCount = this.surfaceSegments + 1;
    const positions = new Float32Array(rowCount * 2 * 3);
    const uvs = new Float32Array(rowCount * 2 * 2);
    const indices = [];

    for (let index = 0; index < rowCount; index += 1) {
      const progress = index / this.surfaceSegments;
      this.getFrame(progress, this.tempFrame);

      this.tempLeft.copy(this.tempFrame.point)
        .addScaledVector(this.tempFrame.right, lateralOffset - width * 0.5)
        .addScaledVector(this.tempFrame.up, yOffset);
      this.tempRight.copy(this.tempFrame.point)
        .addScaledVector(this.tempFrame.right, lateralOffset + width * 0.5)
        .addScaledVector(this.tempFrame.up, yOffset);

      const positionBase = index * 6;
      positions[positionBase] = this.tempLeft.x;
      positions[positionBase + 1] = this.tempLeft.y;
      positions[positionBase + 2] = this.tempLeft.z;
      positions[positionBase + 3] = this.tempRight.x;
      positions[positionBase + 4] = this.tempRight.y;
      positions[positionBase + 5] = this.tempRight.z;

      const uvBase = index * 4;
      uvs[uvBase] = 0;
      uvs[uvBase + 1] = progress;
      uvs[uvBase + 2] = 1;
      uvs[uvBase + 3] = progress;

      if (index < this.surfaceSegments) {
        const vertexIndex = index * 2;
        indices.push(
          vertexIndex,
          vertexIndex + 1,
          vertexIndex + 2,
          vertexIndex + 1,
          vertexIndex + 3,
          vertexIndex + 2
        );
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  buildMapProjection() {
    const sampleCount = THREE.MathUtils.clamp(Math.round(this.length * 0.05), 120, 240);
    const rawPoints = [];
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minZ = Number.POSITIVE_INFINITY;
    let maxZ = Number.NEGATIVE_INFINITY;

    for (let index = 0; index < sampleCount; index += 1) {
      const point = this.getPoint(index / sampleCount, this.tempPointA);
      rawPoints.push({ x: point.x, z: point.z });
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minZ = Math.min(minZ, point.z);
      maxZ = Math.max(maxZ, point.z);
    }

    const paddingX = Math.max(8, (maxX - minX) * 0.08);
    const paddingZ = Math.max(8, (maxZ - minZ) * 0.08);
    this.mapBounds = {
      minX: minX - paddingX,
      maxX: maxX + paddingX,
      minZ: minZ - paddingZ,
      maxZ: maxZ + paddingZ
    };

    this.mapPoints = rawPoints.map((point) => this.projectMapCoordinates(point.x, point.z));
  }

  update(time, graphics = {}) {
    const animatedTrack = graphics.animatedTrack !== false;

    for (let index = 0; index < this.zoneVisuals.length; index += 1) {
      const zone = this.zoneVisuals[index];
      const pulse = animatedTrack ? 0.8 + Math.sin(time * 5 + index * 0.9) * 0.18 : 0.9;
      zone.material.emissiveIntensity = pulse * 1.5;
      zone.material.opacity = THREE.MathUtils.clamp(
        zone.baseOpacity + (animatedTrack ? Math.sin(time * 4 + index) * 0.08 : 0),
        0.4,
        0.92
      );
    }

    for (let index = 0; index < this.socketMaterials.length; index += 1) {
      this.socketMaterials[index].opacity = animatedTrack
        ? 0.24 + Math.sin(time * 4 + index * 0.7) * 0.08
        : 0.28;
    }

    for (let index = 0; index < this.shortcutVisuals.length; index += 1) {
      const shortcut = this.shortcutVisuals[index];
      shortcut.material.emissiveIntensity = animatedTrack ? 1 + Math.sin(time * 4.5 + index * 0.6) * 0.22 : 1.08;
      shortcut.material.opacity = THREE.MathUtils.clamp(
        shortcut.baseOpacity + (animatedTrack ? Math.sin(time * 5.8 + index) * 0.08 : 0),
        0.24,
        0.62
      );
    }

    for (const pulse of this.themePulseMaterials) {
      const wave = animatedTrack ? Math.sin(time * pulse.speed + pulse.phase) : 0;

      if (pulse.opacityBase != null && pulse.material.transparent) {
        pulse.material.opacity = Math.max(0, pulse.opacityBase + wave * pulse.opacityAmplitude);
      }

      if (
        pulse.emissiveBase != null &&
        Object.prototype.hasOwnProperty.call(pulse.material, 'emissiveIntensity')
      ) {
        pulse.material.emissiveIntensity = pulse.emissiveBase + wave * pulse.emissiveAmplitude;
      }
    }

    if (!animatedTrack) {
      return;
    }

    for (const rotator of this.themeRotators) {
      rotator.object.rotation[rotator.axis] += rotator.speed * 0.01;
    }

    for (const floater of this.themeFloaters) {
      floater.object.position.copy(floater.basePosition);
      floater.object.position[floater.axis] += Math.sin(time * floater.speed + floater.phase) * floater.amplitude;
    }
  }

  getWrappedProgress(progress) {
    return THREE.MathUtils.euclideanModulo(progress, 1);
  }

  lerpProgress(progressA, progressB, alpha) {
    const delta = THREE.MathUtils.euclideanModulo(progressB - progressA, 1);
    return this.getWrappedProgress(progressA + delta * alpha);
  }

  getProgressRangeDistance(progressA, progressB) {
    return THREE.MathUtils.euclideanModulo(progressB - progressA, 1) * this.length;
  }

  isProgressWithinRange(progress, startProgress, endProgress) {
    const wrapped = this.getWrappedProgress(progress);
    const start = this.getWrappedProgress(startProgress);
    const end = this.getWrappedProgress(endProgress);

    if (start <= end) {
      return wrapped >= start && wrapped <= end;
    }

    return wrapped >= start || wrapped <= end;
  }

  getSectorIndex(progress) {
    const wrapped = this.getWrappedProgress(progress);

    for (let index = 0; index < this.sectorSplits.length; index += 1) {
      if (wrapped < this.sectorSplits[index]) {
        return index;
      }
    }

    return this.sectorSplits.length;
  }

  getSectorCount() {
    return this.sectorSplits.length + 1;
  }

  getShortcutState(ship, shortcut) {
    if (!this.isProgressWithinRange(ship.progress, shortcut.startProgress, shortcut.endProgress)) {
      return null;
    }

    const lateralGap = Math.abs(ship.lateralOffset - shortcut.laneOffset);

    if (lateralGap > shortcut.width) {
      return null;
    }

    const totalDistance = Math.max(1, this.getProgressRangeDistance(shortcut.startProgress, shortcut.endProgress));
    const alongDistance = this.getProgressRangeDistance(shortcut.startProgress, ship.progress);

    return {
      zone: shortcut,
      totalDistance,
      alongDistance,
      normalizedProgress: THREE.MathUtils.clamp(alongDistance / totalDistance, 0, 1),
      lateralGap
    };
  }

  getSignedProgressDelta(progressA, progressB) {
    return THREE.MathUtils.euclideanModulo(progressA - progressB + 0.5, 1) - 0.5;
  }

  getPoint(progress, target = new THREE.Vector3()) {
    return this.curve.getPointAt(this.getWrappedProgress(progress), target);
  }

  projectMapCoordinates(x, z, target = { x: 0, y: 0 }) {
    const width = Math.max(1, this.mapBounds.maxX - this.mapBounds.minX);
    const height = Math.max(1, this.mapBounds.maxZ - this.mapBounds.minZ);
    target.x = (x - this.mapBounds.minX) / width;
    target.y = 1 - (z - this.mapBounds.minZ) / height;
    return target;
  }

  getMapPoint(progress, target = { x: 0, y: 0 }) {
    const point = this.getPoint(progress, this.tempPointA);
    return this.projectMapCoordinates(point.x, point.z, target);
  }

  getTangent(progress, target = new THREE.Vector3()) {
    return this.curve.getTangentAt(this.getWrappedProgress(progress), target).normalize();
  }

  getFrame(progress, target = this.createFrameState()) {
    const wrappedProgress = this.getWrappedProgress(progress);

    this.curve.getPointAt(wrappedProgress, target.point);
    this.curve.getTangentAt(wrappedProgress, target.tangent).normalize();

    target.right.crossVectors(WORLD_UP, target.tangent);

    if (target.right.lengthSq() < 1e-5) {
      target.right.set(1, 0, 0);
    } else {
      target.right.normalize();
    }

    target.up.crossVectors(target.tangent, target.right).normalize();
    return target;
  }

  getCurvature(progress, sampleOffset = 0.012) {
    this.getTangent(progress - sampleOffset, this.tempTangentA);
    this.getTangent(progress + sampleOffset, this.tempTangentB);
    return this.tempTangentA.angleTo(this.tempTangentB);
  }

  isShipInsideZone(ship, zone) {
    const trackGap = Math.abs(this.getSignedProgressDelta(ship.progress, zone.progress) * this.length);
    const lateralGap = Math.abs(ship.lateralOffset - zone.laneOffset);
    return trackGap < zone.length * 0.5 && lateralGap < zone.width;
  }

  getGridSlot(slotIndex) {
    const columns = 3;
    const row = Math.floor(slotIndex / columns);
    const column = slotIndex % columns;
    const usableHalfWidth = Math.min(this.halfWidth * 0.26, 9.5);
    const laneOffset = THREE.MathUtils.lerp(
      -usableHalfWidth,
      usableHalfWidth,
      columns === 1 ? 0.5 : column / (columns - 1)
    );
    const baseDistance = 6.5;
    const rowDistance = baseDistance + row * 10.5;
    const normalizedOffset = -(rowDistance / this.length);

    return {
      progress: normalizedOffset,
      distance: normalizedOffset,
      laneOffset
    };
  }
}
