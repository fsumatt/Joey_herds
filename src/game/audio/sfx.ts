type SoundName = 'bark' | 'capture' | 'complete';

const soundShapes: Record<SoundName, Array<{ frequency: number; duration: number; delay?: number; type?: OscillatorType; gain?: number }>> = {
  bark: [
    { frequency: 360, duration: 0.055, type: 'square', gain: 0.08 },
    { frequency: 260, duration: 0.07, delay: 0.055, type: 'square', gain: 0.07 },
  ],
  capture: [
    { frequency: 560, duration: 0.08, type: 'sine', gain: 0.06 },
    { frequency: 760, duration: 0.11, delay: 0.075, type: 'sine', gain: 0.05 },
  ],
  complete: [
    { frequency: 523.25, duration: 0.12, type: 'triangle', gain: 0.07 },
    { frequency: 659.25, duration: 0.12, delay: 0.12, type: 'triangle', gain: 0.07 },
    { frequency: 783.99, duration: 0.18, delay: 0.24, type: 'triangle', gain: 0.08 },
  ],
};

let audioContext: AudioContext | undefined;

const getAudioContext = () => {
  const AudioContextConstructor = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextConstructor) return undefined;
  audioContext ??= new AudioContextConstructor();
  if (audioContext.state === 'suspended') void audioContext.resume();
  return audioContext;
};

export function playPlaceholderSound(name: SoundName) {
  const context = getAudioContext();
  if (!context) return;

  soundShapes[name].forEach(({ frequency, duration, delay = 0, type = 'sine', gain = 0.05 }) => {
    const startAt = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startAt);
    gainNode.gain.setValueAtTime(0.0001, startAt);
    gainNode.gain.exponentialRampToValueAtTime(gain, startAt + 0.012);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    oscillator.connect(gainNode).connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.03);
  });
}
