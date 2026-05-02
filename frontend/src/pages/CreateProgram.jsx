import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { Calendar, ArrowLeft, Loader2, Save, Check } from "lucide-react";

export default function CreateProgram() {
    const navigate = useNavigate();
    const [moutoun, setMoutoun] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [name, setName] = useState("");
    const [selected, setSelected] = useState([]);
    const [duration, setDuration] = useState(30);
    const [daily, setDaily] = useState(2);
    const [includeReview, setIncludeReview] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const data = await api.listMoutoun();
                setMoutoun(data);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    function toggleMatn(id) {
        setSelected((s) => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
    }

    const totalAbyat = moutoun
        .filter((m) => selected.includes(m.id))
        .reduce((sum, m) => sum + m.abyat.length, 0);
    const estimatedDays = daily ? Math.ceil(totalAbyat / daily) : 0;

    async function handleSubmit(e) {
        e.preventDefault();
        if (!name.trim()) return alert("Donne un nom à ton programme.");
        if (selected.length === 0) return alert("Sélectionne au moins un matn.");
        setSaving(true);
        try {
            const created = await api.createProgram({
                name: name.trim(),
                matn_ids: selected,
                duration_days: Number(duration),
                daily_new_count: Number(daily),
                include_review: includeReview,
            });
            navigate(`/programmes/${created.id}`);
        } catch (e) {
            alert(e.response?.data?.detail || "Erreur lors de la création");
            setSaving(false);
        }
    }

    return (
        <div className="max-w-3xl mx-auto px-6 md:px-10 py-10 animate-fade-in-up">
            <button onClick={() => navigate(-1)} data-testid="create-back-btn" className="inline-flex items-center gap-2 text-sm text-ink/60 hover:text-ink mb-8 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Retour
            </button>

            <div className="mb-10">
                <p className="text-[11px] uppercase tracking-[0.25em] text-ink/40 font-semibold">Nouveau programme</p>
                <h1 className="font-serif text-4xl sm:text-5xl text-ink tracking-tight mt-3">
                    Conçois ton planning<span className="text-terracotta">.</span>
                </h1>
                <p className="text-ink/60 mt-3">Choisis les moutoun, ajuste la durée et le rythme. On s'occupe du reste.</p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-ink/40" /></div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-8">
                    <div>
                        <label className="block text-[11px] uppercase tracking-[0.2em] text-ink/50 font-semibold mb-2">Nom du programme</label>
                        <input
                            data-testid="program-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex. : Hiver 2026 — 'Aqîda"
                            className="w-full px-4 py-3 rounded-xl border border-sand bg-white focus:outline-none focus:ring-2 focus:ring-ink/20"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] uppercase tracking-[0.2em] text-ink/50 font-semibold mb-3">Moutoun à inclure</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {moutoun.map((m) => {
                                const isSelected = selected.includes(m.id);
                                return (
                                    <button
                                        key={m.id}
                                        type="button"
                                        data-testid={`select-matn-${m.id}`}
                                        onClick={() => toggleMatn(m.id)}
                                        className={`text-left p-4 rounded-xl border transition-all ${
                                            isSelected ? "border-ink bg-ink/[0.03] shadow-sm" : "border-sand bg-white hover:border-ink/40"
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <p className="font-serif text-lg text-ink truncate">{m.title_fr}</p>
                                                <p dir="rtl" className="font-arabic text-base text-ink/60 truncate">{m.title_ar}</p>
                                                <p className="text-xs text-ink/50 mt-1">{m.abyat.length} passages</p>
                                            </div>
                                            <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center mt-1 ${
                                                isSelected ? "bg-ink text-alabaster" : "border border-sand"
                                            }`}>
                                                {isSelected && <Check className="w-3 h-3" />}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] uppercase tracking-[0.2em] text-ink/50 font-semibold mb-2">Durée (jours)</label>
                            <input
                                data-testid="program-duration"
                                type="number"
                                min={1}
                                max={365}
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-sand bg-white focus:outline-none focus:ring-2 focus:ring-ink/20 font-serif text-2xl"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] uppercase tracking-[0.2em] text-ink/50 font-semibold mb-2">Nouveaux abyât / jour</label>
                            <input
                                data-testid="program-daily"
                                type="number"
                                min={1}
                                max={20}
                                value={daily}
                                onChange={(e) => setDaily(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-sand bg-white focus:outline-none focus:ring-2 focus:ring-ink/20 font-serif text-2xl"
                            />
                        </div>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            data-testid="program-review"
                            checked={includeReview}
                            onChange={(e) => setIncludeReview(e.target.checked)}
                            className="w-4 h-4 accent-ink"
                        />
                        <span className="text-sm text-ink/80">Inclure les révisions automatiques (J+1, J+3, J+7)</span>
                    </label>

                    {selected.length > 0 && (
                        <div className="bg-parchment/60 border border-sand rounded-xl p-5">
                            <p className="text-[11px] uppercase tracking-[0.2em] text-ink/50 font-semibold mb-2">Estimation</p>
                            <p className="text-ink">
                                <span className="font-serif text-2xl text-ink">{totalAbyat}</span> passages au total · couverture en <span className="font-serif text-2xl text-ink">{estimatedDays}</span> jour{estimatedDays > 1 ? "s" : ""} au rythme choisi.
                            </p>
                            {estimatedDays > duration && (
                                <p className="text-xs text-terracotta mt-2">
                                    ⓘ Le rythme actuel ne couvrira pas tout en {duration} jours. Augmente la durée ou le nombre quotidien.
                                </p>
                            )}
                        </div>
                    )}

                    <button
                        type="submit"
                        data-testid="program-submit"
                        disabled={saving}
                        className="w-full flex items-center justify-center gap-2 bg-ink text-alabaster py-3.5 rounded-full font-medium hover:bg-ink/85 transition-colors disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? "Création..." : "Créer le programme"}
                    </button>
                </form>
            )}
        </div>
    );
}
