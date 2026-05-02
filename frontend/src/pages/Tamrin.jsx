import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Sparkles, Play, Pause, Check, X, ArrowRight, Loader2, RotateCcw } from "lucide-react";
import { speakArabic, stopSpeaking } from "../lib/speech";

export default function Tamrin() {
    const [plan, setPlan] = useState(null);
    const [idx, setIdx] = useState(0);
    const [showTranslation, setShowTranslation] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [done, setDone] = useState(false);
    const [sessionStats, setSessionStats] = useState({ good: 0, hard: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const p = await api.getPlan();
                setPlan(p);
            } finally {
                setLoading(false);
            }
        })();
        return () => stopSpeaking();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-6 h-6 animate-spin text-ink/40" />
            </div>
        );
    }

    const items = plan?.tamrin_items || [];
    const current = items[idx];

    async function handleAnswer(action) {
        if (!current) return;
        try {
            await api.updateProgress({
                matn_id: current.matn_id,
                bayt_index: current.bayt_index,
                action,
            });
            setSessionStats((s) => ({
                ...s,
                good: s.good + (action === "review_good" ? 1 : 0),
                hard: s.hard + (action === "review_hard" ? 1 : 0),
            }));
            stopSpeaking();
            setPlaying(false);
            setShowTranslation(false);
            if (idx + 1 >= items.length) {
                setDone(true);
            } else {
                setIdx(idx + 1);
            }
        } catch {
            alert("Erreur.");
        }
    }

    function handlePlay() {
        if (!current) return;
        if (playing) {
            stopSpeaking();
            setPlaying(false);
            return;
        }
        speakArabic(current.arabic, {
            onStart: () => setPlaying(true),
            onEnd: () => setPlaying(false),
            onError: () => setPlaying(false),
        });
    }

    if (!plan?.is_tamrin_day) {
        return (
            <div className="max-w-3xl mx-auto px-6 py-20 text-center">
                <Sparkles className="w-10 h-10 text-terracotta/60 mx-auto mb-6" />
                <h1 className="font-serif text-4xl sm:text-5xl text-ink tracking-tight">Tamrîn</h1>
                <p className="text-ink/60 mt-4 text-lg leading-relaxed">
                    La révision complète (Tamrîn) arrive tous les 5 jours.
                </p>
                <p className="text-ink/50 mt-2">
                    Jour actuel du cycle : <span className="font-semibold text-ink">{plan?.cycle_day || 1}/5</span>
                    {plan?.days_until_tamrin > 0 && ` · encore ${plan.days_until_tamrin} jour${plan.days_until_tamrin > 1 ? "s" : ""}`}
                </p>
                <Link
                    to="/"
                    data-testid="tamrin-back-home"
                    className="inline-flex items-center gap-2 mt-10 bg-ink text-alabaster px-6 py-3 rounded-full hover:bg-ink/85 transition-colors"
                >
                    Retour au tableau de bord <ArrowRight className="w-4 h-4" />
                </Link>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="max-w-3xl mx-auto px-6 py-20 text-center">
                <h1 className="font-serif text-4xl text-ink">Tamrîn</h1>
                <p className="text-ink/60 mt-4">Aucun passage appris à réviser pour le moment. Commence par apprendre quelques abyât !</p>
                <Link to="/bibliotheque" data-testid="tamrin-to-library" className="inline-block mt-8 bg-terracotta text-white px-6 py-3 rounded-full hover:bg-terracotta_dark transition-colors">
                    Vers la bibliothèque
                </Link>
            </div>
        );
    }

    if (done) {
        return (
            <div className="max-w-3xl mx-auto px-6 py-20 text-center animate-fade-in-up">
                <div className="w-16 h-16 bg-pine/10 rounded-full mx-auto mb-6 flex items-center justify-center">
                    <Check className="w-8 h-8 text-pine" />
                </div>
                <h1 className="font-serif text-4xl sm:text-5xl text-ink tracking-tight">Tamrîn terminé<span className="text-terracotta">.</span></h1>
                <p className="text-ink/60 mt-4 text-lg">
                    Bârak Allahu fîk. Tu as revu {items.length} passage{items.length > 1 ? "s" : ""}.
                </p>
                <div className="flex gap-4 justify-center mt-8">
                    <div className="bg-pine/5 border border-pine/20 rounded-xl px-6 py-4">
                        <p className="font-serif text-3xl text-pine">{sessionStats.good}</p>
                        <p className="text-xs text-ink/60">Bien sus</p>
                    </div>
                    <div className="bg-terracotta/5 border border-terracotta/20 rounded-xl px-6 py-4">
                        <p className="font-serif text-3xl text-terracotta">{sessionStats.hard}</p>
                        <p className="text-xs text-ink/60">À retravailler</p>
                    </div>
                </div>
                <Link
                    to="/"
                    data-testid="tamrin-done-home"
                    className="inline-flex items-center gap-2 mt-10 bg-ink text-alabaster px-6 py-3 rounded-full hover:bg-ink/85 transition-colors"
                >
                    Retour au tableau de bord <ArrowRight className="w-4 h-4" />
                </Link>
            </div>
        );
    }

    return (
        <div data-testid="tamrin-view" className="min-h-screen grain relative">
            <div className="absolute inset-0 bg-gradient-to-b from-terracotta/5 to-transparent pointer-events-none" />
            <div className="relative max-w-3xl mx-auto px-6 md:px-10 py-12">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <p className="text-[11px] uppercase tracking-[0.25em] text-terracotta font-semibold">Tamrîn · Jour 5</p>
                        <p className="font-serif text-2xl text-ink mt-1">Passage {idx + 1} / {items.length}</p>
                    </div>
                    <div className="flex items-center gap-1">
                        {items.map((_, i) => (
                            <div key={i} className={`h-1 w-6 rounded-full ${i < idx ? "bg-pine" : i === idx ? "bg-terracotta" : "bg-sand"}`} />
                        ))}
                    </div>
                </div>

                <div className="bg-white/80 backdrop-blur border border-sand rounded-3xl p-8 md:p-12 shadow-sm">
                    <p className="text-xs text-ink/50 mb-6">{current.matn_title_fr} · <span dir="rtl" className="font-arabic">{current.matn_title_ar}</span></p>
                    <div dir="rtl" className="font-arabic text-4xl sm:text-5xl text-ink arabic-relaxed text-center mb-8" data-testid="tamrin-arabic">
                        {current.arabic}
                    </div>

                    <div className="flex justify-center gap-2 mb-8">
                        <button
                            data-testid="tamrin-play"
                            onClick={handlePlay}
                            className="flex items-center gap-2 text-sm px-4 py-2 rounded-full border border-sand hover:bg-sand/40 transition-colors"
                        >
                            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            {playing ? "Arrêter" : "Écouter"}
                        </button>
                        <button
                            data-testid="tamrin-reveal"
                            onClick={() => setShowTranslation(!showTranslation)}
                            className="flex items-center gap-2 text-sm px-4 py-2 rounded-full border border-sand hover:bg-sand/40 transition-colors"
                        >
                            {showTranslation ? "Masquer" : "Traduction"}
                        </button>
                    </div>

                    {showTranslation && (
                        <p className="text-base md:text-lg text-ink/70 text-center max-w-2xl mx-auto leading-relaxed border-t border-sand/60 pt-8">
                            {current.translation_fr}
                        </p>
                    )}
                </div>

                <div className="flex gap-3 mt-8 justify-center">
                    <button
                        data-testid="tamrin-hard"
                        onClick={() => handleAnswer("review_hard")}
                        className="flex items-center gap-2 bg-white border border-sand hover:border-terracotta/50 px-6 py-3.5 rounded-full text-ink transition-colors"
                    >
                        <RotateCcw className="w-4 h-4" /> À retravailler
                    </button>
                    <button
                        data-testid="tamrin-good"
                        onClick={() => handleAnswer("review_good")}
                        className="flex items-center gap-2 bg-pine text-white hover:bg-pine/90 px-6 py-3.5 rounded-full transition-colors"
                    >
                        <Check className="w-4 h-4" /> Bien su
                    </button>
                </div>
            </div>
        </div>
    );
}
