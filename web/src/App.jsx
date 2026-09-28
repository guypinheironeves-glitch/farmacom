import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { api, quandoSessaoExpirar, sessao } from "./api.js";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Painel from "./pages/Painel.jsx";
import Medicamentos from "./pages/Medicamentos.jsx";
import MedicamentoDetalhe from "./pages/MedicamentoDetalhe.jsx";
import Movimentacoes from "./pages/Movimentacoes.jsx";
import Relatorios from "./pages/Relatorios.jsx";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(Boolean(sessao.token));

  const sair = useCallback(() => {
    sessao.limpar();
    setUsuario(null);
  }, []);

  useEffect(() => {
    quandoSessaoExpirar(sair);
    if (!sessao.token) return;
    api("/auth/eu")
      .then(setUsuario)
      .catch(sair)
      .finally(() => setCarregando(false));
  }, [sair]);

  const entrar = async (email, senha) => {
    const { token, usuario } = await api("/auth/login", { method: "POST", body: { email, senha } });
    sessao.salvar(token);
    setUsuario(usuario);
  };

  if (carregando) return <div className="tela-carregando">Carregando…</div>;

  return (
    <AuthContext.Provider value={{ usuario, entrar, sair }}>
      <Routes>
        <Route path="/login" element={usuario ? <Navigate to="/" replace /> : <Login />} />
        <Route element={<Protegida usuario={usuario} />}>
          <Route path="/" element={<Painel />} />
          <Route path="/medicamentos" element={<Medicamentos />} />
          <Route path="/medicamentos/:id" element={<MedicamentoDetalhe />} />
          <Route path="/movimentacoes" element={<Movimentacoes />} />
          <Route path="/relatorios" element={<Relatorios />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthContext.Provider>
  );
}

function Protegida({ usuario }) {
  const location = useLocation();
  if (!usuario) return <Navigate to="/login" replace state={{ de: location.pathname }} />;
  return <Layout />;
}
