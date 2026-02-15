/**
 * SIGIL.EXE — Ambient Tone Engine
 * A low-frequency procedural hum via Web Audio API.
 * Not music. A presence.
 *
 * Usage: Add <script src="/js/ambient.js"></script> to any page.
 * Set <body data-ambient="deep|baseline|warm|bright"> to control frequency.
 */
(function () {
  'use strict';

  var FREQ_MAP = {
    deep:     55,
    baseline: 60,
    warm:     65,
    bright:   72
  };

  var MASTER_GAIN   = 0.08;
  var DETUNE_OFFSET = 3;       // Hz offset for beating
  var HARM3_GAIN    = 0.04;    // 3rd harmonic — felt presence
  var HARM5_GAIN    = 0.025;   // 5th harmonic — audible on small speakers
  var LFO_RATE      = 0.08;    // Hz — breathing speed
  var LFO_DEPTH     = 0.35;    // 0-1, how deep the breathing dips

  var STORAGE_KEY = 'sigil-ambient';

  // --- State ---
  var ctx       = null;
  var nodes     = null;
  var isPlaying = false;
  var toggle    = null;

  // --- Determine frequency from body attribute ---
  function getFrequency() {
    var mood = document.body.getAttribute('data-ambient') || 'baseline';
    return FREQ_MAP[mood] || FREQ_MAP.baseline;
  }

  // --- Build the audio graph ---
  function buildGraph() {
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;

    ctx = new AudioContext();
    var freq = getFrequency();

    // Base oscillator — sine (sub-bass foundation)
    var osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = freq;

    // Detuned copy — sine, +offset Hz for slow beating
    var osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq + DETUNE_OFFSET;

    // 3rd harmonic — felt presence (~165-216Hz)
    var osc3 = ctx.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.value = freq * 3;

    var harm3Gain = ctx.createGain();
    harm3Gain.gain.value = HARM3_GAIN;

    // 5th harmonic — audible on laptop speakers (~275-360Hz)
    var osc5 = ctx.createOscillator();
    osc5.type = 'sine';
    osc5.frequency.value = freq * 5;

    var harm5Gain = ctx.createGain();
    harm5Gain.gain.value = HARM5_GAIN;

    // LFO for volume breathing
    var lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = LFO_RATE;

    var lfoGain = ctx.createGain();
    lfoGain.gain.value = MASTER_GAIN * LFO_DEPTH;

    // Master gain
    var master = ctx.createGain();
    master.gain.value = MASTER_GAIN * (1 - LFO_DEPTH * 0.5);

    // Wiring
    osc1.connect(master);
    osc2.connect(master);
    osc3.connect(harm3Gain);
    harm3Gain.connect(master);
    osc5.connect(harm5Gain);
    harm5Gain.connect(master);

    lfo.connect(lfoGain);
    lfoGain.connect(master.gain);

    master.connect(ctx.destination);

    // Start all oscillators
    osc1.start();
    osc2.start();
    osc3.start();
    osc5.start();
    lfo.start();

    return { osc1: osc1, osc2: osc2, osc3: osc3, osc5: osc5, lfo: lfo, master: master };
  }

  // --- Start ---
  function startAmbient() {
    if (isPlaying) return;
    if (!ctx) {
      nodes = buildGraph();
      if (!nodes) return;
    }
    if (ctx.state === 'suspended') {
      ctx.resume().then(function () {
        isPlaying = true;
        localStorage.setItem(STORAGE_KEY, 'on');
        updateToggle();
      });
      return;
    }
    isPlaying = true;
    localStorage.setItem(STORAGE_KEY, 'on');
    updateToggle();
  }

  // --- Stop ---
  function stopAmbient() {
    if (!isPlaying) return;
    if (ctx && ctx.state === 'running') {
      ctx.suspend();
    }
    isPlaying = false;
    localStorage.setItem(STORAGE_KEY, 'off');
    updateToggle();
  }

  // --- Toggle ---
  function toggleAmbient() {
    if (isPlaying) {
      stopAmbient();
    } else {
      startAmbient();
    }
  }

  // --- UI ---
  function updateToggle() {
    if (!toggle) return;
    if (isPlaying) {
      toggle.classList.add('sigil-ambient-active');
      toggle.classList.remove('sigil-ambient-muted');
      toggle.title = 'Mute ambient tone';
    } else {
      toggle.classList.remove('sigil-ambient-active');
      toggle.classList.add('sigil-ambient-muted');
      toggle.title = 'Enable ambient tone';
    }
  }

  function injectStyles() {
    var style = document.createElement('style');
    style.textContent = [
      '#sigil-ambient-toggle {',
      '  position: fixed;',
      '  bottom: 16px;',
      '  left: 16px;',
      '  z-index: 99999;',
      '  width: 36px;',
      '  height: 36px;',
      '  border-radius: 50%;',
      '  border: 1px solid rgba(0, 255, 204, 0.3);',
      '  background: rgba(0, 0, 0, 0.6);',
      '  color: #00ffcc;',
      '  font-size: 18px;',
      '  line-height: 36px;',
      '  text-align: center;',
      '  cursor: pointer;',
      '  user-select: none;',
      '  -webkit-user-select: none;',
      '  transition: opacity 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease;',
      '  font-family: sans-serif;',
      '}',
      '#sigil-ambient-toggle.sigil-ambient-muted {',
      '  opacity: 0.3;',
      '  border-color: rgba(0, 255, 204, 0.15);',
      '}',
      '#sigil-ambient-toggle.sigil-ambient-active {',
      '  opacity: 1;',
      '  border-color: rgba(0, 255, 204, 0.6);',
      '  box-shadow: 0 0 12px rgba(0, 255, 204, 0.15);',
      '  animation: sigil-pulse 3s ease-in-out infinite;',
      '}',
      '@keyframes sigil-pulse {',
      '  0%, 100% {',
      '    box-shadow: 0 0 8px rgba(0, 255, 204, 0.1);',
      '    border-color: rgba(0, 255, 204, 0.4);',
      '  }',
      '  50% {',
      '    box-shadow: 0 0 18px rgba(0, 255, 204, 0.25);',
      '    border-color: rgba(0, 255, 204, 0.7);',
      '  }',
      '}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function createToggle() {
    injectStyles();
    toggle = document.createElement('div');
    toggle.id = 'sigil-ambient-toggle';
    toggle.textContent = '\u25C9'; // ◉
    toggle.classList.add('sigil-ambient-muted');
    toggle.title = 'Enable ambient tone';
    toggle.addEventListener('click', function () {
      toggleAmbient();
    });
    document.body.appendChild(toggle);
  }

  // --- Init ---
  function init() {
    createToggle();

    // If user previously enabled, show active state and start on first gesture
    var pref = localStorage.getItem(STORAGE_KEY);
    if (pref === 'on') {
      // Build the graph now so it's ready, but audio won't play until resumed
      nodes = buildGraph();
      if (nodes) {
        // Show the toggle as active (audio will start on first gesture)
        toggle.classList.add('sigil-ambient-active');
        toggle.classList.remove('sigil-ambient-muted');
        toggle.title = 'Mute ambient tone';

        var resumeOnGesture = function () {
          if (ctx && ctx.state === 'suspended') {
            ctx.resume().then(function () {
              isPlaying = true;
              updateToggle();
            });
          }
          document.removeEventListener('click', resumeOnGesture);
          document.removeEventListener('touchstart', resumeOnGesture);
          document.removeEventListener('keydown', resumeOnGesture);
        };
        document.addEventListener('click', resumeOnGesture);
        document.addEventListener('touchstart', resumeOnGesture);
        document.addEventListener('keydown', resumeOnGesture);
      }
    }
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
