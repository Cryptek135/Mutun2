import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { ArrowLeft, Calendar, BookOpen, Loader2, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";

export default function ProgramDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [viewDay, setViewDay] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const d = await api.getProgramDetail(id);
                setData(d);
                setViewDay(d.today_index);
            } catch {
                alert("Programme introuvable");
                navigate("/programmes");
            } finally {
                setLoading(false);
            }
        })();
    }, [id, navigate]);

    if (loading || !data) {
        return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-6 h-6 animate-spin text-ink/40" /></div>;
    }

    const { program, schedule, today_items, progress_percent, total_new_target, learned_count } = data;
    const safeViewDay = Math.max(0, Math.min(viewDay ?? 0, schedule.length - 1));
    const viewedDay = schedule[safeViewDay];

    return (
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-10 animate-fade-in-up">
            <Link to="/programmes" data-testid="back-to-programs" className="inline-flex items-center gap-2 text-sm text-ink/60 hover:text-ink mb-8 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Programmes
            </Link>

            <header className="mb-10">
                <p className="text-[11px] uppercase tracking-[0.25em] text-ink/40 font-semibold">{program.status === "active" ? "Programme actif" : program.status === "paused" ? "En pause" : "Terminé"}</p>
                <h1 className="font-serif text-4xl sm:text-5xl text-ink mt-3 tracking-tight">{program.name}</h1>
                <div className="flex items-center gap-4 mt-3 text-sm text-ink/60 flex-wrap">
                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{program.duration_days} jours</span>
                    <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" />{program.matn_ids.length} matn</span>
                    <span>·</span>
                    <span>{program.daily_new_count} nouveaux/jour</span>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
                <div data-testid="prog-progress" className="bg-white border border-sand/60 rounded-2xl p-6">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-ink/50 font-semibold mb-3">Progression</p>
                    <p className="font-serif text-5xl text-ink">{progress_percent}%</p>
                    <p className="text-sm text-ink/60 mt-1">{learned_count}/{total_new_target} appris</p>
                    <div className="h-1.5 bg-sand/40 rounded-full overflow-hidden mt-4">
                        <div className="h-full bg-ink/80" style={{ width: `${progress_percent}%` }} />
                    </div>
                </div>
                <div className="bg-white border border-sand/60 rounded-2xl p-6 lg:col-span-2">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-ink/50 font-semibold mb-3">Aujourd'hui · Jour {(data.today_index >= 0 ? data.today_index : 0) + 1}</p>
                    {today_items ? (
                        <>
                            <p className="text-ink mb-3">{today_items.new_items.length} nouveau{today_items.new_items.length > 1 ? "x" : ""} · {today_items.review_items.length} révision{today_items.review_items.length > 1 ? "s" : ""}</p>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {today_items.new_items.slice(0, 3).map((it, i) => (
                                    <Link key={i} to={`/matn/${it.matn_id}`} data-testid={`today-new-${i}`} className="block p-3 rounded-lg hover:bg-parchment/60 transition-colors">
                                        <p className="text-xs text-ink/50">{it.matn_title_fr}</p>
                                        <p dir="rtl" className="font-arabic text-lg truncate">{it.arabic}</p>
                                    </Link>
                                ))}
                            </div>
                        </>
                    ) : (
                        <p className="text-ink/60">{(data.today_index < 0) ? "Le programme commence aujourd'hui." : "Programme terminé. Bârak Allahu fîk !"}</p>
                    )}
                </div>
            </div>

            {/* Calendar / day picker */}
            <div data-testid="schedule-calendar" className="bg-white border border-sand/60 rounded-2xl p-6 md:p-8">
                <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
                    <h2 className="font-serif text-2xl text-ink">Calendrier</h2>
                    <div className="flex items-center gap-2">
                        <button data-testid="prev-day" onClick={() => setViewDay(Math.max(0, safeViewDay - 1))} className="p-2 rounded-full hover:bg-sand/40 disabled:opacity-30" disabled={safeViewDay === 0}>
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm text-ink/60 min-w-[80px] text-center">Jour {safeViewDay + 1}</span>
                        <button data-testid="next-day" onClick={() => setViewDay(Math.min(schedule.length - 1, safeViewDay + 1))} className="p-2 rounded-full hover:bg-sand/40 disabled:opacity-30" disabled={safeViewDay === schedule.length - 1}>
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-14 gap-1.5 mb-8">
                    {schedule.map((d, i) => {
                        const isToday = i === data.today_index;
                        const isPast = i < data.today_index;
                        const isViewed = i === safeViewDay;
                        return (
                            <button
                                key={i}
                                data-testid={`day-cell-${i}`}
                                onClick={() => setViewDay(i)}
                                className={`aspect-square rounded-md text-[10px] font-medium flex items-center justify-center transition-all ${
                                    isViewed ? "ring-2 ring-ink ring-offset-1 ring-offset-alabaster" : ""
                                } ${
                                    isToday ? "bg-ink text-alabaster" :
                                    isPast ? "bg-pine/15 text-pine" :
                                    "bg-sand/30 text-ink/60 hover:bg-sand/50"
                                }`}
                                title={d.date}
                            >
                                {i + 1}
                            </button>
                        );
                    })}
                </div>

                {viewedDay && (
                    <div data-testid="viewed-day-content" className="border-t border-sand/60 pt-6">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-ink/50 font-semibold mb-3">
                            {new Date(viewedDay.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                        </p>

                        {viewedDay.new_items.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
                                    <Sparkles className="w-3.5 h-3.5 text-terracotta" /> À apprendre ({viewedDay.new_items.length})
                                </h3>
                                <div className="space-y-2">
                                    {viewedDay.new_items.map((it, i) => (
                                        <Link key={i} to={`/matn/${it.matn_id}`} data-testid={`day-new-${i}`} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-sand/50 hover:border-ink/30 hover:bg-parchment/40 transition-colors">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs text-ink/50">{it.matn_title_fr}</p>
                                                <p dir="rtl" className="font-arabic text-lg truncate">{it.arabic}</p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {viewedDay.review_items.length > 0 && (
                            <div>
                                <h3 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
                                    <BookOpen className="w-3.5 h-3.5 text-pine" /> À réviser ({viewedDay.review_items.length})
                                </h3>
                                <div className="space-y-2">
                                    {viewedDay.review_items.map((it, i) => (
                                        <Link key={i} to={`/matn/${it.matn_id}`} data-testid={`day-rev-${i}`} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-sand/50 hover:border-pine/30 hover:bg-pine/[0.03] transition-colors">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs text-ink/50">{it.matn_title_fr}</p>
                                                <p dir="rtl" className="font-arabic text-lg truncate">{it.arabic}</p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {viewedDay.new_items.length === 0 && viewedDay.review_items.length === 0 && (
                            <p className="text-ink/50 text-sm">Aucun passage prévu ce jour.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
