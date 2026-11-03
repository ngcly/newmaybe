/* global document, window */
// 那年，那人，那条路. Scrolling walks the road: the painting stays pinned, each stanza settles into
// its sky as falling leaves turn to ink, and a gust carries it off again. The reader's hand is the
// wind. The ambience is generated in the browser (gusting wind and plucked strings in a pentatonic
// mode); there is no recorded audio.
const root = document.documentElement;
const journey = document.querySelector('.journey');
const stage = document.querySelector('.stage');
const plates = [...document.querySelectorAll('.plate')];
const canvas = document.querySelector('.leaves');
const navigation = document.querySelector('.club-edition-nav');
const sound = document.querySelector('#sound');
const motion = document.querySelector('#motion');
const volume = document.querySelector('#volume');
const volumeControl = document.querySelector('.player-volume');
const status = document.querySelector('#sound-status');
const player = document.querySelector('.player');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

// Share of the walk given to each plate, in reading order.
const steps = [
  ['title', 0.08],
  ['year', 0.17],
  ['road', 0.17],
  ['person', 0.22],
  ['now', 0.17],
  ['wind', 0.19],
];
// Falling leaves and the breeze (px/s) for each scene: 风轻云淡 at the crossing, a gale at the end.
const density = { title: 3, year: 5, road: 20, person: 24, now: 12, wind: 30 };
const breeze = { title: 12, year: 16, road: 30, person: 44, now: 22, wind: 56 };
const windLevels = { title: 0.05, year: 0.05, road: 0.075, person: 0.1, now: 0.06, wind: 0.085 };
// 羽调式 (A minor pentatonic), low and unhurried. Each digit indexes a pitch; a dot is a rest.
const pitches = [110, 130.81, 146.83, 164.81, 196, 220, 261.63, 293.66, 329.63];
const phrase = '5.43.2..3.1...6.54.3.2..0...3.45..7.65....';
const random = (min, max) => min + Math.random() * (max - min);
let scene = stage.dataset.state;
let paused = reduced.matches;
let windSince = 0;

// ---- 叶落成字: every verse becomes glyphs that can drift in like leaves; a hidden copy keeps
// the lines whole for screen readers.
const codaGlyphs = [];
for (const verse of document.querySelectorAll('.verse')) {
  const lines = [''];
  for (const node of verse.childNodes) {
    if (node.nodeName === 'BR') lines.push('');
    else lines[lines.length - 1] += node.textContent.replace(/\s+/g, '');
  }
  const reader = document.createElement('span');
  reader.className = 'visually-hidden';
  reader.textContent = lines.join('');
  const glyphs = document.createElement('span');
  glyphs.className = 'glyphs';
  glyphs.setAttribute('aria-hidden', 'true');
  let index = 0;
  for (const text of lines.filter(Boolean)) {
    const line = document.createElement('span');
    line.className = 'line';
    for (const character of text) {
      const glyph = document.createElement('span');
      glyph.className = `glyph tone-${'abc'[Math.floor(Math.random() * 3)]}`;
      glyph.textContent = character;
      for (const [name, value] of [
        ['--i', index++],
        ['--dx', `${random(-90, 10).toFixed(0)}px`],
        ['--dy', `${random(-150, -40).toFixed(0)}px`],
        ['--r', `${random(-170, 170).toFixed(0)}deg`],
        ['--bx', `${random(150, 380).toFixed(0)}px`],
        ['--by', `${random(-70, 90).toFixed(0)}px`],
        ['--br', `${random(120, 460).toFixed(0)}deg`],
      ])
        glyph.style.setProperty(name, value);
      line.append(glyph);
      if (verse.classList.contains('coda-line'))
        codaGlyphs.push({ element: glyph, x: 0, y: 0, r: 0, cx: 0, cy: 0 });
    }
    glyphs.append(line);
  }
  verse.replaceChildren(reader, glyphs);
}
root.classList.add('js');

// ---- Scenes: the scroll position along the pinned walk chooses the plate.
const leaving = new Map();
let codaReady = false;
let codaTimer;
function showPlate(name) {
  for (const plate of plates) {
    if (plate.dataset.scene === name) {
      window.clearTimeout(leaving.get(plate));
      plate.classList.remove('is-leaving');
      plate.classList.add('is-active');
    } else if (plate.classList.contains('is-active')) {
      plate.classList.replace('is-active', 'is-leaving');
      leaving.set(
        plate,
        window.setTimeout(() => plate.classList.remove('is-leaving'), 1800),
      );
    }
  }
}
function setScene(next) {
  scene = next;
  stage.dataset.state = next;
  showPlate(next);
  window.clearTimeout(codaTimer);
  codaReady = false;
  resetCoda();
  if (next === 'wind') {
    windSince = window.performance.now();
    // Let the closing line settle before it starts answering the reader's hand.
    codaTimer = window.setTimeout(() => {
      measureCoda();
      codaReady = true;
    }, 2600);
  }
  syncGale();
}
function walkLength() {
  return Math.max(1, journey.offsetHeight - stage.offsetHeight);
}
function sceneAt(progress) {
  let end = 0;
  for (const [name, share] of steps) {
    end += share;
    if (progress < end) return name;
  }
  return steps[steps.length - 1][0];
}
let frame = 0;
function measure() {
  frame = 0;
  const progress = Math.min(1, Math.max(0, -journey.getBoundingClientRect().top / walkLength()));
  if (reduced.matches) stage.style.removeProperty('--walk');
  else stage.style.setProperty('--walk', progress.toFixed(4));
  const next = sceneAt(progress);
  if (next !== scene) setScene(next);
}
function schedule() {
  if (!frame) frame = window.requestAnimationFrame(measure);
}
// In-page links to a stanza walk to its place on the road instead of jumping into the stage.
function walkTo(id, smooth) {
  const plate = document.getElementById(id);
  if (!plate || !plates.includes(plate)) return false;
  let start = 0;
  for (const [name, share] of steps) {
    if (name === plate.dataset.scene) {
      start += share * 0.3;
      break;
    }
    start += share;
  }
  const top = window.scrollY + journey.getBoundingClientRect().top + start * walkLength();
  window.scrollTo({ top, behavior: smooth && !reduced.matches ? 'smooth' : 'auto' });
  return true;
}
document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href*="#"]');
  if (!link || link.pathname !== window.location.pathname) return;
  if (walkTo(decodeURIComponent(link.hash.slice(1)), true)) {
    event.preventDefault();
    window.history.replaceState(null, '', link.hash);
  }
});
window.addEventListener('hashchange', () =>
  walkTo(decodeURIComponent(window.location.hash.slice(1)), true),
);

// ---- Leaves: a small particle system blown by the scene's breeze and by the reader's hand.
const context = canvas.getContext('2d');
const leafShape = new window.Path2D(
  'M0 11 .4 4.1C4 3.5 8.2.4 9-4.6 6.4-6.9 2.9-7.4.9-5.5L0-3.6-.9-5.5C-2.9-7.4-6.4-6.9-9-4.6-8.2.4-4 3.5-.4 4.1Z',
);
const probes = ['a', 'b', 'c'].map((tone) => {
  const probe = document.createElement('i');
  probe.className = `leaf-probe tone-${tone}`;
  probe.setAttribute('aria-hidden', 'true');
  stage.append(probe);
  return probe;
});
const leaves = [];
const hand = { x: -1e4, y: -1e4, vx: 0, vy: 0, time: 0, energy: 0 };
let width = 0;
let height = 0;
let colors = ['', '', ''];
let running = false;
let onScreen = true;
let last = 0;
let tick = 0;

function resizeCanvas() {
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  width = stage.clientWidth;
  height = stage.clientHeight;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
}
function addLeaf(x, y, vx, vy) {
  if (leaves.length > 90) return;
  leaves.push({
    x,
    y,
    vx,
    vy,
    turn: random(0, 6.3),
    spin: random(-2.2, 2.2),
    flip: random(0, 6.3),
    flipRate: random(1.3, 3.1),
    size: random(0.7, 1.35),
    tone: Math.floor(Math.random() * 3),
    sway: random(0.6, 1.5),
  });
}
// Ten-second gusts in the closing scene, in step with the drawn wind and the sound.
function gust(now) {
  if (scene !== 'wind') return 0;
  const t = ((now - windSince) / 1000) % 10;
  return t < 4 ? Math.sin((Math.PI * t) / 4) ** 2 * 440 : 0;
}
function drawLeaves(now) {
  if (!running) return;
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
  last = now;
  if (tick++ % 6 === 0) colors = probes.map((probe) => window.getComputedStyle(probe).color);
  const wind = breeze[scene] + gust(now);
  const target = density[scene];
  if (leaves.length < target && Math.random() < dt * (2 + target * 0.3)) {
    const fromSide = wind > 160 && Math.random() < 0.7;
    addLeaf(
      fromSide ? -30 : random(-0.2, 1) * width,
      fromSide ? random(0, 0.75) * height : -30,
      wind * 0.6,
      random(18, 46),
    );
  }
  hand.vx *= 0.03 ** dt;
  hand.vy *= 0.03 ** dt;
  hand.energy *= 0.05 ** dt;
  context.clearRect(0, 0, width, height);
  for (let i = leaves.length - 1; i >= 0; i--) {
    const leaf = leaves[i];
    let ax = (wind * leaf.size - leaf.vx) * 1.1;
    let ay = (30 + 26 * leaf.size - leaf.vy) * 0.9;
    const distance = Math.hypot(leaf.x - hand.x, leaf.y - hand.y);
    if (distance < 190 && hand.energy > 20) {
      const k = (1 - distance / 190) ** 2;
      ax += hand.vx * k * 7;
      ay += hand.vy * k * 7 - 120 * k;
      leaf.spin = Math.max(-6, Math.min(6, leaf.spin + Math.sign(hand.vx) * k * dt * 12));
    }
    leaf.vx += ax * dt;
    leaf.vy += ay * dt;
    leaf.flip += leaf.flipRate * dt;
    leaf.turn += leaf.spin * dt;
    leaf.x += (leaf.vx + Math.sin(leaf.flip * 0.8) * 24 * leaf.sway) * dt;
    leaf.y += leaf.vy * dt;
    if (leaf.y > height + 40 || leaf.y < -240 || leaf.x > width + 60 || leaf.x < -320) {
      leaves.splice(i, 1);
      continue;
    }
    context.save();
    context.translate(leaf.x, leaf.y);
    context.rotate(leaf.turn);
    context.scale(leaf.size * Math.cos(leaf.flip), leaf.size);
    context.fillStyle = colors[leaf.tone];
    context.fill(leafShape);
    context.restore();
  }
  swayCoda();
  window.requestAnimationFrame(drawLeaves);
}
function updateRunning() {
  const next = onScreen && !paused && !reduced.matches && !document.hidden;
  if (next && !running) {
    running = true;
    last = window.performance.now();
    window.requestAnimationFrame(drawLeaves);
  } else if (!next && running) {
    running = false;
    resetCoda();
    if (reduced.matches) context.clearRect(0, 0, width, height);
  }
}

// 风却不是你: the closing line leans away from the reader's hand, then settles back.
function measureCoda() {
  const box = stage.getBoundingClientRect();
  for (const glyph of codaGlyphs) {
    const rect = glyph.element.getBoundingClientRect();
    glyph.cx = rect.left + rect.width / 2 - box.left - glyph.x;
    glyph.cy = rect.top + rect.height / 2 - box.top - glyph.y;
  }
}
function swayCoda() {
  if (scene !== 'wind' || !codaReady) return;
  const strength = Math.min(1, hand.energy / 700);
  for (const glyph of codaGlyphs) {
    let tx = 0;
    let ty = 0;
    const dx = glyph.cx - hand.x;
    const dy = glyph.cy - hand.y;
    const distance = Math.hypot(dx, dy) || 1;
    if (distance < 260 && strength > 0.02) {
      const k = (1 - distance / 260) ** 2 * strength;
      tx = (dx / distance) * 30 * k + hand.vx * 0.014 * k;
      ty = (dy / distance) * 20 * k + hand.vy * 0.01 * k;
    }
    glyph.x += (tx - glyph.x) * 0.1;
    glyph.y += (ty - glyph.y) * 0.1;
    glyph.r += (tx * 0.6 - glyph.r) * 0.1;
    const moving = Math.abs(glyph.x) + Math.abs(glyph.y) + Math.abs(glyph.r) > 0.05;
    if (moving || glyph.moving) {
      glyph.element.style.translate = `${glyph.x.toFixed(2)}px ${glyph.y.toFixed(2)}px`;
      glyph.element.style.rotate = `${glyph.r.toFixed(2)}deg`;
    }
    glyph.moving = moving;
  }
}
function resetCoda() {
  for (const glyph of codaGlyphs) {
    glyph.x = glyph.y = glyph.r = 0;
    glyph.moving = false;
    glyph.element.style.translate = '';
    glyph.element.style.rotate = '';
  }
}

// The reader's hand: moving across the painting raises a breeze; a tap shakes leaves loose.
let press;
stage.addEventListener('pointermove', (event) => {
  const box = stage.getBoundingClientRect();
  const x = event.clientX - box.left;
  const y = event.clientY - box.top;
  const elapsed = event.timeStamp - hand.time;
  if (hand.time && elapsed > 0 && elapsed < 120) {
    hand.vx = hand.vx * 0.5 + ((x - hand.x) / Math.max(8, elapsed)) * 500;
    hand.vy = hand.vy * 0.5 + ((y - hand.y) / Math.max(8, elapsed)) * 500;
    hand.energy = Math.min(1600, Math.max(hand.energy, Math.hypot(hand.vx, hand.vy)));
    stir(hand.energy);
  }
  hand.x = x;
  hand.y = y;
  hand.time = event.timeStamp;
});
stage.addEventListener('pointerleave', () => {
  hand.time = 0;
});
stage.addEventListener('pointerdown', (event) => {
  press = event.target.closest('.player, .cue')
    ? undefined
    : { x: event.clientX, y: event.clientY, time: event.timeStamp };
});
stage.addEventListener('pointerup', (event) => {
  if (
    running &&
    press &&
    Math.hypot(event.clientX - press.x, event.clientY - press.y) < 12 &&
    event.timeStamp - press.time < 450
  ) {
    const box = stage.getBoundingClientRect();
    const x = event.clientX - box.left;
    const y = event.clientY - box.top;
    for (let i = 0; i < 10; i++) {
      const angle = random(-Math.PI * 0.95, -Math.PI * 0.05);
      const speed = random(90, 260);
      addLeaf(
        x + random(-14, 14),
        y + random(-14, 14),
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
      );
    }
    rustle();
  }
  press = undefined;
});

// ---- Sound: off until the reader asks for it.
let audio;
let master;
let wind;
let swell;
let windFilter;
let windPan;
let reverb;
let noise;
let playing = false;
let changing = false;
let gustTimer;
let melodyTimer;
let galeTimer;
let stirred = 0;
let step = 0;
const strings = new Map();
const voices = new Set();

function updateMotion() {
  root.classList.toggle('motion-paused', paused);
  const label = reduced.matches ? '已减少动态' : paused ? '继续落叶' : '暂停落叶';
  motion.setAttribute('aria-label', label);
  motion.title = label;
  motion.setAttribute('aria-pressed', String(paused));
  motion.disabled = reduced.matches;
  updateRunning();
}
function updateSound() {
  const label = playing ? '关闭风声与琴音' : '开启风声与琴音';
  sound.setAttribute('aria-label', label);
  sound.title = label;
  sound.setAttribute('aria-pressed', String(playing));
  volumeControl.hidden = !playing;
}
function noiseBuffer(seconds) {
  const buffer = audio.createBuffer(1, audio.sampleRate * seconds, audio.sampleRate);
  const data = buffer.getChannelData(0);
  let lastValue = 0;
  for (let i = 0; i < data.length; i++) {
    lastValue = (lastValue + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    data[i] = lastValue * 3.5;
  }
  return buffer;
}
function impulse(seconds) {
  const length = audio.sampleRate * seconds;
  const buffer = audio.createBuffer(2, length, audio.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++)
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
  }
  return buffer;
}
// Karplus–Strong: a softened noise burst circulating through a damped delay line.
function pluck(frequency) {
  const rate = audio.sampleRate;
  const length = Math.floor(rate * 4);
  const buffer = audio.createBuffer(1, length, rate);
  const data = buffer.getChannelData(0);
  const period = Math.max(2, Math.round(rate / frequency));
  const ring = new Float32Array(period);
  let smooth = 0;
  for (let i = 0; i < period; i++) {
    smooth = smooth * 0.55 + (Math.random() * 2 - 1) * 0.45;
    ring[i] = smooth;
  }
  for (let i = 0, index = 0; i < length; i++) {
    const next = (index + 1) % period;
    const value = ring[index];
    ring[index] = (value + ring[next]) * 0.4985;
    data[i] = value;
    index = next;
  }
  for (let i = 0; i < 96; i++) data[i] *= i / 96;
  const tail = Math.floor(rate * 0.5);
  for (let i = 0; i < tail; i++) data[length - 1 - i] *= i / tail;
  return buffer;
}
function createAudio() {
  audio = new window.AudioContext();
  master = audio.createGain();
  master.gain.value = Number(volume.value) / 100;
  master.connect(audio.destination);
  reverb = audio.createConvolver();
  reverb.buffer = impulse(2.8);
  const wet = audio.createGain();
  wet.gain.value = 0.4;
  reverb.connect(wet).connect(master);

  noise = noiseBuffer(8);
  const source = audio.createBufferSource();
  source.buffer = noise;
  source.loop = true;
  windFilter = audio.createBiquadFilter();
  windFilter.type = 'bandpass';
  windFilter.frequency.value = 480;
  windFilter.Q.value = 0.7;
  wind = audio.createGain();
  wind.gain.value = 0;
  swell = audio.createGain();
  windPan = audio.createStereoPanner();
  source.connect(windFilter).connect(wind).connect(swell).connect(windPan).connect(master);
  source.start();
  for (const frequency of pitches) strings.set(frequency, pluck(frequency));
}
function breathe() {
  if (!playing) return;
  const now = audio.currentTime;
  const level = windLevels[scene] ?? 0.06;
  wind.gain.setTargetAtTime(level * (0.6 + Math.random() * 0.8), now, 0.9 + Math.random());
  windFilter.frequency.setTargetAtTime(320 + Math.random() * 520, now, 1.2);
  windPan.pan.setTargetAtTime(Math.random() * 0.9 - 0.45, now, 1.6);
  gustTimer = window.setTimeout(breathe, 1800 + Math.random() * 2400);
}
function gale() {
  if (!playing || scene !== 'wind') return;
  const now = audio.currentTime;
  wind.gain.cancelScheduledValues(now);
  wind.gain.setTargetAtTime(0.26, now, 0.5);
  wind.gain.setTargetAtTime(windLevels.wind, now + 2.4, 1.4);
  windFilter.frequency.cancelScheduledValues(now);
  windFilter.frequency.setTargetAtTime(1300, now, 0.6);
  windFilter.frequency.setTargetAtTime(520, now + 2.4, 1.6);
  windPan.pan.setTargetAtTime(0.6, now + 0.4, 1.4);
}
function syncGale() {
  window.clearInterval(galeTimer);
  galeTimer = undefined;
  if (playing && scene === 'wind') {
    gale();
    galeTimer = window.setInterval(gale, 10000);
  }
}
// The reader's breeze swells the wind for a moment.
function stir(energy) {
  if (!playing || audio.currentTime - stirred < 0.12) return;
  stirred = audio.currentTime;
  swell.gain.cancelScheduledValues(stirred);
  swell.gain.setTargetAtTime(1 + Math.min(1.8, energy / 500), stirred, 0.12);
  swell.gain.setTargetAtTime(1, stirred + 0.35, 0.9);
}
function rustle() {
  if (!playing) return;
  const now = audio.currentTime;
  const source = audio.createBufferSource();
  source.buffer = noise;
  const filter = audio.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 2200;
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.5, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
  source.connect(filter).connect(gain).connect(master);
  source.start(now, Math.random() * 6, 0.55);
  source.onended = () => source.disconnect();
}
function playNote() {
  if (!playing) return;
  const symbol = phrase[step++ % phrase.length];
  if (symbol === '.') return;
  const note = audio.createBufferSource();
  note.buffer = strings.get(pitches[Number(symbol)]);
  const gain = audio.createGain();
  gain.gain.value = 0.18 * (0.8 + Math.random() * 0.3);
  const pan = audio.createStereoPanner();
  pan.pan.value = Math.random() * 0.6 - 0.3;
  note.connect(gain).connect(pan);
  pan.connect(master);
  pan.connect(reverb);
  note.start();
  voices.add(note);
  note.onended = () => {
    voices.delete(note);
    note.disconnect();
    gain.disconnect();
    pan.disconnect();
  };
}
function stopAmbience() {
  window.clearTimeout(gustTimer);
  window.clearInterval(melodyTimer);
  window.clearInterval(galeTimer);
  galeTimer = undefined;
  for (const voice of voices) voice.stop();
  voices.clear();
}

sound.addEventListener('click', async () => {
  if (changing) return;
  changing = true;
  sound.disabled = true;
  try {
    if (!audio) createAudio();
    if (playing) {
      playing = false;
      stopAmbience();
      await audio.suspend();
    } else {
      await audio.resume();
      playing = true;
      breathe();
      playNote();
      melodyTimer = window.setInterval(playNote, 850);
      syncGale();
    }
    status.textContent = playing ? '风声与琴音已开启' : '声音已关闭';
  } catch {
    playing = false;
    stopAmbience();
    if (audio) await audio.close().catch(() => {});
    audio = undefined;
    strings.clear();
    status.textContent = '声音暂时无法开启，仍可继续阅读。';
  } finally {
    changing = false;
    sound.disabled = false;
    updateSound();
  }
});
volume.addEventListener('input', () => {
  if (master) master.gain.setTargetAtTime(Number(volume.value) / 100, audio.currentTime, 0.1);
});
motion.addEventListener('click', () => {
  paused = !paused;
  updateMotion();
});
reduced.addEventListener('change', () => {
  paused = reduced.matches;
  updateMotion();
  measure();
});
document.addEventListener('visibilitychange', () => {
  updateRunning();
  if (document.hidden && playing) {
    playing = false;
    stopAmbience();
    void audio.suspend();
    updateSound();
    status.textContent = '离开页面后声音已暂停，请手动重新开启。';
  }
});
window.addEventListener('pagehide', () => {
  playing = false;
  stopAmbience();
  if (audio) void audio.suspend();
});

function resize() {
  stage.style.setProperty('--nav', `${navigation ? navigation.offsetHeight : 0}px`);
  resizeCanvas();
  if (codaReady) measureCoda();
  schedule();
}
window.addEventListener('scroll', schedule, { passive: true });
window.addEventListener('resize', resize);
new window.IntersectionObserver(([entry]) => {
  onScreen = entry.isIntersecting;
  updateRunning();
}).observe(stage);

showPlate(scene);
resize();
measure();
updateMotion();
updateSound();
player.hidden = false;
const opening = decodeURIComponent(window.location.hash.slice(1));
if (walkTo(opening, false))
  window.addEventListener('load', () => walkTo(opening, false), { once: true });
