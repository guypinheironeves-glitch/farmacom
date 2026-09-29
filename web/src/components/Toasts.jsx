import { createContext, useCallback, useContext, useState } from "react";
import { Icone } from "./ui.jsx";

const AvisosContext = createContext(() => {});
export const useAvisar = () => useContext(AvisosContext);

let proximoId = 1;

export function ProvedorAvisos({ children }) {
  const [lista, setLista] = useState([]);

  const fechar = useCallback((id) => setLista((l) => l.map((a) => (a.id === id ? { ...a, saindo: true } : a))), []);

  const avisar = useCallback(
    (mensagem, tipo = "sucesso") => {
      const id = proximoId++;
      setLista((l) => [...l.slice(-3), { id, mensagem, tipo }]);
      setTimeout(() => fechar(id), 4200);
      setTimeout(() => setLista((l) => l.filter((a) => a.id !== id)), 4600);
    },
    [fechar]
  );

  return (
    <AvisosContext.Provider value={avisar}>
      {children}
      <div className="toasts" aria-live="polite">
        {lista.map((a) => (
          <div key={a.id} className={`toast toast-${a.tipo} ${a.saindo ? "saindo" : ""}`} role={a.tipo === "erro" ? "alert" : "status"}>
            <Icone nome={a.tipo === "erro" ? "alerta" : "confirmar"} tamanho={18} />
            <span>{a.mensagem}</span>
            <button className="botao-icone" onClick={() => fechar(a.id)} aria-label="Fechar aviso">
              <Icone nome="fechar" tamanho={16} />
            </button>
          </div>
        ))}
      </div>
    </AvisosContext.Provider>
  );
}
