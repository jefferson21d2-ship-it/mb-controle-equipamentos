import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Camera,
  Upload,
  Image as ImageIcon,
  RotateCw,
  Trash2,
  Check,
  AlertTriangle,
  Folder,
  FileCheck,
  HardDrive,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  Layers,
  Sparkles,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Equipamento } from '../types';
import { useApp } from '../context/AppContext';
import {
  compressAndResizeImage,
  rotateImageDataUrl,
  formatFileSize,
  generatePhotoFileName,
  CompressedImageResult,
} from '../utils/imageOptimizer';
import { GoogleSheetsService } from '../services/api';

interface FotoGerenciadorModalProps {
  equipamento: Equipamento | null;
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'view' | 'camera' | 'upload';
}

export const FotoGerenciadorModal: React.FC<FotoGerenciadorModalProps> = ({
  equipamento,
  isOpen,
  onClose,
  initialMode = 'view',
}) => {
  const { config, atualizarFotoEquipamento, removerFotoEquipamento } = useApp();

  // Inputs nativos
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Estados de captura e preview
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Foto em edição / preview antes de salvar
  const [previewData, setPreviewData] = useState<CompressedImageResult | null>(null);
  const [previewRotation, setPreviewRotation] = useState(0);

  // Modal de confirmação de exclusão
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  // Visualização comparativa (Foto Real vs Modelo)
  const [activeTab, setActiveTab] = useState<'real' | 'modelo'>('real');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Se o modal abrir com intenção direta de câmera ou galeria no celular
  useEffect(() => {
    if (!isOpen || !equipamento) {
      setPreviewData(null);
      setUploadError(null);
      setUploadSuccess(false);
      setConfirmRemoveOpen(false);
      return;
    }

    if (initialMode === 'camera') {
      setTimeout(() => cameraInputRef.current?.click(), 100);
    } else if (initialMode === 'upload') {
      setTimeout(() => galleryInputRef.current?.click(), 100);
    }
  }, [isOpen, initialMode, equipamento]);

  if (!isOpen || !equipamento) return null;

  const hasRealPhoto = Boolean(equipamento.fotoUrl);
  const hasModelPhoto = Boolean(equipamento.urlFonteImagem || equipamento.imagemModelo);
  const displayModelUrl =
    equipamento.urlFonteImagem && equipamento.urlFonteImagem.startsWith('http')
      ? equipamento.urlFonteImagem
      : undefined;

  const targetDrivePath = `M&B Controle Equipamentos/Fotos/${equipamento.codigo}/`;
  const defaultFileName = generatePhotoFileName(equipamento.codigo);

  // Processa arquivo selecionado pela câmera ou galeria
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      // Redimensionamento e compressão para celular/Google Drive
      const compressed = await compressAndResizeImage(file, equipamento.codigo, {
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 0.82,
        format: 'image/jpeg',
      });

      setPreviewData(compressed);
      setPreviewRotation(0);
    } catch (err: any) {
      console.error('Erro ao processar imagem:', err);
      setUploadError(err?.message || 'Falha ao processar a fotografia selecionada.');
    } finally {
      setIsProcessing(false);
      // Limpa input para permitir selecionar o mesmo arquivo novamente se necessário
      e.target.value = '';
    }
  };

  // Rotaciona a foto no preview
  const handleRotate = async () => {
    if (!previewData) return;
    setIsProcessing(true);
    try {
      const rotatedDataUrl = await rotateImageDataUrl(previewData.dataUrl, 90);
      const rotatedBase64 = rotatedDataUrl.split(',')[1] || '';
      setPreviewData({
        ...previewData,
        dataUrl: rotatedDataUrl,
        base64Pure: rotatedBase64,
        // Inverte dimensões na rotação de 90°
        width: previewData.height,
        height: previewData.width,
      });
      setPreviewRotation((prev) => (prev + 90) % 360);
    } catch (err) {
      console.error('Erro ao rotacionar imagem', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Salva a fotografia definitiva no Google Drive e Sheets
  const handleConfirmSave = async () => {
    if (!previewData) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      // 1. Envia ao Google Drive via Apps Script se configurado, ou armazena offline
      const uploadResult = await GoogleSheetsService.uploadEquipmentPhoto(
        config.appsScriptUrl,
        {
          codigo: equipamento.codigo,
          fileName: previewData.fileName,
          base64: previewData.base64Pure,
          mimeType: previewData.mimeType,
        }
      );

      // 2. Atualiza estado e cache local do AppContext
      await atualizarFotoEquipamento(equipamento.id, uploadResult.url, {
        fotoDrivePath: uploadResult.folderPath || targetDrivePath,
        fotoNomeArquivo: uploadResult.fileName || defaultFileName,
      });

      setUploadSuccess(true);
      setPreviewData(null);
      setTimeout(() => {
        setUploadSuccess(false);
      }, 3000);
    } catch (err: any) {
      console.error('Erro ao salvar fotografia:', err);
      setUploadError(
        err?.message || 'Falha ao sincronizar fotografia com o Google Drive.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  // Confirmação de remoção da foto real
  const handleConfirmRemove = async () => {
    setIsRemoving(true);
    try {
      await removerFotoEquipamento(equipamento.id);
      setConfirmRemoveOpen(false);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 2500);
    } catch (err: any) {
      setUploadError(err?.message || 'Falha ao remover fotografia do equipamento.');
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fade-in"
    >
      {/* Hidden File Inputs para Câmera e Galeria no Celular */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelected}
      />
      <input
        type="file"
        ref={galleryInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleFileSelected}
      />

      <div
        className={`bg-slate-900 border border-slate-700/90 rounded-2xl w-full ${
          isFullscreen ? 'max-w-4xl h-[95vh]' : 'max-w-2xl'
        } shadow-2xl overflow-hidden my-auto flex flex-col transition-all duration-200 max-h-[95vh]`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-950/80 border border-blue-800 flex items-center justify-center text-blue-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                  {equipamento.codigo}
                </span>
                <span className="text-xs font-bold text-white truncate max-w-[200px] sm:max-w-[300px]">
                  {equipamento.nome}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Gerenciamento Profissional de Fotografias
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Restaurar' : 'Expandir'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors hidden sm:flex"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mensagens de Sucesso / Erro */}
        {uploadSuccess && (
          <div className="bg-emerald-950/90 border-b border-emerald-800 px-5 py-2.5 flex items-center gap-2 text-emerald-300 text-xs font-medium animate-fade-in">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Fotografia atualizada com sucesso no patrimônio da empresa!</span>
          </div>
        )}

        {uploadError && (
          <div className="bg-rose-950/90 border-b border-rose-800 px-5 py-2.5 flex items-center justify-between text-rose-300 text-xs animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{uploadError}</span>
            </div>
            <button
              onClick={() => setUploadError(null)}
              className="text-rose-400 hover:text-white text-xs underline ml-2"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Conteúdo Principal */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-slate-300 text-xs">
          {/* MODO 1: Preview Antes de Salvar */}
          {previewData ? (
            <div className="space-y-4">
              <div className="p-3 bg-blue-950/40 border border-blue-800/80 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-300 font-semibold">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  <span>Visualização prévia da foto capturada</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-200 border border-blue-700">
                  Aguardando Confirmação
                </span>
              </div>

              {/* Área da Imagem em Preview */}
              <div className="relative aspect-video sm:aspect-square max-h-[360px] w-full mx-auto bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex items-center justify-center p-2 shadow-inner group">
                <img
                  src={previewData.dataUrl}
                  alt="Prévia capturada"
                  className="w-full h-full object-contain max-h-full rounded-lg"
                />

                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <button
                    onClick={handleRotate}
                    disabled={isProcessing}
                    title="Girar foto em 90 graus"
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-lg backdrop-blur-sm transition-all"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                    <span>Girar 90°</span>
                  </button>
                </div>
              </div>

              {/* Informações Técnicas da Compressão & Destino no Drive */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <FileCheck className="w-3.5 h-3.5 text-emerald-400" /> Otimização do Arquivo
                  </span>
                  <p className="text-slate-200 font-medium text-xs">
                    Tamanho: <strong className="text-emerald-400 font-mono">{formatFileSize(previewData.compressedSize)}</strong>
                    {previewData.originalSize > 0 && (
                      <span className="text-slate-400 text-[11px] ml-1">
                        (reduzido de {formatFileSize(previewData.originalSize)})
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Dimensões: {previewData.width} &times; {previewData.height} px
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <Folder className="w-3.5 h-3.5 text-blue-400" /> Destino no Google Drive
                  </span>
                  <p className="text-slate-300 font-mono text-[11px] truncate" title={targetDrivePath}>
                    {targetDrivePath}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Arquivo: <strong className="text-blue-300">{previewData.fileName}</strong>
                  </p>
                </div>
              </div>

              {/* Ações de Confirmar / Cancelar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    Tirar Outra
                  </button>
                  <button
                    onClick={() => setPreviewData(null)}
                    disabled={isUploading}
                    className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-semibold text-xs flex items-center justify-center transition-colors"
                  >
                    Descartar
                  </button>
                </div>

                <button
                  onClick={handleConfirmSave}
                  disabled={isUploading}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Salvando no Google Drive...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Confirmar e Salvar Foto Real</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* MODO 2: Visualização Atual (Foto Real vs Modelo) e Controles */
            <div className="space-y-5">
              {/* Seletor de Abas: Foto Real vs Modelo */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('real')}
                    className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                      activeTab === 'real'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Foto Real do Patrimônio</span>
                    {hasRealPhoto && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 ml-1" />
                    )}
                  </button>

                  <button
                    onClick={() => setActiveTab('modelo')}
                    className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                      activeTab === 'modelo'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Imagem Modelo (Referência)</span>
                    {hasModelPhoto && (
                      <span className="w-2 h-2 rounded-full bg-blue-400 ml-1" />
                    )}
                  </button>
                </div>

                <div className="text-[11px] text-slate-400 hidden sm:block">
                  Regra: <span className="text-emerald-400 font-semibold">Foto Real tem prioridade</span>
                </div>
              </div>

              {/* Área de Visualização Principal */}
              {activeTab === 'real' ? (
                <div className="space-y-3">
                  <div className="relative aspect-video sm:aspect-square max-h-[380px] w-full mx-auto bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex items-center justify-center p-3 shadow-inner">
                    {hasRealPhoto ? (
                      <>
                        <img
                          src={equipamento.fotoUrl}
                          alt={`Foto Real de ${equipamento.nome}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain max-h-full"
                        />
                        {/* Selo Oficial de Foto Real */}
                        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-emerald-950/90 text-emerald-300 border border-emerald-700/90 text-[10px] font-bold flex items-center gap-1.5 shadow-lg backdrop-blur-sm">
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Fotografia Real Registrada</span>
                        </div>

                        {/* Informação de data de atualização se houver */}
                        {equipamento.fotoAtualizadaEm && (
                          <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded bg-slate-950/80 text-slate-400 border border-slate-800 text-[9px] font-mono backdrop-blur-sm">
                            Atualizada em: {new Date(equipamento.fotoAtualizadaEm).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center p-6 space-y-3">
                        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500 shadow-inner">
                          <Camera className="w-8 h-8" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-200 text-sm">
                            Nenhuma fotografia real vinculada ainda
                          </p>
                          <p className="text-slate-400 text-xs max-w-sm mx-auto mt-1">
                            Utilize a câmera do celular ou selecione da galeria para registrar o estado físico real do patrimônio da M&B.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Informação do Drive */}
                  <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/90 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-blue-400" />
                      <span className="text-slate-400">Pasta no Google Drive:</span>
                      <span className="font-mono text-slate-200 font-semibold">
                        {equipamento.fotoDrivePath || targetDrivePath}
                      </span>
                    </div>
                    {equipamento.fotoNomeArquivo && (
                      <span className="font-mono text-blue-300 hidden sm:inline">
                        {equipamento.fotoNomeArquivo}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                /* Aba de Imagem Modelo */
                <div className="space-y-3">
                  <div className="relative aspect-video sm:aspect-square max-h-[380px] w-full mx-auto bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex items-center justify-center p-4 shadow-inner">
                    {displayModelUrl ? (
                      <>
                        <img
                          src={displayModelUrl}
                          alt={`Modelo de ${equipamento.nome}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain max-h-full"
                        />
                        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-blue-950/90 text-blue-300 border border-blue-700/90 text-[10px] font-bold flex items-center gap-1.5 shadow-lg backdrop-blur-sm">
                          <Layers className="w-3 h-3 text-blue-400" />
                          <span>Imagem de Referência / Catálogo</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-6 space-y-2">
                        <ImageIcon className="w-10 h-10 text-slate-600 mx-auto" />
                        <p className="font-semibold text-slate-300">
                          Imagem de referência não disponível
                        </p>
                        <p className="text-slate-500 text-xs">
                          {equipamento.marca} {equipamento.modelo}
                        </p>
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800">
                    A imagem modelo serve apenas como guia visual de referência de fábrica. Ela <strong>nunca substitui automaticamente</strong> a fotografia real do patrimônio.
                  </p>
                </div>
              )}

              {/* Barra de Ações Rápidas de Fotografia (Mobile-Friendly) */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/90 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-blue-400" />
                  Ações de Fotografia no Celular / Computador
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Botão Tirar Foto com Câmera */}
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={isProcessing}
                    className="p-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Tirar Foto pela Câmera</span>
                  </button>

                  {/* Botão Selecionar da Galeria */}
                  <button
                    onClick={() => galleryInputRef.current?.click()}
                    disabled={isProcessing}
                    className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
                  >
                    <Upload className="w-4 h-4 text-blue-400" />
                    <span>Selecionar da Galeria</span>
                  </button>
                </div>

                {/* Ações Secundárias: Substituir ou Remover */}
                {hasRealPhoto && (
                  <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 py-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Substituir Fotografia Atual
                    </button>

                    <button
                      onClick={() => setConfirmRemoveOpen(true)}
                      className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 py-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remover Foto Real
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal de Confirmação Rigorosa para Remover Fotografia (Requisito: "remover somente com confirmação") */}
        {confirmRemoveOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
            <div className="bg-slate-900 border border-rose-800/80 rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl">
              <div className="w-12 h-12 rounded-2xl bg-rose-950/80 border border-rose-800 flex items-center justify-center text-rose-400 mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-base font-bold text-white">
                  Confirmar Remoção da Fotografia Real?
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Você está prestes a remover a fotografia do patrimônio <strong>{equipamento.codigo}</strong> ({equipamento.nome}).
                </p>
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-left text-[11px] text-slate-400 space-y-1">
                  <p>&bull; O vínculo será desfeito no Google Sheets (célula Foto).</p>
                  <p>&bull; O aplicativo voltará a exibir a <strong>Imagem Modelo (referência)</strong>.</p>
                  <p>&bull; Esta ação exige confirmação deliberada para evitar perda de dados patrimoniais.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmRemoveOpen(false)}
                  disabled={isRemoving}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRemove}
                  disabled={isRemoving}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg transition-colors"
                >
                  {isRemoving ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>Sim, Remover Foto</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 font-mono">
            {equipamento.codigo} &bull; M&B Engenharia
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
