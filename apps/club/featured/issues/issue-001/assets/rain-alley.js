/* global document, window */
// Original procedural ambience: filtered rain and sparse pentatonic tones, no external audio.
const sound = document.querySelector('#sound');
const motion = document.querySelector('#motion');
const volume = document.querySelector('#volume');
const status = document.querySelector('#sound-status');
const player = document.querySelector('.reading-controls');
const options = document.querySelector('#player-options');
const panel = document.querySelector('#player-panel');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
let context;
let master;
let playing = false;
let changing = false;
let timer;
let step = 0;
let paused = reduced.matches;
const voices = new Set();
const notes = [220, 261.63, 329.63, 392, 440, 392, 329.63, 261.63];

function updateMotion() {
  document.documentElement.classList.toggle('motion-paused', paused);
  const label = reduced.matches ? '已减少动态' : paused ? '继续落雨' : '暂停落雨';
  motion.setAttribute('aria-label', label);
  motion.title = label;
  motion.setAttribute('aria-pressed', String(paused));
  motion.disabled = reduced.matches;
}
function updateSound() {
  const label = playing ? '关闭雨声与配乐' : '开启雨声与配乐';
  sound.setAttribute('aria-label', label);
  sound.title = label;
  sound.setAttribute('aria-pressed', String(playing));
}
function stopMusic() {
  window.clearInterval(timer);
  for (const voice of voices) {
    voice.stop();
    voice.disconnect();
  }
  voices.clear();
}
function playNote() {
  if (!playing) return;
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = notes[step++ % notes.length];
  envelope.gain.setValueAtTime(0, context.currentTime);
  envelope.gain.linearRampToValueAtTime(0.035, context.currentTime + 1.4);
  envelope.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 6);
  oscillator.connect(envelope).connect(master);
  oscillator.start();
  oscillator.stop(context.currentTime + 6.1);
  voices.add(oscillator);
  oscillator.onended = () => {
    voices.delete(oscillator);
    oscillator.disconnect();
    envelope.disconnect();
  };
}
function createAudio() {
  context = new window.AudioContext();
  master = context.createGain();
  master.gain.value = Number(volume.value) / 100;
  master.connect(context.destination);
  const buffer = context.createBuffer(1, context.sampleRate * 6, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const rain = context.createBufferSource();
  rain.buffer = buffer;
  rain.loop = true;
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1100;
  const rainGain = context.createGain();
  rainGain.gain.value = 0.09;
  rain.connect(filter).connect(rainGain).connect(master);
  rain.start();
}
sound.addEventListener('click', async () => {
  if (changing) return;
  changing = true;
  sound.disabled = true;
  try {
    if (!context) createAudio();
    if (playing) {
      playing = false;
      stopMusic();
      await context.suspend();
    } else {
      await context.resume();
      playing = true;
      playNote();
      timer = window.setInterval(playNote, 3600);
    }
    status.textContent = playing ? '雨声与配乐已开启' : '声音已关闭';
  } catch {
    playing = false;
    stopMusic();
    if (context) await context.close().catch(() => {});
    context = undefined;
    status.textContent = '声音暂时无法开启，仍可继续阅读。';
  } finally {
    changing = false;
    sound.disabled = false;
    updateSound();
  }
});
volume.addEventListener('input', () => {
  if (master) master.gain.setTargetAtTime(Number(volume.value) / 100, context.currentTime, 0.1);
});
motion.addEventListener('click', () => {
  paused = !paused;
  updateMotion();
});
reduced.addEventListener('change', () => {
  paused = reduced.matches;
  updateMotion();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && context) {
    playing = false;
    stopMusic();
    void context.suspend();
    updateSound();
    status.textContent = '离开页面后声音已暂停，请手动重新开启。';
  }
});
window.addEventListener('pagehide', () => {
  playing = false;
  stopMusic();
  if (context) void context.suspend();
});
function setPanel(open) {
  panel.hidden = !open;
  options.setAttribute('aria-expanded', String(open));
}
// Pointer hover mirrors music-story; touch and keyboard retain an explicit toggle.
let pinned = false;
options.addEventListener('click', () => {
  pinned = !pinned;
  setPanel(pinned);
});
player.addEventListener('pointerenter', (event) => {
  if (event.pointerType === 'mouse') setPanel(true);
});
player.addEventListener('pointerleave', (event) => {
  if (event.pointerType === 'mouse' && !pinned && !panel.contains(document.activeElement))
    setPanel(false);
});
player.addEventListener('focusout', (event) => {
  if (!player.contains(event.relatedTarget) && !pinned) setPanel(false);
});
document.addEventListener('pointerdown', (event) => {
  if (!player.contains(event.target)) {
    pinned = false;
    setPanel(false);
  }
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !panel.hidden) {
    pinned = false;
    setPanel(false);
    options.focus();
  }
});
const navigation = document.querySelector('.club-edition-nav');
function positionPlayer() {
  player.style.setProperty(
    '--player-nav-bottom',
    `${Math.max(0, navigation.getBoundingClientRect().bottom)}px`,
  );
}
window.addEventListener('scroll', positionPlayer, { passive: true });
window.addEventListener('resize', positionPlayer);
positionPlayer();
updateMotion();
player.hidden = false;
