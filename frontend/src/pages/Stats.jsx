import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Loader2, Flame, CheckCircle2, BookOpen } from "lucide-react";

export default function Stats() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const s = await api.getStats();
                setStats(s);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-6 h-6 animate-spin text-ink/40" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-10 md:py-16 animate-fade-in-up">
            <div className="mb-12">
                <p className="text-[11px] uppercase tracking-[0.25em] text-ink/40 font-semibold">Statistiques</p>
                <h1 className="font-serif text-4xl sm:text-5xl text-ink mt-3 tracking-tight">
                    Ta progression<span className="text-terracotta">.</span>
                </h1>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                <div data-testid="stat-streak" className="bg-white border border-sand/60 rounded-2xl p-6">
                    <Flame className="w-5 h-5 text-terracotta mb-3" />
                    <p className="font-serif text-4xl text-ink">{stats?.streak_days || 0}</p>
                    <p className="text-xs text-ink/60 mt-1">Jours consécutifs</p>
                </div>
                <div data-testid="stat-memorized" className="bg-white border border-sand/60 rounded-2xl p-6">
                    <CheckCircle2 className="w-5 h-5 text-pine mb-3" />
                    <p className="font-serif text-4xl text-ink">{stats?.total_memorized || 0}</p>
                    <p className="text-xs text-ink/60 mt-1">Passages mémorisés</p>
                </div>
                <div data-testid="stat-learning" className="bg-white border border-sand/60 rounded-2xl p-6">
                    <BookOpen className="w-5 h-5 text-terracotta mb-3" />
                    <p className="font-serif text-4xl text-ink">{stats?.total_learning || 0}</p>
                    <p className="text-xs text-ink/60 mt-1">En cours</p>
                </div>
                <div data-testid="stat-sessions" className="bg-white border border-sand/60 rounded-2xl p-6">
                    <p className="text-[11px] uppercase tracking-wider text-ink/50 mb-3 font-semibold">Sessions</p>
                    <p className="font-serif text-4xl text-ink">{stats?.total_sessions || 0}</p>
                    <p className="text-xs text-ink/60 mt-1">Enregistrées</p>
                </div>
            </div>

            <div className="bg-white border border-sand/60 rounded-2xl p-8">
                <h2 className="font-serif text-2xl text-ink mb-6">Par matn</h2>
                {(stats?.per_matn || []).length === 0 ? (
                    <p className="text-ink/50 text-center py-8">Aucune progression enregistrée pour l'instant.</p>
                ) : (
                    <div className="space-y-5">
                        {stats.per_matn.map((m) => (
                            <div key={m.matn_id} data-testid={`per-matn-${m.matn_id}`}>
                                <div className="flex items-end justify-between mb-2 gap-4">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-serif text-lg text-ink truncate">{m.title_fr}</p>
                                        <p dir="rtl" className="font-arabic text-base text-ink/60 truncate">{m.title_ar}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="font-serif text-2xl text-ink">{m.percent}%</p>
                                        <p className="text-xs text-ink/50">{m.memorized + m.learning}/{m.total}</p>
                                    </div>
                                </div>
                                <div className="h-2 bg-sand/40 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-terracotta to-terracotta_dark transition-all"
                                        style={{ width: `${m.percent}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
