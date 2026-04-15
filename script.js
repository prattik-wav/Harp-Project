const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const activeNotes = new Map();

let currentOctave = 1; 
let transposeValue = 0;
let reverbEnabled = false;

// Standard Diatonic Layout (Key of C)
const scale = [
    { n: 1, blow: { f: 261, k: ['q', '1'], note: 'C4' }, draw: { f: 293, k: ['a'], note: 'D4' } },
    { n: 2, blow: { f: 329, k: ['w', '2'], note: 'E4' }, draw: { f: 392, k: ['s'], note: 'G4' } },
    { n: 3, blow: { f: 392, k: ['e', '3'], note: 'G4' }, draw: { f: 493, k: ['d'], note: 'B4' } },
    { n: 4, blow: { f: 523, k: ['r', '4'], note: 'C5' }, draw: { f: 587, k: ['f'], note: 'D5' } },
    { n: 5, blow: { f: 659, k: ['t', '5'], note: 'E5' }, draw: { f: 698, k: ['g'], note: 'F5' } },
    { n: 6, blow: { f: 783, k: ['y', '6'], note: 'G5' }, draw: { f: 880, k: ['h'], note: 'A5' } },
    { n: 7, blow: { f: 1046, k: ['u', '7'], note: 'C6' }, draw: { f: 987, k: ['j'], note: 'B5' } },
    { n: 8, blow: { f: 1318, k: ['i', '8'], note: 'E6' }, draw: { f: 1174, k: ['k'], note: 'D6' } },
    { n: 9, blow: { f: 1567, k: ['o', '9'], note: 'G6' }, draw: { f: 1396, k: ['l'], note: 'F6' } },
    { n: 10, blow: { f: 2093, k: ['p', '0'], note: 'C7' }, draw: { f: 1760, k: [';'], note: 'A6' } }
];

window.addEventListener('DOMContentLoaded', () => {
    const grid = document.querySelector('.harmonica');
    scale.forEach((h, i) => {
        const div = document.createElement('div');
        div.className = 'hole';
        div.id = `hole-${i}`;
        // Only displaying the letter (k[0]) for a cleaner professional look
        div.innerHTML = `
            <div class="note-name">${h.blow.note}</div>
            <div class="key-label">${h.blow.k[0].toUpperCase()}</div>
            <div class="hole-num">${h.n}</div>
            <div class="key-label">${h.draw.k[0].toUpperCase()}</div>
            <div class="note-name">${h.draw.note}</div>
        `;
        grid.appendChild(div);
    });
});

function startNote(key) {
    if (activeNotes.has(key)) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    let data = null, isDraw = false, idx = -1;
    scale.forEach((h, i) => {
        if (h.blow.k.includes(key)) { data = h.blow; idx = i; }
        if (h.draw.k.includes(key)) { data = h.draw; idx = i; isDraw = true; }
    });

    if (!data) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    // --- CALCULATION ---
    // Ensure currentOctave and transposeValue are picked up live
    const pitchAdjust = Math.pow(2, transposeValue / 12);
    osc.frequency.value = data.f * currentOctave * pitchAdjust;

    osc.type = 'triangle';
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.05);

    // --- ROUTING ---
    if (reverbEnabled) {
        const delay = audioCtx.createDelay();
        const feedback = audioCtx.createGain();
        
        delay.delayTime.value = 0.15; // Set a fixed delay time
        feedback.gain.value = 0.4;    // Set the amount of echo
        
        // Connect osc to gain, then gain to the delay loop
        osc.connect(gain);
        gain.connect(delay);
        delay.connect(feedback);
        feedback.connect(delay);
        
        // Connect both the dry sound and the wet sound to the speakers
        gain.connect(audioCtx.destination);
        delay.connect(audioCtx.destination);
    } else {
        // Standard dry routing
        osc.connect(gain).connect(audioCtx.destination);
    }

    osc.start();
    activeNotes.set(key, { osc, gain, idx });

    const holeEl = document.getElementById(`hole-${idx}`);
    if (holeEl) holeEl.classList.add(isDraw ? 'draw-active' : 'blow-active');
}

function stopNote(key) {
    if (!activeNotes.has(key)) return;
    const { osc, gain, idx } = activeNotes.get(key);
    
    gain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.05);
    osc.stop(audioCtx.currentTime + 0.1);
    activeNotes.delete(key);
    
    const stillPlaying = Array.from(activeNotes.values()).some(n => n.idx === idx);
    if (!stillPlaying) {
        const holeEl = document.getElementById(`hole-${idx}`);
        if (holeEl) holeEl.classList.remove('blow-active', 'draw-active');
    }
}

window.onkeydown = e => startNote(e.key.toLowerCase());
window.onkeyup = e => stopNote(e.key.toLowerCase());

function showSection(id) {
    // Hide all sections first
    document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
    
    // Show the specific section that was clicked
    const targetSection = document.getElementById(id + '-section');
    if (targetSection) {
        targetSection.classList.add('active');
    }
}

function setOctave(val) {
    currentOctave = Math.pow(2, val);
    // Update UI
    const buttons = document.querySelectorAll('.button-group button');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');
}

function updateTranspose() {
    transposeValue = parseInt(document.getElementById('transpose-select').value);
}

function toggleReverb() {
    reverbEnabled = !reverbEnabled;
    const btn = document.getElementById('reverb-toggle');
    btn.innerText = reverbEnabled ? "ON" : "OFF";
    btn.classList.toggle('active');
}

// In your startNote function, find the frequency line and update it:
// osc.frequency.value = data.f;  <-- Change this to:
const pitchAdjust = Math.pow(2, transposeValue / 12);
osc.frequency.value = data.f * currentOctave * pitchAdjust;
