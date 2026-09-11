import React from 'react';
import {
  X,
  History,
  ShieldCheck,
  User,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ArrowRight,
  Camera,
  Layers,
} from 'lucide-react';
import { Saida, Movimentacao } from '../../types';

interface DevolucaoAuditoriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  saida: Saida;
  movimentacoes: Movimentacao[];
}

export const DevolucaoAuditoriaModal: React.FC<DevolucaoAuditoriaModalProps> = ({
  isOpen,
  onClose,
  saida,
  movimentacoes,
}) => {
  if (!isOpen) return null;

  // Filtra movimentações vinculadas a esta saída
  const movsDestaSaida = movimentacoes
    .filter((m) => m.saidaId === saida.id || m.codigoSaida === saida.codigo)
    .sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-800 text-indigo-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white leading-tight">
                Auditoria e Histórico de Movimentações
              </h2>
              <p className="text-[11px] text-slate-400">
                Saída {saida.codigo} • {saida.obraNome}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">
                Total de Registros de Auditoria
              </span>
              <span className="font-bold text-white text-sm">
                {movsDestaSaida.length} eventos registrados
              </span>
            </div>
            <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800 px-2.5 py-1 rounded font-mono">
              Imutável • Nunca Apagar
            </span>
          </div>

          {movsDestaSaida.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">
              Nenhuma movimentação detalhada registrada para esta saída até o momento.
            </p>
          ) : (
            <div className="space-y-3">
              {movsDestaSaida.map((mov) => {
                const dataFormatada = new Date(mov.dataHora).toLocaleString('pt-BR');
                const isAvariado = mov.estadoRetorno === 'AVARIADO' || mov.tipo === 'MANUTENCAO_ABERTURA';
                const isNaoLocalizado = mov.estadoRetorno === 'NÃO LOCALIZADO' || mov.tipo === 'RETORNO_PENDENTE';
                const isOK = mov.estadoRetorno === 'OK' || mov.estadoRetorno === 'DESGASTE NORMAL';

                return (
                  <div
                    key={mov.id}
                    className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-900">
                            {mov.codigoEquipamento}
                          </span>
                          <span className="text-xs font-semibold text-white">
                            {mov.nomeEquipamento || 'Equipamento'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Evento: <strong className="text-slate-300">{mov.tipo}</strong>
                        </span>
                      </div>

                      {mov.estadoRetorno && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            isAvariado
                              ? 'bg-rose-950 text-rose-300 border-rose-800'
                              : isNaoLocalizado
                              ? 'bg-amber-950 text-amber-300 border-amber-800'
                              : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          }`}
                        >
                          {mov.estadoRetorno}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span>Status:</span>
                      <span className="font-mono text-slate-300 bg-slate-900 px-1.5 py-0.2 rounded">
                        {mov.statusAnterior || 'EM CAMPO'}
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-500" />
                      <span className="font-mono font-bold text-white bg-slate-800 px-1.5 py-0.2 rounded">
                        {mov.statusNovo}
                      </span>
                    </div>

                    {mov.observacoes && (
                      <p className="text-[11px] text-slate-300 bg-slate-900/70 p-2 rounded-lg border border-slate-800/80 italic">
                        "{mov.observacoes}"
                      </p>
                    )}

                    {mov.fotoUrl && (
                      <div className="inline-block mt-1">
                        <img
                          src={mov.fotoUrl}
                          alt="Evidência"
                          className="w-16 h-16 object-cover rounded-lg border border-slate-700"
                        />
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between pt-1 border-t border-slate-900 text-[10px] text-slate-500">
                      <span className="flex items-center gap-1 text-slate-400">
                        <User className="w-3 h-3 text-blue-400" />
                        {mov.usuarioNome || 'Operador M&B'}
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3" />
                        {dataFormatada}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
