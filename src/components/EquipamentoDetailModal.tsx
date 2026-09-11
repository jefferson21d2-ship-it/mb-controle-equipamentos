import React, { useState, useEffect } from 'react';
import {
  X,
  QrCode,
  Copy,
  Check,
  MapPin,
  Calendar,
  User,
  ShieldCheck,
  Wrench,
  Truck,
  PlusCircle,
  AlertTriangle,
  Info,
  ExternalLink,
  Printer,
  FileText,
  Tag,
  Layers,
  Zap,
  Eye,
  Camera,
  Upload,
  Image as ImageIcon,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { Equipamento } from '../types';
import { useApp } from '../context/AppContext';
import { EquipamentoImage } from './EquipamentoImage';
import { generateEquipamentoQRCode } from '../utils/qrCodeGenerator';
import { QRCodeViewModal } from './QRCodeViewModal';
import { EtiquetasPrintModal } from './EtiquetasPrintModal';
import { FotoGerenciadorModal } from './FotoGerenciadorModal';

interface EquipamentoDetailModalProps {
  equipamento: Equipamento | null;
  onClose: () => void;
  onOpenPrintModal?: (equipamentoId: string) => void;
}

export const EquipamentoDetailModal: React.FC<EquipamentoDetailModalProps> = ({
  equipamento,
  onClose,
  onOpenPrintModal,
}) => {
  const { db, setActiveView } = useApp();
  const [copied, setCopied] = useState(false);
  const [confirmBaixaOpen, setConfirmBaixaOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [individualQrOpen, setIndividualQrOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);

  // Estados para Gerenciamento Profissional de Fotos (PROMPT 4)
  const [fotoModalOpen, setFotoModalOpen] = useState(false);
  const [fotoModalMode, setFotoModalMode] = useState<'view' | 'camera' | 'upload'>('view');
  const [photoViewMode, setPhotoViewMode] = useState<'auto' | 'real' | 'modelo'>('auto');

  // Obtém o registro mais recente do banco de dados (para refletir fotos atualizadas em tempo real)
  const currentEquipamento =
    db.equipamentos.find(
      (e) => e.id === equipamento?.id || e.codigo === equipamento?.codigo
    ) || equipamento;

  useEffect(() => {
    if (!currentEquipamento) {
      setQrDataUrl('');
      return;
    }
    // Conforme especificado no Prompt 3: o conteúdo do QR Code é EXCLUSIVAMENTE o Código do Equipamento
    generateEquipamentoQRCode(currentEquipamento.codigo, { width: 300, margin: 1 })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Erro ao gerar QR Code', err));
  }, [currentEquipamento]);

  if (!currentEquipamento) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentEquipamento.codigo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasRealPhoto = Boolean(currentEquipamento.fotoUrl);
  const hasModelPhoto = Boolean(
    currentEquipamento.urlFonteImagem || currentEquipamento.imagemModelo
  );

  // Histórico de saídas deste item
  const saidasDoItem = db.saidaItens
    .filter(
      (item) =>
        item.equipamentoId === currentEquipamento.id ||
        item.codigoEquipamento === currentEquipamento.codigo
    )
    .map((item) => {
      const saida = db.saidas.find((s) => s.id === item.saidaId);
      return { item, saida };
    })
    .filter((entry) => entry.saida !== undefined);

  // Histórico de manutenções deste item
  const manutencoesDoItem = db.manutencoes.filter(
    (m) =>
      m.equipamentoId === currentEquipamento.id ||
      m.codigoEquipamento === currentEquipamento.codigo
  );

  const isDisponivel =
    currentEquipamento.status === 'DISPONÍVEL' ||
    currentEquipamento.status === 'Disponível';
  const isEmCampo =
    currentEquipamento.status === 'EM CAMPO' ||
    currentEquipamento.status === 'Em Campo';
  const isManutencao =
    currentEquipamento.status === 'MANUTENÇÃO' ||
    currentEquipamento.status === 'Manutenção' ||
    currentEquipamento.status === 'Calibração';
  const isRetornoPendente = currentEquipamento.status === 'RETORNO PENDENTE';
  const isBloqueado = currentEquipamento.status === 'BLOQUEADO';
  const isBaixado =
    currentEquipamento.status === 'BAIXADO' ||
    currentEquipamento.status === 'Baixado';

  const getStatusBadge = () => {
    if (isDisponivel) {
      return 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80';
    }
    if (isEmCampo) {
      return 'bg-blue-950/80 text-blue-300 border-blue-700/80';
    }
    if (isRetornoPendente) {
      return 'bg-amber-950/80 text-amber-300 border-amber-700/80';
    }
    if (isManutencao) {
      return 'bg-rose-950/80 text-rose-300 border-rose-700/80';
    }
    if (isBloqueado) {
      return 'bg-purple-950/80 text-purple-300 border-purple-700/80';
    }
    return 'bg-slate-800 text-slate-400 border-slate-700';
  };

  const openCameraCapture = () => {
    setFotoModalMode('camera');
    setFotoModalOpen(true);
  };

  const openGalleryUpload = () => {
    setFotoModalMode('upload');
    setFotoModalOpen(true);
  };

  const openPhotoManager = () => {
    setFotoModalMode('view');
    setFotoModalOpen(true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in"
    >
      <div className="bg-slate-900 border border-slate-700/90 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-blue-950 text-blue-300 border border-blue-800">
              {currentEquipamento.codigo}
            </span>
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${getStatusBadge()}`}
            >
              {currentEquipamento.status}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCode}
              title="Copiar código do patrimônio"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              aria-label="Fechar detalhes"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-300 text-xs">
          {/* Top Profile Card: Foto Grande em Destaque & Ações de Celular (PROMPT 4) */}
          <div className="bg-slate-950/70 p-4 sm:p-5 rounded-2xl border border-slate-800/80 space-y-4 shadow-lg">
            {/* Cabeçalho da Foto com Alternância Foto Real vs Modelo e Botão Gerenciar */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                {hasRealPhoto ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-700/80 text-[11px] font-bold shadow-sm">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Foto Real do Patrimônio
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-950/80 text-blue-300 border border-blue-700/80 text-[11px] font-bold shadow-sm">
                    <Layers className="w-3.5 h-3.5 text-blue-400" />
                    Imagem Modelo (Referência)
                  </span>
                )}

                {/* Se ambos existirem, permite alternar visualização com 1 clique */}
                {hasRealPhoto && hasModelPhoto && (
                  <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5 ml-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setPhotoViewMode('real')}
                      className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                        photoViewMode !== 'modelo' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Real
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoViewMode('modelo')}
                      className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                        photoViewMode === 'modelo' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Modelo
                    </button>
                  </div>
                )}
              </div>

              {/* Botão de Gerenciamento Profissional */}
              <button
                type="button"
                onClick={openPhotoManager}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Camera className="w-3.5 h-3.5 text-blue-400" />
                <span>{hasRealPhoto ? 'Gerenciar / Substituir Foto' : 'Adicionar Foto Real'}</span>
              </button>
            </div>

            {/* Container Grande da Fotografia */}
            <div className="relative aspect-video sm:aspect-[16/10] max-h-72 w-full mx-auto bg-slate-950 rounded-2xl border border-slate-800/90 overflow-hidden flex items-center justify-center p-3 group shadow-inner">
              <EquipamentoImage
                equipamento={currentEquipamento}
                forceMode={photoViewMode}
                className="w-full h-full object-contain"
                size="detail"
                showBadge={false}
              />

              {/* Ações Rápidas Flutuantes no Celular / Desktop */}
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={openCameraCapture}
                  title="Tirar foto pela câmera do celular"
                  className="px-3 py-1.5 rounded-xl bg-blue-600/95 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xl backdrop-blur-sm transition-all active:scale-95"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tirar Foto</span>
                </button>

                <button
                  type="button"
                  onClick={openGalleryUpload}
                  title="Selecionar foto da galeria"
                  className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-xl backdrop-blur-sm transition-all active:scale-95"
                >
                  <Upload className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden sm:inline">Galeria</span>
                </button>

                <button
                  type="button"
                  onClick={openPhotoManager}
                  title="Expandir detalhes da foto"
                  className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-700 shadow-xl backdrop-blur-sm transition-all"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Informações Principais do Equipamento logo abaixo da foto */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start pt-2">
              <div className="sm:col-span-8 space-y-1.5">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                  {currentEquipamento.categoria}
                </span>
                <h2 className="text-base sm:text-lg font-bold text-white leading-snug">
                  {currentEquipamento.nome}
                </h2>
                <p className="text-xs text-slate-400">
                  {currentEquipamento.marca || 'Fabricante não informado'} &bull; {currentEquipamento.modelo || currentEquipamento.modeloNumero || 'Modelo Padrão'}
                </p>
                {currentEquipamento.numeroSerie && (
                  <p className="text-[11px] font-mono text-slate-300">
                    S/N: <span className="text-white font-semibold">{currentEquipamento.numeroSerie}</span>
                  </p>
                )}
              </div>

              {/* Status e Responsável Atual */}
              <div className="sm:col-span-4 p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div>
                  <span className="text-slate-500 text-[10px] block font-medium">Responsável Atual</span>
                  <span className="font-semibold text-white truncate block">
                    {currentEquipamento.responsavelAtualNome || 'Base Central Palmas'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block font-medium">Localização / Obra</span>
                  <span className="font-semibold text-blue-300 truncate block">
                    {currentEquipamento.obraAtualNome || currentEquipamento.localizacaoAtual || currentEquipamento.localizacaoPadrao || 'Escritório Palmas'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Dados Técnicos Detalhados */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-blue-400" />
              Especificações Técnicas & Patrimônio
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/80">
              <div>
                <span className="text-slate-500 text-[10px] block">Código Patrimônio (Tag)</span>
                <span className="font-mono font-bold text-white">{equipamento.codigo}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">Número de Série</span>
                <span className="font-mono text-slate-200">
                  {equipamento.numeroSerie || 'Pendente de registro'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">Fabricante / Marca</span>
                <span className="text-slate-200 font-medium">{equipamento.marca || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">Tipo de Uso</span>
                <span className="text-slate-200">{equipamento.tipoUso || 'Uso Geral'}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">Estado Físico</span>
                <span className="text-slate-200">{equipamento.estadoFisico || 'A Confirmar'}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">Localização Base</span>
                <span className="text-slate-200">{equipamento.localizacaoPadrao || 'Escritório Palmas'}</span>
              </div>

              {/* Especificações para Baterias */}
              {equipamento.parBateria && (
                <div className="col-span-2">
                  <span className="text-slate-500 text-[10px] block">Par de Bateria</span>
                  <span className="font-semibold text-emerald-400">{equipamento.parBateria}</span>
                </div>
              )}
              {equipamento.capacidadeBateria && (
                <div>
                  <span className="text-slate-500 text-[10px] block">Capacidade</span>
                  <span className="font-mono text-slate-200">{equipamento.capacidadeBateria}</span>
                </div>
              )}

              {/* Calibração se houver */}
              {equipamento.ultimaCalibracao && (
                <div>
                  <span className="text-slate-500 text-[10px] block">Última Calibração</span>
                  <span className="text-slate-200">{equipamento.ultimaCalibracao}</span>
                </div>
              )}
              {equipamento.proximaCalibracao && (
                <div>
                  <span className="text-slate-500 text-[10px] block">Próxima Calibração</span>
                  <span className="text-amber-400 font-semibold">{equipamento.proximaCalibracao}</span>
                </div>
              )}
            </div>
          </div>

          {/* Observações / Notas */}
          {equipamento.observacoes && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                Notas & Observações do Equipamento
              </h3>
              <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-300 leading-relaxed">
                {equipamento.observacoes}
              </div>
            </div>
          )}

          {/* Seção do Identificador QR Code (Conforme Requisito PROMPT 3) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-blue-400" />
                Identificador e QR Code Oficial M&B
              </h3>
              <button
                type="button"
                onClick={() => setIndividualQrOpen(true)}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" />
                Abrir Visualizador Individual
              </button>
            </div>

            <div className="p-4 bg-white rounded-2xl text-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm border border-slate-200">
              <div className="flex items-center gap-4">
                <div
                  onClick={() => setIndividualQrOpen(true)}
                  title="Clique para ampliar QR Code"
                  className="w-20 h-20 bg-white border border-slate-300 rounded-xl p-1 flex flex-col items-center justify-center shrink-0 cursor-pointer hover:border-blue-500 transition-colors group"
                >
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`QR Code ${equipamento.codigo}`}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <QrCode className="w-12 h-12 text-slate-400 animate-pulse" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[9px] font-black tracking-widest text-slate-500 uppercase">
                      M&B TOPOGRAFIA
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                      ATIVO
                    </span>
                  </div>
                  <span className="font-mono text-base font-black text-slate-950 tracking-wide block">
                    {equipamento.codigo}
                  </span>
                  <p className="text-[11px] text-slate-700 font-medium">
                    {equipamento.nome}
                  </p>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Conteúdo do QR: {equipamento.codigo}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap sm:flex-col gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="flex-1 sm:flex-none px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copiado' : 'Copiar Código'}
                </button>

                <button
                  type="button"
                  onClick={() => setIndividualQrOpen(true)}
                  className="flex-1 sm:flex-none px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Ver QR / Download
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onOpenPrintModal) {
                      onClose();
                      onOpenPrintModal(equipamento.id);
                    } else {
                      setPrintModalOpen(true);
                    }
                  }}
                  className="flex-1 sm:flex-none px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir Etiqueta
                </button>
              </div>
            </div>
          </div>

          {/* Histórico Operacional */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              Histórico Operacional do Patrimônio
            </h3>
            {saidasDoItem.length === 0 && manutencoesDoItem.length === 0 ? (
              <div className="p-3.5 bg-slate-950/40 rounded-xl border border-slate-800 text-slate-500 text-center">
                Nenhum evento registrado ainda para este equipamento na base atual.
              </div>
            ) : (
              <div className="space-y-2">
                {saidasDoItem.map(({ item, saida }) => (
                  <div
                    key={item.id}
                    className="p-2.5 bg-slate-950/50 rounded-xl border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-mono font-bold text-blue-400 text-xs">
                        {saida?.codigo}
                      </span>
                      <p className="text-slate-300 font-medium text-xs">
                        {saida?.obraNome || 'Obra M&B'} &bull; Responsável: {saida?.responsavelNome || 'Operador'}
                      </p>
                      <span className="text-[10px] text-slate-500">
                        Saída: {saida?.dataSaida} {saida?.dataDevolucaoReal ? `| Devolução: ${saida.dataDevolucaoReal}` : ''}
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-slate-800 text-slate-300">
                      {saida?.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Proteção contra Exclusão Acidental (PROMPT 2 REQUISITO) */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-white">
                Proteção Ativa de Patrimônio
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Este equipamento ({equipamento.codigo}) pertence ao inventário oficial da M&B. A exclusão acidental ou arbitrária está bloqueada na interface comum para assegurar a rastreabilidade patrimonial e conformidade com o Google Sheets.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer com Ações Operacionais */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors"
          >
            Fechar
          </button>

          <div className="flex items-center gap-2">
            {isDisponivel && (
              <button
                onClick={() => {
                  onClose();
                  setActiveView('nova-saida');
                }}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                Iniciar Saída deste Item
              </button>
            )}

            {isEmCampo && (
              <button
                onClick={() => {
                  onClose();
                  setActiveView('devolucao');
                }}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
              >
                <Truck className="w-4 h-4" />
                Registrar Devolução
              </button>
            )}

            <button
              onClick={() => {
                onClose();
                setActiveView('manutencao');
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold text-xs flex items-center gap-1.5 border border-slate-700 transition-colors"
            >
              <Wrench className="w-3.5 h-3.5" />
              Manutenção
            </button>
          </div>
        </div>
      </div>

      {/* Modal Individual de Visualização de QR Code */}
      <QRCodeViewModal
        equipamento={individualQrOpen ? currentEquipamento : null}
        onClose={() => setIndividualQrOpen(false)}
        onOpenPrintModal={(eqId) => {
          setIndividualQrOpen(false);
          if (onOpenPrintModal) {
            onClose();
            onOpenPrintModal(eqId);
          } else {
            setPrintModalOpen(true);
          }
        }}
      />

      {/* Modal Administrativo de Impressão de Etiquetas */}
      <EtiquetasPrintModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        initialEquipamentoId={currentEquipamento.id}
      />

      {/* Modal Profissional de Gerenciamento de Fotografias (PROMPT 4) */}
      <FotoGerenciadorModal
        equipamento={currentEquipamento}
        isOpen={fotoModalOpen}
        onClose={() => setFotoModalOpen(false)}
        initialMode={fotoModalMode}
      />
    </div>
  );
};
