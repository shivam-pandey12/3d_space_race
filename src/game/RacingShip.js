import * as THREE from 'three';

const DEFAULT_VISUALS = {
  bodyWidth: 1.8,
  bodyHeight: 0.7,
  bodyLength: 2.8,
  noseRadius: 1.28,
  noseLength: 5.6,
  wingSpan: 3.8,
  wingDepth: 1.25,
  finHeight: 1.25
};

export class RacingShip {
  constructor(config) {
    this.config = {
      maxSpeed: 82,
      acceleration: 46,
      friction: 19,
      lateralAcceleration: 35,
      lateralDamping: 4.8,
      startBoostEnergy: 36,
      maxBoostEnergy: 100,
      boostEnergyDrain: 28,
      driftChargeMultiplier: 1,
      driftReleaseMultiplier: 1,
      shieldDurationMultiplier: 1,
      premiumVisuals: false,
      ghost: false,
      advancedVisuals: null,
      shipId: config.shipId ?? 'ship',
      shipName: config.shipName ?? config.label ?? 'Ship',
      manufacturer: config.manufacturer ?? 'Manufacturer',
      manufacturerStyle: config.manufacturerStyle ?? 'aero',
      trailColor: config.glow,
      visuals: DEFAULT_VISUALS,
      ...config,
      visuals: {
        ...DEFAULT_VISUALS,
        ...(config.visuals ?? {})
      }
    };
    this.label = this.config.label ?? 'Pilot';
    this.shipId = this.config.shipId;
    this.shipName = this.config.shipName;
    this.manufacturer = this.config.manufacturer;

    this.root = new THREE.Group();
    this.visual = new THREE.Group();
    this.root.add(this.visual);

    this.speed = 0;
    this.progress = 0;
    this.distance = 0;
    this.startDistance = 0;
    this.lateralOffset = 0;
    this.lateralVelocity = 0;
    this.trackStrain = 0;
    this.launchTimer = 0;
    this.idlePhase = this.config.idlePhase ?? Math.random() * Math.PI * 2;
    this.maxBoostEnergy = this.config.maxBoostEnergy;
    this.boostEnergy = this.config.startBoostEnergy;
    this.boosting = false;
    this.drifting = false;
    this.wasDrifting = false;
    this.driftCharge = 0;
    this.heldItem = null;
    this.shieldTimer = 0;
    this.empTimer = 0;
    this.empSlowFactor = 1;
    this.gravityGlitchTimer = 0;
    this.trackSlowTimer = 0;
    this.trackSlowFactor = 1;
    this.surgeTimer = 0;
    this.surgeSpeedBonus = 0;
    this.surgeAccelerationMultiplier = 1;
    this.boostPadCooldown = 0;
    this.hazardCooldown = 0;
    this.itemCooldown = 0;
    this.nearMissCooldown = 0;
    this.nearMissFlash = 0;
    this.driftBurstTimer = 0;
    this.boostPadFlashTimer = 0;
    this.hazardFlashTimer = 0;
    this.impactFlashTimer = 0;
    this.draftTimer = 0;
    this.draftStrength = 0;
    this.shortcutTimer = 0;
    this.shortcutSpeedBonus = 0;
    this.shortcutGripBonus = 0;
    this.shortcutLabel = '';
    this.contactPulseTimer = 0;
    this.contactPulseStrength = 0;

    this.frame = {
      point: new THREE.Vector3(),
      tangent: new THREE.Vector3(),
      right: new THREE.Vector3(),
      up: new THREE.Vector3()
    };

    this.targetPosition = new THREE.Vector3();
    this.engineTargetScale = new THREE.Vector3(1, 1, 1);
    this.trailTargetScale = new THREE.Vector3(1, 1, 1);
    this.lookMatrix = new THREE.Matrix4();
    this.forwardAxis = new THREE.Vector3();
    this.targetQuaternion = new THREE.Quaternion();
    this.glowStripMaterials = [];
    this.advancedPatternMaterials = [];
    this.advancedVisualRoot = null;
    this.engineHalo = null;
    this.accentMaterial = null;
    this.visualYawOffset = Math.PI;

    this.buildModel();
    this.applyAdvancedVisuals();

    if (this.config.ghost) {
      this.applyGhostStyle();
    }
  }

  buildModel() {
    const visuals = this.config.visuals;
    const engineRadius = visuals.bodyWidth * 0.24 + visuals.bodyHeight * 0.12;
    const trailLength = 5 + visuals.bodyLength * 0.9;
    this.glowStripMaterials = [];

    if (this.config.premiumVisuals) {
      this.buildPremiumModel(visuals, engineRadius, trailLength);
    } else {
      this.buildStandardModel(visuals, engineRadius, trailLength);
    }

    this.shieldBubble = new THREE.Mesh(
      new THREE.SphereGeometry(Math.max(2.5, visuals.wingSpan * 0.68), 18, 18),
      new THREE.MeshBasicMaterial({
        color: 0x7feeff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    this.shieldBubble.visible = false;
    this.visual.add(this.shieldBubble);
  }

  applyAdvancedVisuals() {
    const advanced = this.config.advancedVisuals ?? null;

    if (!advanced) {
      return;
    }

    this.advancedVisualRoot = new THREE.Group();
    this.visual.add(this.advancedVisualRoot);

    if (advanced.skinColor && this.hullMaterial) {
      this.hullMaterial.color.setHex(advanced.skinColor);
      this.hullMaterial.emissive.setHex(advanced.emissive ?? advanced.skinColor);
      this.hullMaterial.metalness = advanced.metalness ?? this.hullMaterial.metalness;
      this.hullMaterial.roughness = advanced.roughness ?? this.hullMaterial.roughness;
    }

    if (advanced.engineColor && this.engineGlow?.material) {
      this.engineGlow.material.color.setHex(advanced.engineColor);
    }

    if (advanced.trailColor && this.trailGlow?.material) {
      this.trailGlow.material.color.setHex(advanced.trailColor);
      this.config.trailColor = advanced.trailColor;
    }

    if (advanced.cockpitColor && this.canopyMaterial) {
      this.canopyMaterial.emissive.setHex(advanced.cockpitColor);
      this.canopyMaterial.color.setHex(advanced.cockpitColor);
    }

    if (advanced.decalColor) {
      this.addAdvancedDecal(advanced);
    }

    if (advanced.badgeColor) {
      this.addAdvancedBadge(advanced.badgeColor);
    }

    if (advanced.plateColor || advanced.numberPlate) {
      this.addAdvancedNumberPlate(advanced);
    }

    if (advanced.patternColor) {
      this.addAdvancedPattern(advanced);
    }
  }

  addAdvancedDecal(advanced) {
    const material = new THREE.MeshBasicMaterial({
      color: advanced.decalColor,
      transparent: true,
      opacity: 0.62,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const shape = advanced.decalShape === 'crest'
      ? new THREE.CircleGeometry(0.34, 5)
      : new THREE.PlaneGeometry(1.4, 0.16);
    const decal = new THREE.Mesh(shape, material);
    decal.position.set(0, 0.82, -0.45);
    decal.rotation.x = -Math.PI * 0.5;

    if (advanced.decalShape === 'chevron') {
      decal.rotation.z = Math.PI * 0.25;
    }

    this.advancedVisualRoot.add(decal);
  }

  addAdvancedBadge(color) {
    const badge = new THREE.Mesh(
      new THREE.CircleGeometry(0.22, 14),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.74,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    badge.position.set(-0.62, 0.72, 0.54);
    badge.rotation.x = -Math.PI * 0.5;
    this.advancedVisualRoot.add(badge);
  }

  addAdvancedNumberPlate(advanced) {
    const plate = advanced.numberPlate ?? { digits: '07', tag: 'ACE' };
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 96;
    const context = canvas.getContext('2d');

    context.fillStyle = `#${(advanced.plateAccent ?? 0x102236).toString(16).padStart(6, '0')}`;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = `#${(advanced.plateColor ?? 0x8defff).toString(16).padStart(6, '0')}`;
    context.lineWidth = 8;
    context.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
    context.fillStyle = context.strokeStyle;
    context.font = 'bold 40px sans-serif';
    context.textAlign = 'center';
    context.fillText(`${plate.tag}-${plate.digits}`, canvas.width / 2, 60);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.24, 0.42),
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    mesh.position.set(0, 0.46, 1.55);
    mesh.rotation.x = -0.2;
    this.advancedVisualRoot.add(mesh);
  }

  addAdvancedPattern(advanced) {
    const material = new THREE.MeshBasicMaterial({
      color: advanced.patternColor,
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.34, 0.025, 8, 42), material);
    ring.position.set(0, 0.08, 0.12);
    ring.rotation.x = Math.PI * 0.5;
    ring.userData.patternSpeed = advanced.patternSpeed ?? 1;
    this.advancedPatternMaterials.push(material);
    this.advancedVisualRoot.add(ring);
  }

  buildStandardModel(visuals, engineRadius, trailLength) {
    this.visual.scale.set(1, 1, 1);
    this.hullMaterial = new THREE.MeshStandardMaterial({
      color: this.config.color,
      emissive: this.config.emissive,
      emissiveIntensity: 1.35,
      metalness: 0.32,
      roughness: 0.24
    });

    this.canopyMaterial = new THREE.MeshStandardMaterial({
      color: 0xe7fbff,
      emissive: this.config.emissive,
      emissiveIntensity: 0.72,
      metalness: 0.08,
      roughness: 0.14
    });

    this.trimMaterial = new THREE.MeshStandardMaterial({
      color: this.config.color,
      emissive: this.config.glow,
      emissiveIntensity: 0.95,
      metalness: 0.24,
      roughness: 0.28
    });
    this.accentMaterial = this.trimMaterial;

    const hull = new THREE.Mesh(
      new THREE.ConeGeometry(visuals.noseRadius, visuals.noseLength, 10),
      this.hullMaterial
    );
    hull.rotation.x = -Math.PI / 2;
    hull.position.z = -visuals.noseLength * 0.34;
    this.visual.add(hull);

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth, visuals.bodyHeight, visuals.bodyLength),
      this.hullMaterial
    );
    body.position.z = visuals.bodyLength * 0.22;
    this.visual.add(body);

    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(
        visuals.bodyWidth * 0.64,
        visuals.bodyHeight * 1.08,
        visuals.bodyLength * 0.66
      ),
      this.canopyMaterial
    );
    canopy.position.set(0, visuals.bodyHeight * 0.82, visuals.bodyLength * 0.04);
    this.visual.add(canopy);

    const wingGeometry = new THREE.BoxGeometry(visuals.wingSpan * 0.58, 0.18, visuals.wingDepth);
    const leftWing = new THREE.Mesh(wingGeometry, this.hullMaterial);
    leftWing.position.set(-visuals.bodyWidth * 0.94, -0.12, visuals.bodyLength * 0.25);
    this.visual.add(leftWing);

    const rightWing = leftWing.clone();
    rightWing.position.x *= -1;
    this.visual.add(rightWing);

    const fin = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, visuals.finHeight, visuals.bodyLength * 0.42),
      this.trimMaterial
    );
    fin.position.set(0, visuals.finHeight * 0.5, visuals.bodyLength * 0.42);
    this.visual.add(fin);

    const engineCore = new THREE.Mesh(
      new THREE.CylinderGeometry(engineRadius * 0.52, engineRadius, visuals.bodyLength * 0.96, 14, 1, true),
      new THREE.MeshBasicMaterial({
        color: this.config.glow,
        transparent: true,
        opacity: 0.56,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    engineCore.rotation.x = Math.PI / 2;
    engineCore.position.z = visuals.bodyLength * 0.94;
    this.engineGlow = engineCore;
    this.engineBaseScale = engineCore.scale.clone();
    this.visual.add(engineCore);

    this.trailGlow = new THREE.Mesh(
      new THREE.CylinderGeometry(engineRadius * 0.2, engineRadius * 0.82, trailLength, 12, 1, true),
      new THREE.MeshBasicMaterial({
        color: this.config.trailColor,
        transparent: true,
        opacity: 0.24,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    this.trailGlow.rotation.x = Math.PI / 2;
    this.trailGlow.position.z = visuals.bodyLength * 1.7 + trailLength * 0.44;
    this.trailBaseScale = this.trailGlow.scale.clone();
    this.visual.add(this.trailGlow);
  }

  buildPremiumModel(visuals, engineRadius, trailLength) {
    this.hullMaterial = new THREE.MeshStandardMaterial({
      color: 0x090d15,
      emissive: 0x040811,
      emissiveIntensity: 0.62,
      metalness: 0.96,
      roughness: 0.1
    });

    this.accentMaterial = new THREE.MeshStandardMaterial({
      color: this.config.color,
      emissive: this.config.emissive,
      emissiveIntensity: 1.36,
      metalness: 0.78,
      roughness: 0.14
    });

    this.canopyMaterial = new THREE.MeshStandardMaterial({
      color: 0x121b28,
      emissive: 0x194165,
      emissiveIntensity: 0.52,
      metalness: 0.84,
      roughness: 0.06
    });

    this.trimMaterial = new THREE.MeshStandardMaterial({
      color: 0x121926,
      emissive: this.config.glow,
      emissiveIntensity: 1.34,
      metalness: 0.82,
      roughness: 0.1
    });

    const glowStripMaterial = new THREE.MeshBasicMaterial({
      color: this.config.glow,
      transparent: true,
      opacity: 0.62,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.glowStripMaterials.push(glowStripMaterial);

    const glowStripMaterialWarm = new THREE.MeshBasicMaterial({
      color: this.config.trailColor,
      transparent: true,
      opacity: 0.46,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.glowStripMaterials.push(glowStripMaterialWarm);
    const parts = {
      visuals,
      engineRadius,
      trailLength,
      coolStripMaterial: glowStripMaterial,
      warmStripMaterial: glowStripMaterialWarm
    };

    if (this.config.shipId === 'eclipse-viper') {
      this.buildVectorPremium(parts);
      this.addEclipseViperSignature(parts);
      return;
    }

    if (this.config.shipId === 'riftblade') {
      this.buildGhostwirePremium(parts);
      this.addRiftbladeSignature(parts);
      return;
    }

    if (this.config.shipId === 'astral-monarch') {
      this.buildImperionPremium(parts);
      this.addAstralMonarchSignature(parts);
      return;
    }

    if (this.config.shipId === 'solar-phantom') {
      this.buildSolsticePremium(parts);
      this.addSolarPhantomSignature(parts);
      return;
    }

    if (this.config.shipId === 'obsidian-halo') {
      this.buildAtlasPremium(parts);
      this.addObsidianHaloSignature(parts);
      return;
    }

    if (this.config.shipId === 'solstice') {
      this.buildSolsticePremium(parts);
      return;
    }

    if (this.config.shipId === 'velour') {
      this.buildVelourPremium(parts);
      return;
    }

    if (this.config.shipId === 'imperion') {
      this.buildImperionPremium(parts);
      return;
    }

    if (this.config.shipId === 'vector') {
      this.buildVectorPremium(parts);
      return;
    }

    if (this.config.shipId === 'atlas') {
      this.buildAtlasPremium(parts);
      return;
    }

    if (this.config.shipId === 'ghostwire') {
      this.buildGhostwirePremium(parts);
      return;
    }

    if (this.config.shipId === 'nova') {
      this.buildNovaPremium(parts);
      return;
    }

    this.buildStarlingPremium(parts);
  }

  attachEngineEffects(engineRadius, trailLength, {
    coreRadius = 1,
    coreTipRadius = 0.28,
    coreLength = 4.2,
    coreZ = 4.8,
    haloRadius = 1.5,
    haloTipRadius = 1,
    haloLength = 2.4,
    haloZ = 5.2,
    trailRadius = 0.84,
    trailTipRadius = 0.18,
    trailLengthScale = 1,
    trailZ = 8,
    coreOpacity = 0.82,
    haloOpacity = 0.42,
    trailOpacity = 0.34
  } = {}) {
    this.engineGlow = new THREE.Mesh(
      new THREE.CylinderGeometry(
        engineRadius * coreTipRadius,
        engineRadius * coreRadius,
        coreLength,
        14,
        1,
        true
      ),
      new THREE.MeshBasicMaterial({
        color: this.config.glow,
        transparent: true,
        opacity: coreOpacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    this.engineGlow.rotation.x = Math.PI / 2;
    this.engineGlow.position.z = coreZ;
    this.engineBaseScale = this.engineGlow.scale.clone();
    this.visual.add(this.engineGlow);

    this.engineHalo = new THREE.Mesh(
      new THREE.CylinderGeometry(
        engineRadius * haloTipRadius,
        engineRadius * haloRadius,
        haloLength,
        14,
        1,
        true
      ),
      new THREE.MeshBasicMaterial({
        color: this.config.trailColor,
        transparent: true,
        opacity: haloOpacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    this.engineHalo.rotation.x = Math.PI / 2;
    this.engineHalo.position.z = haloZ;
    this.engineHaloBaseScale = this.engineHalo.scale.clone();
    this.visual.add(this.engineHalo);

    this.trailGlow = new THREE.Mesh(
      new THREE.CylinderGeometry(
        engineRadius * trailTipRadius,
        engineRadius * trailRadius,
        trailLength * trailLengthScale,
        12,
        1,
        true
      ),
      new THREE.MeshBasicMaterial({
        color: this.config.trailColor,
        transparent: true,
        opacity: trailOpacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    this.trailGlow.rotation.x = Math.PI / 2;
    this.trailGlow.position.z = trailZ;
    this.trailBaseScale = this.trailGlow.scale.clone();
    this.visual.add(this.trailGlow);
  }

  createPremiumGlowMaterial(color = this.config.glow, opacity = 0.35) {
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.glowStripMaterials.push(material);
    return material;
  }

  addEclipseViperSignature({ visuals, engineRadius, coolStripMaterial, warmStripMaterial }) {
    const venomMaterial = this.createPremiumGlowMaterial(this.config.trailColor, 0.42);
    const stingerGeometry = new THREE.BoxGeometry(visuals.bodyWidth * 0.08, 0.08, visuals.noseLength * 1.28);

    for (const side of [-1, 1]) {
      const stinger = new THREE.Mesh(stingerGeometry, this.accentMaterial);
      stinger.position.set(side * visuals.bodyWidth * 0.74, -visuals.bodyHeight * 0.12, -visuals.bodyLength * 1.92);
      stinger.rotation.y = side * -0.28;
      this.visual.add(stinger);

      const venomRail = new THREE.Mesh(
        new THREE.BoxGeometry(visuals.wingSpan * 0.5, 0.045, visuals.wingDepth * 1.9),
        side < 0 ? warmStripMaterial : coolStripMaterial
      );
      venomRail.position.set(side * visuals.bodyWidth * 1.98, visuals.bodyHeight * 0.14, visuals.bodyLength * 0.52);
      venomRail.rotation.set(-0.08, side * -0.78, side * 0.2);
      this.visual.add(venomRail);

      const sideEngine = new THREE.Mesh(
        new THREE.CylinderGeometry(engineRadius * 0.26, engineRadius * 0.52, visuals.bodyLength * 0.92, 12, 1, true),
        venomMaterial
      );
      sideEngine.rotation.x = Math.PI / 2;
      sideEngine.position.set(side * visuals.bodyWidth * 1.08, -visuals.bodyHeight * 0.16, visuals.bodyLength * 1.64);
      this.visual.add(sideEngine);
    }

    const dorsalFang = new THREE.Mesh(
      new THREE.ConeGeometry(visuals.bodyWidth * 0.16, visuals.finHeight * 2.15, 5),
      this.trimMaterial
    );
    dorsalFang.position.set(0, visuals.finHeight * 1.2, visuals.bodyLength * 0.16);
    dorsalFang.rotation.x = -0.18;
    this.visual.add(dorsalFang);
  }

  addRiftbladeSignature({ visuals, engineRadius, coolStripMaterial, warmStripMaterial }) {
    const riftMaterial = this.createPremiumGlowMaterial(0x9bf6ff, 0.28);
    const crescentGeometry = new THREE.TorusGeometry(engineRadius * 2.65, 0.06, 8, 42, Math.PI * 1.18);

    for (const side of [-1, 1]) {
      const crescent = new THREE.Mesh(crescentGeometry, riftMaterial);
      crescent.position.set(side * visuals.bodyWidth * 1.82, visuals.bodyHeight * 0.18, visuals.bodyLength * 0.24);
      crescent.rotation.set(Math.PI * 0.5, side * Math.PI * 0.54, side * Math.PI * 0.18);
      this.visual.add(crescent);

      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(visuals.wingSpan * 0.72, 0.055, visuals.wingDepth * 3.2),
        this.accentMaterial
      );
      blade.position.set(side * visuals.bodyWidth * 2.02, -visuals.bodyHeight * 0.06, visuals.bodyLength * 0.38);
      blade.rotation.set(-0.05, side * -0.86, side * 0.28);
      this.visual.add(blade);

      const bladeGlow = new THREE.Mesh(
        new THREE.BoxGeometry(visuals.wingSpan * 0.46, 0.035, visuals.wingDepth * 2.4),
        side < 0 ? coolStripMaterial : warmStripMaterial
      );
      bladeGlow.position.set(side * visuals.bodyWidth * 2.12, visuals.bodyHeight * 0.05, visuals.bodyLength * 0.18);
      bladeGlow.rotation.copy(blade.rotation);
      this.visual.add(bladeGlow);
    }

    const riftSpine = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 0.07, visuals.bodyHeight * 0.055, visuals.bodyLength * 3.28),
      warmStripMaterial
    );
    riftSpine.position.set(0, visuals.bodyHeight * 1.02, -visuals.bodyLength * 0.08);
    this.visual.add(riftSpine);
  }

  addAstralMonarchSignature({ visuals, engineRadius, coolStripMaterial, warmStripMaterial }) {
    const crownMaterial = this.createPremiumGlowMaterial(0xffe0a0, 0.34);
    const crownRing = new THREE.Mesh(
      new THREE.TorusGeometry(engineRadius * 3.35, 0.08, 10, 56),
      crownMaterial
    );
    crownRing.position.set(0, visuals.bodyHeight * 0.34, visuals.bodyLength * 0.72);
    crownRing.rotation.x = Math.PI * 0.5;
    this.visual.add(crownRing);

    for (const side of [-1, 1]) {
      const solarSail = new THREE.Mesh(
        new THREE.BoxGeometry(visuals.wingSpan * 0.84, 0.045, visuals.wingDepth * 2.85),
        side < 0 ? warmStripMaterial : coolStripMaterial
      );
      solarSail.position.set(side * visuals.bodyWidth * 1.92, visuals.bodyHeight * 0.26, visuals.bodyLength * 0.36);
      solarSail.rotation.set(-0.14, side * -0.46, side * 0.34);
      this.visual.add(solarSail);

      const crownSpire = new THREE.Mesh(
        new THREE.ConeGeometry(visuals.bodyWidth * 0.1, visuals.finHeight * 1.82, 5),
        this.accentMaterial
      );
      crownSpire.position.set(side * visuals.bodyWidth * 0.44, visuals.finHeight * 1.12, -visuals.bodyLength * 0.18);
      crownSpire.rotation.z = side * -0.16;
      this.visual.add(crownSpire);
    }

    const jewel = new THREE.Mesh(
      new THREE.SphereGeometry(engineRadius * 0.48, 14, 10),
      crownMaterial
    );
    jewel.position.set(0, visuals.bodyHeight * 1.1, -visuals.bodyLength * 0.58);
    this.visual.add(jewel);
  }

  addSolarPhantomSignature({ visuals, engineRadius, coolStripMaterial, warmStripMaterial }) {
    const glassMaterial = this.createPremiumGlowMaterial(0xfff1c5, 0.24);
    const veilGeometry = new THREE.BoxGeometry(visuals.wingSpan * 0.72, 0.035, visuals.wingDepth * 2.92);

    for (const side of [-1, 1]) {
      const veil = new THREE.Mesh(veilGeometry, glassMaterial);
      veil.position.set(side * visuals.bodyWidth * 1.78, visuals.bodyHeight * 0.22, visuals.bodyLength * 0.06);
      veil.rotation.set(-0.18, side * -0.62, side * 0.42);
      this.visual.add(veil);

      const sunNeedle = new THREE.Mesh(
        new THREE.ConeGeometry(engineRadius * 0.18, visuals.bodyLength * 1.28, 6),
        this.accentMaterial
      );
      sunNeedle.rotation.x = -Math.PI / 2;
      sunNeedle.position.set(side * visuals.bodyWidth * 1.04, -visuals.bodyHeight * 0.06, -visuals.bodyLength * 1.28);
      sunNeedle.rotation.z = side * 0.12;
      this.visual.add(sunNeedle);
    }

    const solarHalo = new THREE.Mesh(
      new THREE.TorusGeometry(engineRadius * 2.38, 0.07, 10, 38, Math.PI * 1.35),
      warmStripMaterial
    );
    solarHalo.position.set(0, visuals.bodyHeight * 0.12, visuals.bodyLength * 1.58);
    solarHalo.rotation.x = Math.PI * 0.5;
    this.visual.add(solarHalo);

    const canopyRail = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 0.1, visuals.bodyHeight * 0.055, visuals.bodyLength * 2.7),
      coolStripMaterial
    );
    canopyRail.position.set(0, visuals.bodyHeight * 1.08, -visuals.bodyLength * 0.04);
    this.visual.add(canopyRail);
  }

  addObsidianHaloSignature({ visuals, engineRadius, coolStripMaterial, warmStripMaterial }) {
    const voidMaterial = this.createPremiumGlowMaterial(0xb8a6ff, 0.3);
    const mainHalo = new THREE.Mesh(
      new THREE.TorusGeometry(engineRadius * 3.65, 0.16, 12, 64),
      voidMaterial
    );
    mainHalo.position.set(0, visuals.bodyHeight * 0.18, visuals.bodyLength * 0.94);
    mainHalo.rotation.x = Math.PI * 0.5;
    this.visual.add(mainHalo);

    const innerHalo = new THREE.Mesh(
      new THREE.TorusGeometry(engineRadius * 2.25, 0.07, 10, 48),
      coolStripMaterial
    );
    innerHalo.position.copy(mainHalo.position);
    innerHalo.rotation.copy(mainHalo.rotation);
    this.visual.add(innerHalo);

    for (const side of [-1, 1]) {
      const gravityPod = new THREE.Mesh(
        new THREE.BoxGeometry(visuals.bodyWidth * 0.64, visuals.bodyHeight * 0.58, visuals.bodyLength * 1.34),
        this.hullMaterial
      );
      gravityPod.position.set(side * visuals.bodyWidth * 1.42, -visuals.bodyHeight * 0.02, visuals.bodyLength * 0.38);
      gravityPod.rotation.z = side * 0.08;
      this.visual.add(gravityPod);

      const podCore = new THREE.Mesh(
        new THREE.CylinderGeometry(engineRadius * 0.32, engineRadius * 0.58, visuals.bodyLength * 0.86, 12, 1, true),
        warmStripMaterial
      );
      podCore.rotation.x = Math.PI / 2;
      podCore.position.set(side * visuals.bodyWidth * 1.42, -visuals.bodyHeight * 0.18, visuals.bodyLength * 1.18);
      this.visual.add(podCore);
    }

    const voidSpine = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 0.18, visuals.finHeight * 2.25, visuals.bodyLength * 0.42),
      this.trimMaterial
    );
    voidSpine.position.set(0, visuals.finHeight * 1.08, visuals.bodyLength * 0.18);
    this.visual.add(voidSpine);
  }

  buildStarlingPremium({ visuals, engineRadius, trailLength, coolStripMaterial, warmStripMaterial }) {
    this.visual.scale.set(1.04, 1.02, 1.14);

    const fuselage = new THREE.Mesh(
      new THREE.CapsuleGeometry(visuals.bodyWidth * 0.34, visuals.bodyLength * 1.44, 4, 10),
      this.hullMaterial
    );
    fuselage.rotation.x = Math.PI / 2;
    fuselage.position.z = -visuals.bodyLength * 0.08;
    this.visual.add(fuselage);

    const dorsalDeck = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 0.92, visuals.bodyHeight * 0.52, visuals.bodyLength * 1.18),
      this.hullMaterial
    );
    dorsalDeck.position.set(0, visuals.bodyHeight * 0.34, -visuals.bodyLength * 0.08);
    dorsalDeck.rotation.x = -0.16;
    this.visual.add(dorsalDeck);

    const bellyBlade = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 0.34, visuals.bodyHeight * 0.26, visuals.bodyLength * 2.08),
      this.hullMaterial
    );
    bellyBlade.position.set(0, -visuals.bodyHeight * 0.26, visuals.bodyLength * 0.16);
    this.visual.add(bellyBlade);

    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(visuals.noseRadius * 0.6, visuals.noseLength * 1.04, 8),
      this.hullMaterial
    );
    nose.rotation.x = -Math.PI / 2;
    nose.position.z = -visuals.bodyLength * 1.52;
    this.visual.add(nose);

    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 0.52, visuals.bodyHeight * 0.58, visuals.bodyLength * 0.82),
      this.canopyMaterial
    );
    canopy.position.set(0, visuals.bodyHeight * 0.72, -visuals.bodyLength * 0.22);
    canopy.rotation.x = -0.2;
    this.visual.add(canopy);

    const wingGeometry = new THREE.BoxGeometry(visuals.wingSpan * 0.76, 0.14, visuals.wingDepth * 2.42);
    const leftWing = new THREE.Mesh(wingGeometry, this.hullMaterial);
    leftWing.position.set(-visuals.bodyWidth * 1.42, 0.02, visuals.bodyLength * 0.18);
    leftWing.rotation.set(-0.12, -0.34, 0.34);
    this.visual.add(leftWing);

    const rightWing = leftWing.clone();
    rightWing.position.x *= -1;
    rightWing.rotation.y *= -1;
    rightWing.rotation.z *= -1;
    this.visual.add(rightWing);

    const leftWingAccent = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.wingSpan * 0.58, 0.08, visuals.wingDepth * 1.56),
      this.accentMaterial
    );
    leftWingAccent.position.set(-visuals.bodyWidth * 1.36, 0.12, visuals.bodyLength * 0.08);
    leftWingAccent.rotation.copy(leftWing.rotation);
    this.visual.add(leftWingAccent);

    const rightWingAccent = leftWingAccent.clone();
    rightWingAccent.position.x *= -1;
    rightWingAccent.rotation.y *= -1;
    rightWingAccent.rotation.z *= -1;
    this.visual.add(rightWingAccent);

    const leftCanard = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.wingSpan * 0.2, 0.08, visuals.wingDepth * 0.9),
      this.trimMaterial
    );
    leftCanard.position.set(-visuals.bodyWidth * 0.82, 0.1, -visuals.bodyLength * 1.02);
    leftCanard.rotation.set(0.08, -0.42, 0.34);
    this.visual.add(leftCanard);

    const rightCanard = leftCanard.clone();
    rightCanard.position.x *= -1;
    rightCanard.rotation.y *= -1;
    rightCanard.rotation.z *= -1;
    this.visual.add(rightCanard);

    const tailplane = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.wingSpan * 0.42, 0.08, visuals.wingDepth * 0.62),
      this.trimMaterial
    );
    tailplane.position.set(0, visuals.bodyHeight * 0.18, visuals.bodyLength * 1.18);
    this.visual.add(tailplane);

    const dorsalStrip = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 0.08, visuals.bodyHeight * 0.06, visuals.bodyLength * 2),
      coolStripMaterial
    );
    dorsalStrip.position.set(0, visuals.bodyHeight * 0.96, visuals.bodyLength * 0.16);
    this.visual.add(dorsalStrip);

    const leftWingStrip = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.wingSpan * 0.48, 0.05, visuals.wingDepth * 0.96),
      warmStripMaterial
    );
    leftWingStrip.position.set(-visuals.bodyWidth * 1.52, 0.1, visuals.bodyLength * 0.18);
    leftWingStrip.rotation.copy(leftWing.rotation);
    this.visual.add(leftWingStrip);

    const rightWingStrip = leftWingStrip.clone();
    rightWingStrip.position.x *= -1;
    rightWingStrip.rotation.y *= -1;
    rightWingStrip.rotation.z *= -1;
    this.visual.add(rightWingStrip);

    this.attachEngineEffects(engineRadius, trailLength, {
      coreRadius: 0.98,
      coreTipRadius: 0.28,
      coreLength: visuals.bodyLength * 1.38,
      coreZ: visuals.bodyLength * 1.7,
      haloRadius: 1.42,
      haloTipRadius: 0.98,
      haloLength: visuals.bodyLength * 0.86,
      haloZ: visuals.bodyLength * 1.94,
      trailRadius: 0.8,
      trailTipRadius: 0.18,
      trailLengthScale: 1.06,
      trailZ: visuals.bodyLength * 2.32 + trailLength * 0.38
    });
  }

  buildVectorPremium({ visuals, engineRadius, trailLength, coolStripMaterial }) {
    this.visual.scale.set(1.02, 1, 1.22);

    const spine = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 0.28, visuals.bodyHeight * 0.28, visuals.bodyLength * 2.76),
      this.hullMaterial
    );
    spine.position.z = -visuals.bodyLength * 0.08;
    this.visual.add(spine);

    const centerHull = new THREE.Mesh(
      new THREE.CapsuleGeometry(visuals.bodyWidth * 0.22, visuals.bodyLength * 1.08, 4, 8),
      this.hullMaterial
    );
    centerHull.rotation.x = Math.PI / 2;
    centerHull.position.z = visuals.bodyLength * 0.22;
    this.visual.add(centerHull);

    const noseSpike = new THREE.Mesh(
      new THREE.ConeGeometry(visuals.noseRadius * 0.36, visuals.noseLength * 1.42, 6),
      this.accentMaterial
    );
    noseSpike.rotation.x = -Math.PI / 2;
    noseSpike.position.z = -visuals.bodyLength * 2.18;
    this.visual.add(noseSpike);

    const forkGeometry = new THREE.BoxGeometry(visuals.bodyWidth * 0.08, visuals.bodyHeight * 0.08, visuals.noseLength * 1.2);
    const leftFork = new THREE.Mesh(forkGeometry, this.trimMaterial);
    leftFork.position.set(-visuals.bodyWidth * 0.28, -visuals.bodyHeight * 0.06, -visuals.bodyLength * 1.62);
    leftFork.rotation.y = -0.16;
    this.visual.add(leftFork);

    const rightFork = leftFork.clone();
    rightFork.position.x *= -1;
    rightFork.rotation.y *= -1;
    this.visual.add(rightFork);

    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 0.34, visuals.bodyHeight * 0.44, visuals.bodyLength * 0.74),
      this.canopyMaterial
    );
    canopy.position.set(0, visuals.bodyHeight * 0.66, -visuals.bodyLength * 0.22);
    canopy.rotation.x = -0.24;
    this.visual.add(canopy);

    const bladeWingGeometry = new THREE.BoxGeometry(visuals.wingSpan * 0.86, 0.08, visuals.wingDepth * 2.76);
    const leftBlade = new THREE.Mesh(bladeWingGeometry, this.hullMaterial);
    leftBlade.position.set(-visuals.bodyWidth * 1.72, -0.04, visuals.bodyLength * 0.42);
    leftBlade.rotation.set(-0.08, -0.6, 0.22);
    this.visual.add(leftBlade);

    const rightBlade = leftBlade.clone();
    rightBlade.position.x *= -1;
    rightBlade.rotation.y *= -1;
    rightBlade.rotation.z *= -1;
    this.visual.add(rightBlade);

    const leftBladeEdge = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.wingSpan * 0.74, 0.04, visuals.wingDepth * 1.64),
      this.accentMaterial
    );
    leftBladeEdge.position.set(-visuals.bodyWidth * 1.68, 0.06, visuals.bodyLength * 0.26);
    leftBladeEdge.rotation.copy(leftBlade.rotation);
    this.visual.add(leftBladeEdge);

    const rightBladeEdge = leftBladeEdge.clone();
    rightBladeEdge.position.x *= -1;
    rightBladeEdge.rotation.y *= -1;
    rightBladeEdge.rotation.z *= -1;
    this.visual.add(rightBladeEdge);

    const dorsalBlade = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 0.08, visuals.finHeight * 1.9, visuals.bodyLength * 1.18),
      this.trimMaterial
    );
    dorsalBlade.position.set(0, visuals.finHeight * 0.8, visuals.bodyLength * 0.18);
    this.visual.add(dorsalBlade);

    const rearBlade = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 0.06, visuals.finHeight * 1.24, visuals.bodyLength * 0.52),
      this.accentMaterial
    );
    rearBlade.position.set(0, visuals.finHeight * 0.42, visuals.bodyLength * 1.22);
    this.visual.add(rearBlade);

    const sensorLine = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 0.05, visuals.bodyHeight * 0.04, visuals.bodyLength * 2.86),
      coolStripMaterial
    );
    sensorLine.position.set(0, visuals.bodyHeight * 0.94, visuals.bodyLength * 0.08);
    this.visual.add(sensorLine);

    this.attachEngineEffects(engineRadius, trailLength, {
      coreRadius: 0.76,
      coreTipRadius: 0.18,
      coreLength: visuals.bodyLength * 1.76,
      coreZ: visuals.bodyLength * 1.96,
      haloRadius: 1.04,
      haloTipRadius: 0.64,
      haloLength: visuals.bodyLength * 0.72,
      haloZ: visuals.bodyLength * 2.12,
      trailRadius: 0.64,
      trailTipRadius: 0.14,
      trailLengthScale: 1.12,
      trailZ: visuals.bodyLength * 2.5 + trailLength * 0.38
    });
  }

  buildAtlasPremium({ visuals, engineRadius, trailLength, coolStripMaterial, warmStripMaterial }) {
    this.visual.scale.set(1.16, 1.1, 1.08);

    const blockCore = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 0.84, visuals.bodyHeight * 0.78, visuals.bodyLength * 1.46),
      this.hullMaterial
    );
    blockCore.position.z = -visuals.bodyLength * 0.08;
    this.visual.add(blockCore);

    const armorBridge = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 1.22, visuals.bodyHeight * 0.42, visuals.bodyLength * 1.04),
      this.hullMaterial
    );
    armorBridge.position.set(0, visuals.bodyHeight * 0.08, visuals.bodyLength * 0.42);
    this.visual.add(armorBridge);

    const cargoSpine = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 0.2, visuals.finHeight * 0.94, visuals.bodyLength * 1.34),
      this.accentMaterial
    );
    cargoSpine.position.set(0, visuals.finHeight * 0.32, visuals.bodyLength * 0.2);
    this.visual.add(cargoSpine);

    const noseRam = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 0.42, visuals.bodyHeight * 0.28, visuals.noseLength * 1.06),
      this.trimMaterial
    );
    noseRam.position.set(0, -visuals.bodyHeight * 0.04, -visuals.bodyLength * 1.42);
    noseRam.rotation.x = -0.08;
    this.visual.add(noseRam);

    const noseWedge = new THREE.Mesh(
      new THREE.ConeGeometry(visuals.noseRadius * 0.54, visuals.noseLength * 0.84, 4),
      this.hullMaterial
    );
    noseWedge.rotation.x = -Math.PI / 2;
    noseWedge.position.z = -visuals.bodyLength * 1.96;
    this.visual.add(noseWedge);

    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 0.52, visuals.bodyHeight * 0.36, visuals.bodyLength * 0.72),
      this.canopyMaterial
    );
    canopy.position.set(0, visuals.bodyHeight * 0.66, -visuals.bodyLength * 0.26);
    canopy.rotation.x = -0.16;
    this.visual.add(canopy);

    const shoulderGeometry = new THREE.BoxGeometry(visuals.bodyWidth * 0.58, visuals.bodyHeight * 0.58, visuals.bodyLength * 1.42);
    const leftShoulder = new THREE.Mesh(shoulderGeometry, this.hullMaterial);
    leftShoulder.position.set(-visuals.bodyWidth * 1.16, visuals.bodyHeight * 0.08, visuals.bodyLength * 0.18);
    this.visual.add(leftShoulder);

    const rightShoulder = leftShoulder.clone();
    rightShoulder.position.x *= -1;
    this.visual.add(rightShoulder);

    const leftThrusterPod = new THREE.Mesh(
      new THREE.CylinderGeometry(engineRadius * 0.56, engineRadius * 0.72, visuals.bodyLength * 1.62, 8),
      this.hullMaterial
    );
    leftThrusterPod.rotation.x = Math.PI / 2;
    leftThrusterPod.position.set(-visuals.bodyWidth * 1.18, -visuals.bodyHeight * 0.12, visuals.bodyLength * 0.98);
    this.visual.add(leftThrusterPod);

    const rightThrusterPod = leftThrusterPod.clone();
    rightThrusterPod.position.x *= -1;
    this.visual.add(rightThrusterPod);

    const hammerWingGeometry = new THREE.BoxGeometry(visuals.wingSpan * 0.54, 0.16, visuals.wingDepth * 1.18);
    const leftHammer = new THREE.Mesh(hammerWingGeometry, this.accentMaterial);
    leftHammer.position.set(-visuals.bodyWidth * 1.88, -visuals.bodyHeight * 0.06, visuals.bodyLength * 0.18);
    leftHammer.rotation.set(0.04, -0.2, 0.08);
    this.visual.add(leftHammer);

    const rightHammer = leftHammer.clone();
    rightHammer.position.x *= -1;
    rightHammer.rotation.y *= -1;
    rightHammer.rotation.z *= -1;
    this.visual.add(rightHammer);

    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 1.72, visuals.bodyHeight * 0.16, visuals.bodyLength * 0.44),
      this.trimMaterial
    );
    rail.position.set(0, -visuals.bodyHeight * 0.4, visuals.bodyLength * 1.18);
    this.visual.add(rail);

    const ventStrip = new THREE.Mesh(
      new THREE.BoxGeometry(engineRadius * 3.2, engineRadius * 0.2, visuals.bodyLength * 0.34),
      warmStripMaterial
    );
    ventStrip.position.set(0, -visuals.bodyHeight * 0.24, visuals.bodyLength * 1.56);
    this.visual.add(ventStrip);

    const dorsalStrip = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 0.12, visuals.bodyHeight * 0.08, visuals.bodyLength * 1.74),
      coolStripMaterial
    );
    dorsalStrip.position.set(0, visuals.bodyHeight * 0.84, visuals.bodyLength * 0.22);
    this.visual.add(dorsalStrip);

    this.attachEngineEffects(engineRadius, trailLength, {
      coreRadius: 1.12,
      coreTipRadius: 0.34,
      coreLength: visuals.bodyLength * 1.58,
      coreZ: visuals.bodyLength * 1.98,
      haloRadius: 1.7,
      haloTipRadius: 1.14,
      haloLength: visuals.bodyLength * 0.9,
      haloZ: visuals.bodyLength * 2.18,
      trailRadius: 0.94,
      trailTipRadius: 0.22,
      trailLengthScale: 1.18,
      trailZ: visuals.bodyLength * 2.48 + trailLength * 0.42,
      coreOpacity: 0.86,
      haloOpacity: 0.46,
      trailOpacity: 0.38
    });

    const leftSideNozzle = new THREE.Mesh(
      new THREE.CylinderGeometry(engineRadius * 0.24, engineRadius * 0.34, visuals.bodyLength * 0.44, 8, 1, true),
      this.trimMaterial
    );
    leftSideNozzle.rotation.x = Math.PI / 2;
    leftSideNozzle.position.set(-visuals.bodyWidth * 1.18, -visuals.bodyHeight * 0.08, visuals.bodyLength * 1.78);
    this.visual.add(leftSideNozzle);

    const rightSideNozzle = leftSideNozzle.clone();
    rightSideNozzle.position.x *= -1;
    this.visual.add(rightSideNozzle);
  }

  buildGhostwirePremium({ visuals, engineRadius, trailLength, coolStripMaterial, warmStripMaterial }) {
    this.visual.scale.set(1, 0.98, 1.28);

    const spine = new THREE.Mesh(
      new THREE.CapsuleGeometry(visuals.bodyWidth * 0.18, visuals.bodyLength * 1.82, 4, 8),
      this.hullMaterial
    );
    spine.rotation.x = Math.PI / 2;
    spine.position.z = visuals.bodyLength * 0.08;
    this.visual.add(spine);

    const phantomShell = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 0.58, visuals.bodyHeight * 0.34, visuals.bodyLength * 1.46),
      this.canopyMaterial
    );
    phantomShell.position.set(0, visuals.bodyHeight * 0.2, -visuals.bodyLength * 0.08);
    phantomShell.rotation.x = -0.12;
    this.visual.add(phantomShell);

    const needle = new THREE.Mesh(
      new THREE.ConeGeometry(visuals.noseRadius * 0.28, visuals.noseLength * 1.56, 6),
      this.trimMaterial
    );
    needle.rotation.x = -Math.PI / 2;
    needle.position.z = -visuals.bodyLength * 2.26;
    this.visual.add(needle);

    const cockpit = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 0.28, visuals.bodyHeight * 0.3, visuals.bodyLength * 0.74),
      this.canopyMaterial
    );
    cockpit.position.set(0, visuals.bodyHeight * 0.56, -visuals.bodyLength * 0.18);
    cockpit.rotation.x = -0.22;
    this.visual.add(cockpit);

    const veilGeometry = new THREE.BoxGeometry(visuals.wingSpan * 0.64, 0.05, visuals.wingDepth * 3.18);
    const leftVeil = new THREE.Mesh(veilGeometry, this.canopyMaterial);
    leftVeil.position.set(-visuals.bodyWidth * 1.94, 0.18, visuals.bodyLength * 0.18);
    leftVeil.rotation.set(-0.16, -0.68, 0.44);
    this.visual.add(leftVeil);

    const rightVeil = leftVeil.clone();
    rightVeil.position.x *= -1;
    rightVeil.rotation.y *= -1;
    rightVeil.rotation.z *= -1;
    this.visual.add(rightVeil);

    const leftBoom = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 0.08, visuals.bodyHeight * 0.08, visuals.bodyLength * 1.86),
      this.hullMaterial
    );
    leftBoom.position.set(-visuals.bodyWidth * 0.58, -visuals.bodyHeight * 0.12, visuals.bodyLength * 0.42);
    leftBoom.rotation.y = -0.08;
    this.visual.add(leftBoom);

    const rightBoom = leftBoom.clone();
    rightBoom.position.x *= -1;
    rightBoom.rotation.y *= -1;
    this.visual.add(rightBoom);

    const spineGlow = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 0.12, visuals.bodyHeight * 0.05, visuals.bodyLength * 2.42),
      coolStripMaterial
    );
    spineGlow.position.set(0, visuals.bodyHeight * 0.34, visuals.bodyLength * 0.02);
    this.visual.add(spineGlow);

    const leftVeilGlow = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.wingSpan * 0.36, 0.04, visuals.wingDepth * 1.3),
      warmStripMaterial
    );
    leftVeilGlow.position.set(-visuals.bodyWidth * 2.02, 0.14, visuals.bodyLength * 0.16);
    leftVeilGlow.rotation.copy(leftVeil.rotation);
    this.visual.add(leftVeilGlow);

    const rightVeilGlow = leftVeilGlow.clone();
    rightVeilGlow.position.x *= -1;
    rightVeilGlow.rotation.y *= -1;
    rightVeilGlow.rotation.z *= -1;
    this.visual.add(rightVeilGlow);

    const hushRing = new THREE.Mesh(
      new THREE.TorusGeometry(engineRadius * 1.94, 0.1, 10, 28),
      new THREE.MeshBasicMaterial({
        color: this.config.glow,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    hushRing.position.set(0, 0, visuals.bodyLength * 1.86);
    hushRing.rotation.x = Math.PI * 0.5;
    this.visual.add(hushRing);
    this.glowStripMaterials.push(hushRing.material);

    this.attachEngineEffects(engineRadius, trailLength, {
      coreRadius: 0.86,
      coreTipRadius: 0.18,
      coreLength: visuals.bodyLength * 1.62,
      coreZ: visuals.bodyLength * 1.92,
      haloRadius: 1.24,
      haloTipRadius: 0.7,
      haloLength: visuals.bodyLength * 0.78,
      haloZ: visuals.bodyLength * 2.06,
      trailRadius: 0.62,
      trailTipRadius: 0.12,
      trailLengthScale: 1.24,
      trailZ: visuals.bodyLength * 2.42 + trailLength * 0.42,
      coreOpacity: 0.76,
      haloOpacity: 0.28,
      trailOpacity: 0.26
    });
  }

  buildNovaPremium({ visuals, engineRadius, trailLength, coolStripMaterial, warmStripMaterial }) {
    this.visual.scale.set(1.08, 1.04, 1.24);

    const centralSpear = new THREE.Mesh(
      new THREE.CapsuleGeometry(visuals.bodyWidth * 0.24, visuals.bodyLength * 1.72, 4, 10),
      this.hullMaterial
    );
    centralSpear.rotation.x = Math.PI / 2;
    centralSpear.position.z = -visuals.bodyLength * 0.12;
    this.visual.add(centralSpear);

    const topShield = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 0.62, visuals.bodyHeight * 0.32, visuals.bodyLength * 1.04),
      this.accentMaterial
    );
    topShield.position.set(0, visuals.bodyHeight * 0.34, visuals.bodyLength * 0.08);
    topShield.rotation.x = -0.14;
    this.visual.add(topShield);

    const spearNose = new THREE.Mesh(
      new THREE.ConeGeometry(visuals.noseRadius * 0.42, visuals.noseLength * 1.48, 6),
      this.trimMaterial
    );
    spearNose.rotation.x = -Math.PI / 2;
    spearNose.position.z = -visuals.bodyLength * 2.22;
    this.visual.add(spearNose);

    const crest = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 0.22, visuals.finHeight * 1.9, visuals.bodyLength * 0.52),
      this.trimMaterial
    );
    crest.position.set(0, visuals.finHeight * 0.78, -visuals.bodyLength * 0.12);
    this.visual.add(crest);

    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 0.34, visuals.bodyHeight * 0.42, visuals.bodyLength * 0.7),
      this.canopyMaterial
    );
    canopy.position.set(0, visuals.bodyHeight * 0.68, -visuals.bodyLength * 0.18);
    canopy.rotation.x = -0.2;
    this.visual.add(canopy);

    const haloGeometry = new THREE.TorusGeometry(engineRadius * 2.02, 0.14, 10, 32);
    const leftHalo = new THREE.Mesh(
      haloGeometry,
      new THREE.MeshBasicMaterial({
        color: this.config.glow,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    leftHalo.position.set(-visuals.bodyWidth * 1.34, 0.14, visuals.bodyLength * 0.92);
    leftHalo.rotation.y = Math.PI * 0.5;
    this.visual.add(leftHalo);

    const rightHalo = leftHalo.clone();
    rightHalo.position.x *= -1;
    this.visual.add(rightHalo);
    this.glowStripMaterials.push(leftHalo.material, rightHalo.material);

    const leftScythe = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.wingSpan * 0.62, 0.08, visuals.wingDepth * 2.14),
      this.hullMaterial
    );
    leftScythe.position.set(-visuals.bodyWidth * 1.46, -visuals.bodyHeight * 0.06, visuals.bodyLength * 0.32);
    leftScythe.rotation.set(-0.04, -0.82, 0.42);
    this.visual.add(leftScythe);

    const rightScythe = leftScythe.clone();
    rightScythe.position.x *= -1;
    rightScythe.rotation.y *= -1;
    rightScythe.rotation.z *= -1;
    this.visual.add(rightScythe);

    const flareFin = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.wingSpan * 0.92, 0.06, visuals.wingDepth * 0.54),
      this.accentMaterial
    );
    flareFin.position.set(0, -visuals.bodyHeight * 0.08, visuals.bodyLength * 1.22);
    flareFin.rotation.x = 0.14;
    this.visual.add(flareFin);

    const centerGlow = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 0.1, visuals.bodyHeight * 0.06, visuals.bodyLength * 2.1),
      coolStripMaterial
    );
    centerGlow.position.set(0, visuals.bodyHeight * 0.92, visuals.bodyLength * 0.08);
    this.visual.add(centerGlow);

    const bellyGlow = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.wingSpan * 0.58, 0.04, visuals.wingDepth * 0.64),
      warmStripMaterial
    );
    bellyGlow.position.set(0, -visuals.bodyHeight * 0.18, visuals.bodyLength * 1.2);
    this.visual.add(bellyGlow);

    this.attachEngineEffects(engineRadius, trailLength, {
      coreRadius: 1.02,
      coreTipRadius: 0.24,
      coreLength: visuals.bodyLength * 1.72,
      coreZ: visuals.bodyLength * 2.02,
      haloRadius: 1.52,
      haloTipRadius: 0.92,
      haloLength: visuals.bodyLength * 0.84,
      haloZ: visuals.bodyLength * 2.16,
      trailRadius: 0.86,
      trailTipRadius: 0.16,
      trailLengthScale: 1.3,
      trailZ: visuals.bodyLength * 2.58 + trailLength * 0.44,
      coreOpacity: 0.84,
      haloOpacity: 0.44,
      trailOpacity: 0.36
    });
  }

  buildSolsticePremium({ visuals, engineRadius, trailLength, coolStripMaterial, warmStripMaterial }) {
    this.visual.scale.set(1.12, 1.05, 1.22);

    const royalGoldMaterial = new THREE.MeshBasicMaterial({
      color: 0xffd89b,
      transparent: true,
      opacity: 0.44,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.glowStripMaterials.push(royalGoldMaterial);

    const centralFuselage = new THREE.Mesh(
      new THREE.CapsuleGeometry(visuals.bodyWidth * 0.28, visuals.bodyLength * 1.82, 4, 10),
      this.hullMaterial
    );
    centralFuselage.rotation.x = Math.PI / 2;
    centralFuselage.position.z = -visuals.bodyLength * 0.04;
    this.visual.add(centralFuselage);

    const royalDeck = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 0.76, visuals.bodyHeight * 0.38, visuals.bodyLength * 1.34),
      this.accentMaterial
    );
    royalDeck.position.set(0, visuals.bodyHeight * 0.26, visuals.bodyLength * 0.08);
    royalDeck.rotation.x = -0.12;
    this.visual.add(royalDeck);

    const undersideBlade = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 0.26, visuals.bodyHeight * 0.18, visuals.bodyLength * 2.12),
      this.hullMaterial
    );
    undersideBlade.position.set(0, -visuals.bodyHeight * 0.22, visuals.bodyLength * 0.18);
    this.visual.add(undersideBlade);

    const regalNose = new THREE.Mesh(
      new THREE.ConeGeometry(visuals.noseRadius * 0.52, visuals.noseLength * 1.18, 8),
      this.trimMaterial
    );
    regalNose.rotation.x = -Math.PI / 2;
    regalNose.position.z = -visuals.bodyLength * 1.96;
    this.visual.add(regalNose);

    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 0.38, visuals.bodyHeight * 0.42, visuals.bodyLength * 0.82),
      this.canopyMaterial
    );
    canopy.position.set(0, visuals.bodyHeight * 0.64, -visuals.bodyLength * 0.16);
    canopy.rotation.x = -0.18;
    this.visual.add(canopy);

    const shoulderGeometry = new THREE.BoxGeometry(visuals.wingSpan * 0.72, 0.12, visuals.wingDepth * 2.08);
    const leftShoulderWing = new THREE.Mesh(shoulderGeometry, this.hullMaterial);
    leftShoulderWing.position.set(-visuals.bodyWidth * 1.46, 0.08, visuals.bodyLength * 0.28);
    leftShoulderWing.rotation.set(-0.08, -0.46, 0.26);
    this.visual.add(leftShoulderWing);

    const rightShoulderWing = leftShoulderWing.clone();
    rightShoulderWing.position.x *= -1;
    rightShoulderWing.rotation.y *= -1;
    rightShoulderWing.rotation.z *= -1;
    this.visual.add(rightShoulderWing);

    const lowerWingGeometry = new THREE.BoxGeometry(visuals.wingSpan * 0.56, 0.08, visuals.wingDepth * 1.46);
    const leftLowerWing = new THREE.Mesh(lowerWingGeometry, this.accentMaterial);
    leftLowerWing.position.set(-visuals.bodyWidth * 1.28, -visuals.bodyHeight * 0.04, visuals.bodyLength * 0.56);
    leftLowerWing.rotation.set(0.04, -0.34, 0.16);
    this.visual.add(leftLowerWing);

    const rightLowerWing = leftLowerWing.clone();
    rightLowerWing.position.x *= -1;
    rightLowerWing.rotation.y *= -1;
    rightLowerWing.rotation.z *= -1;
    this.visual.add(rightLowerWing);

    const dorsalFin = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 0.1, visuals.finHeight * 1.4, visuals.bodyLength * 0.78),
      this.trimMaterial
    );
    dorsalFin.position.set(0, visuals.finHeight * 0.58, visuals.bodyLength * 0.34);
    this.visual.add(dorsalFin);

    const crownRail = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 0.08, visuals.bodyHeight * 0.06, visuals.bodyLength * 2.42),
      coolStripMaterial
    );
    crownRail.position.set(0, visuals.bodyHeight * 0.92, visuals.bodyLength * 0.16);
    this.visual.add(crownRail);

    const goldSpine = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 0.16, visuals.bodyHeight * 0.04, visuals.bodyLength * 1.92),
      royalGoldMaterial
    );
    goldSpine.position.set(0, visuals.bodyHeight * 0.74, visuals.bodyLength * 0.12);
    this.visual.add(goldSpine);

    const leftRibbon = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.wingSpan * 0.58, 0.04, visuals.wingDepth * 0.84),
      warmStripMaterial
    );
    leftRibbon.position.set(-visuals.bodyWidth * 1.56, 0.16, visuals.bodyLength * 0.26);
    leftRibbon.rotation.copy(leftShoulderWing.rotation);
    this.visual.add(leftRibbon);

    const rightRibbon = leftRibbon.clone();
    rightRibbon.position.x *= -1;
    rightRibbon.rotation.y *= -1;
    rightRibbon.rotation.z *= -1;
    this.visual.add(rightRibbon);

    const haloTail = new THREE.Mesh(
      new THREE.TorusGeometry(engineRadius * 2.14, 0.12, 10, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffe4b8,
        transparent: true,
        opacity: 0.32,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    haloTail.position.set(0, 0.02, visuals.bodyLength * 2.02);
    haloTail.rotation.x = Math.PI * 0.5;
    this.visual.add(haloTail);
    this.glowStripMaterials.push(haloTail.material);

    this.attachEngineEffects(engineRadius, trailLength, {
      coreRadius: 1.06,
      coreTipRadius: 0.28,
      coreLength: visuals.bodyLength * 1.62,
      coreZ: visuals.bodyLength * 1.92,
      haloRadius: 1.62,
      haloTipRadius: 1.06,
      haloLength: visuals.bodyLength * 0.88,
      haloZ: visuals.bodyLength * 2.12,
      trailRadius: 0.88,
      trailTipRadius: 0.18,
      trailLengthScale: 1.18,
      trailZ: visuals.bodyLength * 2.54 + trailLength * 0.42,
      coreOpacity: 0.82,
      haloOpacity: 0.4,
      trailOpacity: 0.34
    });
  }

  buildVelourPremium({ visuals, engineRadius, trailLength, coolStripMaterial, warmStripMaterial }) {
    this.visual.scale.set(1.02, 0.98, 1.32);

    const glassSpineMaterial = new THREE.MeshBasicMaterial({
      color: 0xbff6ff,
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.glowStripMaterials.push(glassSpineMaterial);

    const centerSpine = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 0.22, visuals.bodyHeight * 0.2, visuals.bodyLength * 2.84),
      this.hullMaterial
    );
    centerSpine.position.z = visuals.bodyLength * 0.08;
    this.visual.add(centerSpine);

    const glassyDeck = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 0.44, visuals.bodyHeight * 0.42, visuals.bodyLength * 1.02),
      this.canopyMaterial
    );
    glassyDeck.position.set(0, visuals.bodyHeight * 0.54, -visuals.bodyLength * 0.12);
    glassyDeck.rotation.x = -0.2;
    this.visual.add(glassyDeck);

    const leftNeedle = new THREE.Mesh(
      new THREE.ConeGeometry(visuals.noseRadius * 0.2, visuals.noseLength * 1.5, 6),
      this.trimMaterial
    );
    leftNeedle.rotation.x = -Math.PI / 2;
    leftNeedle.position.set(-visuals.bodyWidth * 0.18, 0, -visuals.bodyLength * 2.42);
    leftNeedle.rotation.z = Math.PI * 0.04;
    this.visual.add(leftNeedle);

    const rightNeedle = leftNeedle.clone();
    rightNeedle.position.x *= -1;
    rightNeedle.rotation.z *= -1;
    this.visual.add(rightNeedle);

    const centerNeedle = new THREE.Mesh(
      new THREE.ConeGeometry(visuals.noseRadius * 0.14, visuals.noseLength * 1.18, 6),
      this.accentMaterial
    );
    centerNeedle.rotation.x = -Math.PI / 2;
    centerNeedle.position.z = -visuals.bodyLength * 2.08;
    this.visual.add(centerNeedle);

    const ribbonGeometry = new THREE.BoxGeometry(visuals.wingSpan * 0.88, 0.04, visuals.wingDepth * 3.24);
    const leftRibbonBlade = new THREE.Mesh(ribbonGeometry, this.hullMaterial);
    leftRibbonBlade.position.set(-visuals.bodyWidth * 2.02, 0.04, visuals.bodyLength * 0.2);
    leftRibbonBlade.rotation.set(-0.16, -0.84, 0.56);
    this.visual.add(leftRibbonBlade);

    const rightRibbonBlade = leftRibbonBlade.clone();
    rightRibbonBlade.position.x *= -1;
    rightRibbonBlade.rotation.y *= -1;
    rightRibbonBlade.rotation.z *= -1;
    this.visual.add(rightRibbonBlade);

    const leftEdgeLine = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.wingSpan * 0.66, 0.03, visuals.wingDepth * 1.82),
      coolStripMaterial
    );
    leftEdgeLine.position.set(-visuals.bodyWidth * 2.1, 0.12, visuals.bodyLength * 0.14);
    leftEdgeLine.rotation.copy(leftRibbonBlade.rotation);
    this.visual.add(leftEdgeLine);

    const rightEdgeLine = leftEdgeLine.clone();
    rightEdgeLine.position.x *= -1;
    rightEdgeLine.rotation.y *= -1;
    rightEdgeLine.rotation.z *= -1;
    this.visual.add(rightEdgeLine);

    const leftUnderRibbon = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.wingSpan * 0.54, 0.03, visuals.wingDepth * 1.1),
      warmStripMaterial
    );
    leftUnderRibbon.position.set(-visuals.bodyWidth * 1.78, -visuals.bodyHeight * 0.08, visuals.bodyLength * 0.44);
    leftUnderRibbon.rotation.set(0.06, -0.62, 0.36);
    this.visual.add(leftUnderRibbon);

    const rightUnderRibbon = leftUnderRibbon.clone();
    rightUnderRibbon.position.x *= -1;
    rightUnderRibbon.rotation.y *= -1;
    rightUnderRibbon.rotation.z *= -1;
    this.visual.add(rightUnderRibbon);

    const dorsalSpine = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 0.1, visuals.finHeight * 1.82, visuals.bodyLength * 0.9),
      glassSpineMaterial
    );
    dorsalSpine.position.set(0, visuals.finHeight * 0.68, visuals.bodyLength * 0.08);
    this.visual.add(dorsalSpine);

    const tailBlade = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 0.08, visuals.finHeight * 1.12, visuals.bodyLength * 0.48),
      this.accentMaterial
    );
    tailBlade.position.set(0, visuals.finHeight * 0.34, visuals.bodyLength * 1.28);
    this.visual.add(tailBlade);

    const sensorRail = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 0.04, visuals.bodyHeight * 0.04, visuals.bodyLength * 3.02),
      coolStripMaterial
    );
    sensorRail.position.set(0, visuals.bodyHeight * 1.02, visuals.bodyLength * 0.06);
    this.visual.add(sensorRail);

    this.attachEngineEffects(engineRadius, trailLength, {
      coreRadius: 0.72,
      coreTipRadius: 0.14,
      coreLength: visuals.bodyLength * 1.94,
      coreZ: visuals.bodyLength * 2.06,
      haloRadius: 0.98,
      haloTipRadius: 0.52,
      haloLength: visuals.bodyLength * 0.68,
      haloZ: visuals.bodyLength * 2.24,
      trailRadius: 0.56,
      trailTipRadius: 0.1,
      trailLengthScale: 1.28,
      trailZ: visuals.bodyLength * 2.74 + trailLength * 0.42,
      coreOpacity: 0.78,
      haloOpacity: 0.24,
      trailOpacity: 0.24
    });
  }

  buildImperionPremium({ visuals, engineRadius, trailLength, coolStripMaterial, warmStripMaterial }) {
    this.visual.scale.set(1.16, 1.1, 1.28);

    const ceremonialHaloMaterial = new THREE.MeshBasicMaterial({
      color: 0xffe1aa,
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.glowStripMaterials.push(ceremonialHaloMaterial);

    const broadSpear = new THREE.Mesh(
      new THREE.CapsuleGeometry(visuals.bodyWidth * 0.32, visuals.bodyLength * 1.88, 4, 10),
      this.hullMaterial
    );
    broadSpear.rotation.x = Math.PI / 2;
    broadSpear.position.z = -visuals.bodyLength * 0.08;
    this.visual.add(broadSpear);

    const throneDeck = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 0.82, visuals.bodyHeight * 0.4, visuals.bodyLength * 1.16),
      this.accentMaterial
    );
    throneDeck.position.set(0, visuals.bodyHeight * 0.3, visuals.bodyLength * 0.04);
    throneDeck.rotation.x = -0.12;
    this.visual.add(throneDeck);

    const spearNose = new THREE.Mesh(
      new THREE.ConeGeometry(visuals.noseRadius * 0.48, visuals.noseLength * 1.34, 6),
      this.trimMaterial
    );
    spearNose.rotation.x = -Math.PI / 2;
    spearNose.position.z = -visuals.bodyLength * 2.18;
    this.visual.add(spearNose);

    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 0.4, visuals.bodyHeight * 0.42, visuals.bodyLength * 0.76),
      this.canopyMaterial
    );
    canopy.position.set(0, visuals.bodyHeight * 0.7, -visuals.bodyLength * 0.14);
    canopy.rotation.x = -0.18;
    this.visual.add(canopy);

    const leftHalo = new THREE.Mesh(
      new THREE.TorusGeometry(engineRadius * 2.3, 0.16, 10, 34),
      ceremonialHaloMaterial
    );
    leftHalo.position.set(-visuals.bodyWidth * 1.5, 0.1, visuals.bodyLength * 0.9);
    leftHalo.rotation.y = Math.PI * 0.5;
    this.visual.add(leftHalo);

    const rightHalo = leftHalo.clone();
    rightHalo.position.x *= -1;
    this.visual.add(rightHalo);

    const sideBladeGeometry = new THREE.BoxGeometry(visuals.wingSpan * 0.68, 0.1, visuals.wingDepth * 2.22);
    const leftSideBlade = new THREE.Mesh(sideBladeGeometry, this.hullMaterial);
    leftSideBlade.position.set(-visuals.bodyWidth * 1.56, -visuals.bodyHeight * 0.04, visuals.bodyLength * 0.26);
    leftSideBlade.rotation.set(-0.04, -0.72, 0.3);
    this.visual.add(leftSideBlade);

    const rightSideBlade = leftSideBlade.clone();
    rightSideBlade.position.x *= -1;
    rightSideBlade.rotation.y *= -1;
    rightSideBlade.rotation.z *= -1;
    this.visual.add(rightSideBlade);

    const leftSideGlow = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.wingSpan * 0.52, 0.05, visuals.wingDepth * 1.08),
      warmStripMaterial
    );
    leftSideGlow.position.set(-visuals.bodyWidth * 1.7, 0.02, visuals.bodyLength * 0.18);
    leftSideGlow.rotation.copy(leftSideBlade.rotation);
    this.visual.add(leftSideGlow);

    const rightSideGlow = leftSideGlow.clone();
    rightSideGlow.position.x *= -1;
    rightSideGlow.rotation.y *= -1;
    rightSideGlow.rotation.z *= -1;
    this.visual.add(rightSideGlow);

    const crownFin = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 0.18, visuals.finHeight * 2.14, visuals.bodyLength * 0.54),
      this.trimMaterial
    );
    crownFin.position.set(0, visuals.finHeight * 0.86, -visuals.bodyLength * 0.08);
    this.visual.add(crownFin);

    const rearCrownGeometry = new THREE.BoxGeometry(visuals.bodyWidth * 0.1, visuals.finHeight * 1.62, visuals.bodyLength * 0.44);
    const leftRearCrown = new THREE.Mesh(rearCrownGeometry, this.accentMaterial);
    leftRearCrown.position.set(-visuals.bodyWidth * 0.42, visuals.finHeight * 0.58, visuals.bodyLength * 1.16);
    leftRearCrown.rotation.z = -0.16;
    this.visual.add(leftRearCrown);

    const rightRearCrown = leftRearCrown.clone();
    rightRearCrown.position.x *= -1;
    rightRearCrown.rotation.z *= -1;
    this.visual.add(rightRearCrown);

    const imperialRail = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 0.12, visuals.bodyHeight * 0.06, visuals.bodyLength * 2.48),
      coolStripMaterial
    );
    imperialRail.position.set(0, visuals.bodyHeight * 0.96, visuals.bodyLength * 0.08);
    this.visual.add(imperialRail);

    const bellyCrest = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.wingSpan * 0.94, 0.06, visuals.wingDepth * 0.5),
      this.accentMaterial
    );
    bellyCrest.position.set(0, -visuals.bodyHeight * 0.08, visuals.bodyLength * 1.34);
    bellyCrest.rotation.x = 0.14;
    this.visual.add(bellyCrest);

    this.attachEngineEffects(engineRadius, trailLength, {
      coreRadius: 1.22,
      coreTipRadius: 0.32,
      coreLength: visuals.bodyLength * 2.04,
      coreZ: visuals.bodyLength * 2.18,
      haloRadius: 1.9,
      haloTipRadius: 1.24,
      haloLength: visuals.bodyLength * 1.02,
      haloZ: visuals.bodyLength * 2.38,
      trailRadius: 1.04,
      trailTipRadius: 0.2,
      trailLengthScale: 1.42,
      trailZ: visuals.bodyLength * 2.96 + trailLength * 0.48,
      coreOpacity: 0.92,
      haloOpacity: 0.52,
      trailOpacity: 0.42
    });
  }

  addManufacturerKit(visuals, engineRadius) {
    const style = this.config.manufacturerStyle ?? 'aero';

    if (style === 'industrial') {
      this.addIndustrialKit(visuals, engineRadius);
      return;
    }

    if (style === 'interceptor') {
      this.addInterceptorKit(visuals, engineRadius);
      return;
    }

    if (style === 'phantom') {
      this.addPhantomKit(visuals, engineRadius);
      return;
    }

    if (style === 'exotic') {
      this.addExoticKit(visuals, engineRadius);
      return;
    }

    this.addAeroKit(visuals, engineRadius);
  }

  addAeroKit(visuals, engineRadius) {
    const chine = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 0.64, visuals.bodyHeight * 0.12, visuals.bodyLength * 0.96),
      this.accentMaterial
    );
    chine.position.set(0, visuals.bodyHeight * 0.16, -visuals.bodyLength * 0.52);
    chine.rotation.x = -0.22;
    this.visual.add(chine);

    const stabilizer = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 1.24, 0.08, visuals.wingDepth * 0.84),
      this.trimMaterial
    );
    stabilizer.position.set(0, visuals.bodyHeight * 0.22, visuals.bodyLength * 1.18);
    this.visual.add(stabilizer);

    const wakeRing = new THREE.Mesh(
      new THREE.TorusGeometry(engineRadius * 2.1, 0.1, 10, 28),
      new THREE.MeshBasicMaterial({
        color: this.config.glow,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    wakeRing.position.set(0, 0, visuals.bodyLength * 1.92);
    wakeRing.rotation.x = Math.PI * 0.5;
    this.visual.add(wakeRing);
    this.glowStripMaterials.push(wakeRing.material);
  }

  addIndustrialKit(visuals, engineRadius) {
    const shoulderGeometry = new THREE.BoxGeometry(
      visuals.bodyWidth * 0.54,
      visuals.bodyHeight * 0.5,
      visuals.bodyLength * 1.18
    );
    const leftShoulder = new THREE.Mesh(shoulderGeometry, this.hullMaterial);
    leftShoulder.position.set(-visuals.bodyWidth * 1.18, visuals.bodyHeight * 0.18, visuals.bodyLength * 0.18);
    this.visual.add(leftShoulder);

    const rightShoulder = leftShoulder.clone();
    rightShoulder.position.x *= -1;
    this.visual.add(rightShoulder);

    const cargoRail = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 1.46, visuals.bodyHeight * 0.2, visuals.bodyLength * 0.42),
      this.accentMaterial
    );
    cargoRail.position.set(0, -visuals.bodyHeight * 0.34, visuals.bodyLength * 1.06);
    this.visual.add(cargoRail);

    const ventGlow = new THREE.Mesh(
      new THREE.BoxGeometry(engineRadius * 2.8, engineRadius * 0.18, visuals.bodyLength * 0.28),
      new THREE.MeshBasicMaterial({
        color: this.config.trailColor,
        transparent: true,
        opacity: 0.34,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    ventGlow.position.set(0, -visuals.bodyHeight * 0.2, visuals.bodyLength * 1.48);
    this.visual.add(ventGlow);
    this.glowStripMaterials.push(ventGlow.material);
  }

  addInterceptorKit(visuals, engineRadius) {
    const splitterGeometry = new THREE.BoxGeometry(
      visuals.bodyWidth * 0.12,
      visuals.bodyHeight * 0.12,
      visuals.bodyLength * 1.4
    );
    const leftSplitter = new THREE.Mesh(splitterGeometry, this.trimMaterial);
    leftSplitter.position.set(-visuals.bodyWidth * 0.48, -visuals.bodyHeight * 0.12, -visuals.bodyLength * 1.58);
    leftSplitter.rotation.y = -0.14;
    this.visual.add(leftSplitter);

    const rightSplitter = leftSplitter.clone();
    rightSplitter.position.x *= -1;
    rightSplitter.rotation.y *= -1;
    this.visual.add(rightSplitter);

    const dorsalBlade = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 0.08, visuals.finHeight * 1.64, visuals.bodyLength * 0.94),
      this.accentMaterial
    );
    dorsalBlade.position.set(0, visuals.finHeight * 0.74, visuals.bodyLength * 0.28);
    this.visual.add(dorsalBlade);

    const sensorLine = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 0.06, visuals.bodyHeight * 0.06, visuals.bodyLength * 2.44),
      new THREE.MeshBasicMaterial({
        color: this.config.glow,
        transparent: true,
        opacity: 0.44,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    sensorLine.position.set(0, visuals.bodyHeight * 0.9, visuals.bodyLength * 0.04);
    this.visual.add(sensorLine);
    this.glowStripMaterials.push(sensorLine.material);
  }

  addPhantomKit(visuals, engineRadius) {
    const veilWingGeometry = new THREE.BoxGeometry(
      visuals.wingSpan * 0.54,
      0.06,
      visuals.wingDepth * 2.24
    );
    const leftVeil = new THREE.Mesh(veilWingGeometry, this.canopyMaterial);
    leftVeil.position.set(-visuals.bodyWidth * 1.58, 0.18, visuals.bodyLength * 0.14);
    leftVeil.rotation.set(-0.12, -0.56, 0.38);
    this.visual.add(leftVeil);

    const rightVeil = leftVeil.clone();
    rightVeil.position.x *= -1;
    rightVeil.rotation.y *= -1;
    rightVeil.rotation.z *= -1;
    this.visual.add(rightVeil);

    const spineGlow = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 0.14, visuals.bodyHeight * 0.06, visuals.bodyLength * 1.82),
      new THREE.MeshBasicMaterial({
        color: this.config.trailColor,
        transparent: true,
        opacity: 0.38,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    spineGlow.position.set(0, visuals.bodyHeight * 0.34, -visuals.bodyLength * 0.04);
    this.visual.add(spineGlow);
    this.glowStripMaterials.push(spineGlow.material);

    const hushRing = new THREE.Mesh(
      new THREE.TorusGeometry(engineRadius * 1.72, 0.08, 10, 24),
      new THREE.MeshBasicMaterial({
        color: this.config.glow,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    hushRing.position.set(0, 0, visuals.bodyLength * 1.82);
    hushRing.rotation.x = Math.PI * 0.5;
    this.visual.add(hushRing);
    this.glowStripMaterials.push(hushRing.material);
  }

  addExoticKit(visuals, engineRadius) {
    const haloGeometry = new THREE.TorusGeometry(engineRadius * 1.8, 0.14, 10, 30);
    const leftHalo = new THREE.Mesh(
      haloGeometry,
      new THREE.MeshBasicMaterial({
        color: this.config.glow,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    leftHalo.position.set(-visuals.bodyWidth * 1.28, 0.12, visuals.bodyLength * 0.88);
    leftHalo.rotation.y = Math.PI * 0.5;
    this.visual.add(leftHalo);

    const rightHalo = leftHalo.clone();
    rightHalo.position.x *= -1;
    this.visual.add(rightHalo);
    this.glowStripMaterials.push(leftHalo.material, rightHalo.material);

    const crest = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.bodyWidth * 0.26, visuals.finHeight * 1.84, visuals.bodyLength * 0.42),
      this.trimMaterial
    );
    crest.position.set(0, visuals.finHeight * 0.84, -visuals.bodyLength * 0.14);
    this.visual.add(crest);

    const flareFin = new THREE.Mesh(
      new THREE.BoxGeometry(visuals.wingSpan * 0.86, 0.06, visuals.wingDepth * 0.52),
      this.accentMaterial
    );
    flareFin.position.set(0, -visuals.bodyHeight * 0.08, visuals.bodyLength * 1.12);
    flareFin.rotation.x = 0.12;
    this.visual.add(flareFin);
  }

  resetRaceState() {
    this.speed = 0;
    this.lateralVelocity = 0;
    this.trackStrain = 0;
    this.launchTimer = 0;
    this.boosting = false;
    this.drifting = false;
    this.wasDrifting = false;
    this.driftCharge = 0;
    this.heldItem = null;
    this.shieldTimer = 0;
    this.empTimer = 0;
    this.empSlowFactor = 1;
    this.gravityGlitchTimer = 0;
    this.trackSlowTimer = 0;
    this.trackSlowFactor = 1;
    this.surgeTimer = 0;
    this.surgeSpeedBonus = 0;
    this.surgeAccelerationMultiplier = 1;
    this.boostPadCooldown = 0;
    this.hazardCooldown = 0;
    this.itemCooldown = 0;
    this.nearMissCooldown = 0;
    this.nearMissFlash = 0;
    this.driftBurstTimer = 0;
    this.boostPadFlashTimer = 0;
    this.hazardFlashTimer = 0;
    this.impactFlashTimer = 0;
    this.draftTimer = 0;
    this.draftStrength = 0;
    this.shortcutTimer = 0;
    this.shortcutSpeedBonus = 0;
    this.shortcutGripBonus = 0;
    this.shortcutLabel = '';
    this.contactPulseTimer = 0;
    this.contactPulseStrength = 0;
    this.boostEnergy = this.config.startBoostEnergy;
  }

  placeOnGrid(track, slot) {
    this.resetRaceState();
    this.progress = track.getWrappedProgress(slot.progress);
    this.distance = slot.distance;
    this.startDistance = slot.distance;
    this.lateralOffset = slot.laneOffset;

    this.syncPose(track, 0.016, 0, { steer: 0, throttle: 0, instant: true, idleOnly: true });
  }

  addBoostEnergy(amount) {
    this.boostEnergy = THREE.MathUtils.clamp(this.boostEnergy + amount, 0, this.maxBoostEnergy);
  }

  giveItem(itemType) {
    if (this.heldItem) {
      return false;
    }

    this.heldItem = itemType;
    return true;
  }

  consumeItem() {
    const itemType = this.heldItem;
    this.heldItem = null;
    return itemType;
  }

  activateBurst(duration, speedBonus, accelerationMultiplier) {
    this.surgeTimer = Math.max(this.surgeTimer, duration);
    this.surgeSpeedBonus = Math.max(this.surgeSpeedBonus, speedBonus);
    this.surgeAccelerationMultiplier = Math.max(this.surgeAccelerationMultiplier, accelerationMultiplier);
    this.boostPadFlashTimer = Math.max(this.boostPadFlashTimer, duration);
    this.speed = Math.min(this.speed + 8, this.config.maxSpeed + speedBonus + 8);
  }

  activateShield(duration) {
    this.shieldTimer = Math.max(this.shieldTimer, duration * this.config.shieldDurationMultiplier);
  }

  applyEmp(duration, slowFactor = 0.72) {
    if (this.shieldTimer > 0) {
      return false;
    }

    this.empTimer = Math.max(this.empTimer, duration);
    this.empSlowFactor = Math.min(this.empSlowFactor, slowFactor);
    this.impactFlashTimer = Math.max(this.impactFlashTimer, 0.28);
    return true;
  }

  applyGravityGlitch(duration) {
    if (this.shieldTimer > 0) {
      return false;
    }

    this.gravityGlitchTimer = Math.max(this.gravityGlitchTimer, duration);
    this.impactFlashTimer = Math.max(this.impactFlashTimer, 0.32);
    return true;
  }

  activateTrackSlow(duration, slowFactor = 0.84) {
    const fresh = this.trackSlowTimer <= 0.01;

    if (this.shieldTimer > 0) {
      return false;
    }

    this.trackSlowTimer = Math.max(this.trackSlowTimer, duration);
    this.trackSlowFactor = Math.min(this.trackSlowFactor, slowFactor);
    return fresh;
  }

  applyMissileHit() {
    if (this.shieldTimer > 0) {
      return false;
    }

    this.empTimer = Math.max(this.empTimer, 2.6);
    this.empSlowFactor = Math.min(this.empSlowFactor, 0.64);
    this.gravityGlitchTimer = Math.max(this.gravityGlitchTimer, 1.45);
    this.speed = Math.max(0, this.speed - 18);
    this.lateralVelocity += Math.sin(this.idlePhase * 4.2 + this.distance * 22) * 7;
    this.impactFlashTimer = 0.55;
    return true;
  }

  applyHazard(time, magnitude = 1) {
    if (this.shieldTimer > 0 || this.hazardCooldown > 0) {
      return false;
    }

    this.hazardCooldown = 0.42;
    this.speed = Math.max(0, this.speed - 14 * magnitude);
    this.lateralVelocity += Math.sin(time * 11 + this.idlePhase) * 7 * magnitude;
    this.hazardFlashTimer = 0.5;
    return true;
  }

  triggerBoostPad() {
    if (this.boostPadCooldown > 0) {
      return false;
    }

    this.boostPadCooldown = 0.65;
    this.activateBurst(0.95, 18, 1.6);
    this.addBoostEnergy(6);
    return true;
  }

  registerNearMiss() {
    if (this.nearMissCooldown > 0) {
      return false;
    }

    this.nearMissCooldown = 1.05;
    this.nearMissFlash = 0.5;
    this.addBoostEnergy(6);
    return true;
  }

  triggerLaunch() {
    this.launchTimer = 0.85;
    this.speed = Math.max(this.speed, 13);
  }

  updateTimers(deltaTime) {
    if (this.launchTimer > 0) {
      this.launchTimer = Math.max(0, this.launchTimer - deltaTime);
    }

    if (this.shieldTimer > 0) {
      this.shieldTimer = Math.max(0, this.shieldTimer - deltaTime);
    }

    if (this.empTimer > 0) {
      this.empTimer = Math.max(0, this.empTimer - deltaTime);

      if (this.empTimer === 0) {
        this.empSlowFactor = 1;
      }
    }

    if (this.gravityGlitchTimer > 0) {
      this.gravityGlitchTimer = Math.max(0, this.gravityGlitchTimer - deltaTime);
    }

    if (this.trackSlowTimer > 0) {
      this.trackSlowTimer = Math.max(0, this.trackSlowTimer - deltaTime);

      if (this.trackSlowTimer === 0) {
        this.trackSlowFactor = 1;
      }
    }

    if (this.surgeTimer > 0) {
      this.surgeTimer = Math.max(0, this.surgeTimer - deltaTime);

      if (this.surgeTimer === 0) {
        this.surgeSpeedBonus = 0;
        this.surgeAccelerationMultiplier = 1;
      }
    }

    this.boostPadCooldown = Math.max(0, this.boostPadCooldown - deltaTime);
    this.hazardCooldown = Math.max(0, this.hazardCooldown - deltaTime);
    this.itemCooldown = Math.max(0, this.itemCooldown - deltaTime);
    this.nearMissCooldown = Math.max(0, this.nearMissCooldown - deltaTime);
    this.nearMissFlash = Math.max(0, this.nearMissFlash - deltaTime);
    this.driftBurstTimer = Math.max(0, this.driftBurstTimer - deltaTime);
    this.boostPadFlashTimer = Math.max(0, this.boostPadFlashTimer - deltaTime);
    this.hazardFlashTimer = Math.max(0, this.hazardFlashTimer - deltaTime);
    this.impactFlashTimer = Math.max(0, this.impactFlashTimer - deltaTime);
    this.contactPulseTimer = Math.max(0, this.contactPulseTimer - deltaTime);
    this.draftTimer = Math.max(0, this.draftTimer - deltaTime);
    this.shortcutTimer = Math.max(0, this.shortcutTimer - deltaTime);

    if (this.draftTimer === 0) {
      this.draftStrength = 0;
    }

    if (this.shortcutTimer === 0) {
      this.shortcutSpeedBonus = 0;
      this.shortcutGripBonus = 0;
      this.shortcutLabel = '';
    }

    if (this.contactPulseTimer === 0) {
      this.contactPulseStrength = 0;
    }
  }

  updateAtRest(deltaTime, time, track) {
    this.updateTimers(deltaTime);
    this.speed = THREE.MathUtils.lerp(this.speed, 0, 1 - Math.exp(-deltaTime * 6));
    this.lateralVelocity *= Math.exp(-deltaTime * 5);
    this.trackStrain = 0;
    this.boosting = false;
    this.drifting = false;
    this.syncPose(track, deltaTime, time, { steer: 0, throttle: 0, idleOnly: true });
  }

  updateRacing(deltaTime, time, track, controls) {
    this.updateTimers(deltaTime);

    const events = {
      driftRelease: 0
    };

    let steer = THREE.MathUtils.clamp(controls.steer ?? 0, -1, 1);
    const throttle = THREE.MathUtils.clamp(controls.throttle ?? 0, 0, 1);

    if (this.gravityGlitchTimer > 0) {
      steer += Math.sin(time * 22 + this.idlePhase) * 0.55;
      steer = THREE.MathUtils.clamp(steer, -1, 1);
    }

    const curvature = track.getCurvature(this.progress + 0.02, 0.018);
    const driftInput = Boolean(controls.drift);
    const driftNow = driftInput && Math.abs(steer) > 0.16 && this.speed > 26;
    const boostRequested = Boolean(controls.boost) && this.boostEnergy > 4;

    this.boosting = false;

    if (boostRequested) {
      this.boosting = true;
      this.boostEnergy = Math.max(0, this.boostEnergy - deltaTime * this.config.boostEnergyDrain);

      if (this.boostEnergy === 0) {
        this.boosting = false;
      }
    }

    if (driftNow) {
      const chargeGain = (0.75 + Math.abs(steer) * 0.7 + curvature * 8) * deltaTime * 8 * this.config.driftChargeMultiplier;
      this.driftCharge = Math.min(100, this.driftCharge + chargeGain);
      this.addBoostEnergy(chargeGain * 0.55);
    }

    if (this.wasDrifting && !driftNow && this.driftCharge > 8) {
      const releaseSpeed = Math.min(14, this.driftCharge * 0.18 * this.config.driftReleaseMultiplier);
      this.speed += releaseSpeed;
      this.addBoostEnergy(this.driftCharge * 0.22 * this.config.driftReleaseMultiplier);
      events.driftRelease = Math.round(this.driftCharge);
      this.driftBurstTimer = 0.45;
      this.driftCharge = 0;
    } else if (!driftNow) {
      this.driftCharge = 0;
    }

    this.drifting = driftNow;
    this.wasDrifting = driftNow;

    const effectSpeedMultiplier = this.empSlowFactor * this.trackSlowFactor;
    const boostSpeedBonus = this.boosting ? 26 : 0;
    const draftSpeedBonus = this.draftTimer > 0 ? this.draftStrength * 9 : 0;
    const effectiveMaxSpeed = (
      this.config.maxSpeed +
      boostSpeedBonus +
      this.surgeSpeedBonus +
      this.shortcutSpeedBonus +
      draftSpeedBonus
    ) * effectSpeedMultiplier;
    const accelerationMultiplier =
      (this.boosting ? 2.15 : 1) *
      this.surgeAccelerationMultiplier *
      (this.empTimer > 0 ? 0.78 : 1) *
      (1 + this.draftStrength * 0.2);

    if (throttle > 0 || this.launchTimer > 0) {
      const effectiveThrottle = Math.max(throttle, this.launchTimer > 0 ? 1 : 0);
      this.speed +=
        this.config.acceleration *
        accelerationMultiplier *
        (0.55 + effectiveThrottle * 0.45) *
        deltaTime;
    } else {
      this.speed -= this.config.friction * (this.drifting ? 0.74 : 1) * deltaTime;
    }

    const lateralAcceleration =
      this.config.lateralAcceleration *
      (this.drifting ? 1.58 : 1) *
      (1 + this.shortcutGripBonus) *
      (this.gravityGlitchTimer > 0 ? 0.92 : 1);
    const lateralDamping =
      this.config.lateralDamping *
      (this.drifting ? 0.66 : 1) *
      (1 + this.shortcutGripBonus * 0.45) *
      (this.gravityGlitchTimer > 0 ? 0.88 : 1);

    this.lateralVelocity += steer * lateralAcceleration * deltaTime;
    this.lateralVelocity *= Math.exp(-deltaTime * lateralDamping);
    this.lateralOffset += this.lateralVelocity * deltaTime;

    const edgeRatio = Math.abs(this.lateralOffset) / track.halfWidth;
    const edgePenalty = Math.max(0, edgeRatio - 0.8);
    const edgeAssist = Math.max(0, edgeRatio - 0.72);

    if (edgeAssist > 0) {
      this.lateralVelocity -= Math.sign(this.lateralOffset) * edgeAssist * 16 * deltaTime;
    }

    let cornerPenaltyFactor = this.drifting ? 0.22 : 0.38;

    if (this.boosting) {
      cornerPenaltyFactor *= 1.75;
    }

    const cornerThreshold = effectiveMaxSpeed * (this.drifting ? 0.58 : 0.64);
    const cornerPenalty = curvature * Math.max(0, this.speed - cornerThreshold) * cornerPenaltyFactor;

    this.speed -= edgePenalty * 58 * (this.drifting ? 1.28 : 1) * deltaTime;
    this.speed -= cornerPenalty * deltaTime;
    this.speed = THREE.MathUtils.clamp(this.speed, 0, effectiveMaxSpeed);

    if (this.lateralOffset > track.halfWidth) {
      this.lateralOffset = track.halfWidth;
      this.lateralVelocity = Math.min(0, this.lateralVelocity);
      this.speed *= 0.992;
    }

    if (this.lateralOffset < -track.halfWidth) {
      this.lateralOffset = -track.halfWidth;
      this.lateralVelocity = Math.max(0, this.lateralVelocity);
      this.speed *= 0.992;
    }

    const distanceStep = (this.speed * deltaTime) / track.length;
    this.distance += distanceStep;
    this.progress = track.getWrappedProgress(this.progress + distanceStep);
    this.trackStrain =
      edgePenalty +
      Math.abs(this.lateralVelocity) * 0.024 +
      (this.boosting ? curvature * 2.6 : 0);

    this.syncPose(track, deltaTime, time, { steer, throttle, curvature });
    return events;
  }

  syncPose(track, deltaTime, time, controlState) {
    track.getFrame(this.progress, this.frame);

    const idleFloat = Math.sin(time * 3.1 + this.idlePhase) * 0.18;
    const speedRatio = this.getSpeedRatio();
    const hover = track.hoverHeight + idleFloat + speedRatio * 0.14;

    this.targetPosition.copy(this.frame.point)
      .addScaledVector(this.frame.right, this.lateralOffset)
      .addScaledVector(this.frame.up, hover);

    const blend = controlState.instant ? 1 : 1 - Math.exp(-deltaTime * 12);

    if (controlState.instant) {
      this.root.position.copy(this.targetPosition);
    } else {
      this.root.position.lerp(this.targetPosition, blend);
    }

    this.forwardAxis.copy(this.frame.tangent);
    this.lookMatrix.makeBasis(this.frame.right, this.frame.up, this.forwardAxis);
    this.targetQuaternion.setFromRotationMatrix(this.lookMatrix);
    this.root.quaternion.slerp(
      this.targetQuaternion,
      controlState.instant ? 1 : 1 - Math.exp(-deltaTime * 9)
    );

    const yawTarget = THREE.MathUtils.clamp(
      (controlState.steer ?? 0) * (this.drifting ? 0.34 : 0.22) +
      this.lateralVelocity * 0.018,
      -0.42,
      0.42
    );
    const bankTarget = THREE.MathUtils.clamp(
      -(controlState.steer ?? 0) * (this.drifting ? 0.42 : 0.24) - this.lateralVelocity * 0.026,
      -0.56,
      0.56
    );
    const pitchTarget = controlState.idleOnly
      ? -0.03
      : THREE.MathUtils.clamp(
        -(controlState.throttle ?? 0) * 0.18 +
        (controlState.curvature ?? 0) * (this.boosting ? 0.36 : 0.28),
        -0.26,
        0.3
      );

    this.visual.rotation.z = THREE.MathUtils.lerp(
      this.visual.rotation.z,
      bankTarget,
      1 - Math.exp(-deltaTime * 8)
    );
    this.visual.rotation.x = THREE.MathUtils.lerp(
      this.visual.rotation.x,
      pitchTarget,
      1 - Math.exp(-deltaTime * 7)
    );
    this.visual.rotation.y = THREE.MathUtils.lerp(
      this.visual.rotation.y,
      this.visualYawOffset +
      yawTarget +
      (this.gravityGlitchTimer > 0 ? Math.sin(time * 18 + this.idlePhase) * 0.12 : 0),
      1 - Math.exp(-deltaTime * 10)
    );
    this.visual.position.y = idleFloat * 0.65 + Math.sin(time * 16) * (this.boosting ? 0.04 : 0);

    this.updateVisualEffects(deltaTime, time, controlState.throttle ?? 0);
  }

  updateVisualEffects(deltaTime, time, throttle) {
    const speedRatio = this.getSpeedRatio();
    const idlePulse = 0.6 + Math.sin(time * 8 + this.idlePhase) * 0.08;
    const launchBoost = this.launchTimer > 0 ? 0.4 : 0;
    const boostGlow = this.boosting ? 0.52 : 0;
    const boostPulse = this.boosting ? 0.38 + Math.sin(time * 28 + this.idlePhase) * 0.12 : 0;
    const driftGlow = this.drifting ? 0.18 : 0;
    const surgeGlow = this.surgeTimer > 0 ? 0.28 : 0;
    const flashGlow = this.hazardFlashTimer * 0.22 + this.impactFlashTimer * 0.24;
    const draftGlow = this.draftTimer > 0 ? this.draftStrength * 0.26 : 0;
    const shortcutGlow = this.shortcutTimer > 0 ? 0.14 + this.shortcutGripBonus * 0.34 : 0;
    const contactPulse = this.contactPulseTimer > 0 ? this.contactPulseStrength * 0.18 : 0;
    const intensity =
      idlePulse +
      speedRatio * 1.1 +
      throttle * 0.22 +
      launchBoost +
      boostGlow +
      boostPulse +
      driftGlow +
      surgeGlow +
      flashGlow +
      draftGlow +
      shortcutGlow +
      contactPulse;
    const stripPulse =
      0.72 +
      Math.sin(time * 12 + this.idlePhase) * 0.14 +
      speedRatio * 0.18 +
      boostPulse * 0.26 +
      draftGlow * 0.35 +
      shortcutGlow * 0.22;

    this.engineGlow.material.opacity = THREE.MathUtils.clamp(intensity * 0.46 + boostPulse * 0.12, 0.24, 0.98);
    this.engineTargetScale.set(
      this.engineBaseScale.x,
      0.9 + intensity * 0.58,
      1 + intensity * 1.02 + boostPulse * 0.32
    );
    this.engineGlow.scale.lerp(this.engineTargetScale, 1 - Math.exp(-deltaTime * 10));

    if (this.engineHalo) {
      this.engineHalo.material.opacity = THREE.MathUtils.clamp(0.16 + intensity * 0.2 + boostPulse * 0.1, 0.16, 0.72);
      this.engineHalo.scale.set(
        this.engineHaloBaseScale.x * (0.94 + intensity * 0.12),
        this.engineHaloBaseScale.y * (0.94 + intensity * 0.12),
        this.engineHaloBaseScale.z * (0.88 + intensity * 0.4 + boostPulse * 0.18)
      );
    }

    const trailIntensity = intensity + speedRatio * 0.38 + (this.boosting ? 0.7 : 0) + boostPulse * 0.4;
    const advanced = this.config.advancedVisuals ?? {};
    const trailWidth = advanced.trailWidth ?? 1;
    const trailLengthScale = advanced.trailLength ?? 1;
    const boostScale = this.boosting ? (advanced.boostScale ?? 1) : 1;

    if (this.boosting && advanced.boostColor && this.engineGlow?.material) {
      this.engineGlow.material.color.setHex(advanced.boostColor);
    } else if (advanced.engineColor && this.engineGlow?.material) {
      this.engineGlow.material.color.setHex(advanced.engineColor);
    }

    this.trailGlow.material.opacity = THREE.MathUtils.clamp(0.14 + trailIntensity * 0.18, 0.12, 0.82);
    this.trailTargetScale.set(
      this.trailBaseScale.x * (0.86 + trailIntensity * 0.12) * trailWidth,
      this.trailBaseScale.y * (0.86 + trailIntensity * 0.12) * trailWidth,
      this.trailBaseScale.z * (0.82 + trailIntensity * 0.56 + boostPulse * 0.28) * trailLengthScale * boostScale
    );
    this.trailGlow.scale.lerp(this.trailTargetScale, 1 - Math.exp(-deltaTime * 8));

    this.hullMaterial.emissiveIntensity =
      (this.config.premiumVisuals ? 0.64 : 1.25) +
      speedRatio * (this.config.premiumVisuals ? 0.28 : 0.6) +
      boostGlow * 0.8 +
      this.driftBurstTimer * 0.3;
    if (this.accentMaterial) {
      this.accentMaterial.emissiveIntensity =
        1.08 + speedRatio * 0.42 + boostGlow * 0.62 + this.driftBurstTimer * 0.32;
    }
    this.canopyMaterial.emissiveIntensity =
      0.72 + this.shieldTimer * 0.12 + this.gravityGlitchTimer * 0.05;
    this.trimMaterial.emissiveIntensity =
      0.95 + boostGlow * 0.42 + this.driftBurstTimer * 0.25;

    for (const material of this.glowStripMaterials) {
      material.opacity = THREE.MathUtils.clamp(0.26 + stripPulse * 0.34 + boostGlow * 0.18, 0.28, 0.88);
    }

    this.shieldBubble.visible = this.shieldTimer > 0.02;
    this.shieldBubble.material.opacity = this.shieldTimer > 0
      ? 0.2 + Math.sin(time * 14) * 0.05
      : 0;
    this.shieldBubble.scale.setScalar(1 + Math.sin(time * 8) * 0.02);

    this.updateAdvancedVisualEffects(time);
  }

  updateAdvancedVisualEffects(time) {
    if (!this.advancedVisualRoot) {
      return;
    }

    const advanced = this.config.advancedVisuals ?? {};

    for (const child of this.advancedVisualRoot.children) {
      if (child.userData.patternSpeed) {
        child.rotation.z = time * child.userData.patternSpeed;
      }
    }

    for (const material of this.advancedPatternMaterials) {
      material.opacity = 0.18 + Math.sin(time * (advanced.patternSpeed ?? 1.2) * 4 + this.idlePhase) * 0.08;
    }

    if (advanced.pose === 'wingTilt') {
      this.visual.rotation.z += Math.sin(time * 1.4) * 0.018;
    } else if (advanced.pose === 'boostSpin') {
      this.visual.rotation.y += Math.sin(time * 1.2) * 0.045;
    } else if (advanced.pose === 'silentHover') {
      this.visual.position.y += Math.sin(time * 1.1) * 0.045;
    }
  }

  applyGhostStyle() {
    this.root.traverse((node) => {
      const material = node.material;

      if (!material) {
        return;
      }

      if (Array.isArray(material)) {
        material.forEach((entry) => this.tuneGhostMaterial(entry));
        return;
      }

      this.tuneGhostMaterial(material);
    });

    this.root.renderOrder = 6;
  }

  tuneGhostMaterial(material) {
    material.transparent = true;
    material.opacity = Math.min(material.opacity ?? 1, 0.36);
    material.depthWrite = false;

    if ('emissiveIntensity' in material) {
      material.emissiveIntensity = Math.max(0.9, material.emissiveIntensity ?? 0.9);
    }
  }

  applyNetworkState(track, snapshot, deltaTime, time) {
    const targetProgress = track.getWrappedProgress(snapshot.progress ?? this.progress);
    const progressDelta = track.getSignedProgressDelta(targetProgress, this.progress);
    const blend = 1 - Math.exp(-deltaTime * 8);

    this.progress = track.getWrappedProgress(this.progress + progressDelta * blend);
    this.distance = THREE.MathUtils.lerp(this.distance, snapshot.distance ?? this.distance, blend);
    this.speed = THREE.MathUtils.lerp(this.speed, snapshot.speed ?? this.speed, blend);
    this.lateralOffset = THREE.MathUtils.lerp(
      this.lateralOffset,
      THREE.MathUtils.clamp(snapshot.lateralOffset ?? this.lateralOffset, -track.halfWidth, track.halfWidth),
      blend
    );
    this.lateralVelocity = THREE.MathUtils.lerp(this.lateralVelocity, 0, 1 - Math.exp(-deltaTime * 5));
    this.boosting = Boolean(snapshot.boosting);
    this.drifting = Boolean(snapshot.drifting);

    this.syncPose(track, deltaTime, time, {
      steer: snapshot.steer ?? 0,
      throttle: snapshot.throttle ?? 0,
      curvature: track.getCurvature(this.progress, 0.008)
    });
  }

  applyContactImpulse({ lateralDirection = 0, lateralStrength = 0, speedLoss = 0, impactFlash = 0.3 }) {
    if (this.shieldTimer > 0) {
      return;
    }

    this.lateralVelocity += lateralDirection * lateralStrength * 7.4;
    this.speed = Math.max(0, this.speed - speedLoss);
    this.impactFlashTimer = Math.max(this.impactFlashTimer, impactFlash);
    this.contactPulseTimer = Math.max(this.contactPulseTimer, 0.24);
    this.contactPulseStrength = Math.max(this.contactPulseStrength, lateralStrength + speedLoss * 0.04);
  }

  setSlipstream(intensity) {
    this.draftTimer = Math.max(this.draftTimer, 0.18);
    this.draftStrength = Math.max(this.draftStrength, THREE.MathUtils.clamp(intensity, 0, 1.2));
  }

  setShortcutAssist(zone, intensity) {
    const clampedIntensity = THREE.MathUtils.clamp(intensity, 0, 1.2);
    this.shortcutTimer = Math.max(this.shortcutTimer, 0.18);
    this.shortcutSpeedBonus = Math.max(this.shortcutSpeedBonus, (zone?.bonusSpeed ?? 10) * clampedIntensity);
    this.shortcutGripBonus = Math.max(this.shortcutGripBonus, (zone?.gripBonus ?? 0.12) * clampedIntensity);
    this.shortcutLabel = zone?.label ?? this.shortcutLabel;
  }

  getSpeedRatio() {
    return this.speed / Math.max(1, this.config.maxSpeed);
  }

  getTravelledDistance() {
    return this.distance - this.startDistance;
  }

  getLapNumber() {
    return Math.max(1, Math.floor(this.getTravelledDistance()) + 1);
  }

  getPosition(target = new THREE.Vector3()) {
    return target.copy(this.root.position);
  }

  getForward(target = new THREE.Vector3()) {
    return target.set(0, 0, 1).applyQuaternion(this.root.quaternion).normalize();
  }
}
