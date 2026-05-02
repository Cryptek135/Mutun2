import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import Library from "./pages/Library";
import MatnReader from "./pages/MatnReader";
import Tamrin from "./pages/Tamrin";
import Stats from "./pages/Stats";
import AddMatn from "./pages/AddMatn";
import Programs from "./pages/Programs";
import CreateProgram from "./pages/CreateProgram";
import ProgramDetail from "./pages/ProgramDetail";
import { Toaster } from "./components/ui/sonner";

function App() {
    return (
        <div className="App paper-bg min-h-screen">
            <BrowserRouter>
                <Navbar />
                <main>
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/bibliotheque" element={<Library />} />
                        <Route path="/matn/:id" element={<MatnReader />} />
                        <Route path="/tamrin" element={<Tamrin />} />
                        <Route path="/statistiques" element={<Stats />} />
                        <Route path="/ajouter" element={<AddMatn />} />
                        <Route path="/programmes" element={<Programs />} />
                        <Route path="/programmes/nouveau" element={<CreateProgram />} />
                        <Route path="/programmes/:id" element={<ProgramDetail />} />
                    </Routes>
                </main>
                <Toaster />
            </BrowserRouter>
        </div>
    );
}

export default App;
