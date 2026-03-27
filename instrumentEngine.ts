// ─── Instrument Audio Engine for InstruComposer ─────────────────────────────
import type { InstrumentPreset, InstrumentTrack } from '../types/music';
import { INSTRUMENT_PRESETS } from '../types/music';

export class InstrumentEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  // Cache of custom audio buffers: trackId -> AudioBuffer
  private customBuffers: Map<string, AudioBuffer> = new Map();

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  /** Public accessor for the AudioContext (used by InstruComposer scheduler) */
  getCtxPublic(): AudioContext {
    return this.getCtx();
  }

  async resume() {
    const ctx = this.getCtx();
    if (ctx.state === 'suspended') await ctx.resume();
  }

  /** Load a custom audio file for a track */
  async loadCustomBuffer(trackId: string, file: File): Promise<string> {
    const ctx = this.getCtx();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    this.customBuffers.set(trackId, audioBuffer);
    return file.name;
  }

  /** Clear custom buffer for a track */
  clearCustomBuffer(trackId: string) {
    this.customBuffers.delete(trackId);
  }

  hasCustomBuffer(trackId: string): boolean {
    return this.customBuffers.has(trackId);
  }

  /** Play a note for a given instrument track at a frequency */
  playNote(
    track: InstrumentTrack,
    frequency: number,
    startTime: number,
    durationSecs: number,
    masterVolume = 1,
  ): void {
    const ctx = this.getCtx();
    const master = this.masterGain!;
    const vol = track.volume * masterVolume;

    if (this.customBuffers.has(track.id)) {
      this._playCustom(ctx, master, track, frequency, startTime, durationSecs, vol);
    } else {
      const preset = INSTRUMENT_PRESETS[track.instrumentKey] || INSTRUMENT_PRESETS['piano'];
      this._playSynth(ctx, master, preset, track, frequency, startTime, durationSecs, vol);
    }
  }

  private _playCustom(
    ctx: AudioContext, master: GainNode,
    track: InstrumentTrack, frequency: number,
    startTime: number, durationSecs: number, vol: number
  ) {
    const buffer = this.customBuffers.get(track.id)!;
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // Pitch shift relative to A4
    const basePitch = 440;
    source.playbackRate.value = frequency / basePitch;

    const gainNode = ctx.createGain();
    source.connect(gainNode);

    // FX chain
    const out = this._buildFxChain(ctx, gainNode, track, startTime, durationSecs, vol);
    out.connect(master);

    source.start(startTime);
    source.stop(startTime + durationSecs + (track.echo ? track.echoDelay / 1000 * 4 : 0.5));
  }

  private _playSynth(
    ctx: AudioContext, master: GainNode,
    preset: InstrumentPreset, track: InstrumentTrack,
    frequency: number, startTime: number, durationSecs: number, vol: number
  ) {
    const now = startTime;

    // Primary oscillator
    const osc = ctx.createOscillator();
    osc.type = preset.oscillatorType as OscillatorType;
    osc.frequency.setValueAtTime(frequency, now);
    osc.detune.setValueAtTime(preset.detune, now);

    // Optional second oscillator for richness (slight detune)
    const osc2 = ctx.createOscillator();
    osc2.type = preset.oscillatorType as OscillatorType;
    osc2.frequency.setValueAtTime(frequency, now);
    osc2.detune.setValueAtTime(preset.detune + 6, now);

    // Envelope gain
    const envGain = ctx.createGain();
    const attackEnd = now + preset.attackTime;
    const decayEnd = attackEnd + preset.decayTime;
    const releaseStart = now + Math.max(durationSecs, preset.attackTime + preset.decayTime);
    const releaseEnd = releaseStart + preset.releaseTime;

    envGain.gain.setValueAtTime(0, now);
    envGain.gain.linearRampToValueAtTime(vol, attackEnd);
    envGain.gain.linearRampToValueAtTime(preset.sustainLevel * vol, decayEnd);
    envGain.gain.setValueAtTime(preset.sustainLevel * vol, releaseStart);
    envGain.gain.linearRampToValueAtTime(0.001, releaseEnd);

    // Filter
    const filter = ctx.createBiquadFilter();
    filter.type = preset.filterType;
    filter.frequency.setValueAtTime(preset.filterFreq, now);

    // Osc2 gain (quieter)
    const osc2Gain = ctx.createGain();
    osc2Gain.gain.value = 0.25;

    osc.connect(envGain);
    osc2.connect(osc2Gain);
    osc2Gain.connect(envGain);
    envGain.connect(filter);

    const out = this._buildFxChain(ctx, filter, track, startTime, durationSecs, 1);
    out.connect(master);

    osc.start(now);
    osc2.start(now);
    osc.stop(releaseEnd + 0.05);
    osc2.stop(releaseEnd + 0.05);
  }

  private _buildFxChain(
    ctx: AudioContext,
    input: AudioNode,
    track: InstrumentTrack,
    startTime: number,
    durationSecs: number,
    vol: number
  ): AudioNode {
    let current: AudioNode = input;

    // Echo / delay
    if (track.echo) {
      const delay = ctx.createDelay(2.0);
      delay.delayTime.value = track.echoDelay / 1000;
      const feedback = ctx.createGain();
      feedback.gain.value = track.echoFeedback;
      const echoGain = ctx.createGain();
      echoGain.gain.value = 0.4;

      current.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(echoGain);

      const merger = ctx.createGain();
      current.connect(merger);
      echoGain.connect(merger);
      current = merger;
    }

    // Fade in / out
    const fxGain = ctx.createGain();
    const now = startTime;
    if (track.fadeIn && track.fadeOut) {
      const mid = now + durationSecs / 2;
      fxGain.gain.setValueAtTime(0.001, now);
      fxGain.gain.linearRampToValueAtTime(vol, mid);
      fxGain.gain.linearRampToValueAtTime(0.001, now + durationSecs);
    } else if (track.fadeIn) {
      fxGain.gain.setValueAtTime(0.001, now);
      fxGain.gain.linearRampToValueAtTime(vol, now + Math.min(durationSecs, 0.5));
      fxGain.gain.setValueAtTime(vol, now + durationSecs);
    } else if (track.fadeOut) {
      fxGain.gain.setValueAtTime(vol, now);
      fxGain.gain.linearRampToValueAtTime(0.001, now + durationSecs);
    } else {
      fxGain.gain.value = vol;
    }

    current.connect(fxGain);
    return fxGain;
  }

  /** Preview a single note immediately */
  previewNote(track: InstrumentTrack, frequency: number) {
    const ctx = this.getCtx();
    this.playNote(track, frequency, ctx.currentTime, 0.5, 0.6);
  }

  setMasterVolume(vol: number) {
    if (this.masterGain) this.masterGain.gain.value = vol;
  }
}

export const instrumentEngine = new InstrumentEngine();
