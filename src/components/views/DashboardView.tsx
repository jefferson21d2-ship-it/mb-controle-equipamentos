import React, { useState } from 'react';
import {
  LayoutDashboard,
  Box,
  Truck,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  RotateCcw,
  QrCode,
  ArrowRight,
  Sheet,
  Layers,
  History,
  Clock,
  MapPin,
  Calendar,
  Activity,
  User,
  ShieldCheck,
  Printer,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { EtiquetasPrintModal } from '../EtiquetasPrintModal';

export const DashboardView: React.FC = () => {
  const {
    db,
    totalEquipamentos,
    setActiveView,
    setConnectionModalOpen,
    openQrScanner,
    isConnected,
    lastSyncTime,
  } = useApp();

  const [printModalOpen, setPrintModalOpen] = useState(false);

  // 1. Indicadores Solicitados
  const disponiveis = db.equipamentos.filter(
    (e) => e.status === 'DISPONÍVEL' || e.status === 'Disponível'
  ).length;

  const emCampo = db.equipamentos.filter(
    (e) => e.status === 'EM CAMPO' || e.status === 'Em Campo'
  ).length;

  const emManutencao = db.equipamentos.filter(
    (e) =>
      e.status === 'MANUTENÇÃO' ||
      e.status === 'Manutenção' ||
      e.status === 'Calibração'
  ).length;

  const retornoPendente = db.equipamentos.filter(
    (e) => e.status === 'RETORNO PENDENTE'
  ).length;

  // Saídas em andamento (Em Campo, Liberado para Campo ou Aguardando Checklist)
  const saidasEmAndamento = db.saidas.filter(
    (s) =>
      s.status === 'Em Campo' ||
      s.status === 'Liberado para Campo' ||
      s.status === 'Aguardando Checklist'
  );

  // Categorias
  const categoriesCount = db.equipamentos.reduce<Record<string, number>>((acc, eq) => {
    const cat = eq.categoria || 'Outros';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  // 8 Ações Principais Grandes
  const acoesPrincipais = [
    {
      id: 'nova-saida',
      title: 'Nova Saída',
      subtitle: 'Registrar saída para obra',
      icon: PlusCircle,
      iconBg: 'bg-blue-600',
      iconColor: 'text-white',
      borderHover: 'hover:border-blue-600/80',
      action: () => setActiveView('nova-saida'),
    },
    {
      id: 'escanear-qr',
      title: 'Escanear QR',
      subtitle: 'Leitura de código e checklist',
      icon: QrCode,
      iconBg: 'bg-emerald-600',
      iconColor: 'text-white',
      borderHover: 'hover:border-emerald-600/80',
      action: () => openQrScanner({ mode: 'lookup' }),
    },
    {
      id: 'equipamentos',
      title: 'Equipamentos',
      subtitle: 'Catálogo dos 35 patrimônios',
      icon: Box,
      iconBg: 'bg-slate-800',
      iconColor: 'text-blue-400',
      borderHover: 'hover:border-blue-500/80',
      action: () => setActiveView('equipamentos'),
    },
    {
      id: 'em-campo',
      title: 'Em Campo',
      subtitle: `${emCampo} itens alocados`,
      icon: Truck,
      iconBg: 'bg-sky-600',
      iconColor: 'text-white',
      borderHover: 'hover:border-sky-600/80',
      action: () => setActiveView('em-campo'),
    },
    {
      id: 'devolucao',
      title: 'Devolução',
      subtitle: 'Inspeção e retorno de obra',
      icon: RotateCcw,
      iconBg: 'bg-indigo-600',
      iconColor: 'text-white',
      borderHover: 'hover:border-indigo-600/80',
      action: () => setActiveView('devolucao'),
    },
    {
      id: 'kits',
      title: 'Kits',
      subtitle: `${db.kits.length} conjuntos operacionais`,
      icon: Layers,
      iconBg: 'bg-purple-600',
      iconColor: 'text-white',
      borderHover: 'hover:border-purple-600/80',
      action: () => setActiveView('kits'),
    },
    {
      id: 'manutencao',
      title: 'Manutenção',
      subtitle: `${emManutencao} preventivas/calibração`,
      icon: Wrench,
      iconBg: 'bg-amber-600',
      iconColor: 'text-white',
      borderHover: 'hover:border-amber-600/80',
      action: () => setActiveView('manutencao'),
    },
    {
      id: 'historico',
      title: 'Histórico',
      subtitle: 'Auditoria de saídas e retornos',
      icon: History,
      iconBg: 'bg-slate-700',
      iconColor: 'text-slate-200',
      borderHover: 'hover:border-slate-500/80',
      action: () => setActiveView('historico'),
    },
  ];

  return (
    <div className="space-y-6 pb-20 lg:pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
      {/* Top Header & Contexto Operacional */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">
              M&B Controle de Equipamentos
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800">
              Palmas - TO
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Painel operacional de rastreabilidade de drones, GNSS, estações e acessórios de topografia.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setPrintModalOpen(true)}
            className="bg-slate-800/90 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Printer className="w-3.5 h-3.5 text-slate-300" />
            <span className="hidden sm:inline">Etiquetas QR</span>
          </button>

          <button
            onClick={() => setConnectionModalOpen(true)}
            className="bg-slate-800/90 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Sheet className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Google Sheets:</span>
            <span className={isConnected ? 'text-emerald-400' : 'text-slate-400'}>
              {isConnected ? 'Sincronizado' : 'Conectar API'}
            </span>
          </button>
        </div>
      </div>

      {/* 6 INDICADORES SOLICITADOS NO PROMPT 2 */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Indicadores do Inventário M&B
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Total de Equipamentos */}
          <div
            onClick={() => setActiveView('equipamentos')}
            className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all cursor-pointer shadow-sm group"
          >
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-xs font-medium">Total</span>
              <Box className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {totalEquipamentos}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Patrimônios reais</p>
          </div>

          {/* 2. Disponíveis */}
          <div
            onClick={() => setActiveView('equipamentos')}
            className="bg-slate-900 border border-slate-800 hover:border-emerald-800/80 rounded-2xl p-4 transition-all cursor-pointer shadow-sm group"
          >
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-xs font-medium">Disponíveis</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-400 tracking-tight">
              {disponiveis}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Prontos para saída</p>
          </div>

          {/* 3. Em Campo */}
          <div
            onClick={() => setActiveView('em-campo')}
            className="bg-slate-900 border border-slate-800 hover:border-blue-800/80 rounded-2xl p-4 transition-all cursor-pointer shadow-sm group"
          >
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-xs font-medium">Em Campo</span>
              <Truck className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-blue-400 tracking-tight">
              {emCampo}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Alocados em obras</p>
          </div>

          {/* 4. Manutenção */}
          <div
            onClick={() => setActiveView('manutencao')}
            className="bg-slate-900 border border-slate-800 hover:border-amber-800/80 rounded-2xl p-4 transition-all cursor-pointer shadow-sm group"
          >
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-xs font-medium">Manutenção</span>
              <Wrench className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-amber-400 tracking-tight">
              {emManutencao}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Calibração/Reparo</p>
          </div>

          {/* 5. Retorno Pendente */}
          <div
            onClick={() => setActiveView('em-campo')}
            className="bg-slate-900 border border-slate-800 hover:border-purple-800/80 rounded-2xl p-4 transition-all cursor-pointer shadow-sm group"
          >
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-xs font-medium">Retorno Pend.</span>
              <Clock className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-purple-400 tracking-tight">
              {retornoPendente}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Prazo de devolução</p>
          </div>

          {/* 6. Saídas em Andamento */}
          <div
            onClick={() => setActiveView('em-campo')}
            className="bg-slate-900 border border-slate-800 hover:border-cyan-800/80 rounded-2xl p-4 transition-all cursor-pointer shadow-sm group"
          >
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-xs font-medium">Saídas Ativas</span>
              <Activity className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-cyan-400 tracking-tight">
              {saidasEmAndamento.length}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Em andamento</p>
          </div>
        </div>
      </div>

      {/* AÇÕES PRINCIPAIS GRANDES (PROMPT 2 REQUISITO) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Ações Principais
          </h2>
          <span className="text-[11px] text-slate-500 font-medium">
            Fluxo completo de controle de patrimônio
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {acoesPrincipais.map((acao) => {
            const Icon = acao.icon;
            return (
              <button
                key={acao.id}
                onClick={acao.action}
                className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-slate-900 border border-slate-800 ${acao.borderHover} rounded-2xl text-left transition-all shadow-sm hover:shadow-md group active:scale-[0.98]`}
              >
                <div
                  className={`w-11 h-11 rounded-xl ${acao.iconBg} ${acao.iconColor} flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-bold text-white group-hover:text-blue-300 transition-colors truncate">
                    {acao.title}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {acao.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid: Saídas Ativas em Campo & Categorias de Equipamentos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1 & 2: Saídas em Andamento */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white tracking-tight">
                Saídas em Andamento ({saidasEmAndamento.length})
              </h3>
            </div>
            <button
              onClick={() => setActiveView('em-campo')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
            >
              Ver todas
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {saidasEmAndamento.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-slate-800 rounded-xl space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500/80 mx-auto" />
              <p className="text-xs text-slate-300 font-semibold">
                Todos os 35 equipamentos estão em base no momento.
              </p>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Inicie uma saída para mobilizar kits de drones Matrice, receptores Trimble ou estações D-RTK.
              </p>
              <button
                onClick={() => setActiveView('nova-saida')}
                className="mt-2 text-xs bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-xl inline-flex items-center gap-1.5 shadow"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Nova Saída de Equipamentos
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {saidasEmAndamento.slice(0, 4).map((saida) => (
                <div
                  key={saida.id}
                  className="bg-slate-800/50 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-blue-400 px-2 py-0.5 rounded bg-blue-950/80 border border-blue-900/60">
                        {saida.codigo}
                      </span>
                      <span className="text-xs font-bold text-white">
                        {saida.obraNome || 'Obra M&B'}
                      </span>
                      {saida.kitNome && (
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                          {saida.kitNome}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-500" />
                        {saida.responsavelNome || 'Operador'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        Saída: {saida.dataSaida}
                      </span>
                      {saida.previsaoDevolucao && (
                        <span className="text-purple-300 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Previsão: {saida.previsaoDevolucao}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveView('devolucao')}
                      className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-sm flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Devolver
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Coluna 3: Distribuição das Categorias M&B */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <Box className="w-4 h-4 text-blue-400" />
                Categorias M&B
              </h3>
              <span className="text-[11px] text-slate-400 font-semibold">
                {Object.keys(categoriesCount).length} grupos
              </span>
            </div>

            <div className="space-y-2">
              {Object.entries(categoriesCount).map(([cat, count]) => (
                <div
                  key={cat}
                  onClick={() => setActiveView('equipamentos')}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-800 text-xs transition-colors cursor-pointer"
                >
                  <span className="font-medium text-slate-300">{cat}</span>
                  <span className="font-mono font-bold text-blue-400 bg-blue-950/70 border border-blue-900/60 px-2 py-0.5 rounded-md">
                    {count} {count === 1 ? 'item' : 'itens'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              Patrimônio M&B Oficial
            </span>
            <span>35 equipamentos</span>
          </div>
        </div>
      </div>

      {/* Modal de Impressão de Etiquetas QR */}
      <EtiquetasPrintModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
      />
    </div>
  );
};
