import * as THREE from 'three';

const LANE_FRACTIONS = [-1, -0.5, 0, 0.5, 1];

export class AiPilot {
  constructor(profile) {
    this.profile = {
      cruiseSpeed: 74,
      lanePreference: 0,
      laneAmplitude: 1.8,
      laneFrequency: 0.42,
      laneResponse: 0.32,
      caution: 1,
      aggression: 1,
      wobble: 0.08,
      boostDiscipline: 1,
      boostAggression: 1,
      shortcutBias: 1,
      driftBias: 1,
      contactBias: 1,
      precision: 1,
      preferredIdentity: '',
      personaLabel: 'Rival',
      phase: Math.random() * Math.PI * 2,
      ...profile
    };
  }

  getControls({ ship, racers, track, time, standings = [] }) {
    const curvatureNear = track.getCurvature(ship.progress + 0.008, 0.005);
    const curvatureMid = track.getCurvature(ship.progress + 0.024, 0.008);
    const curvatureFar = track.getCurvature(ship.progress + 0.05, 0.012);
    const turnSeverity = THREE.MathUtils.clamp(
      curvatureNear * 0.24 + curvatureMid * 0.18 + curvatureFar * 0.12,
      0,
      1.08
    );
    const straightness = THREE.MathUtils.clamp(1 - turnSeverity * 1.08, 0, 1);
    const pack = this.analyzePack(ship, racers, track);
    const laneRange = this.getUsableLaneRange(track);
    const laneTarget = this.chooseLaneTarget(ship, pack, track, time, turnSeverity, laneRange);
    const laneScale = Math.max(laneRange * 0.4, 4.8);
    const laneError = (laneTarget - ship.lateralOffset) / laneScale;
    const edgeRatio = Math.abs(ship.lateralOffset) / track.halfWidth;
    const edgeRisk = THREE.MathUtils.clamp((edgeRatio - 0.72) / 0.28, 0, 1);
    const position = standings.length > 0
      ? standings.findIndex((racer) => racer === ship) + 1
      : racers.filter((racer) => racer.distance > ship.distance).length + 1;
    const packSize = Math.max(1, racers.length - 1);
    const comebackPressure = THREE.MathUtils.clamp((position - 1) / packSize, 0, 1);
    const launchBias = ship.launchTimer > 0 ? 1 : 0;
    const laneCommitment = THREE.MathUtils.clamp(Math.abs(laneTarget - ship.lateralOffset) / Math.max(laneRange, 1), 0, 1);
    const rhythm = Math.sin(time * (1 + this.profile.aggression * 0.24) + this.profile.phase);
    const attackPressure = pack.attackOpportunity * (0.78 + this.profile.aggression * 0.34);
    const identityBoost = track.definition.identityId === this.profile.preferredIdentity ? 4.5 : 0;

    let targetSpeed = this.profile.cruiseSpeed
      + rhythm * 4.8
      + comebackPressure * 12.5 * this.profile.aggression
      + attackPressure * 11
      + identityBoost
      + launchBias * 12
      - turnSeverity * (10 + this.profile.caution * 12)
      - edgeRisk * 18
      - laneCommitment * 3.2;

    if (pack.nearestAhead && pack.nearestAhead.trackGap < 24 && Math.abs(pack.nearestAhead.laneGap) < 3.4) {
      targetSpeed -= 3.8 * this.profile.caution;
    } else if (pack.nearestAhead && pack.nearestAhead.trackGap < 40) {
      targetSpeed += 3.2 * this.profile.aggression;
    }

    const speedFloor = ship.config.maxSpeed * THREE.MathUtils.lerp(0.76, 0.94, straightness);
    targetSpeed = THREE.MathUtils.clamp(
      targetSpeed,
      speedFloor,
      ship.config.maxSpeed + 26 + comebackPressure * 6
    );

    let steer = laneError * (1.12 + this.profile.laneResponse * 0.9)
      - ship.lateralVelocity * 0.045;

    if (edgeRatio > 0.7) {
      steer += -Math.sign(ship.lateralOffset) * (0.32 + edgeRisk * 0.95);
    }

    if (pack.nearestAhead && pack.nearestAhead.trackGap < 12 && Math.abs(pack.nearestAhead.laneGap) < 2.6) {
      steer += pack.nearestAhead.laneGap >= 0 ? -0.38 : 0.38;
    }

    if (
      pack.nearestAhead &&
      pack.nearestAhead.trackGap < 9 &&
      Math.abs(pack.nearestAhead.laneGap) < 2.1 &&
      this.profile.contactBias > 1.08
    ) {
      steer += THREE.MathUtils.clamp(pack.nearestAhead.laneGap * 0.12, -0.26, 0.26);
    }

    steer += Math.sin(time * 5.6 + this.profile.phase) * this.profile.wobble;
    steer = THREE.MathUtils.clamp(steer, -1, 1);

    let throttle = 0.2;

    if (launchBias > 0 || ship.speed < ship.config.maxSpeed * 0.3) {
      throttle = 1;
    } else if (ship.speed < targetSpeed - 4) {
      throttle = 1;
    } else if (ship.speed < targetSpeed + 1.5) {
      throttle = 0.92;
    } else if (ship.speed < targetSpeed + 5) {
      throttle = 0.72;
    }

    const drift = launchBias === 0
      && turnSeverity > THREE.MathUtils.lerp(0.44, 0.3, THREE.MathUtils.clamp(this.profile.driftBias - 0.85, 0, 0.6))
      && Math.abs(steer) > 0.22
      && ship.speed > ship.config.maxSpeed * THREE.MathUtils.lerp(0.68, 0.54, THREE.MathUtils.clamp(this.profile.driftBias - 0.8, 0, 0.75))
      && edgeRisk < 0.35;

    const boost = ship.boostEnergy > 10
      && !drift
      && edgeRisk < 0.28
      && ship.speed > ship.config.maxSpeed * THREE.MathUtils.lerp(0.54, 0.42, THREE.MathUtils.clamp(this.profile.boostAggression - 0.85, 0, 0.6))
      && throttle > 0.86
      && (
        straightness > THREE.MathUtils.lerp(0.72, 0.54, THREE.MathUtils.clamp(this.profile.boostDiscipline - 0.8, 0, 0.6))
        || attackPressure > 0.22
        || comebackPressure > 0.26
        || launchBias > 0
      );

    return { steer, throttle, drift, boost };
  }

  analyzePack(ship, racers, track) {
    const analysis = {
      nearestAhead: null,
      nearestBehind: null,
      attackOpportunity: 0,
      congestion: 0
    };

    for (const rival of racers) {
      if (rival === ship) {
        continue;
      }

      const signedGap = track.getSignedProgressDelta(rival.progress, ship.progress) * track.length;
      const laneGap = rival.lateralOffset - ship.lateralOffset;

      if (signedGap > 0) {
        if (!analysis.nearestAhead || signedGap < analysis.nearestAhead.trackGap) {
          analysis.nearestAhead = {
            ship: rival,
            trackGap: signedGap,
            laneGap
          };
        }

        if (signedGap < 34 && Math.abs(laneGap) < 6.2) {
          analysis.congestion += THREE.MathUtils.clamp(1 - signedGap / 34, 0, 1);
        }
      } else {
        const behindGap = Math.abs(signedGap);

        if (!analysis.nearestBehind || behindGap < analysis.nearestBehind.trackGap) {
          analysis.nearestBehind = {
            ship: rival,
            trackGap: behindGap,
            laneGap
          };
        }
      }
    }

    if (analysis.nearestAhead) {
      const laneWindow = THREE.MathUtils.clamp(1 - Math.abs(analysis.nearestAhead.laneGap) / 6.5, 0, 1);
      const distanceWindow = THREE.MathUtils.clamp(1 - analysis.nearestAhead.trackGap / 70, 0, 1);
      analysis.attackOpportunity = laneWindow * distanceWindow;
    }

    return analysis;
  }

  getUsableLaneRange(track) {
    return Math.min(track.halfWidth * 0.26, 9.5);
  }

  chooseLaneTarget(ship, pack, track, time, turnSeverity, laneRange) {
    const preferenceBase = THREE.MathUtils.clamp(
      this.profile.lanePreference * 1.25,
      -laneRange,
      laneRange
    );
    const roamAmplitude = Math.min(Math.max(this.profile.laneAmplitude * 1.25, 1.8), laneRange * 0.72);
    const roamLane = THREE.MathUtils.clamp(
      preferenceBase + Math.sin(time * this.profile.laneFrequency + this.profile.phase * 1.25) * roamAmplitude,
      -laneRange,
      laneRange
    );
    const candidates = [
      roamLane,
      THREE.MathUtils.clamp(ship.lateralOffset * 0.5, -laneRange, laneRange),
      ...LANE_FRACTIONS.map((fraction) => laneRange * fraction)
    ];

    let bestLane = roamLane;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const candidate of candidates) {
      const score = this.scoreLane(candidate, ship, pack, track, roamLane, turnSeverity, laneRange);

      if (score > bestScore) {
        bestScore = score;
        bestLane = candidate;
      }
    }

    return THREE.MathUtils.clamp(bestLane, -laneRange, laneRange);
  }

  scoreLane(candidate, ship, pack, track, roamLane, turnSeverity, laneRange) {
    let score = 0;
    const travelCost = Math.abs(candidate - ship.lateralOffset) / Math.max(laneRange, 1);
    const centerBias = Math.abs(candidate) / Math.max(laneRange, 1);

    score -= Math.abs(candidate - roamLane) * 0.16;
    score -= travelCost * (4.2 - (this.profile.precision - 1) * 1.2);
    score -= centerBias * turnSeverity * (6 - (this.profile.driftBias - 1) * 1.6);
    score += this.scoreTrackObjects(candidate, ship, track, laneRange);

    if (pack.nearestAhead) {
      const laneSeparation = Math.abs(candidate - pack.nearestAhead.ship.lateralOffset);
      const lanePenalty = THREE.MathUtils.clamp(1 - laneSeparation / 5.6, 0, 1);
      const distancePenalty = THREE.MathUtils.clamp(1 - pack.nearestAhead.trackGap / 48, 0, 1);
      score -= lanePenalty * distancePenalty * (12 + this.profile.aggression * 4 - (this.profile.contactBias - 1) * 5);

      if (laneSeparation > 2.8 && pack.nearestAhead.trackGap < 56) {
        score += THREE.MathUtils.clamp(laneSeparation / laneRange, 0, 1) * 12 * this.profile.aggression;
      }

      if (laneSeparation < 1.8 && pack.nearestAhead.trackGap < 12 && this.profile.contactBias > 1.08) {
        score += (this.profile.contactBias - 1) * 7.5;
      }
    }

    if (pack.nearestBehind && pack.nearestBehind.trackGap < 16) {
      const defendWindow = THREE.MathUtils.clamp(
        1 - Math.abs(candidate - pack.nearestBehind.ship.lateralOffset) / 5.2,
        0,
        1
      );
      score += defendWindow * 2.6 * this.profile.aggression;
    }

    score -= pack.congestion * 1.4;
    return score;
  }

  scoreTrackObjects(candidate, ship, track, laneRange) {
    let score = 0;

    for (const spawn of track.pickupSpawns) {
      const aheadDistance = this.getAheadDistance(track, ship.progress, spawn.progress);

      if (aheadDistance <= 0 || aheadDistance > 180) {
        continue;
      }

      const closeness = THREE.MathUtils.clamp(1 - aheadDistance / 180, 0, 1);
      const laneMatch = THREE.MathUtils.clamp(1 - Math.abs(candidate - spawn.laneOffset) / 4.6, 0, 1);
      const pickupValue = ship.heldItem ? 1.4 : 5.6;
      score += closeness * laneMatch * pickupValue;
    }

    for (const pad of track.boostPads) {
      const aheadDistance = this.getAheadDistance(track, ship.progress, pad.progress);

      if (aheadDistance <= 0 || aheadDistance > 130) {
        continue;
      }

      const closeness = THREE.MathUtils.clamp(1 - aheadDistance / 130, 0, 1);
      const laneMatch = THREE.MathUtils.clamp(
        1 - Math.abs(candidate - pad.laneOffset) / Math.max(3.2, pad.width + 1.4),
        0,
        1
      );
      const boostNeed = ship.boostEnergy < 68 ? 4.2 : 2.1;
      score += closeness * laneMatch * boostNeed * this.profile.boostAggression;
    }

    for (const zone of track.slowZones) {
      const aheadDistance = this.getAheadDistance(track, ship.progress, zone.progress);

      if (aheadDistance <= 0 || aheadDistance > 110) {
        continue;
      }

      const closeness = THREE.MathUtils.clamp(1 - aheadDistance / 110, 0, 1);
      const laneMatch = THREE.MathUtils.clamp(
        1 - Math.abs(candidate - zone.laneOffset) / Math.max(4.2, zone.width + 1.6),
        0,
        1
      );
      score -= closeness * laneMatch * 7.6;
    }

    for (const zone of track.hazardZones) {
      const aheadDistance = this.getAheadDistance(track, ship.progress, zone.progress);

      if (aheadDistance <= 0 || aheadDistance > 120) {
        continue;
      }

      const closeness = THREE.MathUtils.clamp(1 - aheadDistance / 120, 0, 1);
      const laneMatch = THREE.MathUtils.clamp(
        1 - Math.abs(candidate - zone.laneOffset) / Math.max(3.2, zone.width + 1.4),
        0,
        1
      );
      score -= closeness * laneMatch * 10.2;
    }

    for (const shortcut of track.shortcutZones ?? []) {
      const aheadDistance = this.getAheadDistance(track, ship.progress, shortcut.startProgress);

      if (aheadDistance <= 0 || aheadDistance > 160) {
        continue;
      }

      const closeness = THREE.MathUtils.clamp(1 - aheadDistance / 160, 0, 1);
      const laneMatch = THREE.MathUtils.clamp(
        1 - Math.abs(candidate - shortcut.laneOffset) / Math.max(4.4, shortcut.width + 1.1),
        0,
        1
      );
      const shortcutValue =
        (4.8 + (shortcut.bonusSpeed ?? 10) * 0.22) * this.profile.shortcutBias
        - (shortcut.risk ?? 1) * this.profile.caution * 1.8;
      score += closeness * laneMatch * shortcutValue;
    }

    score -= THREE.MathUtils.clamp(Math.abs(candidate) / Math.max(laneRange, 1), 0, 1) * 0.6;
    return score;
  }

  getAheadDistance(track, fromProgress, targetProgress) {
    return track.getSignedProgressDelta(targetProgress, fromProgress) * track.length;
  }
}
