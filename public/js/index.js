// public/index.js
import Timer from './timer.js';

(function(window, document, undefined) {

    ////////////////////////////////// MIDI Section ////////////////////////////
    // for midi oscillator playback
    let audioContext = new (window.AudioContext || window.webkitAudioContext)();
    var oscilators = {};
    let mainGainNode = audioContext.createGain();
    let volumeControl = document.querySelector("input[name='volume']");
    mainGainNode.connect(audioContext.destination);

    volumeControl.addEventListener("change", changeVolume, true);
    mainGainNode.gain.value = volumeControl.value/10;
    var midi, data;

    let sineTerms = new Float32Array([0, 0, 1, 0, 1]);
    let cosineTerms = new Float32Array(sineTerms.length);
    let customWaveform = audioContext.createPeriodicWave(cosineTerms, sineTerms);
    
    // start talking to MIDI controller
    if (navigator.requestMIDIAccess) {
        navigator.requestMIDIAccess({sysex: false}).then(onMIDISuccess, onMIDIFailure);
    } else {
        console.warn("No Midi support in your browser");
    } 

    // on success
    function onMIDISuccess(midiData){
        console.log("OnMIDI SUCCESS \n" +  midiData);
        // all our MIDI data
        midi = midiData;
        var allInputs = midi.inputs.values();
        // loop over all available inputs and listen for any MIDI input
        for (var input = allInputs.next(); input && !input.done; input = allInputs.next()){
            // when a MIDI value is received call the onMIDIMessage function
            input.value.onmidimessage = gotMIDIMessage;
        }
    }

    function onMIDIFailure(){
        console.warn("Not recognizing MIDI controller");
    }

    function gotMIDIMessage(messageData){
        console.log("Obtained user MIDI message")
        console.log(messageData)
        // render data in window
        var d = messageData.data;
        var note = {
            on: d[0],
            pitch: d[1],
            velocity: d[2]
        }

        if (note[0] == 144){
            var newItem = document.createElement("li");
            newItem.appendChild(document.createTextNode("Note: "+ note[1] + 
            "     Velocity: " + note[2] + "     Frequency: " + frequency(note[1]).toFixed(1) ));
            newItem.className = "external-midi";
            document.getElementById("midi-data").prepend(newItem);
        }

        play(note);

        // var msg = {}
        // msg.data = [];
        // msg.data = push(data.on);
        // msg.data.push(data.pitch);
        // msg.data(data.velocity);
    }
    

    ////////////////// Sound Section /////////////////////////////

    var type = "sawtooth"; //wavePicker.options[wavePicker.selectedIndex].value;
    const waves = document.querySelectorAll("div.adjust-waveform-btn");
    let waveformText = document.querySelector(".waveform-name");
    const sineWave = waves[0];
    const squareWave = waves[1];
    const triangleWave = waves[2];
    const sawtoothWave = waves[3];
    const customWave = waves[4];
    console.log("wave start " + type);
    waveformText.textContent = "Sawtooth"


    sineWave.addEventListener('click', () => {
        console.log("wave before " + type);
        type = "sine";
        waveformText.textContent = "Sine";
        console.log("wave after " + type);
        for (const freq in oscilators) {
            oscilators[freq].type = type;
        }


    }, true);

    squareWave.addEventListener('click', () => {
        console.log("wave before " + type);
        type = "square";
        waveformText.textContent = "Square";
        console.log("wave after " + type);
        for (const freq in oscilators) {
            oscilators[freq].type = type;
        }
    }, true);

    
    triangleWave.addEventListener('click', () => {
        console.log("wave before " + type);
        type = "triangle";
        waveformText.textContent = "Triangle";
        console.log("wave after " + type);
        for (const freq in oscilators) {
            oscilators[freq].type = type;
        }
    }, true);


    sawtoothWave.addEventListener('click', () => {
        console.log("wave before " + type);
        type = "sawtooth";
        waveformText.textContent = "Sawtooth";
        console.log("wave after " + type);
        for (const freq in oscilators) {
            oscilators[freq].type = type;
        }
    }, true);


    customWave.addEventListener('click', () => {
        console.log("wave before " + type);
        type = "custom";
        waveformText.textContent = "Custom";
        console.log("wave after " + type);
        for (const freq in oscilators) {
            oscilators[freq].setPeriodicWave(customWaveform);
        }
    }, true);


    // midi note player
    function play(note){
        console.log('play note: ', note.pitch);
        console.log(note)
        switch(note.on){
            case 144: 
                noteOn(frequency(note.pitch), note.velocity);
                break;
            case 128:
                noteOff(frequency(note.pitch));
                break;
        }

    }

    // convert note position top correct frequency
    function frequency(note){
        return Math.pow(2, ((note -69) / 12)) * 440;
    }

    function noteOn(frequency, velocity){
        var osc = oscilators[frequency] = audioContext.createOscillator();
        osc.connect(mainGainNode);
        var vol = (velocity/ 127).toFixed(2);
        if (type == "custom") {
            osc.setPeriodicWave(customWaveform);
        } else {
            console.log("old wave " + type);
            osc.type = type;
            console.log("new wave " + type);
        }
        
        osc.frequency.value = frequency;
        osc.setVolume = vol;
        osc.start(audioContext.currentTime);
    }

    function noteOff(frequency){
        console.log("note turning off " + frequency)
        if (!(frequency in oscilators)){
            console.log("got here " + frequency);

            audioContext.close();
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            oscilators = {};
            mainGainNode = audioContext.createGain();
            mainGainNode.connect(audioContext.destination);
            mainGainNode.gain.value = volumeControl.value/10;

        } else {
            oscilators[frequency].stop(audioContext.currentTime);
            oscilators[frequency].disconnect();
            delete oscilators[frequency];
        }
    }


    ///////////////// Internal Keyboord Section /////////////////////////////

    // MIDI keyboard setup and styling
    var notes, currentInput;
    const MIDI_A0_NUM = 21;
    const CMD_NOTE_ON = 9;
    const CMD_NOTE_OFF = 8;
    
    // note off is 127, note on is 144 
    function getMessageCommand(msg) { return msg.data[0] >> 4;}
    function getMessageNote(msg) { return msg.data[1]; }
    function getMessageVelocity(msg) { return msg.data[2]; }

    function getNoteDiv(msg){
        var noteNum = getMessageNote(msg) - MIDI_A0_NUM;
        
        if (notes && 0<= noteNum < notes.length){
            return notes[noteNum];
        }
    }

    function isNoteOnMessage(msg) {
        return getMessageCommand(msg) == CMD_NOTE_ON;
    } 

    function isNoteOffMessage(msg) {
        var cmd = getMessageCommand(msg);
        return (cmd == CMD_NOTE_OFF) || (cmd == CMD_NOTE_ON && getMessageVelocity(msg) == 0);
    } 

    function onMIDIMessage(msg){
        var action = isNoteOffMessage(msg) ? "remove" : 
        (isNoteOnMessage(msg) ? "add": null), 
        noteDiv;
        if (action && (noteDiv = getNoteDiv(msg))){
            noteDiv.classList[action]("piano-key-pressed");
        }
    }

    function onMIDIAccessSuccess(access) {
        midi = access;
        access.addEventListener("stateChange", populateInputList, false);
        populateInputList();
    }

    function onMIDIAccessFailure(){
        console.error("Request for MIDI access was denied.");
    }

    if ("requestMIDIAccess" in window.navigator) {
        console.log("WebMIDI supported!");
        window.navigator.requestMIDIAccess().then(onMIDIAccessSuccess, onMIDIAccessFailure);
    } else {
        console.error("Your device does not suport WebMIDI or its polyfill");
    }

    function populateInputList() {
        var inputs = Array.from(midi.inputs.values());
        
        if (inputs.length == 1){
            console.log("Only one Input")
            selectInputs(inputs[0]);
        } // else multiple inputs
  

    }
    
    function selectInputs(input) {
        console.log("selecting inputs")
        if (input != currentInput){
            if (currentInput) {
                currentInput.removeEventListener("midimessage", onMIDIMessage);
                currentInput.close();
            }
        }
        input.addEventListener("midimessage", onMIDIMessage);
        currentInput = input;
    }


    document.addEventListener("DOMContentLoaded", () => {
        notes = document.getElementsByClassName("piano-key");
    }, false);
    

    //////////////////// Volume Control Section ////////////////////////////

    function changeVolume(event) {
        mainGainNode.gain.value = volumeControl.value/10;
        // console.log("THIS IS TRIGGERTED")
        // console.log(mainGainNode.gain.value)
        volumeText.textContent = (10*volumeControl.value).toFixed(0)
    }
      
    const decreaseVolumeBtn = document.querySelector(".decrease-volume");
    const increaseVolumeBtn = document.querySelector(".increase-volume");
    let volumeText = document.querySelector(".volume-value");
    console.log(volumeControl.value)
    console.log(volumeText)
    console.log(decreaseVolumeBtn)
    console.log(increaseVolumeBtn)

    increaseVolumeBtn.addEventListener('click', () => {
        // console.log("Increase " + volumeControl.value);
        volumeControl.value = volumeControl.value/1 + 0.5;
        // console.log("after addition "+ volumeControl.value);
        if (volumeControl.value >= 10) { 
            volumeControl.value = 10; 
        }
        mainGainNode.gain.value = volumeControl.value/10;
        volumeText.textContent = 10*volumeControl.value;
    });
    
    decreaseVolumeBtn.addEventListener('click', () => {
        // console.log(volumeControl.value);
        volumeControl.value -= 0.5;
        if (volumeControl.value <= 0) { 
            volumeControl.value = 0;
        }
        mainGainNode.gain.value = volumeControl.value/10;
        volumeText.textContent = 10*volumeControl.value;
    });


    volumeControl.addEventListener('input', () => {
        // console.log("slider" + volumeControl.value);
        if (volumeControl.value <= 0) { 
            volumeControl.value = 0; 
        }
        if (volumeControl.value >= 10) { 
            volumeControl.value = 10; 
        }
        // console.log(volumeControl.value);
        mainGainNode.gain.value = volumeControl.value/10;
        // console.log(volumeControl.value);
        volumeText.textContent =  10*volumeControl.value;
    });


    ///////////////////// Timer Section ////////////////////////////

    const tempoDisplay = document.querySelector('.tempo');
    const tempoText = document.querySelector('.tempo-text');
    const decreaseTempoBtn = document.querySelector('.decrease-tempo');
    const increaseTempoBtn = document.querySelector('.increase-tempo');
    const tempoSlider = document.querySelector('.slider');
    const startStopBtn = document.querySelector('.start-stop');
    const subtractBeats = document.querySelector('.subtract-beats');
    const addBeats = document.querySelector('.add-beats');
    const measureCount = document.querySelector('.measure-count');

    const click1 = new Audio('../audio/click1.mp3');
    const click2 = new Audio('../audio/click2.mp3');

    let bpm = 150;
    let beatsPerMeasure = 4;
    let count = 0;
    let isRunning = false;
    let tempoTextString = "Vivace";

    decreaseTempoBtn.addEventListener('click', () => {
        if (bpm <= 20) { return };
        bpm--;
        validateTempo();
        updateMetronome();
    });
    increaseTempoBtn.addEventListener('click', () => {
        if (bpm >= 280) { return };
        bpm++;
        validateTempo();
        updateMetronome();
    });
    tempoSlider.addEventListener('input', () => {
        bpm = tempoSlider.value;
        validateTempo();
        updateMetronome();
    });
    
    subtractBeats.addEventListener('click', () => {
        if (beatsPerMeasure <= 2) { return };
        beatsPerMeasure--;
        measureCount.textContent = beatsPerMeasure;
        count = 0;
    });
    addBeats.addEventListener('click', () => {
        if (beatsPerMeasure >= 12) { return };
        beatsPerMeasure++;
        measureCount.textContent = beatsPerMeasure;
        count = 0;
    });
    
    startStopBtn.addEventListener('click', () => {
        count = 0;
        if (!isRunning) {
            metronome.start();
            isRunning = true;
            startStopBtn.textContent = 'STOP';
        } else {
            metronome.stop();
            isRunning = false;
            startStopBtn.textContent = 'START';
        }
    });

    function updateMetronome() {
        tempoDisplay.textContent = bpm;
        tempoSlider.value = bpm;
        metronome.timeInterval = 60000 / bpm;
        if (bpm <= 24) { tempoTextString = "Larghissimo" };
        if (bpm > 24 && bpm <= 40) { tempoTextString = "Grave" };
        if (bpm > 40 && bpm <= 45) { tempoTextString = "Lento" };
        if (bpm > 45 && bpm <= 55) { tempoTextString = "Largo" };
        if (bpm > 55 && bpm <= 65) { tempoTextString = "Adagio" };
        if (bpm > 65 && bpm <= 72) { tempoTextString = "Adagietto" };
        if (bpm > 72 && bpm <= 80) { tempoTextString = "Andante" };
        if (bpm > 80 && bpm <= 97) { tempoTextString = "Moderato" };
        if (bpm > 97 && bpm <= 109) { tempoTextString = "Allegrato" };
        if (bpm > 109 && bpm <= 132) { tempoTextString = "Allegro" };
        if (bpm > 132 && bpm <= 150) { tempoTextString = "Vivace" };
        if (bpm > 150 && bpm <= 178) { tempoTextString = "Presto" };
        if (bpm > 178 && bpm <= 280) { tempoTextString = "Prestissimo" };
        
        tempoText.textContent = tempoTextString;
    }
    function validateTempo() {
        if (bpm <= 20) { return };
        if (bpm >= 280) { return };
    }
    
    function playClick() {
        console.log(count);
        if (count === beatsPerMeasure) {
            count = 0;
        }
        if (count === 0) {
            click1.play();
            click1.currentTime = 0;
        } else {
            click2.play();
            click2.currentTime = 0;
        }
        count++;
    }
    
    const metronome = new Timer(playClick, 60000 / bpm, { immediate: true }); 


})(window, window.document);