import { Link, NavLink } from "react-router-dom";
import { BookOpen, Home, Sparkles, BarChart3, Plus, Calendar } from "lucide-react";

const links = [
    { to: "/", icon: Home, label: "Aujourd'hui" },
    { to: "/bibliotheque", icon: BookOpen, label: "Bibliothèque" },
    { to: "/programmes", icon: Calendar, label: "Programmes" },
    { to: "/tamrin", icon: Sparkles, label: "Tamrîn" },
    { to: "/statistiques", icon: BarChart3, label: "Statistiques" },
];

export default function Navbar() {
    return (
        <header
            data-testid="navbar"
            className="sticky top-0 z-40 backdrop-blur-xl bg-alabaster/75 border-b border-sand/50"
        >
            <div className="max-w-7xl mx-auto px-6 md:px-10 py-4 flex items-center justify-between">
                <Link
                    to="/"
                    data-testid="nav-logo"
                    className="flex items-center gap-3 group"
                >
                    <span className="font-serif text-3xl text-terracotta leading-none italic">م</span>
                    <div className="flex flex-col leading-none">
                        <span className="font-serif text-xl text-ink">Moutoun</span>
                        <span className="text-[10px] tracking-[0.22em] uppercase text-ink/50 font-sans">Talib al-'ilm</span>
                    </div>
                </Link>

                <nav className="hidden md:flex items-center gap-1">
                    {links.map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={to === "/"}
                            data-testid={`nav-${label.toLowerCase()}`}
                            className={({ isActive }) =>
                                `relative px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                                    isActive ? "text-terracotta" : "text-ink/70 hover:text-ink"
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <Icon className="w-4 h-4" />
                                    <span>{label}</span>
                                    {isActive && (
                                        <span className="absolute -bottom-[17px] left-4 right-4 h-[2px] bg-terracotta" />
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                <Link
                    to="/ajouter"
                    data-testid="nav-add-matn"
                    className="flex items-center gap-2 text-sm font-medium bg-ink text-alabaster hover:bg-ink/85 px-4 py-2 rounded-full transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Ajouter un matn</span>
                </Link>
            </div>

            {/* Mobile nav */}
            <nav className="md:hidden flex items-center justify-around border-t border-sand/40 py-2">
                {links.map(({ to, icon: Icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === "/"}
                        data-testid={`nav-mobile-${label.toLowerCase()}`}
                        className={({ isActive }) =>
                            `flex flex-col items-center gap-1 px-3 py-1 text-[10px] font-medium ${
                                isActive ? "text-terracotta" : "text-ink/60"
                            }`
                        }
                    >
                        <Icon className="w-4 h-4" />
                        <span>{label}</span>
                    </NavLink>
                ))}
            </nav>
        </header>
    );
}
