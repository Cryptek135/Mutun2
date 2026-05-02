import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { BookOpen, Trash2, Plus, Loader2 } from "lucide-react";

const categoryLabels = {
    "3aqida": "Croyance",
    "nahw": "Grammaire",
    "hadith": "Hadith",
    "fiqh": "Jurisprudence",
    "autre": "Autre",
};

export default function Library() {
    const [moutoun, setMoutoun] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");

    async function load() {
        setLoading(true);
        try {
            const data = await api.listMoutoun();
            setMoutoun(data);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, []);

    async function handleDelete(id, e) {
        e.preventDefault();
        if (!window.confirm("Supprimer ce matn personnalisé ?")) return;
        try {
            await api.deleteMatn(id);
            load();
        } catch {
            alert("Impossible de supprimer ce matn.");
        }
    }

    const categories = ["all", ...Array.from(new Set(moutoun.map((m) => m.category)))];
    const filtered = filter === "all" ? moutoun : moutoun.filter((m) => m.category === filter);

    return (
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-10 md:py-16 animate-fade-in-up">
            <div className="mb-10 flex items-end justify-between flex-wrap gap-4">
                <div>
                    <p className="text-[11px] uppercase tracking-[0.25em] text-ink/40 font-semibold">Bibliothèque</p>
                    <h1 className="font-serif text-4xl sm:text-5xl text-ink mt-3 tracking-tight">
                        Moutoun classiques<span className="text-terracotta">.</span>
                    </h1>
                </div>
                <Link
                    to="/ajouter"
                    data-testid="library-add-btn"
                    className="flex items-center gap-2 text-sm font-medium bg-ink text-alabaster hover:bg-ink/85 px-5 py-2.5 rounded-full transition-colors"
                >
                    <Plus className="w-4 h-4" /> Ajouter un matn
                </Link>
            </div>

            <div className="flex gap-2 flex-wrap mb-8">
                {categories.map((c) => (
                    <button
                        key={c}
                        data-testid={`filter-${c}`}
                        onClick={() => setFilter(c)}
                        className={`text-xs px-4 py-2 rounded-full font-medium transition-colors ${
                            filter === c ? "bg-ink text-alabaster" : "bg-white border border-sand text-ink/70 hover:border-terracotta"
                        }`}
                    >
                        {c === "all" ? "Tous" : categoryLabels[c] || c}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin text-ink/40" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map((m) => (
                        <Link
                            key={m.id}
                            to={`/matn/${m.id}`}
                            data-testid={`matn-card-${m.id}`}
                            className="group bg-white border border-sand/60 rounded-2xl p-7 hover:border-terracotta/50 hover:shadow-md transition-all relative"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <span className="text-[10px] uppercase tracking-wider bg-parchment text-ink/60 px-2.5 py-1 rounded-full font-semibold">
                                    {categoryLabels[m.category] || m.category}
                                </span>
                                {!m.is_preloaded && (
                                    <button
                                        data-testid={`delete-matn-${m.id}`}
                                        onClick={(e) => handleDelete(m.id, e)}
                                        className="text-ink/30 hover:text-terracotta transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <p dir="rtl" className="font-arabic text-3xl text-ink mb-2 leading-snug">{m.title_ar}</p>
                            <h3 className="font-serif text-2xl text-ink mb-1">{m.title_fr}</h3>
                            <p className="text-xs text-ink/50">{m.author_fr}</p>
                            <p className="text-sm text-ink/70 mt-4 line-clamp-3 leading-relaxed">{m.description_fr}</p>
                            <div className="flex items-center gap-2 mt-5 text-xs text-ink/50">
                                <BookOpen className="w-3 h-3" />
                                <span>{m.abyat.length} passage{m.abyat.length > 1 ? "s" : ""}</span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
