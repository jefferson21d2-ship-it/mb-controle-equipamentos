import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  User,
  Package,
  QrCode,
  Camera,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Truck,
  Trash2,
  RotateCcw,
  Check,
  Layers,
  Printer,
  Clock,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Search,
  Volume2,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Equipamento, Kit, KitRequisito, Saida } from '../../types';
import {
  calculateKitChecklistSummary,
  getEquipamentoTipoChecklist,
  matchesKitRequisito,
  playChecklistSound,
  validateKitChecklistScan,
  KitScanValidationResult,
  KitChecklistSummary,
} from '../../utils/kitChecklistEngine';
import { EquipamentoImage } from '../EquipamentoImage';
import jsQR from 'jsqr';

export const NovaSaidaView: React.FC = () => {
  const {
    db,
    concluirSaidaKitComItens,
    openQrScanner,
    setActiveView,
    currentUser,
  } = useApp();

  // Etapas do Fluxo:
  // 1 = Configurar Saída (Obra, Responsável, Kit)
  // 2 = Conferência Inteligente por QR Code
  // 3 = Saída Liberada para Campo com Sucesso
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Formulário Inicial
  const [selectedObraId, setSelectedObraId] = useState<string>('');
  const [selectedResponsavelId, setSelectedResponsavelId] = useState<string>('');
  const [selectedKitId, setSelectedKitId] = useState<string>('kit-matrice-350'); // Padrão: KIT DJI MATRICE 350
  const [previsaoDevolucao, setPrevisaoDevolucao] = useState<string>('');
  const [observacoes, setObservacoes] = useState<string>('');

  // Itens Escaneados e Conferidos
  const [scannedEquipamentos, setScannedEquipamentos] = useState<Equipamento[]>([]);
  const [scannedTimestamps, setScannedTimestamps] = useState<Record<string, string>>({});
  const [lastValidation, setLastValidation] = useState<KitScanValidationResult | null>(null);

  // Entrada Manual / Scanner Ótico
  const [manualCode, setManualCode] = useState<string>('');
  const [expandedReqId, setExpandedReqId] = useState<string | null>(null);
  const [showAvailableDrawer, setShowAvailableDrawer] = useState<boolean>(false);

  // Leitor de Câmera Integrado na Tela
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const isScanningActiveRef = useRef<boolean>(false);
  const lastDetectedRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);

  // Saída Concluída
  const [createdSaida, setCreatedSaida] = useState<Saida | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Obter Kit e Requisitos Atuais
  const currentKit: Kit =
    db.kits.find((k) => k.id === selectedKitId) ||
    db.kits[0] || {
      id: 'kit-matrice-350',
      nome: 'KIT DJI MATRICE 350',
      categoria: 'Drones',
      ativo: true,
    };

  const currentKitRequisitos: KitRequisito[] = db.kitRequisitos.filter(
    (r) => r.kitId === currentKit.id
  );

  // Resumo de Progresso do Checklist
  const summary: KitChecklistSummary = calculateKitChecklistSummary(
    currentKit,
    currentKitRequisitos,
    scannedEquipamentos
  );

  // Selecionar primeira obra e responsável automaticamente se não estiverem preenchidos
  useEffect(() => {
    if (!selectedObraId && db.obras.length > 0) {
      setSelectedObraId(db.obras[0].id);
    }
    if (!selectedResponsavelId && db.usuarios.length > 0) {
      const defaultUser =
        db.usuarios.find((u) => u.cargo?.toLowerCase().includes('campo') || u.cargo?.toLowerCase().includes('piloto')) ||
        db.usuarios[0];
      setSelectedResponsavelId(defaultUser.id);
    }
  }, [db.obras, db.usuarios]);

  // Limpeza de Câmera ao desmontar ou trocar de etapa
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [currentStep]);

  // Iniciar Leitura da Câmera Integrada
  const startCamera = async (facing: 'environment' | 'user') => {
    stopCamera();
    setCameraError(null);

    try {
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

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      setCameraActive(true);
      isScanningActiveRef.current = true;
      startScanLoop();
    } catch (err: any) {
      console.warn('Erro ao abrir câmera integrada:', err);
      setCameraError('Câmera indisponível no dispositivo. Você pode utilizar a entrada de código.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    isScanningActiveRef.current = false;
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Loop de Análise de Vídeo
  const startScanLoop = () => {
    let nativeDetector: any = null;
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        nativeDetector = new (window as any).BarcodeDetector({
          formats: ['qr_code', 'code_128', 'ean_13'],
        });
      } catch (e) {
        nativeDetector = null;
      }
    }

    const tick = async () => {
      if (!isScanningActiveRef.current) return;

      const video = videoRef.current;
      if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
        const now = Date.now();
        // Aprox. 10 análises por segundo
        if (now - lastScanTimeRef.current > 100) {
          lastScanTimeRef.current = now;
          let detectedText: string | null = null;

          if (nativeDetector) {
            try {
              const barcodes = await nativeDetector.detect(video);
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                detectedText = barcodes[0].rawValue;
              }
            } catch (e) {
              // fallback para jsQR
            }
          }

          if (!detectedText) {
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
                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const qr = jsQR(imgData.data, imgData.width, imgData.height, {
                  inversionAttempts: 'dontInvert',
                });
                if (qr && qr.data) {
                  detectedText = qr.data;
                }
              }
            } catch (err) {
              // silencioso
            }
          }

          if (detectedText) {
            const cleanCandidate = detectedText.trim();
            if (cleanCandidate && cleanCandidate !== lastDetectedRef.current) {
              lastDetectedRef.current = cleanCandidate;
              processItemScan(cleanCandidate);

              // Evitar leitura repetida acidental do mesmo frame
              setTimeout(() => {
                lastDetectedRef.current = '';
              }, 1200);
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
   * PROCESSAR E VALIDAR ESCANEAMENTO (Motor dos 5 Passos):
   * 1. Código existe;
   * 2. Ativo está DISPONÍVEL;
   * 3. Não foi escaneado duas vezes;
   * 4. Tipo Checklist corresponde ao requisito;
   * 5. Quantidade máxima ainda não foi atingida.
   */
  const processItemScan = (codeToProcess: string): boolean => {
    const raw = codeToProcess.trim();
    if (!raw) return false;

    // Se vier uma URL de QR Code, extrai o identificador patrimonial
    let cleanCode = raw;
    if (raw.includes('MB-')) {
      const match = raw.match(/MB-[A-Z]{3,4}-\d{3,4}/i);
      if (match) cleanCode = match[0].toUpperCase();
    }

    const validation = validateKitChecklistScan(
      cleanCode,
      db.equipamentos,
      currentKit,
      currentKitRequisitos,
      scannedEquipamentos
    );

    setLastValidation(validation);

    if (!validation.success || !validation.equipamento) {
      playChecklistSound('error');
      return false;
    }

    // Sucesso: Adiciona aos conferidos
    const eq = validation.equipamento;
    const nowIso = new Date().toISOString();

    const updatedScanned = [...scannedEquipamentos, eq];
    setScannedEquipamentos(updatedScanned);
    setScannedTimestamps((prev) => ({
      ...prev,
      [eq.id]: nowIso,
    }));

    // Verifica se completou o checklist
    const newSummary = calculateKitChecklistSummary(
      currentKit,
      currentKitRequisitos,
      updatedScanned
    );

    if (newSummary.isTudoCompleto) {
      playChecklistSound('complete');
    } else {
      playChecklistSound('success');
    }

    setManualCode('');
    return true;
  };

  // Remover equipamento escaneado por engano
  const handleRemoveScannedItem = (equipamentoId: string) => {
    setScannedEquipamentos((prev) => prev.filter((e) => e.id !== equipamentoId));
    setScannedTimestamps((prev) => {
      const copy = { ...prev };
      delete copy[equipamentoId];
      return copy;
    });
    setLastValidation(null);
  };

  // Avançar para a Etapa 2: Iniciar Conferência
  const handleIniciarConferencia = () => {
    if (!selectedObraId) {
      alert('Selecione a obra de destino antes de iniciar.');
      return;
    }
    if (!selectedResponsavelId) {
      alert('Selecione o responsável pela retirada.');
      return;
    }
    if (!selectedKitId) {
      alert('Selecione um Kit de equipamentos.');
      return;
    }

    // Limpa conferência anterior ao iniciar novo kit
    setScannedEquipamentos([]);
    setScannedTimestamps({});
    setLastValidation(null);
    setCurrentStep(2);
  };

  // Concluir Saída e LIBERAR PARA CAMPO
  const handleLiberarParaCampo = async () => {
    if (!summary.isTudoCompleto) {
      alert('Atenção: Todos os requisitos obrigatórios do kit devem estar completos para liberar a saída.');
      return;
    }

    setIsProcessing(true);
    stopCamera();

    try {
      const obra = db.obras.find((o) => o.id === selectedObraId);
      const resp = db.usuarios.find((u) => u.id === selectedResponsavelId);

      const itensPayload = scannedEquipamentos.map((eq) => ({
        equipamentoId: eq.id,
        codigoEquipamento: eq.codigo,
        dataHoraChecklist: scannedTimestamps[eq.id] || new Date().toISOString(),
      }));

      const saidaLiberada = await concluirSaidaKitComItens({
        obraId: selectedObraId,
        obraNome: obra?.nome || 'Obra M&B',
        responsavelId: selectedResponsavelId,
        responsavelNome: resp?.nome || 'Operador Responsável',
        kitId: currentKit.id,
        kitNome: currentKit.nome,
        previsaoDevolucao: previsaoDevolucao || undefined,
        observacoes: observacoes || undefined,
        itensConferidos: itensPayload,
      });

      setCreatedSaida(saidaLiberada);
      setCurrentStep(3); // Tela de Sucesso
    } catch (err: any) {
      alert(`Erro ao liberar equipamentos para campo: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Equipamentos do inventário que atendem aos requisitos deste Kit e estão disponíveis
  const equipamentosDisponiveisParaEsteKit = db.equipamentos.filter((eq) => {
    const isDisp = eq.status === 'DISPONÍVEL' || eq.status === 'Disponível';
    if (!isDisp) return false;
    const jaEscaneado = scannedEquipamentos.some((s) => s.id === eq.id);
    if (jaEscaneado) return false;
    return currentKitRequisitos.some((req) => matchesKitRequisito(eq, req));
  });

  return (
    <div className="space-y-6 pb-24 lg:pb-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-400" />
            Nova Saída de Equipamentos
          </h1>
          <p className="text-xs text-slate-400">
            Checklist inteligente de mobilização por Kit e validação física via QR Code.
          </p>
        </div>

        {/* Indicador de Etapas */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs">
          <span
            className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 ${
              currentStep === 1
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            1. Configuração
          </span>
          <span className="text-slate-600">→</span>
          <span
            className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 ${
              currentStep === 2
                ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/30'
                : currentStep === 3
                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                : 'bg-slate-900 text-slate-500 border border-slate-800'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            2. Checklist QR
          </span>
          <span className="text-slate-600">→</span>
          <span
            className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 ${
              currentStep === 3
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-900 text-slate-500 border border-slate-800'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            3. Liberado
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ETAPA 1: ESCOLHER OBRA, RESPONSÁVEL E KIT */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="space-y-6">
          {/* Card de Configuração */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-6 shadow-sm">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Building2 className="w-4 h-4 text-blue-400" />
              1. Dados da Mobilização de Campo
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* 1. Escolher Obra */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Obra de Destino <span className="text-rose-400">*</span>
                </label>
                <select
                  value={selectedObraId}
                  onChange={(e) => setSelectedObraId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Selecione uma obra cadastrada...</option>
                  {db.obras.map((obra) => (
                    <option key={obra.id} value={obra.id}>
                      {obra.codigo} - {obra.nome} {obra.cidade ? `(${obra.cidade}/${obra.uf})` : ''}
                    </option>
                  ))}
                </select>
                {db.obras.length === 0 && (
                  <p className="text-[11px] text-amber-400 mt-1">
                    Nenhuma obra carregada. Sincronize com o Google Sheets na barra superior.
                  </p>
                )}
              </div>

              {/* 2. Escolher Responsável */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Responsável pela Retirada <span className="text-rose-400">*</span>
                </label>
                <select
                  value={selectedResponsavelId}
                  onChange={(e) => setSelectedResponsavelId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Selecione o colaborador...</option>
                  {db.usuarios.map((usr) => (
                    <option key={usr.id} value={usr.id}>
                      {usr.nome} — {usr.cargo} ({usr.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Previsão de Devolução */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Previsão de Retorno a Base
                </label>
                <input
                  type="date"
                  value={previsaoDevolucao}
                  onChange={(e) => setPrevisaoDevolucao(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Observações de Saída */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Observações da Mobilização
                </label>
                <input
                  type="text"
                  placeholder="Ex: Aerolevantamento topográfico com pontos de controle RTK..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 3. Escolher Kit */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-400" />
                  2. Escolha o Kit Operacional
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Selecione o kit que define os requisitos obrigatórios para a conferência.
                </p>
              </div>
              <span className="text-xs font-semibold text-blue-400 bg-blue-950/80 px-2.5 py-1 rounded-lg border border-blue-900">
                {db.kits.length} Kits Disponíveis
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {db.kits.map((kit) => {
                const reqs = db.kitRequisitos.filter((r) => r.kitId === kit.id);
                const totalItens = reqs.reduce((acc, curr) => acc + curr.quantidade, 0);
                const isSelected = selectedKitId === kit.id;

                return (
                  <div
                    key={kit.id}
                    onClick={() => setSelectedKitId(kit.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-950/60 border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase tracking-wider">
                          {kit.categoria || 'Kit'}
                        </span>
                        <h3 className="text-xs font-bold text-white mt-1.5">{kit.nome}</h3>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'border-slate-700 bg-slate-900'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>

                    {kit.descricao && (
                      <p className="text-[11px] text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                        {kit.descricao}
                      </p>
                    )}

                    {/* Requisitos em pílulas */}
                    <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1.5">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Requisitos ({totalItens} itens no total):
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {reqs.map((r) => (
                          <span
                            key={r.id}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-slate-900 text-slate-300 border border-slate-800 font-mono"
                          >
                            {r.tipoChecklist || r.especificacao}: <strong>{r.quantidade}</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Resumo do Kit Selecionado */}
            {currentKit && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
                <div>
                  <p className="text-xs text-slate-400">Kit pronto para conferência:</p>
                  <p className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                    {currentKit.nome}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {currentKitRequisitos.map((r) => `${r.tipoChecklist}: ${r.quantidade}`).join(' • ')}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleIniciarConferencia}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all shrink-0"
                >
                  <span>Iniciar Conferência</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 2: CHECKLIST INTELIGENTE POR QR CODE (PROMPT 5 CORE) */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div className="space-y-5">
          {/* Card Superior com Informações da Mobilização */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-900">
                  {currentKit.nome}
                </span>
                <span className="text-xs text-slate-400">
                  Destino: <strong className="text-white">{db.obras.find((o) => o.id === selectedObraId)?.nome || 'Obra'}</strong>
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Responsável: <strong className="text-white">{db.usuarios.find((u) => u.id === selectedResponsavelId)?.nome}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (
                    scannedEquipamentos.length > 0 &&
                    !confirm('Voltar cancelará a conferência em andamento. Deseja continuar?')
                  ) {
                    return;
                  }
                  stopCamera();
                  setCurrentStep(1);
                }}
                className="text-slate-400 hover:text-white text-xs font-semibold px-3 py-2 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Trocar Kit / Obra
              </button>
            </div>
          </div>

          {/* BARRA DE PROGRESSO GERAL DA CONFERÊNCIA */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${
                    summary.isTudoCompleto
                      ? 'bg-emerald-400 ring-4 ring-emerald-950 animate-pulse'
                      : 'bg-amber-400'
                  }`}
                />
                <h3 className="text-sm font-bold text-white">
                  Progresso da Conferência:{' '}
                  <span className="font-mono text-blue-400">
                    {summary.totalConferido}/{summary.totalNecessario} Itens ({summary.percentualGeral}%)
                  </span>
                </h3>
              </div>

              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                  summary.isTudoCompleto
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    : 'bg-amber-950/70 text-amber-300 border-amber-800'
                }`}
              >
                {summary.isTudoCompleto
                  ? 'Conferência Concluída (100%)'
                  : `${summary.pendenciasCount} Requisito(s) Pendente(s)`}
              </span>
            </div>

            {/* Barra Visual de Progresso */}
            <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden p-0.5 border border-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  summary.isTudoCompleto
                    ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                    : 'bg-gradient-to-r from-blue-600 to-amber-500'
                }`}
                style={{ width: `${summary.percentualGeral}%` }}
              />
            </div>
          </div>

          {/* PAINEL DE LEITURA: CÂMERA INTEGRADA E ENTRADA MANUAL */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-blue-400" />
                  Escanear Equipamentos do Kit
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Aponte a câmera do celular para o QR Code de cada item ou digite o código patrimonial.
                </p>
              </div>

              {/* Botões de Ação do Scanner */}
              <div className="flex items-center gap-2">
                {!cameraActive ? (
                  <button
                    type="button"
                    onClick={() => startCamera(facingMode)}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Camera className="w-4 h-4" />
                    Ativar Câmera no Navegador
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
                        setFacingMode(nextFacing);
                        startCamera(nextFacing);
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-2.5 py-2 rounded-xl border border-slate-700 flex items-center gap-1"
                      title="Alternar Câmera"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="bg-rose-950 hover:bg-rose-900 text-rose-300 text-xs font-bold px-3 py-2 rounded-xl border border-rose-800 transition-all flex items-center gap-1"
                    >
                      <X className="w-4 h-4" />
                      Fechar Câmera
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() =>
                    openQrScanner({
                      mode: 'saida_checklist',
                      onSuccess: (cod) => processItemScan(cod),
                    })
                  }
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-700 flex items-center gap-1.5"
                  title="Abrir Scanner em Tela Cheia"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  Tela Cheia
                </button>
              </div>
            </div>

            {/* Viewport da Câmera Integrada quando ativa */}
            {cameraActive && (
              <div className="relative bg-black rounded-2xl overflow-hidden aspect-video max-h-72 flex items-center justify-center border border-blue-900/60 shadow-inner">
                <video ref={videoRef} className="w-full h-full object-cover" />

                {/* Retículo de Foco */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-48 h-48 sm:w-56 sm:h-56 border-2 border-blue-400/80 rounded-2xl relative shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                    <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-blue-400 -mt-1 -ml-1 rounded-tl-sm" />
                    <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-blue-400 -mt-1 -mr-1 rounded-tr-sm" />
                    <div className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-blue-400 -mb-1 -ml-1 rounded-bl-sm" />
                    <div className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-blue-400 -mb-1 -mr-1 rounded-br-sm" />

                    <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-rose-500/70 shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-pulse" />
                  </div>
                </div>

                <div className="absolute bottom-2 left-3 right-3 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-1.5 text-center text-[11px] text-white">
                  Aponte o retículo para o QR Code patrimonial do equipamento...
                </div>
              </div>
            )}

            {cameraError && (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800 text-amber-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{cameraError}</span>
              </div>
            )}

            {/* Campo de Entrada Manual e Leitor Ótico com Autofoco */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                processItemScan(manualCode);
              }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Digitar ou ler código com leitor (ex: MB-BAT-005, MB-DRN-001)..."
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-blue-500 uppercase"
                />
                {manualCode && (
                  <button
                    type="button"
                    onClick={() => setManualCode('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0"
              >
                <Check className="w-4 h-4" />
                Validar Item
              </button>
            </form>

            {/* FEEDBACK DA ÚLTIMA VALIDAÇÃO (Motor dos 5 Passos) */}
            {lastValidation && (
              <div
                className={`p-3.5 rounded-xl border flex items-start gap-3 transition-all ${
                  lastValidation.success
                    ? 'bg-emerald-950/50 border-emerald-800 text-emerald-200'
                    : 'bg-rose-950/50 border-rose-800 text-rose-200'
                }`}
              >
                {lastValidation.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                )}

                <div className="flex-1 text-xs">
                  <p className="font-bold">
                    {lastValidation.success ? 'Item Confirmado!' : 'Atenção na Leitura'}
                  </p>
                  <p className="text-[11px] mt-0.5 opacity-90">{lastValidation.message}</p>

                  {lastValidation.equipamento && (
                    <div className="mt-2 flex items-center gap-2 font-mono text-[10px] bg-black/30 px-2.5 py-1.5 rounded-lg border border-white/10 w-fit">
                      <span className="text-blue-400 font-bold">{lastValidation.equipamento.codigo}</span>
                      <span>•</span>
                      <span>{lastValidation.equipamento.nome}</span>
                      <span>•</span>
                      <span>Tipo: {lastValidation.tipoChecklist}</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setLastValidation(null)}
                  className="text-xs opacity-60 hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* ===================================================================== */}
          {/* CARDS DE REQUISITOS DO KIT (Ex: Matrice 350 0/1, BS65 0/1, TB65 8/10, WB37 0/5) */}
          {/* ===================================================================== */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                Requisitos do {currentKit.nome}
              </h3>
              <span className="text-xs text-slate-400">
                Clique no card para ver os números de série / códigos conferidos
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {summary.requisitosProgresso.map((reqProg) => {
                const req = reqProg.requisito;
                const isExpanded = expandedReqId === req.id;

                return (
                  <div
                    key={req.id}
                    className={`rounded-2xl border transition-all ${
                      reqProg.isCompleto
                        ? 'bg-emerald-950/20 border-emerald-800/80 shadow-sm'
                        : reqProg.quantidadeConferida > 0
                        ? 'bg-slate-900 border-amber-700/60'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase font-mono">
                            {req.categoria}
                          </span>
                          <h4 className="text-sm font-bold text-white mt-1">
                            {reqProg.tipoChecklist}
                          </h4>
                          {req.especificacao && (
                            <p className="text-[11px] text-slate-400 mt-0.5">{req.especificacao}</p>
                          )}
                        </div>

                        {/* FRAÇÃO EXIGIDA NO PROMPT 5: "Matrice 350 0/1, TB65 8/10" */}
                        <div className="text-right">
                          <span
                            className={`font-mono text-base font-extrabold px-3 py-1 rounded-xl border inline-block ${
                              reqProg.isCompleto
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                                : reqProg.quantidadeConferida > 0
                                ? 'bg-amber-950 text-amber-300 border-amber-700'
                                : 'bg-slate-950 text-slate-400 border-slate-800'
                            }`}
                          >
                            {reqProg.quantidadeConferida}/{reqProg.quantidadeNecessaria}
                          </span>
                          <p className="text-[10px] font-semibold mt-1">
                            {reqProg.isCompleto ? (
                              <span className="text-emerald-400 font-bold flex items-center justify-end gap-1">
                                <Check className="w-3 h-3 stroke-[3]" /> Completo
                              </span>
                            ) : (
                              <span className="text-amber-400">
                                {reqProg.quantidadeNecessaria - reqProg.quantidadeConferida} pendente(s)
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Mini Barra de Progresso do Requisito */}
                      <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800/80">
                        <div
                          className={`h-full rounded-full transition-all ${
                            reqProg.isCompleto ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${reqProg.percentual}%` }}
                        />
                      </div>

                      {/* Botão para Expandir / Recolher Itens Conferidos */}
                      <button
                        type="button"
                        onClick={() => setExpandedReqId(isExpanded ? null : req.id)}
                        className="w-full pt-2 border-t border-slate-800/70 flex items-center justify-between text-[11px] text-slate-400 hover:text-white transition-colors"
                      >
                        <span>
                          {reqProg.equipamentosConferidos.length > 0
                            ? `Ver ${reqProg.equipamentosConferidos.length} item(ns) conferido(s)`
                            : 'Nenhum equipamento conferido ainda'}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Lista Expandida de Itens Já Escaneados para este Requisito */}
                    {isExpanded && (
                      <div className="p-3 bg-slate-950/80 rounded-b-2xl border-t border-slate-800/80 space-y-2">
                        {reqProg.equipamentosConferidos.length === 0 ? (
                          <p className="text-[11px] text-slate-500 text-center py-2">
                            Aguardando escaneamento do QR Code para {reqProg.tipoChecklist}.
                          </p>
                        ) : (
                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {reqProg.equipamentosConferidos.map((eq) => (
                              <div
                                key={eq.id}
                                className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-900">
                                    {eq.codigo}
                                  </span>
                                  <div>
                                    <p className="font-semibold text-white text-[11px]">{eq.nome}</p>
                                    <p className="text-[10px] text-slate-400 font-mono">
                                      {scannedTimestamps[eq.id]
                                        ? new Date(scannedTimestamps[eq.id]).toLocaleTimeString()
                                        : 'OK'}
                                    </p>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveScannedItem(eq.id)}
                                  className="text-rose-400 hover:text-rose-300 p-1.5 rounded-lg hover:bg-rose-950/50 transition-colors"
                                  title="Remover item da conferência"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* BANDEJA AUXILIAR: ATALHO DE 1-CLIQUE PARA EQUIPAMENTOS DISPONÍVEIS */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <button
              type="button"
              onClick={() => setShowAvailableDrawer(!showAvailableDrawer)}
              className="w-full flex items-center justify-between text-xs font-bold text-slate-300 hover:text-white"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Ver Equipamentos Disponíveis deste Kit no Inventário ({equipamentosDisponiveisParaEsteKit.length})
              </span>
              {showAvailableDrawer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showAvailableDrawer && (
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <p className="text-[11px] text-slate-400">
                  Caso o leitor ótico ou câmera física não estejam operantes, você pode validar qualquer equipamento disponível do kit com 1 clique:
                </p>

                {equipamentosDisponiveisParaEsteKit.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 text-center bg-slate-950 rounded-xl">
                    Todos os equipamentos elegíveis deste kit já foram conferidos ou estão em campo!
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1">
                    {equipamentosDisponiveisParaEsteKit.map((eq) => {
                      const tipo = getEquipamentoTipoChecklist(eq);
                      return (
                        <button
                          key={eq.id}
                          type="button"
                          onClick={() => processItemScan(eq.codigo)}
                          className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-blue-500 text-left transition-all flex items-center justify-between group"
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[10px] font-bold text-blue-400">
                                {eq.codigo}
                              </span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                                {tipo}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-slate-200 mt-0.5 truncate max-w-[180px]">
                              {eq.nome}
                            </p>
                          </div>
                          <span className="text-[10px] font-bold bg-blue-950 text-blue-400 px-2 py-1 rounded border border-blue-900 opacity-0 group-hover:opacity-100 transition-opacity">
                            + Validar
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ===================================================================== */}
          {/* BARRA FIXA DE AÇÃO FINAL: LIBERAR PARA CAMPO */}
          {/* ===================================================================== */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl sticky bottom-4 z-20 backdrop-blur-md">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">Status da Mobilização:</span>
                {summary.isTudoCompleto ? (
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Requisitos 100% Atendidos
                  </span>
                ) : (
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {summary.totalNecessario - summary.totalConferido} Itens Pendentes
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {summary.isTudoCompleto
                  ? 'Pronto para formalizar saída e transferir custódia dos equipamentos.'
                  : 'O botão será habilitado automaticamente ao concluir todos os requisitos obrigatórios.'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleLiberarParaCampo}
                disabled={!summary.isTudoCompleto || isProcessing}
                className={`text-xs font-bold px-6 py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all ${
                  summary.isTudoCompleto && !isProcessing
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white ring-4 ring-emerald-500/20 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                }`}
              >
                {isProcessing ? (
                  <span>Registrando Saída...</span>
                ) : (
                  <>
                    <Truck className="w-4 h-4" />
                    <span>LIBERAR PARA CAMPO</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 3: SUCESSO — SAÍDA REGISTRADA E EQUIPAMENTOS EM CAMPO */}
      {/* ========================================================================= */}
      {currentStep === 3 && createdSaida && (
        <div className="bg-slate-900 border border-emerald-800/80 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-emerald-950 border border-emerald-600 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
              <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Saída Liberada com Sucesso para Campo!
            </h2>
            <p className="text-xs text-slate-300 max-w-md mx-auto">
              Todos os {scannedEquipamentos.length} equipamentos foram transferidos para o status{' '}
              <strong className="text-emerald-400">EM CAMPO</strong> sob responsabilidade do colaborador.
            </p>
          </div>

          {/* Dados do Registro de Saída */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Código da Saída</span>
              <p className="font-mono font-bold text-blue-400 text-sm mt-0.5">{createdSaida.codigo}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Kit Mobilizado</span>
              <p className="font-bold text-white text-sm mt-0.5">{createdSaida.kitNome || currentKit.nome}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Obra de Destino</span>
              <p className="font-bold text-white text-sm mt-0.5">{createdSaida.obraNome}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Responsável</span>
              <p className="font-bold text-white text-sm mt-0.5">{createdSaida.responsavelNome}</p>
            </div>
          </div>

          {/* Tabela de Equipamentos Transferidos */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Equipamentos Transferidos para o Campo ({scannedEquipamentos.length}):
            </h3>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {scannedEquipamentos.map((eq) => (
                <div
                  key={eq.id}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-slate-800">
                      <EquipamentoImage equipamento={eq} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-400">{eq.codigo}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                          {eq.categoria}
                        </span>
                      </div>
                      <p className="font-bold text-white mt-0.5">{eq.nome}</p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {eq.modelo} {eq.numeroSerie ? `• S/N: ${eq.numeroSerie}` : ''}
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800">
                    EM CAMPO
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Botões de Ação Pós-Saída */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => window.print()}
              className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Imprimir Recibo de Carga
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setScannedEquipamentos([]);
                  setScannedTimestamps({});
                  setCreatedSaida(null);
                  setCurrentStep(1);
                }}
                className="flex-1 sm:flex-none bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors text-center"
              >
                Nova Saída
              </button>
              <button
                type="button"
                onClick={() => setActiveView('em_campo')}
                className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow transition-all text-center flex items-center justify-center gap-1.5"
              >
                <span>Ver Em Campo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
