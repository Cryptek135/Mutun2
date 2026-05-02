// Arabic Text-to-Speech using the browser's Web Speech API.
// NOTE: This is automated text-to-speech (TTS), NOT a real recitation by a Qari.
// Quality varies by browser/OS. For real recitations, an external service like
// ElevenLabs would be needed.
let currentUtterance = null;

function pickArabicVoice() {
    const voices = window.speechSynthesis.getVoices();
    // Prefer Saudi/Egyptian male voices for matn reading
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

export function speakArabic(text, { rate = 0.7, onEnd, onStart, onError } = {}) {
    if (!("speechSynthesis" in window)) {
        onError && onError(new Error("Synthèse vocale non supportée par ce navigateur"));
        return null;
    }
    stopSpeaking();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "ar-SA";
    utter.rate = rate;
    utter.pitch = 0.95;
    const v = pickArabicVoice();
    if (v) utter.voice = v;
    utter.onend = () => { currentUtterance = null; onEnd && onEnd(); };
    utter.onstart = () => { onStart && onStart(); };
    utter.onerror = (e) => { currentUtterance = null; onError && onError(e); };
    currentUtterance = utter;
    window.speechSynthesis.speak(utter);
    return utter;
}

export function stopSpeaking() {
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
