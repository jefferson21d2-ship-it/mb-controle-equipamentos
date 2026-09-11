import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  HelpCircle,
  QrCode,
  Building2,
  Calendar,
  Wrench,
  Check,
  ArrowRight,
  Truck,
  User,
  Search,
  Filter,
  Camera,
  History,
  ShieldCheck,
  ChevronRight,
  Box,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Saida, SaidaItem, EstadoRetorno } from '../../types';
import { DevolucaoItemModal } from './DevolucaoItemModal';
import { DevolucaoAuditoriaModal } from './DevolucaoAuditoriaModal';
import { extractCodigoMB } from '../../utils/qrCodeGenerator';

export const DevolucaoView: React.FC = () => {
  const {
    db,
    saidaParaDevolucaoId,
    setSaidaParaDevolucaoId,
    openQrScanner,
    setActiveView,
    concluirDevolucaoSaida,
  } = useApp();

  // Saídas ativas em campo (PROMPT 6: "Mostrar todas as saídas EM CAMPO")
  const saidasEmCampo = db.saidas.filter(
    (s) =>
      s.status === 'Em Campo' ||
      s.status === 'Liberado para Campo' ||
      s.status === 'Devolvido Parcial'
  );

  // Saídas concluídas para visualização de histórico auditado ("Nunca apagar registros...")
  const saidasConcluidas = db.saidas.filter(
    (s) => s.status === 'Devolvido'
  );

  const [abaVisualizacao, setAbaVisualizacao] = useState<'em_campo' | 'concluidas'>('em_campo');
  const [selectedSaidaId, setSelectedSaidaId] = useState<string>('');
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroStatusItem, setFiltroStatusItem] = useState<
    'todos' | 'pendentes' | 'devolvidos' | 'avariados' | 'nao_localizados'
  >('todos');

  // Modal de Inspeção Individual do Item
  const [inspecaoModalOpen, setInspecaoModalOpen] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState<SaidaItem | null>(null);

  // Modal de Auditoria de Movimentações
  const [auditoriaModalOpen, setAuditoriaModalOpen] = useState(false);

  // Feedback de conclusão
  const [isConcluindo, setIsConcluindo] = useState(false);
  const [conclusaoMsg, setConclusaoMsg] = useState<string | null>(null);

  // Input de código manual / busca rápida
  const [codigoBuscaRapida, setCodigoBuscaRapida] = useState('');
  const [buscaErro, setBuscaErro] = useState<string | null>(null);

  // Auto-selecionar saída se veio de outra view via saidaParaDevolucaoId
  useEffect(() => {
    if (saidaParaDevolucaoId) {
      setSelectedSaidaId(saidaParaDevolucaoId);
    } else if (saidasEmCampo.length > 0 && !selectedSaidaId) {
      // Pré-seleciona a primeira saída ativa (ex: SAI-2026-001)
      setSelectedSaidaId(saidasEmCampo[0].id);
    }
  }, [saidaParaDevolucaoId, saidasEmCampo]);

  const selectedSaida = db.saidas.find((s) => s.id === selectedSaidaId);
  const itensDaSaida = selectedSaida
    ? db.saidaItens.filter((i) => i.saidaId === selectedSaida.id)
    : [];

  // Cálculos de Progresso (PROMPT 6: "Mostrar progresso: 14/17 devolvidos.")
  const totalItens = itensDaSaida.length;
  const itensDevolvidos = itensDaSaida.filter((i) => i.devolvido);
  const totalDevolvidos = itensDevolvidos.length;
  const percentualConcluido =
    totalItens > 0 ? Math.round((totalDevolvidos / totalItens) * 100) : 0;

  const totalOk = itensDaSaida.filter((i) => i.estadoRetorno === 'OK').length;
  const totalDesgaste = itensDaSaida.filter(
    (i) => i.estadoRetorno === 'DESGASTE NORMAL'
  ).length;
  const totalAvariado = itensDaSaida.filter(
    (i) => i.estadoRetorno === 'AVARIADO'
  ).length;
  const totalNaoLocalizado = itensDaSaida.filter(
    (i) => i.estadoRetorno === 'NÃO LOCALIZADO'
  ).length;
  const totalPendentes = totalItens - totalDevolvidos;

  // Filtragem dos itens na lista
  const itensFiltrados = itensDaSaida.filter((item) => {
    if (filtroTexto.trim()) {
      const q = filtroTexto.toLowerCase();
      const matchCod = item.codigoEquipamento.toLowerCase().includes(q);
      const matchNome = (item.nomeEquipamento || '').toLowerCase().includes(q);
      if (!matchCod && !matchNome) return false;
    }

    if (filtroStatusItem === 'pendentes') return !item.devolvido;
    if (filtroStatusItem === 'devolvidos') return item.devolvido;
    if (filtroStatusItem === 'avariados') return item.estadoRetorno === 'AVARIADO';
    if (filtroStatusItem === 'nao_localizados') return item.estadoRetorno === 'NÃO LOCALIZADO';

    return true;
  });

  // Ação ao ler QR code com a câmera
  const handleScanQr = () => {
    if (!selectedSaida) return;

    openQrScanner({
      mode: 'devolucao_checklist',
      saidaId: selectedSaida.id,
      onSuccess: (codigoCru) => {
        const codigoMB = extractCodigoMB(codigoCru);
        const itemEncontrado = itensDaSaida.find(
          (i) => i.codigoEquipamento.toUpperCase() === codigoMB.toUpperCase()
        );

        if (itemEncontrado) {
          setItemSelecionado(itemEncontrado);
          setInspecaoModalOpen(true);
        } else {
          setBuscaErro(`Código ${codigoMB} não pertence a esta saída.`);
          setTimeout(() => setBuscaErro(null), 4000);
        }
      },
    });
  };

  // Ação de busca manual rápida de código
  const handleBuscarCodigoManual = (e: React.FormEvent) => {
    e.preventDefault();
    setBuscaErro(null);

    const cod = extractCodigoMB(codigoBuscaRapida.trim());
    if (!cod) return;

    const itemEncontrado = itensDaSaida.find(
      (i) => i.codigoEquipamento.toUpperCase() === cod.toUpperCase()
    );

    if (itemEncontrado) {
      setItemSelecionado(itemEncontrado);
      setInspecaoModalOpen(true);
      setCodigoBuscaRapida('');
    } else {
      setBuscaErro(`Equipamento "${cod}" não encontrado nesta saída.`);
    }
  };

  // Conclusão formal da devolução
  const handleFinalizarSaida = async () => {
    if (!selectedSaida) return;
    setIsConcluindo(true);
    setConclusaoMsg(null);

    try {
      await concluirDevolucaoSaida(
        selectedSaida.id,
        `Conferência de retorno concluída com ${totalDevolvidos}/${totalItens} itens processados.`
      );
      setConclusaoMsg('Devolução concluída com sucesso! Os registros foram arquivados e auditados.');
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setIsConcluindo(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
      {/* Header Superior */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-950 border border-indigo-800 text-indigo-400 flex items-center justify-center">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Devolução e Manutenção
              </h1>
              <p className="text-xs text-slate-400">
                Conferência de retorno por QR Code, estados de inspeção, auditoria e manutenção técnica.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {selectedSaida && (
            <button
              onClick={() => setAuditoriaModalOpen(true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-1.5 border border-slate-700 transition-colors"
            >
              <History className="w-4 h-4 text-indigo-400" />
              Auditoria da Saída
            </button>
          )}

          <button
            onClick={handleScanQr}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-md shadow-indigo-950/40"
          >
            <Camera className="w-4 h-4" />
            Escanear QR Code
          </button>
        </div>
      </div>

      {/* Navegação entre Saídas em Campo e Histórico Concluído */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
        <button
          onClick={() => setAbaVisualizacao('em_campo')}
          className={`text-xs font-bold px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-2 ${
            abaVisualizacao === 'em_campo'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Truck className="w-4 h-4" />
          Saídas em Campo ({saidasEmCampo.length})
        </button>

        <button
          onClick={() => setAbaVisualizacao('concluidas')}
          className={`text-xs font-bold px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-2 ${
            abaVisualizacao === 'concluidas'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          Devoluções Concluídas / Histórico ({saidasConcluidas.length})
        </button>
      </div>

      {/* Grid de Saídas Disponíveis para Seleção */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {abaVisualizacao === 'em_campo'
              ? 'Selecione a Saída para Conferir Retorno'
              : 'Histórico de Saídas Concluídas (Imutável)'}
          </span>
          <span className="text-[11px] text-slate-500">
            Regra: Nunca apagar registros concluídos
          </span>
        </div>

        {(abaVisualizacao === 'em_campo' ? saidasEmCampo : saidasConcluidas).length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center max-w-md mx-auto space-y-2">
            <Truck className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-white">Nenhuma saída encontrada nesta categoria</h3>
            <p className="text-xs text-slate-400">
              {abaVisualizacao === 'em_campo'
                ? 'Não há saídas ativas em campo no momento.'
                : 'Nenhuma devolução concluída arquivada.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {(abaVisualizacao === 'em_campo' ? saidasEmCampo : saidasConcluidas).map((s) => {
              const itens = db.saidaItens.filter((i) => i.saidaId === s.id);
              const devolvidos = itens.filter((i) => i.devolvido).length;
              const isSelected = selectedSaidaId === s.id;
              const pct = itens.length > 0 ? Math.round((devolvidos / itens.length) * 100) : 0;

              return (
                <div
                  key={s.id}
                  onClick={() => {
                    setSelectedSaidaId(s.id);
                    setSaidaParaDevolucaoId(s.id);
                  }}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-2.5 relative ${
                    isSelected
                      ? 'bg-blue-950/40 border-blue-500 shadow-md shadow-blue-950/30'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950/90 border border-blue-900 px-2 py-0.5 rounded">
                      {s.codigo}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        s.status === 'Devolvido'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : s.status === 'Devolvido Parcial'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-blue-900/60 text-blue-300 border border-blue-800'
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-white line-clamp-1">{s.obraNome}</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Resp: <strong className="text-slate-300">{s.responsavelNome}</strong>
                    </p>
                    {s.kitNome && (
                      <p className="text-[10px] text-indigo-300 font-medium mt-0.5">
                        Kit: {s.kitNome}
                      </p>
                    )}
                  </div>

                  {/* Progresso: 14/17 devolvidos */}
                  <div className="pt-2 border-t border-slate-800/80 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-300">
                        Progresso de Devolução:
                      </span>
                      <span className="font-mono font-bold text-white">
                        {devolvidos}/{itens.length} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full transition-all duration-300 ${
                          pct === 100
                            ? 'bg-emerald-500'
                            : pct > 0
                            ? 'bg-blue-500'
                            : 'bg-slate-700'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Área Detalhada da Saída Selecionada */}
      {selectedSaida && (
        <div className="space-y-5 pt-2">
          {/* Cartão de Resumo e Métricas Principais (PROMPT 6) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-blue-400 bg-blue-950 px-2.5 py-0.5 rounded border border-blue-900">
                    {selectedSaida.codigo}
                  </span>
                  <h2 className="text-base font-bold text-white">
                    {selectedSaida.obraNome}
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Responsável: <span className="text-slate-200 font-semibold">{selectedSaida.responsavelNome}</span> • Saída registrada em:{' '}
                  <span className="text-slate-200">
                    {new Date(selectedSaida.dataSaida).toLocaleString('pt-BR')}
                  </span>
                </p>
              </div>

              {/* Botão de Finalização */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleFinalizarSaida}
                  disabled={isConcluindo}
                  className={`text-xs font-bold px-4 py-2.5 rounded-xl shadow flex items-center gap-1.5 transition-all ${
                    totalDevolvidos === totalItens && totalItens > 0
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white ring-2 ring-emerald-400/50'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  {isConcluindo ? 'Gravando...' : 'Concluir Devolução da Saída'}
                </button>
              </div>
            </div>

            {conclusaoMsg && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{conclusaoMsg}</span>
              </div>
            )}

            {/* PROMPT 6: "Mostrar progresso: 14/17 devolvidos." */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Status Geral da Conferência
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-2xl sm:text-3xl font-black text-white font-mono">
                      {totalDevolvidos}/{totalItens} devolvidos
                    </span>
                    <span className="text-xs font-bold text-blue-400">
                      ({percentualConcluido}%)
                    </span>
                  </div>
                </div>

                {/* Badges de Contagem de Estados */}
                <div className="flex flex-wrap gap-2">
                  <div className="px-2.5 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>OK: {totalOk}</span>
                  </div>
                  <div className="px-2.5 py-1.5 rounded-xl bg-blue-950/60 border border-blue-800/80 text-blue-300 text-xs font-semibold flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Desgaste: {totalDesgaste}</span>
                  </div>
                  <div className="px-2.5 py-1.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Avariado: {totalAvariado}</span>
                  </div>
                  <div className="px-2.5 py-1.5 rounded-xl bg-amber-950/60 border border-amber-800/80 text-amber-300 text-xs font-semibold flex items-center gap-1.5">
                    <AlertOctagon className="w-3.5 h-3.5" />
                    <span>Não Localizado: {totalNaoLocalizado}</span>
                  </div>
                  <div className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-xs font-semibold flex items-center gap-1.5">
                    <span>Pendentes: {totalPendentes}</span>
                  </div>
                </div>
              </div>

              {/* Barra de Progresso Segmentada */}
              <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 flex">
                <div
                  style={{ width: `${(totalOk / (totalItens || 1)) * 100}%` }}
                  className="h-full bg-emerald-500"
                  title={`OK: ${totalOk}`}
                />
                <div
                  style={{ width: `${(totalDesgaste / (totalItens || 1)) * 100}%` }}
                  className="h-full bg-blue-500"
                  title={`Desgaste Normal: ${totalDesgaste}`}
                />
                <div
                  style={{ width: `${(totalAvariado / (totalItens || 1)) * 100}%` }}
                  className="h-full bg-rose-500"
                  title={`Avariado: ${totalAvariado}`}
                />
                <div
                  style={{ width: `${(totalNaoLocalizado / (totalItens || 1)) * 100}%` }}
                  className="h-full bg-amber-500"
                  title={`Não Localizado: ${totalNaoLocalizado}`}
                />
              </div>
            </div>

            {/* Barra de Ação Rápida de Leitura QR ou Código Manual */}
            <div className="pt-2 border-t border-slate-800/80">
              <form
                onSubmit={handleBuscarCodigoManual}
                className="flex flex-col sm:flex-row items-center gap-2.5"
              >
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={codigoBuscaRapida}
                    onChange={(e) => setCodigoBuscaRapida(e.target.value)}
                    placeholder="Escanear ou digitar Código MB (ex: MB-BAT-008)..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-700 transition-colors shrink-0"
                >
                  Localizar e Inspecionar
                </button>

                <button
                  type="button"
                  onClick={handleScanQr}
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shrink-0"
                >
                  <Camera className="w-4 h-4" />
                  Abrir Scanner
                </button>
              </form>

              {buscaErro && (
                <p className="text-xs text-rose-400 mt-2 font-medium">
                  {buscaErro}
                </p>
              )}
            </div>
          </div>

          {/* Filtros e Lista de Equipamentos */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden space-y-4 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Box className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">
                  Equipamentos Desta Saída ({itensDaSaida.length})
                </h3>
              </div>

              {/* Filtros de Status */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setFiltroStatusItem('todos')}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                    filtroStatusItem === 'todos'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  Todos ({itensDaSaida.length})
                </button>
                <button
                  onClick={() => setFiltroStatusItem('pendentes')}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                    filtroStatusItem === 'pendentes'
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  Pendentes ({totalPendentes})
                </button>
                <button
                  onClick={() => setFiltroStatusItem('devolvidos')}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                    filtroStatusItem === 'devolvidos'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  Devolvidos ({totalDevolvidos})
                </button>
                <button
                  onClick={() => setFiltroStatusItem('avariados')}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                    filtroStatusItem === 'avariados'
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  Avariados ({totalAvariado})
                </button>
              </div>
            </div>

            {/* Lista dos Itens */}
            <div className="space-y-2.5">
              {itensFiltrados.map((item) => {
                const eq = db.equipamentos.find(
                  (e) => e.id === item.equipamentoId || e.codigo === item.codigoEquipamento
                );

                const isDevolvido = item.devolvido;
                const estado = item.estadoRetorno;

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isDevolvido
                        ? estado === 'AVARIADO'
                          ? 'bg-rose-950/20 border-rose-800/60'
                          : estado === 'NÃO LOCALIZADO'
                          ? 'bg-amber-950/20 border-amber-800/60'
                          : 'bg-slate-950/70 border-slate-800/80'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                          isDevolvido
                            ? estado === 'AVARIADO'
                              ? 'bg-rose-950 text-rose-400 border border-rose-800'
                              : estado === 'NÃO LOCALIZADO'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800'
                              : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {isDevolvido ? (
                          estado === 'AVARIADO' ? (
                            <AlertTriangle className="w-5 h-5" />
                          ) : estado === 'NÃO LOCALIZADO' ? (
                            <AlertOctagon className="w-5 h-5" />
                          ) : (
                            <CheckCircle2 className="w-5 h-5" />
                          )
                        ) : (
                          <RotateCcw className="w-5 h-5" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-900">
                            {item.codigoEquipamento}
                          </span>
                          <span className="text-xs font-bold text-white">
                            {item.nomeEquipamento || eq?.nome || 'Equipamento'}
                          </span>
                          <span className="text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.2 rounded">
                            {item.categoriaEquipamento || eq?.categoria}
                          </span>
                        </div>

                        {/* Status do Retorno */}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {isDevolvido ? (
                            <>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                  estado === 'OK'
                                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                    : estado === 'DESGASTE NORMAL'
                                    ? 'bg-blue-950 text-blue-300 border-blue-800'
                                    : estado === 'AVARIADO'
                                    ? 'bg-rose-950 text-rose-300 border-rose-800'
                                    : 'bg-amber-950 text-amber-300 border-amber-800'
                                }`}
                              >
                                {estado === 'AVARIADO'
                                  ? 'AVARIADO → MANUTENÇÃO'
                                  : estado === 'NÃO LOCALIZADO'
                                  ? 'NÃO LOCALIZADO → RETORNO PENDENTE'
                                  : `${estado} → DISPONÍVEL`}
                              </span>

                              {item.dataHoraDevolucao && (
                                <span className="text-[10px] text-slate-400">
                                  Conferido em:{' '}
                                  {new Date(item.dataHoraDevolucao).toLocaleTimeString('pt-BR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              )}

                              {item.auditoriaUsuario && (
                                <span className="text-[10px] text-slate-500">
                                  por {item.auditoriaUsuario}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-[10px] bg-slate-900 text-amber-400 px-2 py-0.5 rounded border border-amber-900/50 font-semibold">
                              Pendente de Leitura QR
                            </span>
                          )}
                        </div>

                        {/* Observação */}
                        {item.observacaoDevolucao && (
                          <p className="text-[11px] text-slate-300 italic bg-slate-900/60 p-1.5 rounded border border-slate-800/80">
                            "{item.observacaoDevolucao}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Botão de Ação */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {item.fotoDevolucaoUrl && (
                        <img
                          src={item.fotoDevolucaoUrl}
                          alt="Foto"
                          className="w-9 h-9 object-cover rounded-lg border border-slate-700 cursor-pointer"
                          onClick={() => {
                            setItemSelecionado(item);
                            setInspecaoModalOpen(true);
                          }}
                        />
                      )}

                      <button
                        onClick={() => {
                          setItemSelecionado(item);
                          setInspecaoModalOpen(true);
                        }}
                        className={`text-xs font-semibold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                          isDevolvido
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                        }`}
                      >
                        {isDevolvido ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Editar Estado
                          </>
                        ) : (
                          <>
                            <QrCode className="w-3.5 h-3.5" />
                            Conferir Retorno
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Inspeção Individual do Item */}
      {inspecaoModalOpen && itemSelecionado && selectedSaida && (
        <DevolucaoItemModal
          isOpen={inspecaoModalOpen}
          onClose={() => {
            setInspecaoModalOpen(false);
            setItemSelecionado(null);
          }}
          item={itemSelecionado}
          equipamento={db.equipamentos.find(
            (e) =>
              e.id === itemSelecionado.equipamentoId ||
              e.codigo === itemSelecionado.codigoEquipamento
          )}
          saida={selectedSaida}
          onSuccess={() => {
            // Atualização reativa já disparada pelo AppContext
          }}
        />
      )}

      {/* Modal de Auditoria Completa das Movimentações */}
      {auditoriaModalOpen && selectedSaida && (
        <DevolucaoAuditoriaModal
          isOpen={auditoriaModalOpen}
          onClose={() => setAuditoriaModalOpen(false)}
          saida={selectedSaida}
          movimentacoes={db.movimentacoes || []}
        />
      )}
    </div>
  );
};
