import React, { useState } from 'react';
import {
  Layers,
  Box,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  QrCode,
  ArrowRight,
  Sparkles,
  Search,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Kit } from '../../types';

export const KitsView: React.FC = () => {
  const { db, setActiveView } = useApp();
  const [search, setSearch] = useState('');

  const kitsFiltrados = db.kits.filter(
    (k) =>
      k.nome.toLowerCase().includes(search.toLowerCase()) ||
      (k.descricao && k.descricao.toLowerCase().includes(search.toLowerCase())) ||
      (k.categoria && k.categoria.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 pb-20 lg:pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-400" />
            Kits Operacionais M&B
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Conjuntos oficiais pré-configurados para mobilização ágil em campo (Drones, GNSS e Topografia).
          </p>
        </div>

        <button
          onClick={() => setActiveView('nova-saida')}
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          Nova Saída por Kit
        </button>
      </div>

      {/* Busca */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder="Buscar kit operacional..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Grid de Kits */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kitsFiltrados.map((kit) => {
          // Itens deste kit nos 35 equipamentos reais
          const itensDoKit = db.equipamentos.filter((e) => e.kit === kit.nome);
          const disponiveis = itensDoKit.filter(
            (e) => e.status === 'DISPONÍVEL' || e.status === 'Disponível'
          ).length;
          const emCampo = itensDoKit.filter(
            (e) => e.status === 'EM CAMPO' || e.status === 'Em Campo'
          ).length;
          const manutencao = itensDoKit.filter(
            (e) => e.status === 'MANUTENÇÃO' || e.status === 'Manutenção'
          ).length;

          const allAvailable = itensDoKit.length > 0 && disponiveis === itensDoKit.length;

          return (
            <div
              key={kit.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div className="space-y-3">
                {/* Header do Card */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                      {kit.categoria || 'Kit Especializado'}
                    </span>
                    <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors">
                      {kit.nome}
                    </h3>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      allAvailable
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                        : disponiveis > 0
                        ? 'bg-amber-950 text-amber-400 border-amber-800'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {allAvailable ? 'Completo' : `${disponiveis}/${itensDoKit.length} Disp.`}
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  {kit.descricao || 'Kit oficial cadastrado no sistema.'}
                </p>

                {/* Status dos Itens */}
                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Total</span>
                    <span className="font-bold text-white text-xs">{itensDoKit.length}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-500 block">Disponíveis</span>
                    <span className="font-bold text-emerald-400 text-xs">{disponiveis}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-blue-500 block">Em Campo</span>
                    <span className="font-bold text-blue-400 text-xs">{emCampo}</span>
                  </div>
                </div>

                {/* Lista de Equipamentos Vinculados */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold uppercase text-slate-500">
                    Composição do Kit:
                  </span>
                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                    {itensDoKit.map((eq) => (
                      <div
                        key={eq.id}
                        className="flex items-center justify-between text-[11px] p-1.5 rounded-lg bg-slate-800/40 border border-slate-800/60"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-mono font-bold text-blue-400 text-[10px]">
                            {eq.codigo}
                          </span>
                          <span className="text-slate-300 truncate">{eq.nome}</span>
                        </div>
                        <span
                          className={`text-[9px] font-semibold px-1.5 py-0.2 rounded shrink-0 ${
                            eq.status === 'DISPONÍVEL' || eq.status === 'Disponível'
                              ? 'text-emerald-400 bg-emerald-950/60'
                              : 'text-blue-400 bg-blue-950/60'
                          }`}
                        >
                          {eq.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Botão de Ação */}
              <div className="pt-4 mt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  {itensDoKit.length} patrimônios
                </span>
                <button
                  onClick={() => setActiveView('nova-saida')}
                  className="bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"
                >
                  Mobilizar Kit
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
