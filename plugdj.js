// RM -- TODO: clean this file up

var audioContext;
var chatSound;

function initSounds() {
    var self = this;

    try {
        // RM -- TODO: add other browser prefixes as needed
        window.AudioContext = window.AudioContext||window.webkitAudioContext;
        audioContext = new AudioContext();
    }
    catch(e) {
        console.warn('Web Audio API not available.');
    }

    if (audioContext) {
        var request = new XMLHttpRequest();
        request.open('GET', chrome.extension.getURL('New.wav'), true);
        request.responseType = 'arraybuffer';
        request.onload = function() {
            audioContext.decodeAudioData(request.response, function(buffer) {
                chatSound = buffer;
            }, function (e) {
                console.error("error getting audio data", e);
            });
        }
        request.send();
    }
}

function playSound(clip) {
    if (!audioContext) return;

    var source = audioContext.createBufferSource();

    switch (clip) {
        case "chat":
            source.buffer = chatSound;
            break;
        default:
            source.buffer = chatSound;
            break;
    }

    source.connect(audioContext.destination);
    source.start(0);
}

window.addEventListener("message", function (msg) {
    var data;
    if (msg.data) {
        data = msg.data;
    } else {
        data = {};
    }

    switch (data.action) {
        case "notify":
            chrome.extension.sendMessage(data);
            break;
        case "sound":
            playSound(data.clip);
            break;
    }
        
});

function init() {
    initSounds();
}

$(document).on("ready", function () {
    if (window.plugDJLoaded) return;

    window.plugDJLoaded = true;

    init();

    var roomInterval = setInterval(function () {
        if ($("#audience").length) {
            clearInterval(roomInterval);
            $.getScript(chrome.extension.getURL("app.js")).done(function () {
                console.log("plugdj script injected");
            }).fail(function () {
                console.log("could not inject plugdj script");
            });
        }
    }, 1000);
});
