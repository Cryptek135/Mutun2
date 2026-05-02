import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { Calendar, Plus, Trash2, Pause, Play, Loader2, ArrowRight } from "lucide-react";

export default function Programs() {
    const [programs, setPrograms] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    async function load() {
        setLoading(true);
        try {
            const data = await api.listPrograms();
            setPrograms(data);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, []);

    async function handleDelete(id) {
        if (!window.confirm("Supprimer ce programme ?")) return;
        await api.deleteProgram(id);
        load();
    }

    async function toggleStatus(p) {
        const newStatus = p.status === "active" ? "paused" : "active";
        try {
            await api.updateProgramStatus(p.id, newStatus);
            load();
        } catch (e) {
            alert(e.response?.data?.detail || "Erreur");
        }
    }

    const activeCount = programs.filter(p => p.status === "active").length;

    return (
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-10 md:py-16 animate-fade-in-up">
            <div className="mb-10 flex items-end justify-between flex-wrap gap-4">
                <div>
                    <p className="text-[11px] uppercase tracking-[0.25em] text-ink/40 font-semibold">Programmes</p>
                    <h1 className="font-serif text-4xl sm:text-5xl text-ink mt-3 tracking-tight">
                        Tes programmes<span className="text-terracotta">.</span>
                    </h1>
                    <p className="text-ink/60 mt-2">
                        {activeCount}/5 actif{activeCount > 1 ? "s" : ""} · jusqu'à 5 programmes en parallèle
                    </p>
                </div>
                <button
                    data-testid="programs-create-btn"
                    onClick={() => navigate("/programmes/nouveau")}
                    disabled={activeCount >= 5}
                    className="flex items-center gap-2 text-sm font-medium bg-ink text-alabaster hover:bg-ink/85 px-5 py-2.5 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <Plus className="w-4 h-4" /> Nouveau programme
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-ink/40" /></div>
            ) : programs.length === 0 ? (
                <div className="bg-parchment/50 border border-sand rounded-2xl p-12 text-center">
                    <Calendar className="w-10 h-10 text-ink/30 mx-auto mb-4" />
                    <h2 className="font-serif text-2xl text-ink mb-2">Aucun programme</h2>
                    <p className="text-ink/60 mb-6">Crée ton premier programme personnalisé : choisis tes moutoun, fixe une durée, on s'occupe du planning.</p>
                    <Link to="/programmes/nouveau" data-testid="programs-empty-create" className="inline-flex items-center gap-2 bg-ink text-alabaster px-5 py-2.5 rounded-full hover:bg-ink/85 transition-colors">
                        <Plus className="w-4 h-4" /> Créer un programme
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {programs.map((p) => (
                        <ProgramCard key={p.id} program={p} onDelete={handleDelete} onToggle={toggleStatus} />
                    ))}
                </div>
            )}
        </div>
    );
}

function ProgramCard({ program, onDelete, onToggle }) {
    const start = new Date(program.start_date);
    const end = new Date(program.end_date);
    const today = new Date();
    const dayIdx = Math.floor((today - start) / (1000 * 60 * 60 * 24));
    const isOver = dayIdx >= program.duration_days;
    const dayDisplay = Math.min(Math.max(dayIdx + 1, 1), program.duration_days);
    const percent = Math.min(Math.max(Math.round((dayDisplay / program.duration_days) * 100), 0), 100);

    return (
        <div data-testid={`program-${program.id}`} className="bg-white border border-sand/60 rounded-2xl p-6 hover:border-ink/30 transition-colors">
            <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold ${
                        program.status === "active" ? "bg-pine/10 text-pine" :
                        program.status === "paused" ? "bg-sand/40 text-ink/60" :
                        "bg-parchment text-ink/50"
                    }`}>
                        {program.status === "active" ? "Actif" : program.status === "paused" ? "En pause" : "Terminé"}
                    </span>
                    <h3 className="font-serif text-2xl text-ink mt-2">{program.name}</h3>
                </div>
                <div className="flex gap-1">
                    {!isOver && (
                        <button
                            data-testid={`toggle-${program.id}`}
                            onClick={() => onToggle(program)}
                            className="p-2 rounded-full hover:bg-sand/40 text-ink/60"
                            title={program.status === "active" ? "Mettre en pause" : "Reprendre"}
                        >
                            {program.status === "active" ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </button>
                    )}
                    <button data-testid={`delete-prog-${program.id}`} onClick={() => onDelete(program.id)} className="p-2 rounded-full hover:bg-sand/40 text-ink/40 hover:text-ink">
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
            <p className="text-xs text-ink/50 mb-4">
                {start.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} → {end.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                {" · "}{program.matn_ids.length} matn · {program.daily_new_count}/jour
            </p>
            <div className="h-1.5 bg-sand/40 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-ink/80" style={{ width: `${percent}%` }} />
            </div>
            <div className="flex justify-between text-xs text-ink/60 mb-4">
                <span>Jour {dayDisplay} / {program.duration_days}</span>
                <span>{percent}%</span>
            </div>
            <Link to={`/programmes/${program.id}`} data-testid={`open-prog-${program.id}`} className="flex items-center justify-between text-sm text-ink hover:text-ink/70 transition-colors group">
                <span>Voir le calendrier</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
        </div>
    );
}
