import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { Plus, Trash2, Save, ArrowLeft, Loader2 } from "lucide-react";

export default function AddMatn() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        title_fr: "",
        title_ar: "",
        author_fr: "",
        category: "autre",
        level: "Débutant",
        description_fr: "",
    });
    const [abyat, setAbyat] = useState([{ arabic: "", translation_fr: "" }]);
    const [saving, setSaving] = useState(false);

    function updateBayt(i, field, v) {
        setAbyat((a) => a.map((b, idx) => (idx === i ? { ...b, [field]: v } : b)));
    }
    function addBayt() { setAbyat((a) => [...a, { arabic: "", translation_fr: "" }]); }
    function removeBayt(i) { setAbyat((a) => a.filter((_, idx) => idx !== i)); }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!form.title_fr.trim() || !form.title_ar.trim()) {
            alert("Les titres (FR et AR) sont requis.");
            return;
        }
        const validAbyat = abyat.filter((b) => b.arabic.trim()).map((b, i) => ({
            index: i,
            arabic: b.arabic.trim(),
            translation_fr: b.translation_fr.trim(),
        }));
        if (validAbyat.length === 0) {
            alert("Ajoute au moins un passage.");
            return;
        }
        setSaving(true);
        try {
            const created = await api.createMatn({ ...form, abyat: validAbyat });
            navigate(`/matn/${created.id}`);
        } catch {
            alert("Erreur lors de la création.");
            setSaving(false);
        }
    }

    return (
        <div className="max-w-3xl mx-auto px-6 md:px-10 py-10 animate-fade-in-up">
            <button
                onClick={() => navigate(-1)}
                data-testid="add-back-btn"
                className="inline-flex items-center gap-2 text-sm text-ink/60 hover:text-ink mb-8 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" /> Retour
            </button>

            <h1 className="font-serif text-4xl sm:text-5xl text-ink tracking-tight mb-8">
                Ajouter un matn<span className="text-terracotta">.</span>
            </h1>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                    <Input label="Titre (français)" required value={form.title_fr} onChange={(v) => setForm({ ...form, title_fr: v })} testid="input-title-fr" />
                    <Input label="Titre (arabe)" required value={form.title_ar} onChange={(v) => setForm({ ...form, title_ar: v })} testid="input-title-ar" dir="rtl" arabicFont />
                    <Input label="Auteur" value={form.author_fr} onChange={(v) => setForm({ ...form, author_fr: v })} testid="input-author" />
                    <div>
                        <label className="block text-[11px] uppercase tracking-[0.2em] text-ink/50 font-semibold mb-2">Catégorie</label>
                        <select
                            data-testid="input-category"
                            value={form.category}
                            onChange={(e) => setForm({ ...form, category: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-sand bg-white focus:outline-none focus:ring-2 focus:ring-terracotta/30"
                        >
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
                    <textarea
                        data-testid="input-description"
                        value={form.description_fr}
                        onChange={(e) => setForm({ ...form, description_fr: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl border border-sand bg-white focus:outline-none focus:ring-2 focus:ring-terracotta/30 resize-none"
                    />
                </div>

                <div className="bg-parchment/50 border border-sand rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="font-serif text-xl text-ink">Passages (abyât)</h2>
                        <button
                            type="button"
                            data-testid="add-bayt-btn"
                            onClick={addBayt}
                            className="flex items-center gap-1 text-sm text-terracotta hover:underline"
                        >
                            <Plus className="w-4 h-4" /> Ajouter
                        </button>
                    </div>
                    <div className="space-y-4">
                        {abyat.map((b, i) => (
                            <div key={i} className="bg-white border border-sand rounded-xl p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs text-ink/50 font-mono">#{i + 1}</span>
                                    {abyat.length > 1 && (
                                        <button
                                            type="button"
                                            data-testid={`remove-bayt-${i}`}
                                            onClick={() => removeBayt(i)}
                                            className="text-ink/40 hover:text-terracotta"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                                <textarea
                                    data-testid={`bayt-arabic-${i}`}
                                    dir="rtl"
                                    value={b.arabic}
                                    onChange={(e) => updateBayt(i, "arabic", e.target.value)}
                                    placeholder="النص بالعربية"
                                    rows={2}
                                    className="w-full px-3 py-2 border-b border-sand bg-transparent focus:outline-none font-arabic text-xl resize-none leading-loose"
                                />
                                <textarea
                                    data-testid={`bayt-translation-${i}`}
                                    value={b.translation_fr}
                                    onChange={(e) => updateBayt(i, "translation_fr", e.target.value)}
                                    placeholder="Traduction française (optionnelle)"
                                    rows={2}
                                    className="w-full px-3 py-2 bg-transparent focus:outline-none text-sm resize-none mt-2"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <button
                    type="submit"
                    data-testid="submit-matn-btn"
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 bg-terracotta text-white py-3.5 rounded-full font-medium hover:bg-terracotta_dark transition-colors disabled:opacity-50"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? "Enregistrement..." : "Enregistrer le matn"}
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
            <input
                data-testid={testid}
                dir={dir}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border border-sand bg-white focus:outline-none focus:ring-2 focus:ring-terracotta/30 ${arabicFont ? "font-arabic text-xl" : ""}`}
            />
        </div>
    );
}
