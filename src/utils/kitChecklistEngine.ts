import { Equipamento, Kit, KitRequisito } from '../types';

/**
 * Motor de Validação e Conferência Inteligente por Kit (Prompt 5)
 * Regras Operacionais M&B Controle de Equipamentos
 */

export interface KitScanValidationResult {
  success: boolean;
  errorType?:
    | 'codigo_inexistente'
    | 'status_invalido'
    | 'ja_escaneado'
    | 'tipo_invalido'
    | 'limite_atingido';
  message: string;
  equipamento?: Equipamento;
  matchingReq?: KitRequisito;
  tipoChecklist?: string;
}

export interface KitRequisitoProgress {
  requisito: KitRequisito;
  tipoChecklist: string;
  quantidadeNecessaria: number;
  quantidadeConferida: number;
  isCompleto: boolean;
  percentual: number;
  equipamentosConferidos: Equipamento[];
}

export interface KitChecklistSummary {
  kit: Kit;
  requisitosProgresso: KitRequisitoProgress[];
  totalNecessario: number;
  totalConferido: number;
  percentualGeral: number;
  isTudoCompleto: boolean;
  pendenciasCount: number;
}

export type TipoChecklistPadrao =
  | 'M350'
  | 'BS65'
  | 'TB65'
  | 'WB37'
  | 'DRTK2'
  | 'DRTK2_TRIPE'
  | 'DRTK2_BASTAO'
  | 'DA2'
  | 'POWERBANK_DA2'
  | 'M400'
  | 'BS100'
  | 'TB100'
  | 'DRTK3'
  | 'DRTK3_BASTAO'
  | 'DRTK3_TRIPE';

/**
 * Normaliza e identifica o "Tipo Checklist" padronizado de um equipamento do patrimônio.
 * Padrão oficial: M350, BS65, TB65, WB37, DRTK2, DRTK2_TRIPE, DRTK2_BASTAO, DA2, POWERBANK_DA2, M400, BS100, TB100, DRTK3, DRTK3_BASTAO, DRTK3_TRIPE.
 */
export function getEquipamentoTipoChecklist(eq: Equipamento | string): string {
  if (!eq) return '';
  if (typeof eq === 'string') {
    const s = eq.toUpperCase().trim();
    const tiposPadrao = [
      'M350', 'BS65', 'TB65', 'WB37', 'DRTK2', 'DRTK2_TRIPE', 'DRTK2_BASTAO',
      'DA2', 'POWERBANK_DA2', 'M400', 'BS100', 'TB100', 'DRTK3', 'DRTK3_BASTAO', 'DRTK3_TRIPE'
    ];
    if (tiposPadrao.includes(s)) return s;
    // Tenta encontrar em equivalências ou retorna a string
    return s;
  }

  const cod = (eq.codigo || '').toUpperCase().trim();
  const nome = (eq.nome || '').toUpperCase().trim();
  const mod = (eq.modelo || '').toUpperCase().trim();
  const modNum = (eq.modeloNumero || '').toUpperCase().trim();
  const currentTipo = (eq.tipoChecklist || '').trim();

  // Se já possui o tipo padronizado, retorna diretamente
  const tiposPadrao = [
    'M350', 'BS65', 'TB65', 'WB37', 'DRTK2', 'DRTK2_TRIPE', 'DRTK2_BASTAO',
    'DA2', 'POWERBANK_DA2', 'M400', 'BS100', 'TB100', 'DRTK3', 'DRTK3_BASTAO', 'DRTK3_TRIPE'
  ];
  if (tiposPadrao.includes(currentTipo.toUpperCase())) {
    return currentTipo.toUpperCase();
  }

  // 1. M350 (Matrice 350 RTK)
  if (
    cod === 'MB-DRN-001' ||
    currentTipo === 'M350' ||
    currentTipo.toUpperCase() === 'MATRICE 350' ||
    modNum.includes('MATRICE 350') ||
    nome.includes('MATRICE 350')
  ) {
    return 'M350';
  }

  // 2. BS65 (Estação de Carga Matrice 350)
  if (
    cod === 'MB-CAR-001' ||
    currentTipo === 'BS65' ||
    modNum.includes('BS65') ||
    nome.includes('BS65')
  ) {
    return 'BS65';
  }

  // 3. TB65 (Baterias Matrice 350 - MB-BAT-001 a MB-BAT-010)
  if (
    currentTipo === 'TB65' ||
    modNum.includes('TB65') ||
    nome.includes('TB65') ||
    (cod.startsWith('MB-BAT-') && isBatNumberInRange(cod, 1, 10))
  ) {
    return 'TB65';
  }

  // 4. WB37 (Baterias RC Plus / Base - MB-BAT-011 a MB-BAT-015)
  if (
    currentTipo === 'WB37' ||
    modNum.includes('WB37') ||
    nome.includes('WB37') ||
    (cod.startsWith('MB-BAT-') && isBatNumberInRange(cod, 11, 15))
  ) {
    return 'WB37';
  }

  // 5. DRTK2 (DJI D-RTK 2 High Precision Station)
  if (
    cod === 'MB-GNSS-001' ||
    currentTipo === 'DRTK2' ||
    currentTipo.toUpperCase() === 'D-RTK 2' ||
    (modNum.includes('D-RTK 2') && !nome.includes('TRIPÉ') && !nome.includes('BASTÃO') && !nome.includes('HASTE'))
  ) {
    return 'DRTK2';
  }

  // 6. DRTK2_TRIPE (Tripé DJI D-RTK 2)
  if (
    cod === 'MB-TRI-003' ||
    currentTipo === 'DRTK2_TRIPE' ||
    currentTipo.toUpperCase() === 'TRIPÉ D-RTK 2' ||
    (nome.includes('TRIPÉ') && (nome.includes('D-RTK 2') || mod.includes('D-RTK 2')))
  ) {
    return 'DRTK2_TRIPE';
  }

  // 7. DRTK2_BASTAO (Haste / Barra Extensora DJI D-RTK 2)
  if (
    cod === 'MB-BST-003' ||
    currentTipo === 'DRTK2_BASTAO' ||
    currentTipo.toUpperCase() === 'HASTE D-RTK 2' ||
    ((nome.includes('HASTE') || nome.includes('BASTÃO')) && (nome.includes('D-RTK 2') || mod.includes('D-RTK 2')))
  ) {
    return 'DRTK2_BASTAO';
  }

  // 8. DA2 (Trimble Catalyst DA2 - MB-GNSS-002, MB-GNSS-003)
  if (
    cod === 'MB-GNSS-002' ||
    cod === 'MB-GNSS-003' ||
    currentTipo === 'DA2' ||
    currentTipo.toUpperCase() === 'CATALYST DA2' ||
    modNum.includes('CATALYST') ||
    modNum.includes('DA2') ||
    nome.includes('CATALYST') ||
    nome.includes('DA2')
  ) {
    return 'DA2';
  }

  // 9. POWERBANK_DA2 (Power Banks USB para Trimble DA2 - MB-BAT-016 a MB-BAT-019)
  if (
    cod === 'MB-BAT-016' ||
    cod === 'MB-BAT-017' ||
    cod === 'MB-BAT-018' ||
    cod === 'MB-BAT-019' ||
    currentTipo === 'POWERBANK_DA2' ||
    currentTipo.toUpperCase() === 'POWER BANK USB' ||
    (cod.startsWith('MB-BAT-') && isBatNumberInRange(cod, 16, 19)) ||
    nome.includes('POWER BANK')
  ) {
    return 'POWERBANK_DA2';
  }

  // 10. M400 (DJI Matrice 400)
  if (
    cod === 'MB-DRN-002' ||
    currentTipo === 'M400' ||
    currentTipo.toUpperCase() === 'MATRICE 400' ||
    modNum.includes('MATRICE 400') ||
    nome.includes('MATRICE 400')
  ) {
    return 'M400';
  }

  // 11. BS100 (Estação BS100)
  if (
    cod === 'MB-CAR-002' ||
    currentTipo === 'BS100' ||
    modNum.includes('BS100') ||
    nome.includes('BS100')
  ) {
    return 'BS100';
  }

  // 12. TB100 (Baterias Matrice 400 - quantidade 0 / aguardando inventário)
  if (
    currentTipo === 'TB100' ||
    modNum.includes('TB100') ||
    nome.includes('TB100')
  ) {
    return 'TB100';
  }

  // 13. DRTK3 (DJI D-RTK 3 Multifunctional Station)
  if (
    cod === 'MB-GNSS-004' ||
    currentTipo === 'DRTK3' ||
    currentTipo.toUpperCase() === 'D-RTK 3' ||
    (modNum.includes('D-RTK 3') && !nome.includes('TRIPÉ') && !nome.includes('BASTÃO'))
  ) {
    return 'DRTK3';
  }

  // 14. DRTK3_TRIPE (Tripé DJI D-RTK 3)
  if (
    cod === 'MB-TRI-004' ||
    currentTipo === 'DRTK3_TRIPE' ||
    currentTipo.toUpperCase() === 'TRIPÉ D-RTK 3' ||
    (nome.includes('TRIPÉ') && (nome.includes('D-RTK 3') || mod.includes('D-RTK 3')))
  ) {
    return 'DRTK3_TRIPE';
  }

  // 15. DRTK3_BASTAO (Bastão DJI D-RTK 3)
  if (
    cod === 'MB-BST-004' ||
    currentTipo === 'DRTK3_BASTAO' ||
    currentTipo.toUpperCase() === 'BASTÃO D-RTK 3' ||
    (nome.includes('BASTÃO') && (nome.includes('D-RTK 3') || mod.includes('D-RTK 3')))
  ) {
    return 'DRTK3_BASTAO';
  }

  // Se já tinha tipoChecklist customizado, usa ele
  if (currentTipo) return currentTipo;

  // Fallback seguro baseado em modelo ou nome
  return eq.modeloNumero || eq.modelo || eq.nome;
}

/**
 * Helper para verificar número de identificação MB-BAT-XXX
 */
function isBatNumberInRange(cod: string, min: number, max: number): boolean {
  try {
    const numPart = parseInt(cod.replace('MB-BAT-', ''), 10);
    return !isNaN(numPart) && numPart >= min && numPart <= max;
  } catch {
    return false;
  }
}

/**
 * Compara se um equipamento corresponde estritamente ao Tipo Checklist de um KitRequisito.
 * Evita falsos positivos entre Base, Tripé e Bastão.
 */
export function matchesKitRequisito(eq: Equipamento | string, req: KitRequisito | string): boolean {
  const eqTipo = getEquipamentoTipoChecklist(eq).toUpperCase().trim();
  const reqTipo = (typeof req === 'string' ? req : (req?.tipoChecklist || '')).toUpperCase().trim();

  // 1. Correspondência exata do token padronizado
  if (eqTipo && reqTipo && eqTipo === reqTipo) {
    return true;
  }

  // 2. Mapeamento preciso de equivalências entre aliases legados e tokens oficiais
  const equivalencias: Record<string, string[]> = {
    M350: ['M350', 'MATRICE 350', 'DJI MATRICE 350 RTK'],
    BS65: ['BS65', 'ESTAÇÃO BS65', 'DJI BS65'],
    TB65: ['TB65', 'BATERIA TB65', 'TB65 INTELLIGENT FLIGHT BATTERY'],
    WB37: ['WB37', 'BATERIA WB37', 'WB37 INTELLIGENT BATTERY'],
    DRTK2: ['DRTK2', 'D-RTK 2', 'DJI D-RTK 2'],
    DRTK2_TRIPE: ['DRTK2_TRIPE', 'TRIPÉ D-RTK 2', 'TRIPE D-RTK 2', 'TRIPÉ DJI D-RTK 2'],
    DRTK2_BASTAO: ['DRTK2_BASTAO', 'HASTE D-RTK 2', 'BASTÃO D-RTK 2', 'BASTAO D-RTK 2'],
    DA2: ['DA2', 'CATALYST DA2', 'TRIMBLE CATALYST DA2'],
    POWERBANK_DA2: ['POWERBANK_DA2', 'POWER BANK USB', 'POWER BANK DA2', 'POWER BANK'],
    M400: ['M400', 'MATRICE 400', 'DJI MATRICE 400'],
    BS100: ['BS100', 'ESTAÇÃO BS100', 'DJI BS100'],
    TB100: ['TB100', 'BATERIA TB100'],
    DRTK3: ['DRTK3', 'D-RTK 3', 'DJI D-RTK 3'],
    DRTK3_TRIPE: ['DRTK3_TRIPE', 'TRIPÉ D-RTK 3', 'TRIPE D-RTK 3'],
    DRTK3_BASTAO: ['DRTK3_BASTAO', 'BASTÃO D-RTK 3', 'BASTAO D-RTK 3'],
  };

  // Verifica se eqTipo e reqTipo pertencem ao mesmo grupo de equivalência
  for (const [padrao, aliases] of Object.entries(equivalencias)) {
    const eqPertence = eqTipo === padrao || aliases.includes(eqTipo);
    const reqPertence = reqTipo === padrao || aliases.includes(reqTipo);
    if (eqPertence && reqPertence) {
      return true;
    }
  }

  // Se nenhum dos tipos padronizados deu match, checa especificação explícita do requisito (fallback seguro)
  if (typeof req !== 'string' && req.especificacao && !reqTipo) {
    const spec = req.especificacao.toUpperCase().trim();
    if (typeof eq !== 'string') {
      if (eq.codigo?.toUpperCase() === spec) return true;
      if (eq.modeloNumero?.toUpperCase() === spec) return true;
    }
  }

  return false;
}

/**
 * Validação rigorosa dos 5 passos exigidos no Prompt 5:
 * 1. Código existe no cadastro;
 * 2. Ativo está DISPONÍVEL;
 * 3. Não foi escaneado duas vezes;
 * 4. Tipo Checklist corresponde a um dos requisitos do kit;
 * 5. Quantidade máxima do requisito ainda não foi atingida.
 */
export function validateKitChecklistScan(
  rawCode: string,
  allEquipamentos: Equipamento[],
  currentKit: Kit,
  kitRequisitos: KitRequisito[],
  currentlyScanned: Equipamento[]
): KitScanValidationResult {
  const cleanCode = rawCode.trim().toUpperCase();

  if (!cleanCode) {
    return {
      success: false,
      errorType: 'codigo_inexistente',
      message: 'Código do equipamento vazio.',
    };
  }

  // 1. CÓDIGO EXISTE
  const eq = allEquipamentos.find(
    (item) =>
      item.codigo.toUpperCase() === cleanCode ||
      (item.numeroSerie && item.numeroSerie.toUpperCase() === cleanCode)
  );

  if (!eq) {
    return {
      success: false,
      errorType: 'codigo_inexistente',
      message: `Código "${cleanCode}" não cadastrado no inventário patrimonial M&B.`,
    };
  }

  const tipoChecklist = getEquipamentoTipoChecklist(eq);

  // 2. ATIVO ESTÁ DISPONÍVEL
  const statusUpper = (eq.status || '').toUpperCase();
  const isDisponivel = statusUpper === 'DISPONÍVEL' || statusUpper === 'DISPONIVEL';

  if (!isDisponivel) {
    let detalhe = `Equipamento está com status "${eq.status}".`;
    if (statusUpper === 'EM CAMPO') {
      detalhe = `O equipamento ${eq.codigo} já está EM CAMPO (Obra: ${eq.obraAtualNome || 'Desconhecida'}).`;
    } else if (statusUpper === 'MANUTENÇÃO' || statusUpper === 'MANUTENCAO') {
      detalhe = `O equipamento ${eq.codigo} está em MANUTENÇÃO e não pode ser liberado.`;
    } else if (statusUpper === 'BLOQUEADO') {
      detalhe = `O equipamento ${eq.codigo} está BLOQUEADO por pendência administrativa ou técnica.`;
    } else if (statusUpper === 'RETORNO PENDENTE') {
      detalhe = `O equipamento ${eq.codigo} possui retorno pendente de conferência.`;
    } else if (statusUpper === 'BAIXADO') {
      detalhe = `O equipamento ${eq.codigo} foi baixado do ativo patrimonial.`;
    }

    return {
      success: false,
      errorType: 'status_invalido',
      message: detalhe,
      equipamento: eq,
      tipoChecklist,
    };
  }

  // 3. NÃO FOI ESCANEADO DUAS VEZES
  const alreadyScanned = currentlyScanned.some((item) => item.id === eq.id || item.codigo === eq.codigo);
  if (alreadyScanned) {
    return {
      success: false,
      errorType: 'ja_escaneado',
      message: `O equipamento ${eq.codigo} (${eq.nome}) já foi escaneado nesta conferência.`,
      equipamento: eq,
      tipoChecklist,
    };
  }

  // 4. TIPO CHECKLIST CORRESPONDE AO REQUISITO
  const matchingReq = kitRequisitos.find((req) => matchesKitRequisito(eq, req));

  if (!matchingReq) {
    return {
      success: false,
      errorType: 'tipo_invalido',
      message: `O equipamento ${eq.codigo} (${tipoChecklist}) não corresponde aos requisitos do ${currentKit.nome}.`,
      equipamento: eq,
      tipoChecklist,
    };
  }

  // 5. QUANTIDADE MÁXIMA AINDA NÃO FOI ATINGIDA
  const alreadyScannedForReq = currentlyScanned.filter((item) => matchesKitRequisito(item, matchingReq)).length;
  const maxAllowed = matchingReq.quantidade;

  if (alreadyScannedForReq >= maxAllowed) {
    return {
      success: false,
      errorType: 'limite_atingido',
      message: `Requisito ${matchingReq.tipoChecklist} já atingiu a quantidade máxima (${alreadyScannedForReq}/${maxAllowed}).`,
      equipamento: eq,
      matchingReq,
      tipoChecklist,
    };
  }

  // SUCESSO COMPLETO
  return {
    success: true,
    equipamento: eq,
    matchingReq,
    tipoChecklist,
    message: `${eq.codigo} (${matchingReq.tipoChecklist}) validado com sucesso!`,
  };
}

/**
 * Calcula o progresso por requisito e o percentual geral da conferência
 */
export function calculateKitChecklistSummary(
  kit: Kit,
  kitRequisitos: KitRequisito[],
  scannedEquipamentos: Equipamento[]
): KitChecklistSummary {
  let totalNecessario = 0;
  let totalConferido = 0;

  const requisitosProgresso: KitRequisitoProgress[] = kitRequisitos.map((req) => {
    const itensConferidos = scannedEquipamentos.filter((eq) => matchesKitRequisito(eq, req));
    const qtdConferida = itensConferidos.length;
    const qtdNecessaria = req.quantidade;
    const isCompleto = qtdConferida >= qtdNecessaria;
    const percentual = qtdNecessaria > 0 ? Math.min(100, Math.round((qtdConferida / qtdNecessaria) * 100)) : 100;

    totalNecessario += qtdNecessaria;
    totalConferido += qtdConferida;

    return {
      requisito: req,
      tipoChecklist: req.tipoChecklist || req.especificacao || 'Item',
      quantidadeNecessaria: qtdNecessaria,
      quantidadeConferida: qtdConferida,
      isCompleto,
      percentual,
      equipamentosConferidos: itensConferidos,
    };
  });

  const percentualGeral =
    totalNecessario > 0 ? Math.min(100, Math.round((totalConferido / totalNecessario) * 100)) : 100;

  const isTudoCompleto = requisitosProgresso.every((p) => p.isCompleto);
  const pendenciasCount = requisitosProgresso.filter((p) => !p.isCompleto).length;

  return {
    kit,
    requisitosProgresso,
    totalNecessario,
    totalConferido,
    percentualGeral,
    isTudoCompleto,
    pendenciasCount,
  };
}

/**
 * Feedback Sonoro de Bip Operacional via Web Audio API (sem dependências de rede)
 */
export function playChecklistSound(type: 'success' | 'error' | 'complete'): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'success') {
      // Bipe duplo de confirmação rápida (alta frequência agradável)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'complete') {
      // Acorde triunfal de conclusão 100%
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.35);
        osc.start(ctx.currentTime + i * 0.08);
        osc.stop(ctx.currentTime + i * 0.08 + 0.35);
      });
    } else {
      // Tom grave de erro ou rejeição
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.setValueAtTime(180, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {
    // Silencioso em caso de restrições de autoplay
  }

  // Vibração tátil no celular se compatível
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      if (type === 'success') navigator.vibrate(60);
      else if (type === 'complete') navigator.vibrate([100, 50, 100, 50, 150]);
      else navigator.vibrate([120, 60, 120]);
    }
  } catch (e) {
    // Silencioso
  }
}
