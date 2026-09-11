import React, { useState } from 'react';
import {
  Wrench,
  PlusCircle,
  CheckCircle2,
  Calendar,
  DollarSign,
  AlertTriangle,
  Building,
  Box,
  Check,
  User,
  Image as ImageIcon,
  Tag,
  Clock,
  CheckCircle,
  FileText,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Manutencao, TipoManutencao, PrioridadeManutencao } from '../../types';

export const ManutencaoView: React.FC = () => {
  const { db, registrarManutencao, concluirManutencao, currentUser } = useApp();

  const [modalOpen, setModalOpen] = useState(false);
  const [equipamentoId, setEquipamentoId] = useState('');
  const [tipo, setTipo] = useState<TipoManutencao>('Corretiva');
  const [prioridade, setPrioridade] = useState<PrioridadeManutencao>('Alta');
  const [responsavel, setResponsavel] = useState(currentUser?.nome || 'Operador Técnico');
  const [descricao, setDescricao] = useState('');
  const [fornecedor, setFornecedor] = useState('');
  const [custo, setCusto] = useState('');
  const [previsaoRetorno, setPrevisaoRetorno] = useState('');
  const [conclusaoPlano, setConclusaoPlano] = useState('');
  const [fotoModalUrl, setFotoModalUrl] = useState<string | null>(null);

  const [activeFilter, setActiveFilter] = useState<'all' | 'Em Andamento' | 'Concluída'>('Em Andamento');

  const filteredManutencoes = db.manutencoes.filter((m) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'Em Andamento') {
      return m.status === 'Em Andamento' || m.status === 'Aberta' || m.status === 'Aguardando Peça';
    }
    return m.status === 'Concluída';
  });

  const handleSalvarManutencao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipamentoId || !descricao) {
      alert('Selecione o equipamento e descreva o motivo da manutenção.');
      return;
    }

    const eq = db.equipamentos.find((e) => e.id === equipamentoId);
    if (!eq) return;

    const agora = new Date().toISOString();

    await registrarManutencao({
      equipamentoId,
      codigoEquipamento: eq.codigo,
      nomeEquipamento: eq.nome,
      abertura: agora,
      responsavel: responsavel.trim() || currentUser?.nome || 'Operador M&B',
      descricao: descricao.trim(),
      prioridade,
      fornecedor: fornecedor.trim() || undefined,
      custo: custo ? Number(custo) : undefined,
      status: 'Em Andamento',
      conclusao: conclusaoPlano.trim() || undefined,
      tipo,
      dataEntrada: agora.split('T')[0],
      previsaoRetorno: previsaoRetorno || undefined,
    });

    setModalOpen(false);
    setDescricao('');
    setFornecedor('');
    setCusto('');
    setPrevisaoRetorno('');
    setEquipamentoId('');
    setConclusaoPlano('');
  };

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-950 border border-amber-800 text-amber-400 flex items-center justify-center">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Controle de Manutenção e Reparos
              </h1>
              <p className="text-xs text-slate-400">
                Ordens geradas por avaria em devolução de campo, revisões preventivas e calibração.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-md transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          Abrir Ordem Manual
        </button>
      </div>

      {/* Filtros e Métricas */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 text-xs">
          <button
            onClick={() => setActiveFilter('Em Andamento')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all ${
              activeFilter === 'Em Andamento'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Em Aberto / Oficina ({db.manutencoes.filter((m) => m.status !== 'Concluída').length})
          </button>
          <button
            onClick={() => setActiveFilter('Concluída')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all ${
              activeFilter === 'Concluída'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Concluídas ({db.manutencoes.filter((m) => m.status === 'Concluída').length})
          </button>
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all ${
              activeFilter === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Todas ({db.manutencoes.length})
          </button>
        </div>

        <span className="text-[11px] text-slate-500">
          Total de ordens registradas: <strong className="text-slate-300">{db.manutencoes.length}</strong>
        </span>
      </div>

      {/* Grid de Ordens de Manutenção (PROMPT 6) */}
      {filteredManutencoes.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center max-w-md mx-auto space-y-3">
          <Wrench className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-white">Nenhum registro encontrado</h3>
          <p className="text-xs text-slate-400">
            Não há manutenções cadastradas nesta categoria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredManutencoes.map((item) => {
            const isEmAndamento = item.status !== 'Concluída';
            const prioridadeUpper = (item.prioridade || 'Média').toUpperCase();
            const dataAberturaFmt = item.abertura
              ? new Date(item.abertura).toLocaleString('pt-BR')
              : item.dataEntrada || '-';

            return (
              <div
                key={item.id}
                className={`bg-slate-900 border rounded-2xl p-4.5 space-y-3.5 flex flex-col justify-between transition-all ${
                  isEmAndamento
                    ? 'border-slate-800 hover:border-slate-700 shadow-md'
                    : 'border-slate-800/60 opacity-90'
                }`}
              >
                <div className="space-y-3">
                  {/* Top: Código + Prioridade + Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-900">
                        {item.codigoEquipamento}
                      </span>
                      {item.prioridade && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            prioridadeUpper === 'URGENTE' || prioridadeUpper === 'CRÍTICA'
                              ? 'bg-rose-950 text-rose-300 border-rose-800'
                              : prioridadeUpper === 'ALTA'
                              ? 'bg-amber-950 text-amber-300 border-amber-800'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {item.prioridade}
                        </span>
                      )}
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isEmAndamento
                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                          : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  {/* Nome do Ativo */}
                  <div>
                    <h3 className="text-xs font-bold text-white line-clamp-1">
                      {item.nomeEquipamento || 'Equipamento M&B'}
                    </h3>
                    <span className="text-[10px] text-slate-400">
                      Ordem: <span className="font-mono text-slate-300">{item.id}</span>
                    </span>
                  </div>

                  {/* Descrição da Avaria */}
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Descrição da Avaria / Laudo:
                    </span>
                    <p className="text-xs text-slate-200 leading-relaxed">
                      {item.descricao}
                    </p>
                  </div>

                  {/* Foto de Avaria (se houver) */}
                  {item.foto && (
                    <div className="flex items-center gap-2">
                      <img
                        src={item.foto}
                        alt="Avaria"
                        onClick={() => setFotoModalUrl(item.foto || null)}
                        className="w-14 h-14 object-cover rounded-xl border border-slate-700 cursor-pointer hover:opacity-80 transition-opacity"
                      />
                      <span className="text-[11px] text-slate-400">
                        Foto da avaria anexada na devolução
                      </span>
                    </div>
                  )}

                  {/* Detalhes de Abertura, Responsável, Fornecedor e Custo */}
                  <div className="text-[11px] text-slate-400 space-y-1 pt-1 border-t border-slate-800/80">
                    <p className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      Abertura: <span className="text-slate-200">{dataAberturaFmt}</span>
                    </p>
                    {item.responsavel && (
                      <p className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        Responsável: <span className="text-slate-200">{item.responsavel}</span>
                      </p>
                    )}
                    {item.fornecedor && (
                      <p className="flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-500" />
                        Oficina/Fornecedor:{' '}
                        <span className="text-slate-200 font-medium">{item.fornecedor}</span>
                      </p>
                    )}
                    {item.custo !== undefined && item.custo > 0 && (
                      <p className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                        <DollarSign className="w-3.5 h-3.5" />
                        Custo Estimado: R$ {item.custo.toFixed(2)}
                      </p>
                    )}
                    {item.conclusao && (
                      <p className="flex items-start gap-1.5 text-slate-300 bg-slate-950/60 p-2 rounded-lg border border-slate-850 mt-1">
                        <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                        <span>Conclusão: {item.conclusao}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Ação de Conclusão */}
                {isEmAndamento && (
                  <div className="pt-2 border-t border-slate-800 flex justify-end">
                    <button
                      onClick={() => concluirManutencao(item.id)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Concluir e Liberar para Estoque
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Foto Ampliada */}
      {fotoModalUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fadeIn"
          onClick={() => setFotoModalUrl(null)}
        >
          <div className="relative max-w-xl max-h-[85vh] p-2 bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden">
            <img
              src={fotoModalUrl}
              alt="Evidência Ampliada"
              className="max-h-[75vh] w-auto object-contain rounded-xl"
            />
            <p className="text-center text-xs text-slate-400 mt-2">
              Clique fora para fechar a visualização
            </p>
          </div>
        </div>
      )}

      {/* Modal Registrar Manutenção Manual */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-400" />
                Registrar Ordem de Manutenção / Calibração
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSalvarManutencao} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Equipamento <span className="text-rose-400">*</span>
                </label>
                <select
                  value={equipamentoId}
                  onChange={(e) => setEquipamentoId(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="">Selecione o equipamento...</option>
                  {db.equipamentos.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.codigo} - {eq.nome} ({eq.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Prioridade</label>
                  <select
                    value={prioridade}
                    onChange={(e) => setPrioridade(e.target.value as PrioridadeManutencao)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Tipo</label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as TipoManutencao)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="Corretiva">Corretiva</option>
                    <option value="Preventiva">Preventiva</option>
                    <option value="Calibração">Calibração</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Responsável pela Abertura
                </label>
                <input
                  type="text"
                  value={responsavel}
                  onChange={(e) => setResponsavel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Descrição do Defeito / Serviço <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Descreva o problema ou serviços a serem executados..."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Oficina / Fornecedor
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Assistência Autorizada DJI"
                    value={fornecedor}
                    onChange={(e) => setFornecedor(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Custo Estimado (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={custo}
                    onChange={(e) => setCusto(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Conclusão / Observações
                </label>
                <input
                  type="text"
                  placeholder="Ex: Encaminhado para substituição do braço esquerdo"
                  value={conclusaoPlano}
                  onChange={(e) => setConclusaoPlano(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="bg-slate-800 text-slate-300 px-4 py-2 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl"
                >
                  Salvar Manutenção
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
