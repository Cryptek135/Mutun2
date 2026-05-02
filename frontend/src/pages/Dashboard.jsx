import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Flame, BookOpen, Sparkles, CheckCircle2, ArrowRight, Loader2, Calendar } from "lucide-react";

export default function Dashboard() {
    const [plan, setPlan] = useState(null);
    const [stats, setStats] = useState(null);
    const [moutoun, setMoutoun] = useState([]);
    const [todayPrograms, setTodayPrograms] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const [p, s, m, tp] = await Promise.all([api.getPlan(), api.getStats(), api.listMoutoun(), api.getTodayPrograms()]);
                setPlan(p);
                setStats(s);
                setMoutoun(m);
                setTodayPrograms(tp.programs || []);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] text-ink/50">
                <Loader2 className="w-6 h-6 animate-spin" />
            </div>
        );
    }

    const greeting = (() => {
        const h = new Date().getHours();
        if (h < 12) return "As-salâmu 'alaykum, bonne matinée";
        if (h < 18) return "As-salâmu 'alaykum, bon après-midi";
        return "As-salâmu 'alaykum, bonne soirée";
    })();

    return (
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-10 md:py-16 animate-fade-in-up">
            <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <p className="text-[11px] uppercase tracking-[0.25em] text-ink/40 font-semibold">Tableau de bord</p>
                    <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-ink mt-3 tracking-tight leading-[0.95]">
                        {greeting}<span className="text-terracotta">.</span>
                    </h1>
                    <p className="text-ink/60 mt-3 text-base max-w-xl leading-relaxed">
                        Voici ton plan de révision. La régularité prime sur la quantité.
                    </p>
                </div>
                <div data-testid="streak-badge" className="flex items-center gap-2 bg-gold/15 border border-gold/40 rounded-full px-5 py-2.5">
                    <Flame className="w-4 h-4 text-terracotta" />
                    <span className="font-serif text-lg text-ink">{stats?.streak_days || 0}</span>
                    <span className="text-xs text-ink/60">jour{(stats?.streak_days || 0) > 1 ? "s" : ""} consécutif{(stats?.streak_days || 0) > 1 ? "s" : ""}</span>
                </div>
            </div>

            {plan?.is_tamrin_day && (
                <Link
                    to="/tamrin"
                    data-testid="tamrin-banner"
                    className="block mb-10 relative overflow-hidden bg-terracotta text-alabaster rounded-2xl p-8 hover:shadow-lg transition-shadow grain"
                >
                    <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <p className="text-[11px] uppercase tracking-[0.25em] opacity-75 font-semibold">Cycle jour 5</p>
                            <h2 className="font-serif text-3xl md:text-4xl mt-2">Aujourd'hui, c'est Tamrîn.</h2>
                            <p className="opacity-85 mt-2 max-w-lg">Pas de nouveaux abyât : révise l'intégralité de ce que tu as appris durant le cycle.</p>
                        </div>
                        <span className="flex items-center gap-2 bg-alabaster/15 hover:bg-alabaster/25 transition-colors px-6 py-3 rounded-full font-medium">
                            Commencer <ArrowRight className="w-4 h-4" />
                        </span>
                    </div>
                </Link>
            )}

            {/* Active programs section */}
            {todayPrograms.length > 0 && (
                <section data-testid="today-programs" className="mb-10">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-[11px] uppercase tracking-[0.25em] text-ink/40 font-semibold flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5" /> Programmes du jour
                        </p>
                        <Link to="/programmes" data-testid="dashboard-programs-link" className="text-xs text-ink/60 hover:text-ink hover:underline">Tous →</Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {todayPrograms.map((tp) => (
                            <Link
                                key={tp.program_id}
                                to={`/programmes/${tp.program_id}`}
                                data-testid={`today-program-${tp.program_id}`}
                                className="bg-white border border-sand/60 rounded-xl p-5 hover:border-ink/30 hover:shadow-sm transition-all"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <p className="font-serif text-lg text-ink truncate">{tp.program_name}</p>
                                    <span className="text-[10px] text-ink/50 font-mono">J{tp.day_index + 1}/{tp.duration_days}</span>
                                </div>
                                <p className="text-xs text-ink/60 mb-3">
                                    {tp.today_items.new_items.length} nouveau{tp.today_items.new_items.length > 1 ? "x" : ""} · {tp.today_items.review_items.length} révision{tp.today_items.review_items.length > 1 ? "s" : ""}
                                </p>
                                {tp.today_items.new_items[0] && (
                                    <p dir="rtl" className="font-arabic text-base text-ink/80 truncate">
                                        {tp.today_items.new_items[0].arabic}
                                    </p>
                                )}
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* Bento grid */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
                {/* Today's plan */}
                <div className="md:col-span-4 bg-white border border-sand/60 rounded-2xl p-8">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <p className="text-[11px] uppercase tracking-[0.25em] text-ink/40 font-semibold">Plan du jour</p>
                            <h3 className="font-serif text-2xl mt-1 text-ink">
                                {plan?.due_reviews.length || 0} révision{(plan?.due_reviews.length || 0) > 1 ? "s" : ""} · {plan?.new_suggestions.length || 0} nouveau{(plan?.new_suggestions.length || 0) > 1 ? "x" : ""}
                            </h3>
                        </div>
                    </div>

                    {(plan?.due_reviews.length === 0 && plan?.new_suggestions.length === 0 && !plan?.is_tamrin_day) && (
                        <div data-testid="empty-plan" className="text-center py-10 text-ink/50">
                            <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-40" />
                            <p className="font-serif text-lg">Rien à réviser aujourd'hui.</p>
                            <p className="text-sm mt-1">Commence par explorer la bibliothèque.</p>
                        </div>
                    )}

                    <div className="space-y-3">
                        {plan?.due_reviews.slice(0, 4).map((r) => (
                            <Link
                                key={`${r.matn_id}-${r.bayt_index}`}
                                to={`/matn/${r.matn_id}`}
                                data-testid={`review-item-${r.bayt_index}`}
                                className="flex items-center justify-between gap-4 p-4 rounded-xl border border-sand/50 hover:border-terracotta/40 hover:bg-parchment/50 transition-colors group"
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] uppercase tracking-wider bg-pine/10 text-pine px-2 py-0.5 rounded-full font-semibold">À réviser</span>
                                        <span className="text-xs text-ink/50 truncate">{r.matn_title_fr}</span>
                                    </div>
                                    <p dir="rtl" className="font-arabic text-xl text-ink truncate">{r.arabic}</p>
                                </div>
                                <ArrowRight className="w-4 h-4 text-ink/30 group-hover:text-terracotta transition-colors flex-shrink-0" />
                            </Link>
                        ))}
                        {plan?.new_suggestions.slice(0, 2).map((s) => (
                            <Link
                                key={`new-${s.matn_id}-${s.bayt_index}`}
                                to={`/matn/${s.matn_id}`}
                                data-testid={`new-item-${s.bayt_index}`}
                                className="flex items-center justify-between gap-4 p-4 rounded-xl border border-sand/50 hover:border-terracotta/40 hover:bg-parchment/50 transition-colors group"
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] uppercase tracking-wider bg-terracotta/10 text-terracotta px-2 py-0.5 rounded-full font-semibold">Nouveau</span>
                                        <span className="text-xs text-ink/50 truncate">{s.matn_title_fr}</span>
                                    </div>
                                    <p dir="rtl" className="font-arabic text-xl text-ink truncate">{s.arabic}</p>
                                </div>
                                <ArrowRight className="w-4 h-4 text-ink/30 group-hover:text-terracotta transition-colors flex-shrink-0" />
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Cycle card */}
                <div data-testid="cycle-card" className="md:col-span-2 bg-pine/5 border border-pine/20 rounded-2xl p-7 flex flex-col justify-between">
                    <div>
                        <Sparkles className="w-5 h-5 text-pine mb-3" />
                        <p className="text-[11px] uppercase tracking-[0.25em] text-pine/70 font-semibold">Cycle Tamrîn</p>
                        <h3 className="font-serif text-2xl mt-2 text-ink">Jour {plan?.cycle_day || 1} <span className="text-ink/40">/ 5</span></h3>
                    </div>
                    <div className="mt-5">
                        <div className="flex gap-1.5 mb-3">
                            {[1, 2, 3, 4, 5].map((d) => (
                                <div
                                    key={d}
                                    className={`flex-1 h-1.5 rounded-full ${d <= (plan?.cycle_day || 0) ? "bg-terracotta" : "bg-pine/15"}`}
                                />
                            ))}
                        </div>
                        <p className="text-sm text-ink/60">
                            {plan?.is_tamrin_day
                                ? "C'est aujourd'hui le jour de révision globale."
                                : `Plus que ${plan?.days_until_tamrin} jour${(plan?.days_until_tamrin || 0) > 1 ? "s" : ""} avant le Tamrîn.`}
                        </p>
                    </div>
                </div>

                {/* Stats card */}
                <div data-testid="stats-card" className="md:col-span-3 bg-white border border-sand/60 rounded-2xl p-7">
                    <p className="text-[11px] uppercase tracking-[0.25em] text-ink/40 font-semibold">Progression</p>
                    <div className="grid grid-cols-3 gap-4 mt-5">
                        <div>
                            <p className="font-serif text-4xl text-ink">{stats?.total_memorized || 0}</p>
                            <p className="text-xs text-ink/60 mt-1">Mémorisés</p>
                        </div>
                        <div>
                            <p className="font-serif text-4xl text-ink">{stats?.total_learning || 0}</p>
                            <p className="text-xs text-ink/60 mt-1">En cours</p>
                        </div>
                        <div>
                            <p className="font-serif text-4xl text-ink">{stats?.active_moutoun || 0}</p>
                            <p className="text-xs text-ink/60 mt-1">Moutoun actifs</p>
                        </div>
                    </div>
                </div>

                {/* Quick library */}
                <div className="md:col-span-3 bg-parchment/70 border border-sand/60 rounded-2xl p-7">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-[11px] uppercase tracking-[0.25em] text-ink/40 font-semibold">Bibliothèque</p>
                        <Link to="/bibliotheque" data-testid="dashboard-library-link" className="text-xs text-terracotta hover:underline">
                            Voir tout →
                        </Link>
                    </div>
                    <div className="space-y-2">
                        {moutoun.slice(0, 3).map((m) => (
                            <Link
                                key={m.id}
                                to={`/matn/${m.id}`}
                                data-testid={`dash-matn-${m.id}`}
                                className="flex items-center justify-between p-3 rounded-lg hover:bg-white transition-colors group"
                            >
                                <div className="min-w-0">
                                    <p className="font-serif text-lg text-ink truncate">{m.title_fr}</p>
                                    <p dir="rtl" className="font-arabic text-base text-ink/60 truncate">{m.title_ar}</p>
                                </div>
                                <ArrowRight className="w-4 h-4 text-ink/30 group-hover:text-terracotta transition-colors" />
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
