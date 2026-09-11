import React, { useState } from 'react';
import {
  History,
  Search,
  Calendar,
  Truck,
  RotateCcw,
  Wrench,
  User,
  Building2,
  FileText,
  ShieldCheck,
  Lock,
  Trash2,
  Edit3,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const HistoricoView: React.FC = () => {
  const { db, permissions, excluirSaida } = useApp();

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'saidas' | 'manutencoes' | 'auditoria'>('saidas');

  const filteredSaidas = db.saidas.filter((s) => {
    return (
      s.codigo.toLowerCase().includes(search.toLowerCase()) ||
      (s.obraNome && s.obraNome.toLowerCase().includes(search.toLowerCase())) ||
      (s.responsavelNome && s.responsavelNome.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const filteredManutencoes = db.manutencoes.filter((m) => {
    return (
      m.codigoEquipamento.toLowerCase().includes(search.toLowerCase()) ||
      (m.nomeEquipamento && m.nomeEquipamento.toLowerCase().includes(search.toLowerCase())) ||
      m.descricao.toLowerCase().includes(search.toLowerCase())
    );
  });

  const movimentacoes = db.movimentacoes || [];
  const filteredAuditoria = movimentacoes.filter((mov) => {
    const q = search.toLowerCase();
    return (
      (mov.codigoEquipamento && mov.codigoEquipamento.toLowerCase().includes(q)) ||
      (mov.nomeEquipamento && mov.nomeEquipamento.toLowerCase().includes(q)) ||
      (mov.codigoSaida && mov.codigoSaida.toLowerCase().includes(q)) ||
      (mov.usuarioNome && mov.usuarioNome.toLowerCase().includes(q)) ||
      (mov.usuarioEmail && mov.usuarioEmail.toLowerCase().includes(q)) ||
      (mov.observacoes && mov.observacoes.toLowerCase().includes(q)) ||
      (mov.tipo && mov.tipo.toLowerCase().includes(q))
    );
  });

  const handleDeleteSaida = async (saidaId: string, codigo: string) => {
    if (!permissions.canApagarSaidas) {
      alert('Acesso negado: Operadores não têm permissão para apagar saídas.');
      return;
    }

    if (window.confirm(`Confirma a exclusão da saída ${codigo}? Esta ação é irreversível e será registrada na auditoria.`)) {
      try {
        await excluirSaida(saidaId);
      } catch (err: any) {
        alert(err?.message || 'Erro ao apagar saída.');
      }
    }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-blue-400" />
            Histórico e Auditoria de Operações
          </h1>
          <p className="text-xs text-slate-400">
            Registro cronológico e imutável de saídas, devoluções, manutenções e rastreabilidade de operadores.
          </p>
        </div>

        {/* Badge de Governança RBAC */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Auditoria Criptoativa (Google Workspace)</span>
          </div>
        </div>
      </div>

      {/* Busca e Abas */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Buscar por código, colaborador, e-mail, obra ou ativo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('saidas')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'saidas'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            Saídas e Devoluções ({db.saidas.length})
          </button>
          <button
            onClick={() => setActiveTab('manutencoes')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'manutencoes'
                ? 'bg-amber-600 text-slate-950 shadow-sm'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            Manutenções ({db.manutencoes.length})
          </button>
          <button
            onClick={() => setActiveTab('auditoria')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'auditoria'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-purple-400" />
            Auditoria Crítica ({movimentacoes.length})
          </button>
        </div>
      </div>

      {/* Aba 1: Saídas e Devoluções */}
      {activeTab === 'saidas' && (
        <div className="space-y-3">
          {filteredSaidas.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-xs text-slate-400">
              Nenhuma saída registrada no histórico.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSaidas.map((saida) => {
                const itens = db.saidaItens.filter((i) => i.saidaId === saida.id);
                const isConcluida = saida.status === 'Devolvido' || saida.status === 'Devolvido Parcial';
                return (
                  <div
                    key={saida.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2.5 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-900">
                        {saida.codigo}
                      </span>
                      <div className="flex items-center gap-2">
                        {isConcluida ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            {saida.status} (Concluído)
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800 flex items-center gap-1">
                            <Truck className="w-3 h-3" />
                            {saida.status}
                          </span>
                        )}

                        {/* Apenas Administrador pode apagar saídas não concluídas. Saídas concluídas são imutáveis */}
                        {permissions.canApagarSaidas && !isConcluida && (
                          <button
                            onClick={() => handleDeleteSaida(saida.id, saida.codigo)}
                            className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                            title="Apagar saída (Administrador)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xs font-bold text-white">{saida.obraNome}</h3>
                      <p className="text-[11px] text-slate-400">
                        Responsável: {saida.responsavelNome}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                      <span>Saída: {saida.dataSaida}</span>
                      {saida.dataDevolucaoReal && (
                        <span className="text-emerald-400">
                          Devolução: {new Date(saida.dataDevolucaoReal).toLocaleString()}
                        </span>
                      )}
                    </div>

                    {itens.length > 0 && (
                      <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-1">
                        {itens.map((it) => (
                          <span
                            key={it.id}
                            className="text-[9px] font-mono bg-slate-950 text-slate-300 border border-slate-800 px-1.5 py-0.5 rounded"
                          >
                            {it.codigoEquipamento}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Proteção de Integridade */}
                    {isConcluida && (
                      <div className="pt-2 border-t border-slate-800/60 flex items-center gap-1.5 text-[10px] text-slate-500">
                        <Lock className="w-3 h-3 text-slate-500" />
                        <span>Registro concluído e imutável conforme governança M&B</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Aba 2: Manutenções */}
      {activeTab === 'manutencoes' && (
        <div className="space-y-3">
          {filteredManutencoes.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-xs text-slate-400">
              Nenhuma manutenção no histórico.
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Código</th>
                    <th className="px-4 py-3">Equipamento</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Descrição</th>
                    <th className="px-4 py-3">Data Entrada</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredManutencoes.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-mono font-bold text-blue-400">
                        {m.codigoEquipamento}
                      </td>
                      <td className="px-4 py-3 text-white font-medium">
                        {m.nomeEquipamento || '-'}
                      </td>
                      <td className="px-4 py-3 text-amber-400">{m.tipo}</td>
                      <td className="px-4 py-3 text-slate-300 max-w-xs truncate">
                        {m.descricao}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{m.dataEntrada}</td>
                      <td className="px-4 py-3 font-semibold text-slate-200">
                        {m.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Aba 3: Auditoria Crítica (PROMPT 7: Usuário, Data, Hora em Operações Críticas) */}
      {activeTab === 'auditoria' && (
        <div className="space-y-3">
          <div className="p-3.5 bg-slate-900 border border-purple-900/60 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-950 text-purple-300 border border-purple-800 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-white">Log de Auditoria de Operações Críticas</p>
                <p className="text-slate-400 text-[11px]">
                  Toda saída, devolução, checklist, cadastro e modificação registra automaticamente Usuário, E-mail Google Workspace, Data e Hora.
                </p>
              </div>
            </div>
            <span className="font-mono font-bold text-purple-400 bg-purple-950 px-2.5 py-1 rounded border border-purple-800 text-[11px]">
              {filteredAuditoria.length} Registros
            </span>
          </div>

          {filteredAuditoria.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-xs text-slate-400">
              Nenhuma movimentação crítica registrada ainda.
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Data e Hora</th>
                      <th className="px-4 py-3">Operação</th>
                      <th className="px-4 py-3">Usuário Google</th>
                      <th className="px-4 py-3">Ativo / Código</th>
                      <th className="px-4 py-3">Obra / Destino</th>
                      <th className="px-4 py-3">Transição Status</th>
                      <th className="px-4 py-3">Detalhes / Auditoria</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-sans">
                    {filteredAuditoria.map((mov) => {
                      const dataFormatada = new Date(mov.dataHora).toLocaleString('pt-BR');
                      return (
                        <tr key={mov.id} className="hover:bg-slate-800/40">
                          <td className="px-4 py-3 font-mono text-slate-300 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                              {dataFormatada}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                mov.tipo === 'SAIDA'
                                  ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                  : mov.tipo === 'DEVOLUCAO'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : 'bg-amber-950 text-amber-300 border border-amber-800'
                              }`}
                            >
                              {mov.tipo}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <p className="font-semibold text-white">{mov.usuarioNome || 'Operador M&B'}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{mov.usuarioEmail || 'workspace@mb.com.br'}</p>
                          </td>
                          <td className="px-4 py-3 font-mono">
                            {mov.codigoEquipamento ? (
                              <span className="font-bold text-blue-400">{mov.codigoEquipamento}</span>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-300">
                            {mov.obraNome || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {mov.statusAnterior && mov.statusNovo ? (
                              <div className="flex items-center gap-1 text-[11px]">
                                <span className="text-slate-400">{mov.statusAnterior}</span>
                                <span className="text-slate-600">&rarr;</span>
                                <span className="font-semibold text-white">{mov.statusNovo}</span>
                              </div>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-400 max-w-sm text-[11px]">
                            {mov.observacoes || (mov.codigoSaida ? `Saída ${mov.codigoSaida}` : 'Operação realizada no sistema')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
