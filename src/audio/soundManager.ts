import { SOUND_URLS, type SoundKey } from './sounds';

const MUSIC_VOLUME = 0.25;

/**
 * Thin Web Audio wrapper: decode-once, play-many. `play()` silently no-ops
 * if a clip hasn't finished loading yet or the browser hasn't unlocked audio
 * - sound is a nice-to-have, never something gameplay should wait on or
 * crash without.
 */
class SoundManager {
  private context: AudioContext | null = null;
  private buffers = new Map<SoundKey, AudioBuffer>();
  private loadPromise: Promise<void> | null = null;
  private cycleIndex = new Map<string, number>();
  private musicSource: AudioBufferSourceNode | null = null;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return null;
    if (!this.context) this.context = new AudioContextCtor();
    if (this.context.state === 'suspended') void this.context.resume();
    return this.context;
  }

  /** Fire-and-forget: decodes every clip once. Safe to call multiple times. */
  preload(): Promise<void> {
    if (this.loadPromise) return this.loadPromise;
    const ctx = this.ensureContext();
    if (!ctx) return Promise.resolve();

    this.loadPromise = Promise.all(
      (Object.entries(SOUND_URLS) as Array<[SoundKey, string]>).map(async ([key, url]) => {
        try {
          const response = await fetch(url);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
          this.buffers.set(key, audioBuffer);
        } catch {
          // A single missing/corrupt clip shouldn't take the rest down.
        }
      }),
    ).then(() => undefined);

    return this.loadPromise;
  }

  play(key: SoundKey, volume = 1): void {
    const ctx = this.ensureContext();
    const buffer = this.buffers.get(key);
    if (!ctx || !buffer) return;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(gain).connect(ctx.destination);
    source.start();
  }

  /** Cycles through `keys` round-robin (1,2,3,1,2,3...) on each call, keyed by `groupKey`. */
  playAlternating(groupKey: string, keys: SoundKey[]): void {
    if (keys.length === 0) return;
    const index = this.cycleIndex.get(groupKey) ?? 0;
    this.cycleIndex.set(groupKey, index + 1);
    const key = keys[index % keys.length];
    if (key) this.play(key);
  }

  startMusic(key: SoundKey, volume = MUSIC_VOLUME): void {
    if (this.musicSource) return;
    const ctx = this.ensureContext();
    const buffer = this.buffers.get(key);
    if (!ctx || !buffer) return;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(gain).connect(ctx.destination);
    source.start();
    this.musicSource = source;
  }

  stopMusic(): void {
    this.musicSource?.stop();
    this.musicSource = null;
  }
}

export const soundManager = new SoundManager();
