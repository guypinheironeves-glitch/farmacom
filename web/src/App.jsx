import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { api, quandoSessaoExpirar, sessao } from "./api.js";
import { useProvedorTema, TemaContext } from "./tema.js";
import Layout from "./components/Layout.jsx";
import { ProvedorAvisos } from "./components/Toasts.jsx";
import { MarcaIcone } from "./components/Logo.jsx";
import Login from "./pages/Login.jsx";
import Painel from "./pages/Painel.jsx";
import Medicamentos from "./pages/Medicamentos.jsx";
import MedicamentoDetalhe from "./pages/MedicamentoDetalhe.jsx";
import Movimentacoes from "./pages/Movimentacoes.jsx";
import Relatorios from "./pages/Relatorios.jsx";
import Fornecedores from "./pages/Fornecedores.jsx";
import EntradaNota from "./pages/EntradaNota.jsx";
import Configuracoes from "./pages/Configuracoes.jsx";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export default function App() {
  const tema = useProvedorTema();
  const [usuario, setUsuario] = useState(null);
  const [nomeFarmacia, setNomeFarmacia] = useState("");
  const [carregando, setCarregando] = useState(Boolean(sessao.token));

  const sair = useCallback(() => {
    sessao.limpar();
    setUsuario(null);
  }, []);

  useEffect(() => {
    api("/aparencia")
      .then((a) => {
        if (a.cor_destaque) tema.setCor(a.cor_destaque);
        setNomeFarmacia(a.nome_farmacia || "");
      })
      .catch(() => {});
    quandoSessaoExpirar(sair);
    if (!sessao.token) return;
    api("/auth/eu")
      .then(setUsuario)
      .catch(sair)
      .finally(() => setCarregando(false));
  }, [sair]); // eslint-disable-line react-hooks/exhaustive-deps

  const entrar = async (email, senha) => {
    const { token, usuario } = await api("/auth/login", { method: "POST", body: { email, senha } });
    sessao.salvar(token);
    setUsuario(usuario);
  };

  const valorAuth = useMemo(
    () => ({ usuario, entrar, sair, admin: usuario?.perfil === "administrador", nomeFarmacia, setNomeFarmacia }),
    [usuario, sair, nomeFarmacia] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <TemaContext.Provider value={tema}>
      <ProvedorAvisos>
        {carregando ? (
          <div className="tela-carregando"><MarcaIcone tamanho={56} className="girando" /></div>
        ) : (
          <AuthContext.Provider value={valorAuth}>
            <Routes>
              <Route path="/login" element={usuario ? <Navigate to="/" replace /> : <Login />} />
              <Route element={<Protegida usuario={usuario} />}>
                <Route path="/" element={<Painel />} />
                <Route path="/medicamentos" element={<Medicamentos />} />
                <Route path="/medicamentos/:id" element={<MedicamentoDetalhe />} />
                <Route path="/movimentacoes" element={<Movimentacoes />} />
                <Route path="/entrada-nota" element={<EntradaNota />} />
                <Route path="/fornecedores" element={<Fornecedores />} />
                <Route path="/relatorios" element={<Relatorios />} />
                <Route path="/configuracoes" element={<Configuracoes />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AuthContext.Provider>
        )}
      </ProvedorAvisos>
    </TemaContext.Provider>
  );
}

function Protegida({ usuario }) {
  const location = useLocation();
  if (!usuario) return <Navigate to="/login" replace state={{ de: location.pathname }} />;
  return <Layout />;
}
