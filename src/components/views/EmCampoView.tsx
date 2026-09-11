import React from 'react';
import {
  Truck,
  RotateCcw,
  MapPin,
  Calendar,
  User,
  Box,
  AlertCircle,
  PlusCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const EmCampoView: React.FC = () => {
  const { db, setActiveView, setSaidaParaDevolucaoId } = useApp();

  const equipamentosEmCampo = db.equipamentos.filter(
    (e) => e.status === 'EM CAMPO' || e.status === 'Em Campo'
  );
  const saidasEmCampo = db.saidas.filter(
    (s) => s.status === 'Em Campo' || s.status === 'Liberado para Campo' || s.status === 'Devolvido Parcial'
  );

  const handleIrParaDevolucao = (saidaId?: string) => {
    if (saidaId) {
      setSaidaParaDevolucaoId(saidaId);
    }
    setActiveView('devolucao');
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-400" />
            Equipamentos em Campo
          </h1>
          <p className="text-xs text-slate-400">
            Monitoramento de equipamentos alocados em obras e frentes de serviço.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView('devolucao')}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow"
          >
            <RotateCcw className="w-4 h-4" />
            Processar Devolução
          </button>
        </div>
      </div>

      {equipamentosEmCampo.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center max-w-md mx-auto space-y-3">
          <Truck className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">Nenhum equipamento em campo</h3>
          <p className="text-xs text-slate-400">
            Todos os equipamentos cadastrados estão no estoque da M&B ou em manutenção.
          </p>
          <button
            onClick={() => setActiveView('nova-saida')}
            className="mt-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl inline-flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            Registrar Nova Saída
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Resumo de Saídas Ativas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {saidasEmCampo.map((saida) => {
              const itens = db.saidaItens.filter((i) => i.saidaId === saida.id);
              return (
                <div
                  key={saida.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-mono font-bold text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-900">
                        {saida.codigo}
                      </span>
                      <h3 className="text-sm font-bold text-white mt-1">
                        {saida.obraNome || 'Obra M&B'}
                      </h3>
                    </div>
                    <button
                      onClick={() => handleIrParaDevolucao(saida.id)}
                      className="bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-xs font-semibold px-3 py-1.5 rounded-lg border border-indigo-700/50 transition-colors flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Conferir Retorno
                    </button>
                  </div>

                  <div className="text-xs text-slate-400 space-y-1">
                    <p className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      Responsável: <span className="text-slate-200 font-medium">{saida.responsavelNome}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      Data Saída: <span className="text-slate-200">{saida.dataSaida}</span>
                      {saida.previsaoDevolucao && (
                        <span className="text-amber-400"> (Retorno Previsto: {saida.previsaoDevolucao})</span>
                      )}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-[11px] text-slate-400 font-semibold block mb-1.5">
                      Equipamentos nesta saída ({itens.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {itens.map((it) => (
                        <span
                          key={it.id}
                          className="font-mono text-[10px] bg-slate-950 border border-slate-800 text-slate-300 px-2 py-1 rounded"
                        >
                          {it.codigoEquipamento}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tabela de Equipamentos Individuais em Campo */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                Lista Detalhada de Patrimônios em Campo ({equipamentosEmCampo.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Código MB</th>
                    <th className="px-4 py-3">Equipamento</th>
                    <th className="px-4 py-3">Obra Alocada</th>
                    <th className="px-4 py-3">Responsável</th>
                    <th className="px-4 py-3">Serial</th>
                    <th className="px-4 py-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {equipamentosEmCampo.map((eq) => (
                    <tr key={eq.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-blue-400">
                        {eq.codigo}
                      </td>
                      <td className="px-4 py-3 font-semibold text-white">
                        {eq.nome}
                        <span className="block text-[10px] text-slate-500 font-normal">{eq.categoria}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-200">
                        {eq.obraAtualNome || 'Obra Geral'}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {eq.responsavelAtualNome || '-'}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-400">
                        {eq.numeroSerie || '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setActiveView('devolucao')}
                          className="text-xs bg-slate-800 hover:bg-slate-700 text-blue-300 px-2.5 py-1 rounded transition-colors"
                        >
                          Devolver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
