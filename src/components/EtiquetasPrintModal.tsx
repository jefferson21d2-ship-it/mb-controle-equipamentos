import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  QrCode,
  CheckSquare,
  Square,
  Filter,
  Layers,
  Sparkles,
  Download,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Equipamento } from '../types';
import { generateEquipamentoQRCode } from '../utils/qrCodeGenerator';

interface EtiquetasPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEquipamentoId?: string;
}

export const EtiquetasPrintModal: React.FC<EtiquetasPrintModalProps> = ({
  isOpen,
  onClose,
  initialEquipamentoId,
}) => {
  const { db } = useApp();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterKit, setFilterKit] = useState<string>('all');
  const [labelSize, setLabelSize] = useState<'standard' | 'large' | 'compact'>('standard');
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  // Inicializar seleção
  useEffect(() => {
    if (isOpen) {
      if (initialEquipamentoId) {
        setSelectedIds([initialEquipamentoId]);
      } else {
        // Selecionar todos os 35 inicialmente para facilitar impressão em lote
        setSelectedIds(db.equipamentos.map((e) => e.id));
      }
    }
  }, [isOpen, initialEquipamentoId, db.equipamentos]);

  // Gerar QR codes para os equipamentos selecionados
  useEffect(() => {
    if (!isOpen || selectedIds.length === 0) return;

    let isMounted = true;
    setIsGenerating(true);

    const generateAll = async () => {
      const newMap: Record<string, string> = { ...qrMap };
      for (const id of selectedIds) {
        if (!newMap[id]) {
          const eq = db.equipamentos.find((e) => e.id === id);
          if (eq) {
            try {
              // Conteúdo exclusivamente o Código do Equipamento
              const url = await generateEquipamentoQRCode(eq.codigo, {
                width: 250,
                margin: 1,
              });
              newMap[id] = url;
            } catch (err) {
              console.error('Erro gerando QR para', eq.codigo, err);
            }
          }
        }
      }
      if (isMounted) {
        setQrMap(newMap);
        setIsGenerating(false);
      }
    };

    generateAll();

    return () => {
      isMounted = false;
    };
  }, [selectedIds, isOpen, db.equipamentos]);

  if (!isOpen) return null;

  const categories = Array.from(
    new Set(db.equipamentos.map((e) => e.categoria).filter(Boolean))
  ).sort();

  const kits = Array.from(
    new Set(db.equipamentos.map((e) => e.kit).filter(Boolean) as string[])
  ).sort();

  // Itens visíveis no seletor baseado no filtro
  const visibleEquipamentos = db.equipamentos.filter((e) => {
    const matchesCat = filterCategory === 'all' || e.categoria === filterCategory;
    const matchesKit = filterKit === 'all' || e.kit === filterKit;
    return matchesCat && matchesKit;
  });

  const handleToggleSelectAll = () => {
    const visibleIds = visibleEquipamentos.map((e) => e.id);
    const allSelected = visibleIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(selectedIds.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds(Array.from(new Set([...selectedIds, ...visibleIds])));
    }
  };

  const handleToggleItem = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const equipamentosToPrint = db.equipamentos.filter((e) => selectedIds.includes(e.id));

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto animate-fade-in"
    >
      <div className="bg-slate-900 border border-slate-700/90 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col">
        {/* Header (ignorado na impressão) */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/70 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Emissão Administrativa de Etiquetas QR Code
              </h2>
              <p className="text-[11px] text-slate-400">
                Padrão oficial M&B com identificação patrimonial e código em formato exclusivo
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Fechar emissor de etiquetas"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Filtros e Controles (oculta na impressão) */}
        <div className="p-4 bg-slate-950/40 border-b border-slate-800 shrink-0 space-y-3 print:hidden">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            {/* Filtro Categoria */}
            <div className="sm:col-span-4">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Filtrar por Categoria
              </label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="all">Todas as Categorias ({db.equipamentos.length})</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro Kit */}
            <div className="sm:col-span-4">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Filtrar por Kit Operacional
              </label>
              <select
                value={filterKit}
                onChange={(e) => setFilterKit(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="all">Todos os Kits ({kits.length})</option>
                {kits.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>

            {/* Formato da Etiqueta */}
            <div className="sm:col-span-4">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Formato da Etiqueta
              </label>
              <div className="flex rounded-xl bg-slate-900 p-0.5 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setLabelSize('standard')}
                  className={`flex-1 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                    labelSize === 'standard' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Padrão (3 col)
                </button>
                <button
                  type="button"
                  onClick={() => setLabelSize('large')}
                  className={`flex-1 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                    labelSize === 'large' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Grande (2 col)
                </button>
                <button
                  type="button"
                  onClick={() => setLabelSize('compact')}
                  className={`flex-1 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                    labelSize === 'compact' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Térmica (1 col)
                </button>
              </div>
            </div>
          </div>

          {/* Seleção Rápida */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-semibold"
              >
                {visibleEquipamentos.every((e) => selectedIds.includes(e.id)) ? (
                  <CheckSquare className="w-4 h-4 text-blue-400" />
                ) : (
                  <Square className="w-4 h-4 text-slate-500" />
                )}
                <span>Marcar/Desmarcar Filtrados</span>
              </button>
              <span className="text-slate-500">
                {selectedIds.length} de {db.equipamentos.length} selecionados para impressão
              </span>
            </div>

            {isGenerating && (
              <span className="text-[11px] text-amber-400 animate-pulse flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Gerando matrizes QR em alta definição...
              </span>
            )}
          </div>
        </div>

        {/* Scrollable Preview and Printable Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950/30 print:bg-white print:p-0 print:overflow-visible">
          {equipamentosToPrint.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-xs print:hidden">
              <AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              Nenhum equipamento selecionado para emissão.
              <p className="mt-1">Selecione ao menos um ativo acima para visualizar a folha de etiquetas.</p>
            </div>
          ) : (
            <div
              id="printable-labels-container"
              className={`grid gap-3 print:gap-2 mx-auto ${
                labelSize === 'standard'
                  ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 print:grid-cols-3'
                  : labelSize === 'large'
                  ? 'grid-cols-1 sm:grid-cols-2 print:grid-cols-2'
                  : 'grid-cols-1 max-w-xs mx-auto print:grid-cols-1'
              }`}
            >
              {equipamentosToPrint.map((eq) => {
                const qrUrl = qrMap[eq.id];
                const isSelected = selectedIds.includes(eq.id);

                return (
                  <div
                    key={eq.id}
                    className="relative bg-white text-slate-900 border border-slate-300 rounded-xl p-3 shadow-sm flex flex-col justify-between print:border-slate-800 print:shadow-none print:break-inside-avoid print:page-break-inside-avoid"
                  >
                    {/* Botão de desmarcar individual (oculto na impressão) */}
                    <button
                      type="button"
                      onClick={() => handleToggleItem(eq.id)}
                      title="Clique para alternar seleção desta etiqueta"
                      className="absolute top-2 right-2 p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-100 print:hidden transition-colors"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    {/* Cabeçalho da Etiqueta */}
                    <div className="border-b border-slate-200 pb-1.5 mb-2 pr-6">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black tracking-wider text-slate-600 uppercase">
                          M&B TOPOGRAFIA
                        </span>
                        <span className="text-[8px] font-semibold text-slate-500">
                          PALMAS - TO
                        </span>
                      </div>
                      <h4 className="text-[11px] font-bold text-slate-900 leading-tight truncate mt-0.5">
                        {eq.nome}
                      </h4>
                    </div>

                    {/* QR Code Centralizado e Código Monospace */}
                    <div className="flex items-center gap-2.5 my-1">
                      <div className="w-20 h-20 shrink-0 bg-white border border-slate-200 rounded p-1 flex items-center justify-center">
                        {qrUrl ? (
                          <img
                            src={qrUrl}
                            alt={`QR ${eq.codigo}`}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="text-[8px] text-slate-400 animate-pulse">
                            Carregando...
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <span className="text-[8px] font-bold text-slate-500 uppercase block">
                          CÓDIGO PATRIMÔNIO:
                        </span>
                        <span className="font-mono text-sm font-black text-slate-950 block tracking-wider">
                          {eq.codigo}
                        </span>
                        <span className="text-[9px] text-slate-700 block truncate">
                          {eq.marca || ''} {eq.modelo || eq.modeloNumero || ''}
                        </span>
                        {eq.numeroSerie && (
                          <span className="font-mono text-[8px] text-slate-500 block truncate">
                            S/N: {eq.numeroSerie}
                          </span>
                        )}
                        {eq.kit && (
                          <span className="text-[8px] font-medium text-slate-600 block truncate">
                            Kit: {eq.kit}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Rodapé da Etiqueta */}
                    <div className="border-t border-slate-200 pt-1 mt-1 text-[7px] text-slate-500 flex items-center justify-between">
                      <span>CONTROLE DE ATIVOS M&B</span>
                      <span>QR: {eq.codigo}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer com botão de Ação de Impressão (oculto na impressão) */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors"
          >
            Voltar
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={equipamentosToPrint.length === 0}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              Imprimir {equipamentosToPrint.length} Etiquetas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
