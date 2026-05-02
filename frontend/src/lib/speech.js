// Arabic Text-to-Speech using the browser's Web Speech API.
// NOTE: This is automated text-to-speech (TTS), NOT a real recitation by a Qari.
let currentUtterance = null;
let loopState = null; // { text, opts, count, current }

function pickArabicVoice() {
    const voices = window.speechSynthesis.getVoices();
    const preferences = [
        (v) => /ar-SA/i.test(v.lang) && /male|man|majed|naim/i.test(v.name || ""),
        (v) => /ar-SA/i.test(v.lang),
        (v) => /ar-EG/i.test(v.lang),
        (v) => /^ar/i.test(v.lang) && !/female|woman/i.test(v.name || ""),
        (v) => /^ar/i.test(v.lang),
    ];
    for (const pref of preferences) {
        const found = voices.find(pref);
        if (found) return found;
    }
    return voices[0];
}

function speakOnce(text, { rate = 0.7, onEnd, onStart, onError } = {}) {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "ar-SA";
    utter.rate = rate;
    utter.pitch = 0.95;
    const v = pickArabicVoice();
    if (v) utter.voice = v;
    utter.onstart = () => { onStart && onStart(); };
    utter.onend = () => { currentUtterance = null; onEnd && onEnd(); };
    utter.onerror = (e) => { currentUtterance = null; onError && onError(e); };
    currentUtterance = utter;
    window.speechSynthesis.speak(utter);
    return utter;
}

/**
 * speakArabic with optional looping.
 * @param {string} text
 * @param {object} opts - rate, onStart, onEnd (called when ALL loops done), onError, onLoopEnd (called per loop), loop (1=once, 3, 5, Infinity)
 */
export function speakArabic(text, opts = {}) {
    if (!("speechSynthesis" in window)) {
        opts.onError && opts.onError(new Error("Synthèse vocale non supportée"));
        return null;
    }
    stopSpeaking();
    const loop = Math.max(1, opts.loop || 1);
    loopState = { text, opts, count: loop, current: 0 };

    function playNext() {
        if (!loopState) return;
        loopState.current += 1;
        const isLast = loopState.current >= loopState.count;
        speakOnce(text, {
            rate: opts.rate,
            onStart: loopState.current === 1 ? opts.onStart : opts.onLoopStart,
            onError: opts.onError,
            onEnd: () => {
                opts.onLoopEnd && opts.onLoopEnd(loopState.current);
                if (!loopState) return;
                if (isLast) {
                    loopState = null;
                    opts.onEnd && opts.onEnd();
                } else {
                    setTimeout(playNext, 350);
                }
            },
        });
    }
    playNext();
    return true;
}

export function stopSpeaking() {
    loopState = null;
    if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
    }
    currentUtterance = null;
}

export function isSpeaking() {
    return "speechSynthesis" in window && window.speechSynthesis.speaking;
}

export function hasArabicVoice() {
    if (!("speechSynthesis" in window)) return false;
    const voices = window.speechSynthesis.getVoices();
    return voices.some((v) => /^ar/i.test(v.lang));
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}
