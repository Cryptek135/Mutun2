import { useEffect, useState, useRef } from "react";
import { X, Send, Sparkles, Loader2 } from "lucide-react";
import { api } from "../lib/api";

export default function AIChatPanel({ open, onClose, matnId, matnTitle, bayt }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState("free");
    const scrollRef = useRef(null);

    useEffect(() => {
        if (open) {
            setMessages([
                {
                    role: "ai",
                    text: bayt
                        ? `As-salâmu 'alaykum. Je suis prêt à t'aider sur le passage sélectionné du matn « ${matnTitle} ». Pose ta question, ou utilise les raccourcis : « Expliquer » pour une explication pédagogique, « Questions » pour générer des questions de révision.`
                        : `As-salâmu 'alaykum. Je suis là pour t'aider dans ton apprentissage des moutoun. Pose-moi une question en lien avec le matn « ${matnTitle || "sélectionné"} » ou la méthodologie d'apprentissage.`,
                },
            ]);
        }
    }, [open, matnTitle, bayt]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages, loading]);

    async function send(customMessage, customMode) {
        const message = customMessage ?? input.trim();
        if (!message || loading) return;
        const useMode = customMode ?? mode;
        setMessages((m) => [...m, { role: "user", text: message }]);
        setInput("");
        setLoading(true);
        try {
            const { response } = await api.aiChat({
                matn_id: matnId,
                bayt_index: bayt?.index,
                message,
                mode: useMode,
            });
            setMessages((m) => [...m, { role: "ai", text: response }]);
        } catch (e) {
            setMessages((m) => [
                ...m,
                { role: "ai", text: "Une erreur est survenue. Réessaie dans un instant." },
            ]);
        } finally {
            setLoading(false);
        }
    }

    if (!open) return null;

    return (
        <>
            <div
                className="fixed inset-0 bg-ink/20 backdrop-blur-sm z-50"
                onClick={onClose}
                data-testid="ai-chat-overlay"
            />
            <aside
                data-testid="ai-chat-panel"
                className="fixed top-0 right-0 bottom-0 w-full sm:w-[460px] bg-alabaster border-l border-sand shadow-2xl z-50 flex flex-col animate-slide-in-right"
            >
                <div className="flex items-center justify-between px-6 py-5 border-b border-sand/60">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-terracotta/10 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-terracotta" />
                        </div>
                        <div>
                            <h3 className="font-serif text-xl text-ink leading-none">Assistant</h3>
                            <p className="text-xs text-ink/50 mt-1">Claude Sonnet 4.5</p>
                        </div>
                    </div>
                    <button
                        data-testid="ai-chat-close"
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-sand/40 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {bayt && (
                    <div className="px-6 py-4 bg-parchment border-b border-sand/60">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-ink/50 mb-2">Passage sélectionné</p>
                        <p dir="rtl" className="font-arabic text-lg text-ink leading-loose">{bayt.arabic}</p>
                    </div>
                )}

                <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    {messages.map((m, i) => (
                        <div
                            key={i}
                            className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
                        >
                            <div
                                data-testid={`ai-msg-${m.role}`}
                                className={
                                    m.role === "user"
                                        ? "max-w-[85%] px-4 py-3 rounded-2xl rounded-tr-sm bg-ink text-alabaster text-sm leading-relaxed"
                                        : "max-w-[90%] px-4 py-3 rounded-2xl rounded-tl-sm bg-sand/30 text-ink text-sm leading-relaxed whitespace-pre-wrap"
                                }
                            >
                                {m.text}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex items-center gap-2 text-ink/50 text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Réflexion…</span>
                        </div>
                    )}
                </div>

                {bayt && (
                    <div className="px-6 py-2 flex gap-2 border-t border-sand/60">
                        <button
                            data-testid="ai-quick-explain"
                            onClick={() => send("Explique ce passage en détail.", "explain")}
                            disabled={loading}
                            className="text-xs px-3 py-1.5 rounded-full border border-sand hover:bg-sand/40 transition-colors disabled:opacity-50"
                        >
                            Expliquer
                        </button>
                        <button
                            data-testid="ai-quick-questions"
                            onClick={() => send("Génère des questions de révision sur ce passage.", "questions")}
                            disabled={loading}
                            className="text-xs px-3 py-1.5 rounded-full border border-sand hover:bg-sand/40 transition-colors disabled:opacity-50"
                        >
                            Questions de révision
                        </button>
                    </div>
                )}

                <form
                    onSubmit={(e) => { e.preventDefault(); send(); }}
                    className="p-4 border-t border-sand/60 bg-alabaster"
                >
                    <div className="flex gap-2 items-end">
                        <textarea
                            data-testid="ai-chat-input"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    send();
                                }
                            }}
                            placeholder="Pose ta question..."
                            rows={2}
                            className="flex-1 resize-none px-4 py-3 rounded-2xl border border-sand bg-white text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30"
                        />
                        <button
                            data-testid="ai-chat-send"
                            type="submit"
                            disabled={loading || !input.trim()}
                            className="w-11 h-11 rounded-full bg-terracotta text-white flex items-center justify-center hover:bg-terracotta_dark transition-colors disabled:opacity-40"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </form>
            </aside>
        </>
    );
}
