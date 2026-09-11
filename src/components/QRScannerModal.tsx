import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  X,
  Camera,
  QrCode,
  Search,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Wrench,
  Truck,
  Ban,
  Box,
  MapPin,
  Calendar,
  Layers,
  ArrowRight,
  RotateCcw,
  Zap,
  Sparkles,
  Clipboard,
  SwitchCamera,
  Eye,
  RefreshCw,
} from 'lucide-react';
import jsQR from 'jsqr';
import { useApp } from '../context/AppContext';
import { Equipamento } from '../types';
import { EquipamentoImage } from './EquipamentoImage';
import { extractCodigoMB, isValidCodigoMB } from '../utils/qrCodeGenerator';
import {
  triggerScanSuccessFeedback,
  triggerScanErrorFeedback,
} from '../utils/audioFeedback';
import { EquipamentoDetailModal } from './EquipamentoDetailModal';
import { QRCodeViewModal } from './QRCodeViewModal';

type ScanErrorType =
  | 'codigo_inexistente'
  | 'equipamento_bloqueado'
  | 'equipamento_manutencao'
  | 'equipamento_em_campo'
  | 'qr_invalido'
  | null;

interface ScanStatus {
  type: 'success' | 'warning' | 'error';
  errorType?: ScanErrorType;
  title: string;
  message: string;
}

export const QRScannerModal: React.FC = () => {
  const {
    qrScannerOpen,
    closeQrScanner,
    qrScanTarget,
    findEquipamentoByCodigo,
    confirmarItemChecklistQr,
    db,
    setActiveView,
  } = useApp();

  // Estados
  const [inputCodigo, setInputCodigo] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchActive, setTorchActive] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

  const [selectedEquipamento, setSelectedEquipamento] = useState<Equipamento | null>(null);
  const [scanStatus, setScanStatus] = useState<ScanStatus | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string>('');

  // Modais secundários abertos a partir do leitor
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [qrViewModalOpen, setQrViewModalOpen] = useState(false);

  // Refs para loop de câmera e canvas
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const isScanningActiveRef = useRef<boolean>(false);
  const cameraStartTimerRef = useRef<number | null>(null);

  // Inicializar / Finalizar modal
  useEffect(() => {
    if (qrScannerOpen) {
      // Aguarda o modal montar o elemento <video> antes de anexar o stream.
      cameraStartTimerRef.current = window.setTimeout(() => {
        startCamera(facingMode);
      }, 120);
    } else {
      if (cameraStartTimerRef.current) window.clearTimeout(cameraStartTimerRef.current);
      stopCamera();
      setSelectedEquipamento(null);
      setScanStatus(null);
      setInputCodigo('');
      setLastScannedCode('');
    }
    return () => {
      if (cameraStartTimerRef.current) window.clearTimeout(cameraStartTimerRef.current);
      stopCamera();
    };
  }, [qrScannerOpen]);

  // Iniciar Câmera
  const startCamera = async (facing: 'environment' | 'user') => {
    stopCamera();
    setCameraError(null);

    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('SECURE_CONTEXT_UNAVAILABLE');
      }
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Verificar suporte a lanterna (torch)
      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities: any = track.getCapabilities?.() || {};
        setHasTorch(Boolean(capabilities.torch));
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      setCameraActive(true);
      isScanningActiveRef.current = true;
      startScanLoop();
    } catch (err: any) {
      console.warn('Câmera indisponível ou acesso não concedido:', err);
      const message = err?.name === 'NotAllowedError'
        ? 'Permissão da câmera negada. Autorize a câmera nas permissões do navegador ou do aplicativo Android e tente novamente.'
        : err?.message === 'SECURE_CONTEXT_UNAVAILABLE'
        ? 'A câmera só funciona em HTTPS ou no aplicativo Android instalado. Abra o endereço oficial ou use o APK atualizado.'
        : 'Não foi possível abrir a câmera. Verifique se outro aplicativo está usando-a e tente novamente.';
      setCameraError(`${message} Você também pode digitar o código patrimonial manualmente abaixo.`);
      setCameraActive(false);
      isScanningActiveRef.current = false;
    }
  };

  // Parar Câmera
  const stopCamera = () => {
    isScanningActiveRef.current = false;
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setTorchActive(false);
  };

  // Alternar Lanterna
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const next = !torchActive;
        await track.applyConstraints({
          advanced: [{ torch: next } as any],
        });
        setTorchActive(next);
      } catch (err) {
        console.warn('Erro ao alternar lanterna:', err);
      }
    }
  };

  // Alternar Câmera frontal / traseira
  const toggleCamera = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  // Loop de Leitura de QR Code (Native BarcodeDetector com Fallback jsQR)
  const startScanLoop = () => {
    const hasNativeBarcodeDetector =
      typeof window !== 'undefined' && 'BarcodeDetector' in window;

    let nativeDetector: any = null;
    if (hasNativeBarcodeDetector) {
      try {
        nativeDetector = new (window as any).BarcodeDetector({
          formats: ['qr_code'],
        });
      } catch (e) {
        nativeDetector = null;
      }
    }

    let lastDetectTimestamp = 0;

    const tick = async () => {
      if (!isScanningActiveRef.current) return;

      const video = videoRef.current;
      if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
        const now = Date.now();
        // Limitar frequência a aprox. 10 leituras por segundo para poupar bateria
        if (now - lastDetectTimestamp > 90) {
          lastDetectTimestamp = now;

          let detectedRawText: string | null = null;

          // 1. Tentar com BarcodeDetector nativo (mais rápido e consome menos CPU)
          if (nativeDetector) {
            try {
              const barcodes = await nativeDetector.detect(video);
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                detectedRawText = barcodes[0].rawValue;
              }
            } catch (e) {
              // Em caso de erro na API nativa, prossegue para o fallback jsQR
            }
          }

          // 2. Fallback com biblioteca gratuita open-source jsQR
          if (!detectedRawText) {
            try {
              if (!canvasRef.current) {
                canvasRef.current = document.createElement('canvas');
              }
              const canvas = canvasRef.current;
              canvas.width = video.videoWidth || 640;
              canvas.height = video.videoHeight || 480;
              const ctx = canvas.getContext('2d', { willReadFrequently: true });

              if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const qrResult = jsQR(imageData.data, imageData.width, imageData.height, {
                  inversionAttempts: 'dontInvert',
                });
                if (qrResult && qrResult.data) {
                  detectedRawText = qrResult.data;
                }
              }
            } catch (err) {
              // Silencioso no loop
            }
          }

          // Processar leitura encontrada
          if (detectedRawText) {
            const cleanCandidate = detectedRawText.trim();
            if (cleanCandidate && cleanCandidate !== lastScannedCode) {
              setLastScannedCode(cleanCandidate);
              handleProcessCode(cleanCandidate);
            }
          }
        }
      }

      if (isScanningActiveRef.current) {
        scanLoopRef.current = requestAnimationFrame(tick);
      }
    };

    scanLoopRef.current = requestAnimationFrame(tick);
  };

  /**
   * PROCESSAMENTO E VALIDAÇÃO COMPLETA DE ERROS (PROMPT 3 REQUISITOS):
   * 1. QR inválido
   * 2. Código inexistente
   * 3. Equipamento bloqueado
   * 4. Equipamento em manutenção
   * 5. Equipamento já em campo
   * 6. Sucesso com exibição de Foto, Código, Nome, Modelo, Categoria e Status
   */
  const handleProcessCode = useCallback(
    (rawInput: string) => {
      const trimmed = rawInput.trim();
      if (!trimmed) return;

      // 1. Validação de formato de QR Code
      const extractedCode = extractCodigoMB(trimmed);
      const isFormatValid = isValidCodigoMB(extractedCode);

      // Se não contiver padrão MB- ou caracteres plausíveis
      if (!isFormatValid && !extractedCode.startsWith('MB-')) {
        setSelectedEquipamento(null);
        setScanStatus({
          type: 'error',
          errorType: 'qr_invalido',
          title: 'QR Code Inválido',
          message: `O conteúdo lido ("${trimmed.slice(0, 30)}") não corresponde a um identificador de patrimônio M&B (formato esperado: MB-...).`,
        });
        triggerScanErrorFeedback();
        return;
      }

      // 2. Localização na tabela EQUIPAMENTOS
      const eq = findEquipamentoByCodigo(extractedCode);

      // Código inexistente
      if (!eq) {
        setSelectedEquipamento(null);
        setScanStatus({
          type: 'error',
          errorType: 'codigo_inexistente',
          title: 'Código Não Encontrado',
          message: `Nenhum equipamento cadastrado com o código "${extractedCode}" no inventário oficial da M&B.`,
        });
        triggerScanErrorFeedback();
        return;
      }

      // Equipamento localizado!
      setSelectedEquipamento(eq);
      const statusUpper = (eq.status || '').toUpperCase();

      // Se estiver em modo checklist de saída
      if (qrScanTarget?.mode === 'saida_checklist') {
        if (qrScanTarget.onSuccess) {
          qrScanTarget.onSuccess(eq.codigo);
          closeQrScanner();
          return;
        }
        if (qrScanTarget.saidaId) {
          const confirmed = confirmarItemChecklistQr(qrScanTarget.saidaId, eq.codigo);
          if (confirmed) {
            setScanStatus({
              type: 'success',
              title: 'Equipamento Confirmado no Checklist',
              message: `${eq.codigo} (${eq.nome}) verificado com sucesso para a saída!`,
            });
            triggerScanSuccessFeedback();
          } else {
            setScanStatus({
              type: 'error',
              errorType: 'codigo_inexistente',
              title: 'Item Não Pertence a Esta Saída',
              message: `O equipamento ${eq.codigo} não está listado nos itens desta mobilização de campo.`,
            });
            triggerScanErrorFeedback();
          }
          return;
        }
      }

      // Se estiver em modo checklist de devolução (PROMPT 6)
      if (qrScanTarget?.mode === 'devolucao_checklist') {
        if (qrScanTarget.onSuccess) {
          triggerScanSuccessFeedback();
          qrScanTarget.onSuccess(eq.codigo);
          closeQrScanner();
          return;
        }
      }

      // Tratamento dos status operacionais específicos (PROMPT 3)
      if (statusUpper === 'BLOQUEADO') {
        setScanStatus({
          type: 'error',
          errorType: 'equipamento_bloqueado',
          title: 'Atenção: Equipamento Bloqueado',
          message: `O ativo ${eq.codigo} está com bloqueio administrativo/segurança. Não pode ser liberado para saídas.`,
        });
        triggerScanErrorFeedback();
      } else if (
        statusUpper === 'MANUTENÇÃO' ||
        statusUpper === 'MANUTENCAO' ||
        statusUpper === 'CALIBRAÇÃO' ||
        statusUpper === 'CALIBRACAO'
      ) {
        setScanStatus({
          type: 'warning',
          errorType: 'equipamento_manutencao',
          title: 'Equipamento em Manutenção / Calibração',
          message: `O ativo ${eq.codigo} está registrado na oficina técnica ou aguardando laudo de calibração.`,
        });
        triggerScanErrorFeedback();
      } else if (statusUpper === 'EM CAMPO') {
        setScanStatus({
          type: 'warning',
          errorType: 'equipamento_em_campo',
          title: 'Equipamento Já em Campo',
          message: `Atualmente alocado na obra "${eq.obraAtualNome || 'Obra Externa'}" com o responsável ${eq.responsavelAtualNome || 'Operador'}.`,
        });
        triggerScanSuccessFeedback();
      } else {
        // Equipamento Disponível / Normal
        setScanStatus({
          type: 'success',
          title: 'Equipamento Localizado com Sucesso',
          message: `${eq.codigo} está disponível para mobilização e pronto para uso.`,
        });
        triggerScanSuccessFeedback();
      }
    },
    [findEquipamentoByCodigo, qrScanTarget, confirmarItemChecklistQr]
  );

  // Colar código da área de transferência
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputCodigo(text);
        handleProcessCode(text);
      }
    } catch (err) {
      console.warn('Não foi possível ler clipboard:', err);
    }
  };

  // Limpar para escanear próximo item (Ergonomia com uma mão)
  const handleScanNext = () => {
    setSelectedEquipamento(null);
    setScanStatus(null);
    setInputCodigo('');
    setLastScannedCode('');
    if (!cameraActive) {
      startCamera(facingMode);
    }
  };

  if (!qrScannerOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto animate-fade-in"
    >
      <div className="bg-slate-900 border border-slate-700/90 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto max-h-[96vh] flex flex-col">
        {/* Top Header Ergonômico */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                {qrScanTarget?.mode === 'saida_checklist'
                  ? 'Checklist de Saída (QR Code)'
                  : 'Scanner de QR Code M&B'}
              </h3>
              <p className="text-[10px] text-slate-400">
                Padrão patrimonial exclusivo (ex: MB-BAT-005, MB-DRN-001)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {hasTorch && cameraActive && (
              <button
                onClick={toggleTorch}
                title="Alternar Lanterna"
                className={`p-2 rounded-xl transition-colors ${
                  torchActive
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Zap className="w-4 h-4" />
              </button>
            )}

            {cameraActive && (
              <button
                onClick={toggleCamera}
                title="Alternar Câmera"
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={closeQrScanner}
              aria-label="Fechar leitor QR"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corpo Scrollável do Leitor */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Câmera / Visor com Mira e Laser Animado */}
          <div className="relative bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 aspect-[4/3] sm:aspect-video flex items-center justify-center shadow-inner group">
            {cameraActive ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Mira Central com Laser */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                  <div className="w-48 h-48 sm:w-56 sm:h-56 border-2 border-blue-400/80 rounded-2xl relative shadow-lg">
                    {/* Cantoneiras reforçadas */}
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-400 -mt-1 -ml-1 rounded-tl" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-400 -mt-1 -mr-1 rounded-tr" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-400 -mb-1 -ml-1 rounded-bl" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-400 -mb-1 -mr-1 rounded-br" />

                    {/* Linha Laser Animada */}
                    <div
                      className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_12px_#38bdf8] animate-bounce"
                      style={{ animationDuration: '2s' }}
                    />
                  </div>

                  <span className="mt-3 px-3 py-1 rounded-full text-[10px] font-bold bg-slate-950/80 text-blue-300 border border-blue-800/80 backdrop-blur-md">
                    Aponte a câmera para a etiqueta do equipamento
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center p-5 space-y-2.5">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-300">
                    Câmera desligada ou sem permissão
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Você pode reativar a câmera ou digitar o código abaixo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => startCamera(facingMode)}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-xl inline-flex items-center gap-1.5 shadow transition-all"
                >
                  <Camera className="w-4 h-4" />
                  Ativar Câmera
                </button>
              </div>
            )}
          </div>

          {cameraError && (
            <div className="p-3 rounded-xl bg-amber-950/50 border border-amber-800/80 text-amber-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <span>{cameraError}</span>
            </div>
          )}

          {/* CARD DE RESULTADO / EQUIPAMENTO ENCONTRADO (PROMPT 3 REQUISITO) */}
          {selectedEquipamento && (
            <div className="bg-slate-950/80 border border-slate-700/80 rounded-2xl p-4 space-y-3.5 shadow-lg animate-fade-in">
              {/* Header do Card com Foto, Código, Nome, Modelo, Categoria e Status */}
              <div className="flex items-start gap-3">
                {/* 1. Foto do Equipamento */}
                <div className="w-20 h-20 shrink-0 aspect-square rounded-xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center p-1">
                  <EquipamentoImage
                    equipamento={selectedEquipamento}
                    className="w-full h-full"
                    size="sm"
                  />
                </div>

                {/* 2. Informações Principais */}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-blue-950 text-blue-300 border border-blue-800">
                      {selectedEquipamento.codigo}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                        selectedEquipamento.status === 'DISPONÍVEL' || selectedEquipamento.status === 'Disponível'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                          : selectedEquipamento.status === 'EM CAMPO' || selectedEquipamento.status === 'Em Campo'
                          ? 'bg-blue-950 text-blue-300 border-blue-700'
                          : selectedEquipamento.status === 'BLOQUEADO'
                          ? 'bg-rose-950 text-rose-300 border-rose-700'
                          : 'bg-amber-950 text-amber-300 border-amber-700'
                      }`}
                    >
                      {selectedEquipamento.status}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white leading-tight truncate">
                    {selectedEquipamento.nome}
                  </h4>

                  <p className="text-xs text-slate-400 truncate">
                    {selectedEquipamento.marca ? `${selectedEquipamento.marca} • ` : ''}
                    {selectedEquipamento.modelo || selectedEquipamento.modeloNumero || 'Modelo Padrão'}
                  </p>

                  <span className="inline-block text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                    {selectedEquipamento.categoria}
                  </span>
                </div>
              </div>

              {/* Detalhes de Alocação e Serial */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">Responsável Atual</span>
                  <span className="text-white font-medium truncate block">
                    {selectedEquipamento.responsavelAtualNome || 'Base Palmas'}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">Localização / Obra</span>
                  <span className="text-blue-300 font-medium truncate block">
                    {selectedEquipamento.obraAtualNome || selectedEquipamento.localizacaoPadrao || 'Escritório Central'}
                  </span>
                </div>
              </div>

              {/* Ações Rápidas no Card de Resultado */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDetailModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-400" />
                    Ver Ficha
                  </button>
                  <button
                    type="button"
                    onClick={() => setQrViewModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <QrCode className="w-3.5 h-3.5 text-slate-400" />
                    Ver Etiqueta
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {selectedEquipamento.status === 'EM CAMPO' && (
                    <button
                      type="button"
                      onClick={() => {
                        closeQrScanner();
                        setActiveView('devolucao');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 shadow transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Registrar Devolução
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleScanNext}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Escanear Próximo
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MENSAGEM DE STATUS E FEEDBACK DE ERROS */}
          {scanStatus && (
            <div
              className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                scanStatus.type === 'success'
                  ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                  : scanStatus.type === 'warning'
                  ? 'bg-amber-950/80 border-amber-800 text-amber-300'
                  : 'bg-rose-950/80 border-rose-800 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                {scanStatus.type === 'success' && (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                )}
                {scanStatus.type === 'warning' && (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                )}
                {scanStatus.type === 'error' && (
                  <Ban className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span>{scanStatus.title}</span>
              </div>
              <p className="text-[11px] leading-relaxed opacity-95 pl-6">
                {scanStatus.message}
              </p>
            </div>
          )}

          {/* OPÇÃO PARA DIGITAR O CÓDIGO MANUALMENTE (CASO CÂMERA FALHE) */}
          <div className="bg-slate-950/50 p-3.5 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Digitar Código Manualmente (Fallback)
              </label>
              <button
                type="button"
                onClick={handlePasteFromClipboard}
                className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
              >
                <Clipboard className="w-3 h-3" />
                Colar
              </button>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Ex: MB-BAT-005, MB-DRN-001..."
                  value={inputCodigo}
                  onChange={(e) => setInputCodigo(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleProcessCode(inputCodigo);
                  }}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white uppercase placeholder:normal-case font-mono focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <button
                type="button"
                onClick={() => handleProcessCode(inputCodigo)}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow"
              >
                Localizar
              </button>
            </div>

            {/* Chips de Atalho de Teste Rápido */}
            <div className="pt-1.5 space-y-1">
              <span className="text-[10px] text-slate-500 block">
                Sugestões de teste rápido (conforme inventário):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {['MB-BAT-005', 'MB-DRN-001', 'MB-GNSS-001', 'MB-CAR-001', 'MB-EST-001'].map(
                  (code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => {
                        setInputCodigo(code);
                        handleProcessCode(code);
                      }}
                      className="font-mono text-[10px] bg-slate-900 hover:bg-slate-800 text-blue-300 px-2 py-1 rounded-lg border border-slate-800 transition-colors"
                    >
                      {code}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Ergonômico de Polegar */}
        <div className="px-4 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
          <button
            onClick={() => {
              closeQrScanner();
              setActiveView('equipamentos');
            }}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
          >
            <Box className="w-3.5 h-3.5" />
            Ver Catálogo Completo
          </button>

          <button
            onClick={closeQrScanner}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors"
          >
            Concluir
          </button>
        </div>
      </div>

      {/* Modais Vinculados */}
      <EquipamentoDetailModal
        equipamento={detailModalOpen ? selectedEquipamento : null}
        onClose={() => setDetailModalOpen(false)}
      />

      <QRCodeViewModal
        equipamento={qrViewModalOpen ? selectedEquipamento : null}
        onClose={() => setQrViewModalOpen(false)}
      />
    </div>
  );
};
