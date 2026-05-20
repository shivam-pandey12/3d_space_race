import * as THREE from 'three';

export class SoundSystem {
  constructor() {
    this.context = null;
    this.masterGain = null;
    this.fxGain = null;
    this.engineBus = null;
    this.ambienceBus = null;
    this.noiseBuffer = null;
    this.engineReady = false;
    this.unlockHandler = null;
    this.eventCooldowns = new Map();
    this.speech = typeof window !== 'undefined' ? window.speechSynthesis ?? null : null;
    this.speechEnabled = Boolean(this.speech && typeof window !== 'undefined' && 'SpeechSynthesisUtterance' in window);
    this.speechVoice = null;
    this.speechQueue = [];
    this.activeSpeech = null;
    this.nextSpeechAllowedAt = 0;
    this.voiceEventHandler = null;
    this.settings = {
      master: 0.82,
      effects: 0.92,
      voice: 0.84,
      voiceEnabled: true
    };

    this.wasBoosting = false;
  }

  armUnlock(target = window) {
    if (this.unlockHandler || !target) {
      return;
    }

    this.unlockHandler = () => {
      this.resume();
    };

    target.addEventListener('pointerdown', this.unlockHandler, { passive: true });
    target.addEventListener('keydown', this.unlockHandler, { passive: true });
  }

  async resume() {
    if (!this.ensureContext()) {
      this.prepareSpeech();
      return this.speechEnabled;
    }

    if (this.context.state === 'suspended') {
      await this.context.resume();
    }

    this.ensureContinuousVoices();
    this.prepareSpeech();
    return true;
  }

  ensureContext() {
    if (this.context) {
      return true;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      return false;
    }

    this.context = new AudioContextClass();
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = 0.28 * this.settings.master;
    this.masterGain.connect(this.context.destination);

    this.fxGain = this.context.createGain();
    this.fxGain.gain.value = 0.92 * this.settings.effects;
    this.fxGain.connect(this.masterGain);

    this.engineBus = this.context.createGain();
    this.engineBus.gain.value = 0.2;
    this.engineBus.connect(this.masterGain);

    this.ambienceBus = this.context.createGain();
    this.ambienceBus.gain.value = 0.12;
    this.ambienceBus.connect(this.masterGain);

    this.noiseBuffer = this.createNoiseBuffer(1.5);
    return true;
  }

  createNoiseBuffer(durationSeconds) {
    const frameCount = Math.floor(this.context.sampleRate * durationSeconds);
    const buffer = this.context.createBuffer(1, frameCount, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    let brown = 0;

    for (let index = 0; index < frameCount; index += 1) {
      const white = Math.random() * 2 - 1;
      brown = (brown + 0.02 * white) / 1.02;
      data[index] = brown * 3.4;
    }

    return buffer;
  }

  applySettings(audioSettings = {}) {
    this.settings = {
      ...this.settings,
      ...audioSettings
    };

    if (!this.settings.voiceEnabled) {
      this.stopCommentarySpeech(true);
    }

    if (this.masterGain) {
      this.masterGain.gain.value = 0.28 * this.settings.master;
    }

    if (this.fxGain) {
      this.fxGain.gain.value = 0.92 * this.settings.effects;
    }
  }

  ensureContinuousVoices() {
    if (!this.context || this.engineReady) {
      return;
    }

    const ctx = this.context;

    this.engineLowOsc = ctx.createOscillator();
    this.engineLowOsc.type = 'sawtooth';
    this.engineLowGain = ctx.createGain();
    this.engineLowGain.gain.value = 0.0001;

    this.engineHighOsc = ctx.createOscillator();
    this.engineHighOsc.type = 'triangle';
    this.engineHighGain = ctx.createGain();
    this.engineHighGain.gain.value = 0.0001;

    this.engineFilter = ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 420;
    this.engineFilter.Q.value = 0.8;

    this.engineLowOsc.connect(this.engineLowGain);
    this.engineHighOsc.connect(this.engineHighGain);
    this.engineLowGain.connect(this.engineFilter);
    this.engineHighGain.connect(this.engineFilter);
    this.engineFilter.connect(this.engineBus);

    this.windSource = ctx.createBufferSource();
    this.windSource.buffer = this.noiseBuffer;
    this.windSource.loop = true;
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.value = 950;
    this.windFilter.Q.value = 0.7;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0.0001;
    this.windSource.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.engineBus);

    this.droneOscA = ctx.createOscillator();
    this.droneOscA.type = 'sine';
    this.droneOscA.frequency.value = 44;
    this.droneOscB = ctx.createOscillator();
    this.droneOscB.type = 'triangle';
    this.droneOscB.frequency.value = 66;
    this.droneFilter = ctx.createBiquadFilter();
    this.droneFilter.type = 'lowpass';
    this.droneFilter.frequency.value = 240;
    this.droneGain = ctx.createGain();
    this.droneGain.gain.value = 0.0001;
    this.droneOscA.connect(this.droneFilter);
    this.droneOscB.connect(this.droneFilter);
    this.droneFilter.connect(this.droneGain);
    this.droneGain.connect(this.ambienceBus);

    this.engineLowOsc.start();
    this.engineHighOsc.start();
    this.windSource.start();
    this.droneOscA.start();
    this.droneOscB.start();

    this.engineReady = true;
  }

  prepareSpeech() {
    if (!this.speechEnabled || !this.speech) {
      return false;
    }

    this.selectSpeechVoice();

    if (!this.voiceEventHandler && typeof this.speech.addEventListener === 'function') {
      this.voiceEventHandler = () => {
        this.selectSpeechVoice();
        this.processSpeechQueue();
      };
      this.speech.addEventListener('voiceschanged', this.voiceEventHandler);
    }

    return true;
  }

  selectSpeechVoice() {
    if (!this.speechEnabled || !this.speech) {
      return;
    }

    const voices = this.speech.getVoices?.() ?? [];

    if (voices.length === 0) {
      return;
    }

    this.speechVoice =
      voices.find((voice) =>
        /^en/i.test(voice.lang) &&
        /(davis|guy|roger|thomas|mark|david|daniel|alex|microsoft|google)/i.test(voice.name)
      ) ??
      voices.find((voice) => /^en/i.test(voice.lang)) ??
      voices[0];
  }

  update(deltaTime, ship, phase) {
    if (!this.context || this.context.state !== 'running') {
      return;
    }

    this.ensureContinuousVoices();

    const now = this.context.currentTime;
    const speedRatio = ship ? THREE.MathUtils.clamp(ship.getSpeedRatio(), 0, 1.5) : 0;
    const boost = ship?.boosting ? 1 : 0;
    const drifting = ship?.drifting ? 1 : 0;
    const phaseBlend = phase === 'race'
      ? 1
      : phase === 'countdown'
        ? 0.32
        : phase === 'intro'
          ? 0.22
          : phase === 'hangar'
            ? 0.16
            : 0.1;

    this.engineLowOsc.frequency.setTargetAtTime(52 + speedRatio * 62 + boost * 24, now, 0.05);
    this.engineHighOsc.frequency.setTargetAtTime(118 + speedRatio * 240 + boost * 56 + drifting * 18, now, 0.05);
    this.engineLowGain.gain.setTargetAtTime(0.01 + phaseBlend * 0.04 + speedRatio * 0.06 + boost * 0.024, now, 0.08);
    this.engineHighGain.gain.setTargetAtTime(0.005 + phaseBlend * 0.015 + speedRatio * 0.03 + boost * 0.02, now, 0.08);
    this.engineFilter.frequency.setTargetAtTime(360 + speedRatio * 820 + boost * 260, now, 0.08);
    this.windFilter.frequency.setTargetAtTime(780 + speedRatio * 1900 + drifting * 180, now, 0.08);
    this.windGain.gain.setTargetAtTime(0.0001 + phaseBlend * 0.006 + speedRatio * 0.04 + boost * 0.03 + drifting * 0.01, now, 0.08);
    this.droneGain.gain.setTargetAtTime(phase === 'hangar' ? 0.02 : phase === 'intro' ? 0.014 : 0.008, now, 0.3);

    if (ship?.boosting && !this.wasBoosting) {
      this.playBoostStart();
    }

    this.wasBoosting = Boolean(ship?.boosting);
  }

  syncCommentary(commentary, phase) {
    if (!this.speechEnabled || !commentary || phase === 'hangar') {
      return;
    }

    const pending = commentary.drainVoiceQueue();

    if (pending.length === 0) {
      return;
    }

    this.prepareSpeech();

    for (const entry of pending) {
      this.enqueueSpeech(entry);
    }

    this.processSpeechQueue();
  }

  playUiSelect() {
    this.playToneSweep({ frequency: 520, endFrequency: 760, duration: 0.08, gain: 0.03, type: 'triangle' });
  }

  playUiConfirm() {
    this.playToneSweep({ frequency: 420, endFrequency: 960, duration: 0.12, gain: 0.05, type: 'sawtooth' });
  }

  playCountdown(number) {
    const base = 620 - (number - 1) * 90;
    this.playToneSweep({ frequency: base, endFrequency: base * 0.94, duration: 0.18, gain: 0.06, type: 'square' });
    this.playToneSweep({ frequency: base * 2, endFrequency: base * 1.5, duration: 0.12, gain: 0.025, type: 'triangle' });
  }

  playGo() {
    this.playToneSweep({ frequency: 540, endFrequency: 980, duration: 0.26, gain: 0.07, type: 'sawtooth' });
    this.playToneSweep({ frequency: 720, endFrequency: 1320, duration: 0.18, gain: 0.045, type: 'triangle' });
    this.playNoiseBurst({ duration: 0.14, gain: 0.028, filterFrequency: 1600, filterType: 'bandpass' });
  }

  playLaunch() {
    this.playNoiseBurst({ duration: 0.2, gain: 0.026, filterFrequency: 540, filterType: 'lowpass' });
  }

  playBoostStart() {
    if (!this.canPlay('boost-start', 0.12)) {
      return;
    }

    this.playToneSweep({ frequency: 180, endFrequency: 1280, duration: 0.24, gain: 0.06, type: 'sawtooth' });
    this.playNoiseBurst({ duration: 0.18, gain: 0.02, filterFrequency: 1200, filterType: 'highpass' });
  }

  playDriftRelease(amount = 0) {
    const intensity = THREE.MathUtils.clamp(amount / 100, 0.25, 1);
    this.playNoiseBurst({ duration: 0.16 + intensity * 0.12, gain: 0.02 + intensity * 0.02, filterFrequency: 1900, filterType: 'bandpass' });
    this.playToneSweep({ frequency: 300, endFrequency: 660 + intensity * 220, duration: 0.12 + intensity * 0.06, gain: 0.03 + intensity * 0.02, type: 'triangle' });
  }

  playOvertake(count = 1) {
    const intensity = THREE.MathUtils.clamp(count / 3, 0.4, 1);
    this.playToneSweep({ frequency: 420, endFrequency: 920 + intensity * 120, duration: 0.12, gain: 0.038 + intensity * 0.018, type: 'triangle' });
  }

  playPositionLost() {
    this.playToneSweep({ frequency: 420, endFrequency: 230, duration: 0.16, gain: 0.03, type: 'square' });
  }

  playBoostPad() {
    this.playToneSweep({ frequency: 260, endFrequency: 1140, duration: 0.18, gain: 0.06, type: 'sawtooth' });
  }

  playSlowZone() {
    this.playToneSweep({ frequency: 380, endFrequency: 120, duration: 0.22, gain: 0.04, type: 'triangle' });
  }

  playHazard() {
    this.playNoiseBurst({ duration: 0.18, gain: 0.04, filterFrequency: 780, filterType: 'lowpass' });
    this.playToneSweep({ frequency: 180, endFrequency: 88, duration: 0.18, gain: 0.03, type: 'sine' });
  }

  playNearMiss() {
    if (!this.canPlay('near-miss', 0.22)) {
      return;
    }

    this.playNoiseBurst({ duration: 0.12, gain: 0.026, filterFrequency: 2200, filterType: 'bandpass' });
    this.playToneSweep({ frequency: 780, endFrequency: 1120, duration: 0.08, gain: 0.018, type: 'triangle' });
  }

  playPickup(itemType) {
    const colors = {
      'speed-burst': 980,
      shield: 760,
      emp: 680,
      missile: 520,
      'gravity-glitch': 610
    };

    const frequency = colors[itemType] ?? 720;
    this.playToneSweep({ frequency, endFrequency: frequency * 1.3, duration: 0.11, gain: 0.04, type: 'triangle' });
    this.playToneSweep({ frequency: frequency * 1.4, endFrequency: frequency * 1.9, duration: 0.09, gain: 0.022, type: 'sine' });
  }

  playEnergyPickup() {
    this.playToneSweep({ frequency: 640, endFrequency: 980, duration: 0.08, gain: 0.03, type: 'triangle' });
  }

  playNoTarget() {
    this.playToneSweep({ frequency: 260, endFrequency: 210, duration: 0.12, gain: 0.026, type: 'square' });
  }

  playShieldHum() {
    this.playToneSweep({ frequency: 440, endFrequency: 720, duration: 0.28, gain: 0.038, type: 'sine' });
  }

  playEmpShock() {
    this.playNoiseBurst({ duration: 0.14, gain: 0.03, filterFrequency: 2300, filterType: 'bandpass' });
    this.playToneSweep({ frequency: 900, endFrequency: 220, duration: 0.16, gain: 0.032, type: 'square' });
  }

  playGravityWarp() {
    this.playToneSweep({ frequency: 280, endFrequency: 520, duration: 0.2, gain: 0.034, type: 'triangle' });
    this.playToneSweep({ frequency: 420, endFrequency: 140, duration: 0.24, gain: 0.026, type: 'sine' });
  }

  playMissileLaunch() {
    this.playToneSweep({ frequency: 180, endFrequency: 880, duration: 0.18, gain: 0.04, type: 'sawtooth' });
  }

  playMissileImpact() {
    this.playNoiseBurst({ duration: 0.2, gain: 0.042, filterFrequency: 860, filterType: 'lowpass' });
    this.playToneSweep({ frequency: 240, endFrequency: 100, duration: 0.2, gain: 0.035, type: 'sine' });
  }

  playLap() {
    this.playToneSweep({ frequency: 440, endFrequency: 780, duration: 0.14, gain: 0.04, type: 'triangle' });
    this.playToneSweep({ frequency: 660, endFrequency: 1120, duration: 0.18, gain: 0.03, type: 'sine' });
  }

  playFinish(position) {
    if (position <= 3) {
      this.playToneSweep({ frequency: 360, endFrequency: 760, duration: 0.16, gain: 0.05, type: 'triangle' });
      this.playToneSweep({ frequency: 540, endFrequency: 1080, duration: 0.24, gain: 0.04, type: 'sine' });
      this.playToneSweep({ frequency: 760, endFrequency: 1320, duration: 0.3, gain: 0.03, type: 'triangle' });
      return;
    }

    this.playToneSweep({ frequency: 280, endFrequency: 360, duration: 0.14, gain: 0.035, type: 'triangle' });
    this.playToneSweep({ frequency: 220, endFrequency: 180, duration: 0.22, gain: 0.026, type: 'sine' });
  }

  handlePowerEvent(type, payload = {}) {
    if (type === 'pickup') {
      if (payload.kind === 'energy') {
        this.playEnergyPickup();
      } else {
        this.playPickup(payload.itemType);
      }

      return;
    }

    if (type === 'use-item') {
      if (payload.itemType === 'speed-burst') {
        this.playBoostStart();
      } else if (payload.itemType === 'shield') {
        this.playShieldHum();
      } else if (payload.itemType === 'emp') {
        this.playEmpShock();
      } else if (payload.itemType === 'missile') {
        this.playMissileLaunch();
      } else if (payload.itemType === 'gravity-glitch') {
        this.playGravityWarp();
      }

      return;
    }

    if (type === 'missile-impact') {
      this.playMissileImpact();
    }
  }

  enqueueSpeech(entry) {
    if (!this.settings.voiceEnabled) {
      return;
    }

    if (!entry?.text) {
      return;
    }

    const normalizedText = this.normalizeSpeechText(entry.text, entry.tone);

    if (!normalizedText) {
      return;
    }

    if (normalizedText === this.activeSpeech?.text || normalizedText === this.speechQueue[this.speechQueue.length - 1]?.text) {
      return;
    }

    this.speechQueue.push({
      id: entry.id ?? performance.now(),
      tone: entry.tone ?? 'neutral',
      text: normalizedText,
      priority: this.getSpeechPriority(entry.tone)
    });

    this.trimSpeechQueue();
  }

  trimSpeechQueue(maxItems = 4) {
    while (this.speechQueue.length > maxItems) {
      let dropIndex = 0;

      for (let index = 1; index < this.speechQueue.length; index += 1) {
        const candidate = this.speechQueue[index];
        const current = this.speechQueue[dropIndex];

        if (candidate.priority < current.priority) {
          dropIndex = index;
        }
      }

      this.speechQueue.splice(dropIndex, 1);
    }
  }

  getSpeechPriority(tone = 'neutral') {
    const priorityMap = {
      spotlight: 5,
      lead: 5,
      countdown: 6,
      player: 4,
      overtake: 4,
      boost: 3,
      chaos: 3,
      neutral: 2
    };

    return priorityMap[tone] ?? 2;
  }

  normalizeSpeechText(text, tone = 'neutral') {
    let normalized = String(text ?? '').trim();

    if (!normalized) {
      return '';
    }

    if (tone === 'countdown') {
      const match = normalized.match(/^(\d+)/);
      return match ? match[1] : normalized;
    }

    normalized = normalized
      .replace(/\bGO!/gi, 'Go!')
      .replace(/\bP(\d+)\b/g, 'position $1')
      .replace(/\+(\d+)u\b/gi, '$1 units')
      .replace(/\bu\/s\b/gi, 'units per second')
      .replace(/\bEMP\b/g, 'E M P')
      .replace(/\s+/g, ' ')
      .trim();

    return normalized;
  }

  processSpeechQueue() {
    if (!this.settings.voiceEnabled || !this.speechEnabled || !this.speech || this.activeSpeech || this.speech.speaking || this.speechQueue.length === 0) {
      return;
    }

    const now = performance.now() * 0.001;

    if (now < this.nextSpeechAllowedAt) {
      return;
    }

    const next = this.speechQueue.shift();
    const utterance = new SpeechSynthesisUtterance(next.text);
    utterance.voice = this.speechVoice;
    utterance.rate = next.tone === 'countdown' ? 1.08 : next.tone === 'overtake' || next.tone === 'boost' ? 1.03 : 0.98;
    utterance.pitch = next.tone === 'spotlight' || next.tone === 'lead' ? 0.92 : 0.98;
    utterance.volume = (next.tone === 'spotlight' ? 0.92 : 0.84) * this.settings.voice;

    utterance.onend = () => {
      if (this.activeSpeech === utterance) {
        this.activeSpeech = null;
      }

      this.nextSpeechAllowedAt = performance.now() * 0.001 + 0.12;
      this.processSpeechQueue();
    };

    utterance.onerror = () => {
      if (this.activeSpeech === utterance) {
        this.activeSpeech = null;
      }

      this.nextSpeechAllowedAt = performance.now() * 0.001 + 0.2;
    };

    try {
      this.activeSpeech = utterance;
      this.nextSpeechAllowedAt = now + 0.15;
      this.speech.speak(utterance);
    } catch {
      this.activeSpeech = null;
    }
  }

  stopCommentarySpeech(cancelCurrent = true) {
    this.speechQueue = [];

    if (!this.speechEnabled || !this.speech) {
      return;
    }

    if (cancelCurrent) {
      this.speech.cancel();
      this.activeSpeech = null;
    }
  }

  playToneSweep({
    frequency,
    endFrequency = frequency,
    duration,
    gain,
    type = 'sine',
    attack = 0.005,
    release = duration * 0.7,
    filterFrequency = 1800
  }) {
    if (!this.context || this.context.state !== 'running') {
      return;
    }

    const ctx = this.context;
    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const amplitude = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFrequency, now);

    amplitude.gain.setValueAtTime(0.0001, now);
    amplitude.gain.exponentialRampToValueAtTime(gain, now + attack);
    amplitude.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(attack + 0.02, release));

    oscillator.connect(filter);
    filter.connect(amplitude);
    amplitude.connect(this.fxGain);

    oscillator.start(now);
    oscillator.stop(now + duration + 0.05);
  }

  playNoiseBurst({
    duration,
    gain,
    filterFrequency,
    filterType = 'bandpass'
  }) {
    if (!this.context || this.context.state !== 'running') {
      return;
    }

    const ctx = this.context;
    const now = ctx.currentTime;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const amplitude = ctx.createGain();

    source.buffer = this.noiseBuffer;
    source.loop = false;

    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFrequency, now);
    filter.Q.value = 0.8;

    amplitude.gain.setValueAtTime(0.0001, now);
    amplitude.gain.exponentialRampToValueAtTime(gain, now + 0.01);
    amplitude.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    source.connect(filter);
    filter.connect(amplitude);
    amplitude.connect(this.fxGain);

    source.start(now);
    source.stop(now + duration + 0.05);
  }

  canPlay(key, cooldownSeconds) {
    const time = performance.now() * 0.001;
    const lastTime = this.eventCooldowns.get(key) ?? -Infinity;

    if (time - lastTime < cooldownSeconds) {
      return false;
    }

    this.eventCooldowns.set(key, time);
    return true;
  }

  dispose() {
    this.stopCommentarySpeech(true);

    if (this.speech && this.voiceEventHandler && typeof this.speech.removeEventListener === 'function') {
      this.speech.removeEventListener('voiceschanged', this.voiceEventHandler);
    }

    if (this.context) {
      this.context.close();
    }

    this.context = null;
  }
}
