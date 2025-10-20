// About imports and exports in JavaScript modules
// see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules
// and https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import
// and https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export

// default imports of classes from waveformdrawer.js and trimbarsdrawer.js
import WaveformDrawer from './waveformdrawer.js';
import TrimbarsDrawer from './trimbarsdrawer.js';
import Sound from './sound.js';
// "named" imports from utils.js and soundutils.js
import { loadAndDecodeSound, playSound } from './soundutils.js';
import { pixelToSeconds } from './utils.js';

// The AudioContext object is the main "entry point" into the Web Audio API
let ctx;

const soundURLs = [
    'https://upload.wikimedia.org/wikipedia/commons/a/a3/Hardstyle_kick.wav',
    'https://upload.wikimedia.org/wikipedia/commons/transcoded/c/c7/Redoblante_de_marcha.ogg/Redoblante_de_marcha.ogg.mp3',
    'https://upload.wikimedia.org/wikipedia/commons/transcoded/c/c9/Hi-Hat_Cerrado.ogg/Hi-Hat_Cerrado.ogg.mp3',
    'https://upload.wikimedia.org/wikipedia/commons/transcoded/0/07/Hi-Hat_Abierto.ogg/Hi-Hat_Abierto.ogg.mp3',
    'https://upload.wikimedia.org/wikipedia/commons/transcoded/3/3c/Tom_Agudo.ogg/Tom_Agudo.ogg.mp3',
    'https://upload.wikimedia.org/wikipedia/commons/transcoded/a/a4/Tom_Medio.ogg/Tom_Medio.ogg.mp3',
    'https://upload.wikimedia.org/wikipedia/commons/transcoded/8/8d/Tom_Grave.ogg/Tom_Grave.ogg.mp3',
    'https://upload.wikimedia.org/wikipedia/commons/transcoded/6/68/Crash.ogg/Crash.ogg.mp3',
    'https://upload.wikimedia.org/wikipedia/commons/transcoded/2/24/Ride.ogg/Ride.ogg.mp3'
]
let decodedSounds;
let decodedSoundsObj;

let canvas, canvasOverlay;
// waveform drawer is for drawing the waveform in the canvas
// trimbars drawer is for drawing the trim bars in the overlay canvas

let waveformDrawer, trimbarsDrawer;
let mousePos = { x: 0, y: 0 }
// The button for playing the sound
let playButton = document.querySelector("#playButton");
// disable the button until the sound is loaded and decoded
playButton.disabled = true;
let currentSound;

window.onload = async function init() {
    ctx = new AudioContext();

    canvas = document.querySelector("#myCanvas");
    canvasOverlay = document.querySelector("#myCanvasOverlay");

    waveformDrawer = new WaveformDrawer();
    trimbarsDrawer = new TrimbarsDrawer(canvasOverlay, 0, canvasOverlay.width);

    const response = await fetch("http://localhost:3000/api/presets");
    const presets = await response.json();

    // Créer le menu déroulant pour les presets
    const dropdown = document.createElement('select');
    dropdown.id = 'presetDropdown';
    document.body.appendChild(dropdown);

    // Remplir le menu déroulant avec les options des presets
    presets.forEach((preset, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = preset.name;
        dropdown.appendChild(option);
    });

    // Conteneur pour les boutons de sons
    const buttonContainer = document.createElement('div');
    buttonContainer.id = 'soundButtons';
    document.body.appendChild(buttonContainer);

    // Fonction pour mettre à jour les boutons en fonction du preset sélectionné
    async function updateSoundButtons(presetIndex) {
        // Vider les boutons existants
        buttonContainer.innerHTML = '';

        // Remplir soundURLs à partir des samples du preset sélectionné
        soundURLs.length = 0; // Vider le tableau
        presets[presetIndex].samples.forEach(sample => {
            soundURLs.push(sample.url);
        });

        // Charger et décoder les sons
        decodedSounds = await Promise.all(soundURLs.map(url => loadAndDecodeSound(url, ctx)));
        decodedSoundsObj = await Promise.all(decodedSounds.map(decodedSound => new Sound(decodedSound, canvasOverlay.width)));

        // Définir le son initial
        currentSound = decodedSoundsObj[0] || null;
        if (currentSound) {
            waveformDrawer.init(decodedSounds[0], canvas, '#83E83E');
            waveformDrawer.drawWave(0, canvas.height);
            playButton.disabled = false;
        } else {
            waveformDrawer.clear();
            playButton.disabled = true;
        }

        // Créer des boutons pour chaque son du preset
        decodedSounds.forEach((decodedSound, index) => {
            const button = document.createElement('button');
            button.textContent = presets[presetIndex].samples[index].name || `Son ${index + 1}`;
            buttonContainer.appendChild(button);
            button.onclick = function(evt) {
                currentSound = decodedSoundsObj[index];
                trimbarsDrawer.leftTrimBar.x = currentSound.leftTrimbarX;
                trimbarsDrawer.rightTrimBar.x = currentSound.rightTrimbarX;
                waveformDrawer.clear();
                waveformDrawer.init(decodedSound, canvas, '#83E83E');
                waveformDrawer.drawWave(0, canvas.height);
                playButton.disabled = false;
            };
        });
    }

    // Initialiser avec le premier preset
    await updateSoundButtons(0);

    // Gérer l'événement de changement du menu déroulant
    dropdown.onchange = async function(evt) {
        const selectedPresetIndex = parseInt(evt.target.value, 10);
        await updateSoundButtons(selectedPresetIndex);
    };

    // Logique du bouton de lecture
    playButton.onclick = function(evt) {
        if (currentSound) {
            let start = pixelToSeconds(trimbarsDrawer.leftTrimBar.x, currentSound.decodedSound.duration, canvas.width);
            let end = pixelToSeconds(trimbarsDrawer.rightTrimBar.x, currentSound.decodedSound.duration, canvas.width);
            playSound(ctx, currentSound.decodedSound, start, end);
        }
    };


    // declare mouse event listeners for ajusting the trim bars
    // when the mouse moves, we check if we are close to a trim bar
    // if so: highlight it!
    // if a trim bar is selected and the mouse moves, we move the trim bar
    // when the mouse is pressed, we start dragging the selected trim bar (if any)
    // when the mouse is released, we stop dragging the trim bar (if any)
    canvasOverlay.onmousemove = (evt) => {
        // get the mouse position in the canvas
        let rect = canvas.getBoundingClientRect();

        mousePos.x = (evt.clientX - rect.left);
        mousePos.y = (evt.clientY - rect.top);

        // When the mouse moves, we check if we are close to a trim bar
        // if so: move it!
        trimbarsDrawer.moveTrimBars(mousePos);
    }

    canvasOverlay.onmousedown = (evt) => {
        // If a trim bar is close to the mouse position, we start dragging it
        trimbarsDrawer.startDrag();
    }

    canvasOverlay.onmouseup = (evt) => {
        // We stop dragging the trim bars (if they were being dragged)
        trimbarsDrawer.stopDrag();
        currentSound.leftTrimbarX = trimbarsDrawer.leftTrimBar.x;
        currentSound.rightTrimbarX = trimbarsDrawer.rightTrimBar.x;
    }

    // start the animation loop for drawing the trim bars
    requestAnimationFrame(animate);
};

// Animation loop for drawing the trim bars
// We use requestAnimationFrame() to call the animate function
// at a rate of 60 frames per second (if possible)
// see https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame
function animate() {
    // clear overlay canvas;
    trimbarsDrawer.clear();

    // draw the trim bars
    trimbarsDrawer.draw();

    // redraw in 1/60th of a second
    requestAnimationFrame(animate);
}



