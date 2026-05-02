import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import { ArrowLeft, ZoomIn, ZoomOut, Play, Pause, Sparkles, CheckCircle2, Circle, Eye, EyeOff, Loader2, RotateCcw, Info } from "lucide-react";
import { speakArabic, stopSpeaking } from "../lib/speech";
import AIChatPanel from "../components/AIChatPanel";

const ZOOM_CLASSES = [
    "text-2xl sm:text-3xl",
    "text-3xl sm:text-4xl",
    "text-4xl sm:text-5xl",
    "text-5xl sm:text-6xl",
    "text-6xl sm:text-7xl",
];

export default function MatnReader() {
    const { id } = useParams();
    const [matn, setMatn] = useState(null);
    const [progress, setProgress] = useState([]);
    const [zoom, setZoom] = useState(1);
    const [showTranslation, setShowTranslation] = useState(true);
    const [testMode, setTestMode] = useState(false);
    const [revealed, setRevealed] = useState({});
    const [playingIdx, setPlayingIdx] = useState(null);
    const [aiOpen, setAiOpen] = useState(false);
    const [aiBayt, setAiBayt] = useState(null);
    const [loading, setLoading] = useState(true);
    const [audioInfoSeen, setAudioInfoSeen] = useState(() => localStorage.getItem("audio_info_seen") === "1");

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
        return () => stopSpeaking();
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

    function handlePlay(bayt) {
        if (!audioInfoSeen) {
            setAudioInfoSeen(true);
            localStorage.setItem("audio_info_seen", "1");
        }
        if (playingIdx === bayt.index) {
            stopSpeaking();
            setPlayingIdx(null);
            return;
        }
        speakArabic(bayt.arabic, {
            onStart: () => setPlayingIdx(bayt.index),
            onEnd: () => setPlayingIdx(null),
            onError: () => setPlayingIdx(null),
        });
    }

    function openAiForBayt(bayt) {
        setAiBayt(bayt);
        setAiOpen(true);
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-6 h-6 animate-spin text-ink/40" />
            </div>
        );
    }

    if (!matn) {
        return <div className="text-center py-20">Matn introuvable.</div>;
    }

    return (
        <div className="min-h-screen pb-40 animate-fade-in-up">
            <div className="max-w-4xl mx-auto px-6 md:px-10 pt-8">
                <Link
                    to="/bibliotheque"
                    data-testid="matn-back-btn"
                    className="inline-flex items-center gap-2 text-sm text-ink/60 hover:text-ink mb-8 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Bibliothèque
                </Link>

                <header className="mb-10 pb-8 border-b border-sand">
                    <p className="text-[11px] uppercase tracking-[0.25em] text-terracotta/80 font-semibold mb-3">
                        {matn.level} · {matn.abyat.length} passages
                    </p>
                    <h1 dir="rtl" className="font-arabic text-4xl sm:text-5xl text-ink leading-snug mb-3">{matn.title_ar}</h1>
                    <h2 className="font-serif text-3xl sm:text-4xl text-ink tracking-tight">{matn.title_fr}</h2>
                    <p className="text-sm text-ink/55 mt-2">{matn.author_fr}</p>
                    {matn.description_fr && (
                        <p className="text-base text-ink/70 mt-5 max-w-2xl leading-relaxed">{matn.description_fr}</p>
                    )}
                </header>

                {!audioInfoSeen && (
                    <div data-testid="audio-disclaimer" className="bg-parchment/60 border border-sand rounded-xl p-4 mb-8 flex items-start gap-3">
                        <Info className="w-4 h-4 text-ink/60 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-ink/70 leading-relaxed">
                            <strong className="text-ink">Lecture automatique</strong> — l'écoute utilise la synthèse vocale du navigateur, ce n'est <em>pas</em> une véritable récitation par un Qârî. La qualité dépend de ton navigateur/OS. Pour mémoriser, écoute des récitations authentiques en parallèle.
                        </div>
                        <button onClick={() => { setAudioInfoSeen(true); localStorage.setItem("audio_info_seen", "1"); }} data-testid="audio-disclaimer-close" className="text-ink/50 hover:text-ink text-xs flex-shrink-0 px-2 py-1 rounded hover:bg-sand/40">
                            OK
                        </button>
                    </div>
                )}

                <div className="space-y-10">
                    {matn.abyat.map((b) => {
                        const prog = progressMap[b.index];
                        const isMemorized = prog?.status === "memorized";
                        const isLearning = prog?.status === "learning";
                        const isHidden = testMode && !revealed[b.index];

                        return (
                            <article
                                key={b.index}
                                data-testid={`bayt-${b.index}`}
                                className="group relative"
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="font-serif text-sm text-ink/40">{String(b.index + 1).padStart(2, "0")}</span>
                                    {isMemorized && (
                                        <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-pine font-semibold">
                                            <CheckCircle2 className="w-3 h-3" /> Mémorisé
                                        </span>
                                    )}
                                    {isLearning && (
                                        <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-terracotta font-semibold">
                                            <Circle className="w-3 h-3" /> En cours
                                        </span>
                                    )}
                                </div>

                                <div
                                    dir="rtl"
                                    className={`font-arabic ${ZOOM_CLASSES[zoom]} text-ink arabic-relaxed transition-all ${isHidden ? "blur-lg select-none" : ""}`}
                                    data-testid={`bayt-arabic-${b.index}`}
                                >
                                    {b.arabic}
                                </div>

                                {isHidden && (
                                    <button
                                        data-testid={`reveal-${b.index}`}
                                        onClick={() => setRevealed({ ...revealed, [b.index]: true })}
                                        className="mt-4 inline-flex items-center gap-2 text-sm px-4 py-2 rounded-full border border-terracotta/40 text-terracotta hover:bg-terracotta/5 transition-colors"
                                    >
                                        <Eye className="w-3.5 h-3.5" /> Révéler
                                    </button>
                                )}

                                {showTranslation && !isHidden && (
                                    <p className="font-sans text-base md:text-lg text-ink/65 mt-5 leading-relaxed max-w-3xl">
                                        {b.translation_fr}
                                    </p>
                                )}

                                {/* Per-bayt action row */}
                                <div className="flex items-center gap-1 mt-5 flex-wrap">
                                    <button
                                        data-testid={`play-bayt-${b.index}`}
                                        onClick={() => handlePlay(b)}
                                        className="flex items-center gap-2 text-xs px-3 py-2 rounded-full hover:bg-sand/40 text-ink/70 transition-colors"
                                    >
                                        {playingIdx === b.index ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                        {playingIdx === b.index ? "Arrêter" : "Écouter"}
                                    </button>
                                    {!isMemorized && (
                                        <button
                                            data-testid={`mark-learning-${b.index}`}
                                            onClick={() => markProgress(b.index, "learn")}
                                            className="flex items-center gap-2 text-xs px-3 py-2 rounded-full hover:bg-sand/40 text-ink/70 transition-colors"
                                        >
                                            <Circle className="w-3.5 h-3.5" /> En cours
                                        </button>
                                    )}
                                    <button
                                        data-testid={`mark-memorized-${b.index}`}
                                        onClick={() => markProgress(b.index, "review_good")}
                                        className="flex items-center gap-2 text-xs px-3 py-2 rounded-full hover:bg-pine/10 text-pine transition-colors"
                                    >
                                        <CheckCircle2 className="w-3.5 h-3.5" /> {isMemorized ? "Réviser (bien)" : "Mémorisé"}
                                    </button>
                                    {prog && (
                                        <button
                                            data-testid={`reset-${b.index}`}
                                            onClick={() => markProgress(b.index, "reset")}
                                            className="flex items-center gap-2 text-xs px-3 py-2 rounded-full hover:bg-sand/40 text-ink/50 transition-colors"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                    <button
                                        data-testid={`ai-bayt-${b.index}`}
                                        onClick={() => openAiForBayt(b)}
                                        className="flex items-center gap-2 text-xs px-3 py-2 rounded-full hover:bg-terracotta/10 text-terracotta transition-colors ml-auto"
                                    >
                                        <Sparkles className="w-3.5 h-3.5" /> Expliquer
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            </div>

            {/* Floating reading controls */}
            <div
                data-testid="reading-controls"
                className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white border border-sand shadow-xl rounded-full px-3 py-2 flex items-center gap-1 z-30 backdrop-blur-md"
            >
                <button
                    data-testid="zoom-out-btn"
                    onClick={() => setZoom(Math.max(0, zoom - 1))}
                    disabled={zoom === 0}
                    className="p-2.5 rounded-full hover:bg-sand/40 disabled:opacity-30 transition-colors"
                    title="Réduire"
                >
                    <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs text-ink/50 px-2 w-10 text-center font-mono">{zoom + 1}/5</span>
                <button
                    data-testid="zoom-in-btn"
                    onClick={() => setZoom(Math.min(ZOOM_CLASSES.length - 1, zoom + 1))}
                    disabled={zoom === ZOOM_CLASSES.length - 1}
                    className="p-2.5 rounded-full hover:bg-sand/40 disabled:opacity-30 transition-colors"
                    title="Agrandir"
                >
                    <ZoomIn className="w-4 h-4" />
                </button>
                <div className="w-px h-6 bg-sand mx-1" />
                <button
                    data-testid="toggle-translation-btn"
                    onClick={() => setShowTranslation(!showTranslation)}
                    className={`p-2.5 rounded-full hover:bg-sand/40 transition-colors ${!showTranslation ? "text-ink/40" : ""}`}
                    title={showTranslation ? "Masquer la traduction" : "Afficher la traduction"}
                >
                    <span className="text-[10px] font-bold">FR</span>
                </button>
                <button
                    data-testid="toggle-test-btn"
                    onClick={() => { setTestMode(!testMode); setRevealed({}); }}
                    className={`p-2.5 rounded-full transition-colors ${testMode ? "bg-terracotta text-white hover:bg-terracotta_dark" : "hover:bg-sand/40"}`}
                    title="Mode test"
                >
                    {testMode ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <div className="w-px h-6 bg-sand mx-1" />
                <button
                    data-testid="ai-open-btn"
                    onClick={() => { setAiBayt(null); setAiOpen(true); }}
                    className="p-2.5 rounded-full text-terracotta hover:bg-terracotta/10 transition-colors"
                    title="Assistant IA"
                >
                    <Sparkles className="w-4 h-4" />
                </button>
            </div>

            <AIChatPanel
                open={aiOpen}
                onClose={() => setAiOpen(false)}
                matnId={matn.id}
                matnTitle={matn.title_fr}
                bayt={aiBayt}
            />
        </div>
    );
}
