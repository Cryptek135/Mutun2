import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { Plus, Trash2, Save, ArrowLeft, Loader2 } from "lucide-react";

export default function EditMatn() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [matn, setMatn] = useState(null);
    const [form, setForm] = useState({
        title_fr: "", title_ar: "", author_fr: "", category: "autre",
        level: "Débutant", description_fr: "",
    });
    const [abyat, setAbyat] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const m = await api.getMatn(id);
                setMatn(m);
                setForm({
                    title_fr: m.title_fr || "",
                    title_ar: m.title_ar || "",
                    author_fr: m.author_fr || "",
                    category: m.category || "autre",
                    level: m.level || "Débutant",
                    description_fr: m.description_fr || "",
                });
                setAbyat(m.abyat.length ? m.abyat.map((b) => ({ arabic: b.arabic, translation_fr: b.translation_fr })) : [{ arabic: "", translation_fr: "" }]);
            } catch {
                alert("Matn introuvable");
                navigate(-1);
            } finally {
                setLoading(false);
            }
        })();
    }, [id, navigate]);

    function updateBayt(i, field, v) {
        setAbyat((a) => a.map((b, idx) => (idx === i ? { ...b, [field]: v } : b)));
    }
    function addBayt(afterIdx) {
        setAbyat((a) => {
            const next = [...a];
            next.splice(afterIdx + 1, 0, { arabic: "", translation_fr: "" });
            return next;
        });
    }
    function removeBayt(i) { setAbyat((a) => a.filter((_, idx) => idx !== i)); }
    function moveBayt(i, dir) {
        setAbyat((a) => {
            const next = [...a];
            const j = i + dir;
            if (j < 0 || j >= next.length) return next;
            [next[i], next[j]] = [next[j], next[i]];
            return next;
        });
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!form.title_fr.trim() || !form.title_ar.trim()) {
            alert("Les titres (FR et AR) sont requis.");
            return;
        }
        const validAbyat = abyat.filter((b) => b.arabic.trim()).map((b, i) => ({
            index: i, arabic: b.arabic.trim(), translation_fr: b.translation_fr.trim(),
        }));
        if (validAbyat.length === 0) { alert("Au moins un passage requis."); return; }
        setSaving(true);
        try {
            await api.updateMatn(id, { ...form, abyat: validAbyat });
            navigate(`/matn/${id}`);
        } catch {
            alert("Erreur lors de la sauvegarde.");
            setSaving(false);
        }
    }

    if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-6 h-6 animate-spin text-ink/40" /></div>;

    return (
        <div className="max-w-3xl mx-auto px-6 md:px-10 py-10 animate-fade-in-up">
            <button onClick={() => navigate(-1)} data-testid="edit-back-btn" className="inline-flex items-center gap-2 text-sm text-ink/60 hover:text-ink mb-8 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Retour
            </button>

            <h1 className="font-serif text-4xl sm:text-5xl text-ink tracking-tight mb-3">
                Modifier le matn<span className="text-terracotta">.</span>
            </h1>
            {matn?.is_preloaded && (
                <p className="text-sm text-ink/60 mb-8 bg-parchment/60 border border-sand rounded-xl p-4">
                    ⓘ Tu modifies un matn préchargé. Tes corrections seront conservées et ne seront pas écrasées par les mises à jour automatiques.
                </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                    <Input label="Titre (français)" required value={form.title_fr} onChange={(v) => setForm({ ...form, title_fr: v })} testid="edit-title-fr" />
                    <Input label="Titre (arabe)" required value={form.title_ar} onChange={(v) => setForm({ ...form, title_ar: v })} testid="edit-title-ar" dir="rtl" arabicFont />
                    <Input label="Auteur" value={form.author_fr} onChange={(v) => setForm({ ...form, author_fr: v })} testid="edit-author" />
                    <div>
                        <label className="block text-[11px] uppercase tracking-[0.2em] text-ink/50 font-semibold mb-2">Catégorie</label>
                        <select data-testid="edit-category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-sand bg-white focus:outline-none focus:ring-2 focus:ring-ink/20">
                            <option value="3aqida">Croyance</option>
                            <option value="nahw">Grammaire</option>
                            <option value="hadith">Hadith</option>
                            <option value="fiqh">Jurisprudence</option>
                            <option value="autre">Autre</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-[11px] uppercase tracking-[0.2em] text-ink/50 font-semibold mb-2">Description</label>
                    <textarea data-testid="edit-description" value={form.description_fr} onChange={(e) => setForm({ ...form, description_fr: e.target.value })} rows={3}
                        className="w-full px-4 py-3 rounded-xl border border-sand bg-white focus:outline-none focus:ring-2 focus:ring-ink/20 resize-none" />
                </div>

                <div className="bg-parchment/50 border border-sand rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="font-serif text-xl text-ink">Passages ({abyat.length})</h2>
                        <button type="button" data-testid="edit-add-bayt" onClick={() => addBayt(abyat.length - 1)} className="flex items-center gap-1 text-sm text-terracotta hover:underline">
                            <Plus className="w-4 h-4" /> Ajouter à la fin
                        </button>
                    </div>
                    <div className="space-y-3">
                        {abyat.map((b, i) => (
                            <div key={i} className="bg-white border border-sand rounded-xl p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs text-ink/50 font-mono">#{i + 1}</span>
                                    <div className="flex gap-1">
                                        <button type="button" onClick={() => moveBayt(i, -1)} disabled={i === 0} className="text-xs px-2 py-1 rounded text-ink/50 hover:bg-sand/40 disabled:opacity-30">↑</button>
                                        <button type="button" onClick={() => moveBayt(i, 1)} disabled={i === abyat.length - 1} className="text-xs px-2 py-1 rounded text-ink/50 hover:bg-sand/40 disabled:opacity-30">↓</button>
                                        <button type="button" onClick={() => addBayt(i)} className="text-xs px-2 py-1 rounded text-terracotta hover:bg-sand/40" title="Insérer après">＋</button>
                                        {abyat.length > 1 && (
                                            <button type="button" data-testid={`edit-remove-${i}`} onClick={() => removeBayt(i)} className="text-ink/40 hover:text-terracotta px-2 py-1">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <textarea data-testid={`edit-bayt-arabic-${i}`} dir="rtl" value={b.arabic} onChange={(e) => updateBayt(i, "arabic", e.target.value)}
                                    placeholder="النص بالعربية" rows={2}
                                    className="w-full px-3 py-2 border-b border-sand bg-transparent focus:outline-none font-arabic text-xl resize-none leading-loose" />
                                <textarea data-testid={`edit-bayt-translation-${i}`} value={b.translation_fr} onChange={(e) => updateBayt(i, "translation_fr", e.target.value)}
                                    placeholder="Traduction française" rows={2}
                                    className="w-full px-3 py-2 bg-transparent focus:outline-none text-sm resize-none mt-2" />
                            </div>
                        ))}
                    </div>
                </div>

                <button type="submit" data-testid="edit-submit-btn" disabled={saving}
                    className="w-full flex items-center justify-center gap-2 bg-ink text-alabaster py-3.5 rounded-full font-medium hover:bg-ink/85 transition-colors disabled:opacity-50">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? "Sauvegarde..." : "Enregistrer les modifications"}
                </button>
            </form>
        </div>
    );
}

function Input({ label, value, onChange, required, testid, dir, arabicFont }) {
    return (
        <div>
            <label className="block text-[11px] uppercase tracking-[0.2em] text-ink/50 font-semibold mb-2">
                {label} {required && <span className="text-terracotta">*</span>}
            </label>
            <input data-testid={testid} dir={dir} value={value} onChange={(e) => onChange(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border border-sand bg-white focus:outline-none focus:ring-2 focus:ring-ink/20 ${arabicFont ? "font-arabic text-xl" : ""}`} />
        </div>
    );
}
