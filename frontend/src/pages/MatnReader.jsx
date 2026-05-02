import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import {
    ArrowLeft, ZoomIn, ZoomOut, Play, Pause, Sparkles, CheckCircle2, Circle, Eye, EyeOff,
    Loader2, RotateCcw, Info, Repeat, ListVideo, Pencil, SquareDashed, ChevronRight,
} from "lucide-react";
import { speakArabic, stopSpeaking } from "../lib/speech";
import AIChatPanel from "../components/AIChatPanel";

const ZOOM_CLASSES = [
    "text-2xl sm:text-3xl",
    "text-3xl sm:text-4xl",
    "text-4xl sm:text-5xl",
    "text-5xl sm:text-6xl",
    "text-6xl sm:text-7xl",
];

const DISPLAY_MODES = [
    { id: "normal", label: "Normal", icon: Eye },
    { id: "first_word", label: "Premier mot", icon: ChevronRight },
    { id: "cloze", label: "Texte à trous", icon: SquareDashed },
    { id: "hidden", label: "Masqué", icon: EyeOff },
];

const LOOP_OPTIONS = [1, 3, 5, Infinity];

function renderMaskedArabic(arabic, mode) {
    if (mode === "first_word") {
        const words = arabic.split(/\s+/);
        if (words.length === 0) return arabic;
        return (
            <>
                <span>{words[0]}</span>
                <span className="text-ink/15"> {words.slice(1).map((_, i) => "•").join(" ")}</span>
            </>
        );
    }
    if (mode === "cloze") {
        // Hide every 3rd content word with __
        const words = arabic.split(/\s+/);
        return words.map((w, i) => {
            const hide = i > 0 && i % 3 === 1 && w.length > 1;
            return (
                <span key={i}>
                    {hide ? <span className="inline-block bg-sand/60 text-transparent select-none rounded px-2 mx-0.5">{w}</span> : w}
                    {i < words.length - 1 ? " " : ""}
                </span>
            );
        });
    }
    return arabic;
}

export default function MatnReader() {
    const { id } = useParams();
    const [matn, setMatn] = useState(null);
    const [progress, setProgress] = useState([]);
    const [zoom, setZoom] = useState(1);
    const [showTranslation, setShowTranslation] = useState(true);
    const [displayMode, setDisplayMode] = useState("normal");
    const [revealed, setRevealed] = useState({});
    const [playingIdx, setPlayingIdx] = useState(null);
    const [loopIdx, setLoopIdx] = useState(0); // index in LOOP_OPTIONS
    const [loopCounter, setLoopCounter] = useState(0); // current iteration in loop
    const [aiOpen, setAiOpen] = useState(false);
    const [aiBayt, setAiBayt] = useState(null);
    const [loading, setLoading] = useState(true);
    const [audioInfoSeen, setAudioInfoSeen] = useState(() => localStorage.getItem("audio_info_seen") === "1");
    const [seqMode, setSeqMode] = useState(false); // Révision globale: sequential play
    const seqIndexRef = useRef(0);
    const seqStopRef = useRef(false);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const [m, p] = await Promise.all([api.getMatn(id), api.getProgress(id)]);
                setMatn(m);
                setProgress(p);
            } finally {
                setLoading(false);
            }
        })();
        return () => {
            seqStopRef.current = true;
            stopSpeaking();
        };
    }, [id]);

    const progressMap = useMemo(() => {
        const map = {};
        progress.forEach((p) => { map[p.bayt_index] = p; });
        return map;
    }, [progress]);

    async function markProgress(bayt_index, action) {
        try {
            await api.updateProgress({ matn_id: id, bayt_index, action });
            const p = await api.getProgress(id);
            setProgress(p);
        } catch {
            alert("Erreur lors de l'enregistrement.");
        }
    }

    function ensureAudioInfo() {
        if (!audioInfoSeen) {
            setAudioInfoSeen(true);
            localStorage.setItem("audio_info_seen", "1");
        }
    }

    function handlePlay(bayt) {
        ensureAudioInfo();
        if (playingIdx === bayt.index) {
            stopSpeaking();
            setPlayingIdx(null);
            setLoopCounter(0);
            return;
        }
        const loop = LOOP_OPTIONS[loopIdx];
        speakArabic(bayt.arabic, {
            loop,
            onStart: () => { setPlayingIdx(bayt.index); setLoopCounter(1); },
            onLoopEnd: (n) => { setLoopCounter(n + 1); },
            onEnd: () => { setPlayingIdx(null); setLoopCounter(0); },
            onError: () => { setPlayingIdx(null); setLoopCounter(0); },
        });
    }

    function startSequential() {
        ensureAudioInfo();
        if (!matn || matn.abyat.length === 0) return;
        seqStopRef.current = false;
        seqIndexRef.current = 0;
        setSeqMode(true);
        playSeqAt(0);
    }

    function playSeqAt(idx) {
        if (seqStopRef.current || !matn) return;
        if (idx >= matn.abyat.length) {
            setSeqMode(false);
            setPlayingIdx(null);
            return;
        }
        const b = matn.abyat[idx];
        seqIndexRef.current = idx;
        speakArabic(b.arabic, {
            loop: 1,
            onStart: () => setPlayingIdx(b.index),
            onEnd: () => {
                if (seqStopRef.current) return;
                setTimeout(() => playSeqAt(idx + 1), 600);
            },
            onError: () => {
                setSeqMode(false);
                setPlayingIdx(null);
            },
        });
    }

    function stopSequential() {
        seqStopRef.current = true;
        stopSpeaking();
        setSeqMode(false);
        setPlayingIdx(null);
    }

    function cycleDisplayMode() {
        const idx = DISPLAY_MODES.findIndex((m) => m.id === displayMode);
        const next = DISPLAY_MODES[(idx + 1) % DISPLAY_MODES.length];
        setDisplayMode(next.id);
        setRevealed({});
    }

    function cycleLoop() {
        setLoopIdx((i) => (i + 1) % LOOP_OPTIONS.length);
    }

    function loopLabel() {
        const v = LOOP_OPTIONS[loopIdx];
        return v === Infinity ? "∞" : `×${v}`;
    }

    function openAiForBayt(bayt) {
        setAiBayt(bayt);
        setAiOpen(true);
    }

    if (loading) {
        return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-6 h-6 animate-spin text-ink/40" /></div>;
    }
    if (!matn) {
        return <div className="text-center py-20">Matn introuvable.</div>;
    }

    const currentDisplayMode = DISPLAY_MODES.find((m) => m.id === displayMode);
    const DisplayIcon = currentDisplayMode.icon;

    return (
        <div className="min-h-screen pb-40 animate-fade-in-up">
            <div className="max-w-4xl mx-auto px-6 md:px-10 pt-8">
                <div className="flex items-center justify-between mb-8">
                    <Link to="/bibliotheque" data-testid="matn-back-btn" className="inline-flex items-center gap-2 text-sm text-ink/60 hover:text-ink transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Bibliothèque
                    </Link>
                    <Link to={`/matn/${matn.id}/modifier`} data-testid="matn-edit-btn" className="inline-flex items-center gap-2 text-sm text-ink/60 hover:text-ink transition-colors">
                        <Pencil className="w-4 h-4" /> Modifier
                    </Link>
                </div>

                <header className="mb-10 pb-8 border-b border-sand">
                    <p className="text-[11px] uppercase tracking-[0.25em] text-ink/40 font-semibold mb-3">
                        {matn.level} · {matn.abyat.length} passages
                    </p>
                    <h1 dir="rtl" className="font-arabic text-4xl sm:text-5xl text-ink leading-snug mb-3">{matn.title_ar}</h1>
                    <h2 className="font-serif text-3xl sm:text-4xl text-ink tracking-tight">{matn.title_fr}</h2>
                    <p className="text-sm text-ink/55 mt-2">{matn.author_fr}</p>
                    {matn.description_fr && (
                        <p className="text-base text-ink/70 mt-5 max-w-2xl leading-relaxed">{matn.description_fr}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-6">
                        <button
                            data-testid="murajaa-global-btn"
                            onClick={seqMode ? stopSequential : startSequential}
                            className={`flex items-center gap-2 text-sm px-4 py-2 rounded-full transition-colors ${
                                seqMode ? "bg-ink text-alabaster hover:bg-ink/85" : "border border-ink/30 text-ink hover:bg-ink/5"
                            }`}
                        >
                            <ListVideo className="w-3.5 h-3.5" />
                            {seqMode ? "Arrêter Murâja'a" : "Murâja'a globale (lecture en chaîne)"}
                        </button>
                    </div>
                </header>

                {!audioInfoSeen && (
                    <div data-testid="audio-disclaimer" className="bg-parchment/60 border border-sand rounded-xl p-4 mb-8 flex items-start gap-3">
                        <Info className="w-4 h-4 text-ink/60 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-ink/70 leading-relaxed">
                            <strong className="text-ink">Lecture automatique</strong> — l'écoute utilise la synthèse vocale du navigateur, ce n'est <em>pas</em> une véritable récitation par un Qârî. Pour mémoriser, écoute des récitations authentiques en parallèle.
                        </div>
                        <button onClick={() => { setAudioInfoSeen(true); localStorage.setItem("audio_info_seen", "1"); }} data-testid="audio-disclaimer-close" className="text-ink/50 hover:text-ink text-xs flex-shrink-0 px-2 py-1 rounded hover:bg-sand/40">OK</button>
                    </div>
                )}

                <div className="space-y-10">
                    {matn.abyat.map((b) => {
                        const prog = progressMap[b.index];
                        const isMemorized = prog?.status === "memorized";
                        const isLearning = prog?.status === "learning";
                        const isHiddenMode = displayMode === "hidden" && !revealed[b.index];
                        const showMasked = (displayMode === "first_word" || displayMode === "cloze") && !revealed[b.index];

                        return (
                            <article key={b.index} data-testid={`bayt-${b.index}`} className={`group relative scroll-mt-24 transition-all ${playingIdx === b.index ? "ring-2 ring-ink/20 ring-offset-4 ring-offset-alabaster rounded-md" : ""}`}>
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="font-serif text-sm text-ink/40">{String(b.index + 1).padStart(2, "0")}</span>
                                    {isMemorized && (
                                        <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-pine font-semibold">
                                            <CheckCircle2 className="w-3 h-3" /> Mémorisé
                                        </span>
                                    )}
                                    {isLearning && (
                                        <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink/50 font-semibold">
                                            <Circle className="w-3 h-3" /> En cours
                                        </span>
                                    )}
                                    {playingIdx === b.index && loopCounter > 0 && LOOP_OPTIONS[loopIdx] !== 1 && (
                                        <span data-testid={`loop-counter-${b.index}`} className="text-[10px] text-ink/60 font-mono">
                                            {loopCounter}/{LOOP_OPTIONS[loopIdx] === Infinity ? "∞" : LOOP_OPTIONS[loopIdx]}
                                        </span>
                                    )}
                                </div>

                                {isHiddenMode ? (
                                    <div className={`font-arabic ${ZOOM_CLASSES[zoom]} text-ink arabic-relaxed blur-lg select-none`} data-testid={`bayt-arabic-${b.index}`} dir="rtl">
                                        {b.arabic}
                                    </div>
                                ) : (
                                    <div dir="rtl" className={`font-arabic ${ZOOM_CLASSES[zoom]} text-ink arabic-relaxed`} data-testid={`bayt-arabic-${b.index}`}>
                                        {showMasked ? renderMaskedArabic(b.arabic, displayMode) : b.arabic}
                                    </div>
                                )}

                                {(isHiddenMode || showMasked) && (
                                    <button
                                        data-testid={`reveal-${b.index}`}
                                        onClick={() => setRevealed({ ...revealed, [b.index]: true })}
                                        className="mt-4 inline-flex items-center gap-2 text-sm px-4 py-2 rounded-full border border-ink/20 text-ink hover:bg-ink/5 transition-colors"
                                    >
                                        <Eye className="w-3.5 h-3.5" /> Révéler
                                    </button>
                                )}

                                {showTranslation && !isHiddenMode && (
                                    <p className="font-sans text-base md:text-lg text-ink/65 mt-5 leading-relaxed max-w-3xl">
                                        {b.translation_fr}
                                    </p>
                                )}

                                <div className="flex items-center gap-1 mt-5 flex-wrap">
                                    <button data-testid={`play-bayt-${b.index}`} onClick={() => handlePlay(b)} className="flex items-center gap-2 text-xs px-3 py-2 rounded-full hover:bg-sand/40 text-ink/70 transition-colors">
                                        {playingIdx === b.index ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                        {playingIdx === b.index ? "Arrêter" : "Écouter"}
                                        {LOOP_OPTIONS[loopIdx] !== 1 && playingIdx !== b.index && <span className="text-ink/40">{loopLabel()}</span>}
                                    </button>
                                    {!isMemorized && (
                                        <button data-testid={`mark-learning-${b.index}`} onClick={() => markProgress(b.index, "learn")} className="flex items-center gap-2 text-xs px-3 py-2 rounded-full hover:bg-sand/40 text-ink/70 transition-colors">
                                            <Circle className="w-3.5 h-3.5" /> En cours
                                        </button>
                                    )}
                                    <button data-testid={`mark-memorized-${b.index}`} onClick={() => markProgress(b.index, "review_good")} className="flex items-center gap-2 text-xs px-3 py-2 rounded-full hover:bg-pine/10 text-pine transition-colors">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> {isMemorized ? "Réviser (bien)" : "Mémorisé"}
                                    </button>
                                    {prog && (
                                        <button data-testid={`reset-${b.index}`} onClick={() => markProgress(b.index, "reset")} className="flex items-center gap-2 text-xs px-3 py-2 rounded-full hover:bg-sand/40 text-ink/50 transition-colors">
                                            <RotateCcw className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                    <button data-testid={`ai-bayt-${b.index}`} onClick={() => openAiForBayt(b)} className="flex items-center gap-2 text-xs px-3 py-2 rounded-full hover:bg-ink/5 text-ink/70 transition-colors ml-auto">
                                        <Sparkles className="w-3.5 h-3.5" /> Expliquer
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            </div>

            {/* Floating reading controls */}
            <div data-testid="reading-controls" className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white border border-sand shadow-xl rounded-full px-3 py-2 flex items-center gap-1 z-30 backdrop-blur-md max-w-[95vw] overflow-x-auto no-scrollbar">
                <button data-testid="zoom-out-btn" onClick={() => setZoom(Math.max(0, zoom - 1))} disabled={zoom === 0} className="p-2.5 rounded-full hover:bg-sand/40 disabled:opacity-30 transition-colors flex-shrink-0">
                    <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs text-ink/50 px-2 w-10 text-center font-mono flex-shrink-0">{zoom + 1}/5</span>
                <button data-testid="zoom-in-btn" onClick={() => setZoom(Math.min(ZOOM_CLASSES.length - 1, zoom + 1))} disabled={zoom === ZOOM_CLASSES.length - 1} className="p-2.5 rounded-full hover:bg-sand/40 disabled:opacity-30 transition-colors flex-shrink-0">
                    <ZoomIn className="w-4 h-4" />
                </button>
                <div className="w-px h-6 bg-sand mx-1 flex-shrink-0" />

                <button data-testid="toggle-translation-btn" onClick={() => setShowTranslation(!showTranslation)} className={`p-2.5 rounded-full hover:bg-sand/40 transition-colors flex-shrink-0 ${!showTranslation ? "text-ink/40" : ""}`} title="Traduction">
                    <span className="text-[10px] font-bold">FR</span>
                </button>

                <button
                    data-testid="display-mode-btn"
                    onClick={cycleDisplayMode}
                    className={`px-3 py-2 rounded-full transition-colors flex-shrink-0 flex items-center gap-1.5 text-xs ${displayMode !== "normal" ? "bg-ink text-alabaster hover:bg-ink/85" : "hover:bg-sand/40"}`}
                    title={`Mode : ${currentDisplayMode.label}`}
                >
                    <DisplayIcon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline whitespace-nowrap">{currentDisplayMode.label}</span>
                </button>

                <button
                    data-testid="loop-btn"
                    onClick={cycleLoop}
                    className={`px-3 py-2 rounded-full transition-colors flex-shrink-0 flex items-center gap-1.5 text-xs ${loopIdx > 0 ? "bg-pine/10 text-pine" : "hover:bg-sand/40 text-ink/70"}`}
                    title="Boucle audio"
                >
                    <Repeat className="w-3.5 h-3.5" />
                    <span className="font-mono">{loopLabel()}</span>
                </button>

                <div className="w-px h-6 bg-sand mx-1 flex-shrink-0" />
                <button data-testid="ai-open-btn" onClick={() => { setAiBayt(null); setAiOpen(true); }} className="p-2.5 rounded-full text-ink hover:bg-ink/5 transition-colors flex-shrink-0" title="Assistant IA">
                    <Sparkles className="w-4 h-4" />
                </button>
            </div>

            <AIChatPanel open={aiOpen} onClose={() => setAiOpen(false)} matnId={matn.id} matnTitle={matn.title_fr} bayt={aiBayt} />
        </div>
    );
}
