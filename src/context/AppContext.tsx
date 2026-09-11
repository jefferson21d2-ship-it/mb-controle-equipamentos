/**
 * Contexto Global do Aplicativo M&B Controle de Equipamentos
 * Gerencia estado das 8 tabelas reais, sincronização e fluxo de navegação.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { GoogleSheetsService } from '../services/api';
import { GoogleAuthService, AuthValidationResult } from '../services/googleAuth';
import { INITIAL_DATABASE } from '../data/initialDatabase';
import { UserPermissions, getUserPermissions } from '../utils/permissions';
import {
  AppView,
  Equipamento,
  EstadoRetorno,
  GoogleSheetsConfig,
  Kit,
  KitRequisito,
  Manutencao,
  MBDatabase,
  Movimentacao,
  Obra,
  PrioridadeManutencao,
  Saida,
  SaidaItem,
  StatusEquipamento,
  Usuario,
} from '../types';

interface QrScanContextTarget {
  mode: 'lookup' | 'saida_checklist' | 'devolucao_checklist';
  saidaId?: string;
  onSuccess?: (codigo: string) => void;
}

interface AppContextType {
  db: MBDatabase;
  hasData: boolean;
  totalEquipamentos: number;
  config: GoogleSheetsConfig;
  currentUser: Usuario | null;
  activeView: AppView;
  isSyncing: boolean;
  isConnected: boolean;
  lastSyncTime: string | null;
  syncError: string | null;
  connectionModalOpen: boolean;
  qrScannerOpen: boolean;
  qrScanTarget: QrScanContextTarget | null;

  // Saída selecionada para devolução
  saidaParaDevolucaoId: string | null;
  setSaidaParaDevolucaoId: (id: string | null) => void;

  // Ações de Navegação e UI
  setActiveView: (view: AppView) => void;
  setConnectionModalOpen: (open: boolean) => void;
  openQrScanner: (target?: QrScanContextTarget) => void;
  closeQrScanner: () => void;

  // Ações de Dados e Sincronização
  saveConfig: (newConfig: GoogleSheetsConfig) => void;
  syncWithGoogleSheets: (overrideUrl?: string) => Promise<boolean>;
  importExcelFile: (file: File) => Promise<{ count: number }>;
  setCurrentUser: (user: Usuario) => void;

  // Utilitários de busca
  findEquipamentoByCodigo: (codigo: string) => Equipamento | undefined;
  findEquipamentoById: (id: string) => Equipamento | undefined;

  // Fluxo de Negócios (Saídas, Devolução, Manutenção)
  criarNovaSaida: (
    novaSaida: Omit<Saida, 'id' | 'codigo' | 'status'>,
    itensEquipamentoIds: string[]
  ) => Promise<Saida>;
  concluirSaidaKitComItens: (dados: {
    obraId: string;
    obraNome: string;
    responsavelId: string;
    responsavelNome: string;
    kitId?: string;
    kitNome?: string;
    previsaoDevolucao?: string;
    observacoes?: string;
    itensConferidos: {
      equipamentoId: string;
      codigoEquipamento: string;
      dataHoraChecklist: string;
    }[];
  }) => Promise<Saida>;
  confirmarItemChecklistQr: (saidaId: string, codigoEquipamento: string) => boolean;
  liberarSaidaParaCampo: (saidaId: string) => Promise<void>;

  // PROMPT 6: Fluxo Completo de Devolução com Estados e Auditoria
  registrarDevolucaoItem: (dados: {
    saidaId: string;
    itemId: string;
    estadoRetorno: EstadoRetorno;
    observacao?: string;
    fotoUrl?: string;
    dadosManutencao?: {
      descricao?: string;
      prioridade?: PrioridadeManutencao;
      fornecedor?: string;
      custo?: number;
      responsavel?: string;
      status?: Manutencao['status'];
      conclusao?: string;
    };
  }) => Promise<{ statusNovo: StatusEquipamento; manutencaoCriada?: Manutencao }>;
  concluirDevolucaoSaida: (saidaId: string, observacoesFinais?: string) => Promise<Saida>;

  realizarDevolucao: (
    saidaId: string,
    itensCondicoes: { itemId: string; condicao: SaidaItem['condicaoDevolucao']; obs?: string; enviarManutencao?: boolean }[]
  ) => Promise<void>;
  registrarManutencao: (novaManutencao: Omit<Manutencao, 'id'>) => Promise<void>;
  concluirManutencao: (manutencaoId: string) => Promise<void>;

  // Gerenciamento Profissional de Fotografias (PROMPT 4)
  atualizarFotoEquipamento: (
    equipamentoId: string,
    novaFotoUrl: string,
    meta?: { fotoDrivePath?: string; fotoNomeArquivo?: string }
  ) => Promise<void>;
  removerFotoEquipamento: (equipamentoId: string) => Promise<void>;

  // PROMPT 7: Autenticação Google Workspace, Segurança e Permissões (RBAC)
  permissions: UserPermissions;
  authValidation: AuthValidationResult;
  detectedEmail: string;
  loginWithGoogleEmail: (email: string) => Promise<boolean>;
  logout: () => void;
  salvarUsuario: (usuario: Usuario) => Promise<void>;
  alternarStatusUsuario: (usuarioId: string) => Promise<void>;
  cadastrarEquipamento: (novo: Omit<Equipamento, 'id'>) => Promise<Equipamento>;
  editarEquipamento: (id: string, atualizacao: Partial<Equipamento>) => Promise<Equipamento>;
  excluirEquipamento: (id: string) => Promise<boolean>;
  excluirSaida: (id: string) => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

/**
 * Migração segura e higienização de caches antigos (PROMPT 8)
 * - Preserva estritamente os 35 equipamentos reais da base oficial.
 * - Remove quaisquer dados fictícios/de demonstração remanescentes (obras e saídas de teste).
 * - Garante que o banco operacional inicie vazio quando não existirem registros reais confirmados.
 * - Nunca altera códigos MB existentes.
 */
function sanitizeAndMigrateDatabase(cached: MBDatabase | null): MBDatabase {
  if (!cached || !cached.equipamentos || cached.equipamentos.length < 35) {
    return INITIAL_DATABASE;
  }

  const fakeSaidaIds = new Set(['sai-2026-001', 'sai-2026-002']);
  const fakeObraIds = new Set(['obr-palmas-base', 'obr-solar-gurupi', 'obr-ferrovia-norte']);
  const fakeUserEmails = new Set([
    'operacoes@mbtopografia.com.br',
    'campo@mbtopografia.com.br',
    'bloqueado@mbtopografia.com.br',
  ]);

  // Purga saídas fictícias
  const cleanSaidas = (cached.saidas || []).filter(
    (s) =>
      !fakeSaidaIds.has(s.id) &&
      !fakeObraIds.has(s.obraId) &&
      s.obraNome !== 'Parque Solar Gurupi - Lote 04' &&
      s.obraNome !== 'Ferrovia Norte-Sul - Trecho Alvorada'
  );

  const cleanSaidaIds = new Set(cleanSaidas.map((s) => s.id));
  const cleanSaidaItens = (cached.saidaItens || []).filter((i) => cleanSaidaIds.has(i.saidaId));

  // Purga obras fictícias
  const cleanObras = (cached.obras || []).filter(
    (o) =>
      !fakeObraIds.has(o.id) &&
      o.nome !== 'Parque Solar Gurupi - Lote 04' &&
      o.nome !== 'Ferrovia Norte-Sul - Trecho Alvorada' &&
      o.nome !== 'Base Central Palmas - TO'
  );

  // Purga usuários fictícios
  const cleanUsuarios = (cached.usuarios || []).filter(
    (u) => !fakeUserEmails.has(u.email.toLowerCase())
  );
  if (!cleanUsuarios.some((u) => u.email.toLowerCase() === 'jefferson21d2@gmail.com')) {
    cleanUsuarios.unshift({
      id: 'usr-admin-jefferson',
      nome: 'Jefferson (Coordenador M&B)',
      email: 'jefferson21D2@gmail.com',
      cargo: 'Coordenador Geral / Administrador',
      perfil: 'Administrador',
      ativo: true,
    });
  }

  // Purga manutenções e movimentações fictícias
  const cleanManutencoes = (cached.manutencoes || []).filter(
    (m) => m.id !== 'man-001' && m.id !== 'man-002' && m.id !== 'man-003'
  );
  const cleanMovimentacoes = (cached.movimentacoes || []).filter(
    (m) => !fakeSaidaIds.has(m.saidaId || '') && m.obraNome !== 'Parque Solar Gurupi - Lote 04'
  );

  // Sanitiza equipamentos: preserva códigos MB-... e UUIDs, restaura status DISPONÍVEL se a saída de campo era fictícia
  const cleanEquipamentos = INITIAL_DATABASE.equipamentos.map((initEq) => {
    const existing = cached.equipamentos.find(
      (e) => e.codigo.toUpperCase() === initEq.codigo.toUpperCase() || e.id === initEq.id
    );
    if (!existing) return initEq;

    let status = existing.status;
    let obraAtualNome = existing.obraAtualNome;
    let responsavelAtualNome = existing.responsavelAtualNome;

    // Se estava 'EM CAMPO' decorrente de obra fictícia, restaura para DISPONÍVEL
    if (
      obraAtualNome === 'Parque Solar Gurupi - Lote 04' ||
      obraAtualNome === 'Ferrovia Norte-Sul - Trecho Alvorada' ||
      cleanSaidas.length === 0
    ) {
      status = 'DISPONÍVEL';
      obraAtualNome = undefined;
      responsavelAtualNome = undefined;
    }

    return {
      ...initEq,
      ...existing,
      id: existing.id || initEq.id,
      codigo: initEq.codigo, // NUNCA altera o código MB oficial
      status,
      obraAtualNome,
      responsavelAtualNome,
      tipoChecklist: initEq.tipoChecklist, // Garante tipo padronizado
      fotoUrl: existing.fotoUrl || initEq.fotoUrl,
    };
  });

  const cleanDb: MBDatabase = {
    equipamentos: cleanEquipamentos,
    kits: INITIAL_DATABASE.kits,
    kitRequisitos: INITIAL_DATABASE.kitRequisitos,
    usuarios: cleanUsuarios,
    obras: cleanObras,
    saidas: cleanSaidas,
    saidaItens: cleanSaidaItens,
    manutencoes: cleanManutencoes,
    movimentacoes: cleanMovimentacoes,
  };

  GoogleSheetsService.saveLocalDatabase(cleanDb);
  return cleanDb;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<MBDatabase>(() => {
    const cached = GoogleSheetsService.loadLocalDatabase();
    return sanitizeAndMigrateDatabase(cached);
  });

  const [config, setConfig] = useState<GoogleSheetsConfig>(() => GoogleSheetsService.loadConfig());

  // PROMPT 7: Autenticação Google Workspace e Validação com USUÁRIOS
  const [detectedEmail, setDetectedEmail] = useState<string>(() => {
    return GoogleAuthService.detectConnectedGoogleEmail();
  });

  const [authValidation, setAuthValidation] = useState<AuthValidationResult>(() => {
    return GoogleAuthService.validateUserAccess(
      GoogleAuthService.detectConnectedGoogleEmail(),
      INITIAL_DATABASE.usuarios
    );
  });

  const [currentUser, setCurrentUserState] = useState<Usuario | null>(() => {
    const val = GoogleAuthService.validateUserAccess(
      GoogleAuthService.detectConnectedGoogleEmail(),
      INITIAL_DATABASE.usuarios
    );
    if (val.status === 'AUTHORIZED' && val.user) {
      return val.user;
    }
    return null;
  });

  // Re-validação contínua quando o e-mail detectado ou a lista de usuários é alterada
  useEffect(() => {
    const val = GoogleAuthService.validateUserAccess(detectedEmail, db.usuarios);
    setAuthValidation(val);
    if (val.status === 'AUTHORIZED' && val.user) {
      setCurrentUserState(val.user);
      GoogleAuthService.setCurrentUser(val.user);
    } else {
      setCurrentUserState(val.user || null);
    }
  }, [detectedEmail, db.usuarios]);

  // Permissões derivadas do usuário autenticado (RBAC)
  const permissions = getUserPermissions(currentUser);

  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [saidaParaDevolucaoId, setSaidaParaDevolucaoId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => config.lastSyncedAt || null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [connectionModalOpen, setConnectionModalOpen] = useState<boolean>(false);
  const [qrScannerOpen, setQrScannerOpen] = useState<boolean>(false);
  const [qrScanTarget, setQrScanTarget] = useState<QrScanContextTarget | null>(null);

  // Efeito inicial: se tiver URL configurada, tenta sincronizar automaticamente
  useEffect(() => {
    if (config.appsScriptUrl && config.appsScriptUrl.startsWith('http')) {
      syncWithGoogleSheets(config.appsScriptUrl).catch((err) => {
        console.log('Sincronização inicial automática aguardando:', err.message);
      });
    }
  }, []);

  const saveConfig = (newConfig: GoogleSheetsConfig) => {
    setConfig(newConfig);
    GoogleSheetsService.saveConfig(newConfig);
  };

  const setCurrentUser = (user: Usuario) => {
    setCurrentUserState(user);
    GoogleAuthService.setCurrentUser(user);
  };

  const openQrScanner = (target?: QrScanContextTarget) => {
    setQrScanTarget(target || { mode: 'lookup' });
    setQrScannerOpen(true);
  };

  const closeQrScanner = () => {
    setQrScannerOpen(false);
    setQrScanTarget(null);
  };

  /**
   * Sincroniza dados com o Google Sheets via Google Apps Script
   */
  const syncWithGoogleSheets = async (overrideUrl?: string): Promise<boolean> => {
    const targetUrl = overrideUrl || config.appsScriptUrl;
    if (!targetUrl) {
      setSyncError('URL da API Google Apps Script não configurada.');
      return false;
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      const liveDb = await GoogleSheetsService.fetchAllFromAppsScript(targetUrl);
      setDb(liveDb);
      GoogleSheetsService.saveLocalDatabase(liveDb);

      const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      setLastSyncTime(now);
      setIsConnected(true);

      const updatedConfig = { ...config, appsScriptUrl: targetUrl, lastSyncedAt: now };
      saveConfig(updatedConfig);
      return true;
    } catch (err: any) {
      console.error('Erro na sincronização:', err);
      setSyncError(err?.message || 'Falha ao sincronizar com Google Sheets');
      setIsConnected(false);
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  /**
   * Importa a planilha Excel MB_Controle_Equipamentos_AppSheet_PRONTO.xlsx
   */
  const importExcelFile = async (file: File): Promise<{ count: number }> => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const importedDb = await GoogleSheetsService.parseExcelFile(file);
      setDb(importedDb);
      GoogleSheetsService.saveLocalDatabase(importedDb);

      const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      setLastSyncTime(`${now} (Importação Planilha)`);
      setIsConnected(true);
      return { count: importedDb.equipamentos.length };
    } catch (err: any) {
      setSyncError(err?.message || 'Erro ao ler arquivo da planilha');
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  const findEquipamentoByCodigo = (codigo: string): Equipamento | undefined => {
    if (!codigo) return undefined;
    const clean = codigo.trim().toUpperCase();
    return db.equipamentos.find(
      (e) => e.codigo.toUpperCase() === clean || e.numeroSerie?.toUpperCase() === clean
    );
  };

  const findEquipamentoById = (id: string): Equipamento | undefined => {
    return db.equipamentos.find((e) => e.id === id);
  };

  /**
   * FLUXO 1: Criar Nova Saída com Itens
   */
  const criarNovaSaida = async (
    novaSaidaData: Omit<Saida, 'id' | 'codigo' | 'status'>,
    itensEquipamentoIds: string[]
  ): Promise<Saida> => {
    const saidaId = `sai-${Date.now()}`;
    const codigoSaida = `SAI-${String(db.saidas.length + 1).padStart(3, '0')}`;

    const novaSaida: Saida = {
      ...novaSaidaData,
      id: saidaId,
      codigo: codigoSaida,
      status: 'Aguardando Checklist',
      criadoPor: currentUser?.nome || 'Operador',
      criadoEm: new Date().toISOString(),
    };

    const novosItens: SaidaItem[] = itensEquipamentoIds.map((eqId, idx) => {
      const eq = findEquipamentoById(eqId);
      return {
        id: `item-${Date.now()}-${idx}`,
        saidaId: saidaId,
        equipamentoId: eqId,
        codigoEquipamento: eq?.codigo || '',
        nomeEquipamento: eq?.nome,
        categoriaEquipamento: eq?.categoria,
        checklistQrConfirmado: false,
        condicaoSaida: 'Bom',
      };
    });

    const updatedDb: MBDatabase = {
      ...db,
      saidas: [novaSaida, ...db.saidas],
      saidaItens: [...novosItens, ...db.saidaItens],
    };

    setDb(updatedDb);
    GoogleSheetsService.saveLocalDatabase(updatedDb);

    // Se conectado ao Apps Script, envia os registros
    if (config.appsScriptUrl) {
      GoogleSheetsService.sendUpdateToAppsScript(config.appsScriptUrl, 'insert', {
        table: 'SAIDAS',
        data: novaSaida,
      }).catch(console.error);
    }

    return novaSaida;
  };

  /**
   * FLUXO 2: Confirmar Checklist QR do Equipamento na Saída
   */
  const confirmarItemChecklistQr = (saidaId: string, codigoEquipamento: string): boolean => {
    const cleanCodigo = codigoEquipamento.trim().toUpperCase();
    let found = false;

    const updatedItens = db.saidaItens.map((item) => {
      if (item.saidaId === saidaId && item.codigoEquipamento.toUpperCase() === cleanCodigo) {
        found = true;
        return {
          ...item,
          checklistQrConfirmado: true,
          dataHoraChecklist: new Date().toISOString(),
        };
      }
      return item;
    });

    if (found) {
      const updatedDb = { ...db, saidaItens: updatedItens };
      setDb(updatedDb);
      GoogleSheetsService.saveLocalDatabase(updatedDb);
    }

    return found;
  };

  /**
   * FLUXO 3: Liberar para Campo
   * Altera status da saída para 'Em Campo' e atualiza equipamentos para 'Em Campo'
   */
  const liberarSaidaParaCampo = async (saidaId: string): Promise<void> => {
    const saida = db.saidas.find((s) => s.id === saidaId);
    if (!saida) throw new Error('Saída não encontrada');

    const itensDaSaida = db.saidaItens.filter((i) => i.saidaId === saidaId);
    const equipamentoIds = new Set(itensDaSaida.map((i) => i.equipamentoId));

    // Atualiza status dos equipamentos para 'EM CAMPO'
    const updatedEquipamentos = db.equipamentos.map((eq) => {
      if (equipamentoIds.has(eq.id)) {
        return {
          ...eq,
          status: 'EM CAMPO' as const,
          obraAtualId: saida.obraId,
          obraAtualNome: saida.obraNome,
          responsavelAtualId: saida.responsavelId,
          responsavelAtualNome: saida.responsavelNome,
        };
      }
      return eq;
    });

    // Atualiza status da saída
    const updatedSaidas = db.saidas.map((s) => {
      if (s.id === saidaId) {
        return { ...s, status: 'Em Campo' as const };
      }
      return s;
    });

    const updatedDb: MBDatabase = {
      ...db,
      equipamentos: updatedEquipamentos,
      saidas: updatedSaidas,
    };

    setDb(updatedDb);
    GoogleSheetsService.saveLocalDatabase(updatedDb);

    if (config.appsScriptUrl) {
      GoogleSheetsService.sendUpdateToAppsScript(config.appsScriptUrl, 'update', {
        table: 'SAIDAS',
        keyField: 'ID',
        keyValue: saidaId,
        data: { Status: 'Em Campo' },
      }).catch(console.error);
    }
  };

  /**
   * FLUXO OFICIAL PROMPT 5: Liberar Saída por Kit para Campo
   * Registra SAIDA, cria registros SAIDA ITENS, muda equipamentos para EM CAMPO,
   * vincula responsável, obra, data/hora.
   */
  const concluirSaidaKitComItens = async (dados: {
    obraId: string;
    obraNome: string;
    responsavelId: string;
    responsavelNome: string;
    kitId?: string;
    kitNome?: string;
    previsaoDevolucao?: string;
    observacoes?: string;
    itensConferidos: {
      equipamentoId: string;
      codigoEquipamento: string;
      dataHoraChecklist: string;
    }[];
  }): Promise<Saida> => {
    const agora = new Date().toISOString();
    const dataSaidaHoje = agora.split('T')[0];
    const saidaId = `sai-${Date.now()}`;
    const codigoSaida = `SAI-${String(db.saidas.length + 1).padStart(3, '0')}`;

    const novaSaida: Saida = {
      id: saidaId,
      codigo: codigoSaida,
      obraId: dados.obraId,
      obraNome: dados.obraNome,
      responsavelId: dados.responsavelId,
      responsavelNome: dados.responsavelNome,
      kitId: dados.kitId,
      kitNome: dados.kitNome,
      dataSaida: dataSaidaHoje,
      previsaoDevolucao: dados.previsaoDevolucao,
      status: 'Em Campo',
      observacoes: dados.observacoes,
      criadoPor: currentUser?.nome || 'Operador',
      criadoEm: agora,
    };

    const novosItens: SaidaItem[] = dados.itensConferidos.map((item, idx) => {
      const eq = findEquipamentoById(item.equipamentoId) || findEquipamentoByCodigo(item.codigoEquipamento);
      return {
        id: `item-${Date.now()}-${idx}`,
        saidaId: saidaId,
        equipamentoId: item.equipamentoId,
        codigoEquipamento: item.codigoEquipamento,
        nomeEquipamento: eq?.nome,
        categoriaEquipamento: eq?.categoria,
        checklistQrConfirmado: true,
        dataHoraChecklist: item.dataHoraChecklist || agora,
        condicaoSaida: 'Excelente',
      };
    });

    const conferidosIdsSet = new Set(dados.itensConferidos.map((i) => i.equipamentoId));

    // Mudar equipamentos para EM CAMPO, registrar responsável, obra, data/hora
    const updatedEquipamentos = db.equipamentos.map((eq) => {
      const isConferido =
        conferidosIdsSet.has(eq.id) ||
        dados.itensConferidos.some((i) => i.codigoEquipamento.toUpperCase() === eq.codigo.toUpperCase());

      if (isConferido) {
        return {
          ...eq,
          status: 'EM CAMPO' as const,
          obraAtualId: dados.obraId,
          obraAtualNome: dados.obraNome,
          responsavelAtualId: dados.responsavelId,
          responsavelAtualNome: dados.responsavelNome,
          localizacaoAtual: dados.obraNome || eq.localizacaoAtual,
        };
      }
      return eq;
    });

    // Auditoria de operações críticas: usuário, data, hora (PROMPT 7)
    const novasMovimentacoes: Movimentacao[] = dados.itensConferidos.map((item) => {
      const eq = findEquipamentoById(item.equipamentoId) || findEquipamentoByCodigo(item.codigoEquipamento);
      return {
        id: `mov-${Date.now()}-${item.equipamentoId}`,
        tipo: 'SAIDA' as const,
        equipamentoId: item.equipamentoId,
        codigoEquipamento: item.codigoEquipamento,
        nomeEquipamento: eq?.nome || 'Equipamento',
        saidaId: saidaId,
        codigoSaida: novaSaida.codigo,
        obraId: dados.obraId,
        obraNome: dados.obraNome,
        responsavelId: dados.responsavelId,
        responsavelNome: dados.responsavelNome,
        statusAnterior: eq?.status || 'DISPONÍVEL',
        statusNovo: 'EM CAMPO',
        dataHora: agora,
        usuarioNome: currentUser?.nome || 'Operador M&B',
        usuarioEmail: currentUser?.email,
      };
    });

    // Revalidação rigorosa de disponibilidade antes de confirmar checkout
    for (const item of dados.itensConferidos) {
      const eq = findEquipamentoById(item.equipamentoId) || findEquipamentoByCodigo(item.codigoEquipamento);
      if (eq && (eq.status === 'EM CAMPO' || eq.status === 'MANUTENÇÃO' || eq.status === 'BLOQUEADO')) {
        throw new Error(`Conflito de checkout: O equipamento ${eq.codigo} (${eq.nome}) já se encontra com status ${eq.status}.`);
      }
    }

    const updatedDb: MBDatabase = {
      ...db,
      saidas: [novaSaida, ...db.saidas],
      saidaItens: [...novosItens, ...db.saidaItens],
      equipamentos: updatedEquipamentos,
      movimentacoes: [...novasMovimentacoes, ...(db.movimentacoes || [])],
    };

    setDb(updatedDb);
    GoogleSheetsService.saveLocalDatabase(updatedDb);

    if (config.appsScriptUrl) {
      // Usa o endpoint transacional de checkout com LockService no Apps Script
      GoogleSheetsService.sendUpdateToAppsScript(config.appsScriptUrl, 'checkout', {
        saida: novaSaida,
        itens: novosItens,
      }).catch((err) => {
        console.warn('Erro na sincronização online de checkout, salvo localmente:', err);
      });
    }

    return novaSaida;
  };

  /**
   * PROMPT 6: Fluxo Completo de Devolução por Item com Estados e Auditoria
   * Regras:
   * OK → DISPONÍVEL.
   * DESGASTE NORMAL → DISPONÍVEL, mantendo observação.
   * AVARIADO → MANUTENÇÃO (com registro completo na tabela MANUTENCOES).
   * NÃO LOCALIZADO → RETORNO PENDENTE.
   * Auditoria completa de movimentação (usuário, data/hora).
   * Nunca apagar registros de saída ou devolução concluídos.
   */
  const registrarDevolucaoItem = async (dados: {
    saidaId: string;
    itemId: string;
    estadoRetorno: EstadoRetorno;
    observacao?: string;
    fotoUrl?: string;
    dadosManutencao?: {
      descricao?: string;
      prioridade?: PrioridadeManutencao;
      fornecedor?: string;
      custo?: number;
      responsavel?: string;
      status?: Manutencao['status'];
      conclusao?: string;
    };
  }): Promise<{ statusNovo: StatusEquipamento; manutencaoCriada?: Manutencao }> => {
    const { saidaId, itemId, estadoRetorno, observacao, fotoUrl, dadosManutencao } = dados;
    const nowIso = new Date().toISOString();
    const userNome = currentUser?.nome || 'Operador M&B';
    const userEmail = currentUser?.email || 'jefferson21D2@gmail.com';

    const item = db.saidaItens.find(
      (i) => (i.id === itemId || i.codigoEquipamento === itemId || i.equipamentoId === itemId) && i.saidaId === saidaId
    );
    if (!item) {
      throw new Error(`Item ${itemId} não localizado nesta saída.`);
    }

    const eq = db.equipamentos.find(
      (e) => e.id === item.equipamentoId || e.codigo === item.codigoEquipamento
    );
    if (!eq) {
      throw new Error(`Equipamento ${item.codigoEquipamento} não encontrado no inventário.`);
    }

    const saida = db.saidas.find((s) => s.id === saidaId);

    let novoStatusEq: StatusEquipamento = 'DISPONÍVEL';
    let novaManutencao: Manutencao | undefined;

    if (estadoRetorno === 'OK') {
      novoStatusEq = 'DISPONÍVEL';
    } else if (estadoRetorno === 'DESGASTE NORMAL') {
      novoStatusEq = 'DISPONÍVEL';
    } else if (estadoRetorno === 'AVARIADO') {
      novoStatusEq = 'MANUTENÇÃO';

      // Manutenção deve possuir: equipamento, abertura, responsável, descrição, foto, prioridade, fornecedor, custo, status e conclusão.
      novaManutencao = {
        id: `man-${Date.now()}-${eq.id}`,
        equipamentoId: eq.id,
        codigoEquipamento: eq.codigo,
        nomeEquipamento: eq.nome,
        abertura: nowIso,
        responsavel: dadosManutencao?.responsavel || userNome,
        descricao: dadosManutencao?.descricao || observacao || 'Avaria identificada na devolução e conferência de retorno.',
        foto: fotoUrl || undefined,
        prioridade: dadosManutencao?.prioridade || 'Alta',
        fornecedor: dadosManutencao?.fornecedor || undefined,
        custo: dadosManutencao?.custo !== undefined ? Number(dadosManutencao.custo) : undefined,
        status: dadosManutencao?.status || 'Em Andamento',
        conclusao: dadosManutencao?.conclusao || undefined,
        tipo: 'Corretiva',
        dataEntrada: nowIso.split('T')[0],
      };
    } else if (estadoRetorno === 'NÃO LOCALIZADO') {
      novoStatusEq = 'RETORNO PENDENTE';
    }

    // Atualiza Equipamento
    const updatedEquipamentos = db.equipamentos.map((e) => {
      if (e.id === eq.id) {
        if (novoStatusEq === 'DISPONÍVEL') {
          return {
            ...e,
            status: novoStatusEq,
            obraAtualId: undefined,
            obraAtualNome: undefined,
            responsavelAtualId: undefined,
            responsavelAtualNome: undefined,
            localizacaoAtual: e.localizacaoPadrao || 'Escritorio Palmas',
            observacoes:
              estadoRetorno === 'DESGASTE NORMAL' && observacao
                ? `${e.observacoes ? e.observacoes + ' | ' : ''}[Desgaste Normal ${nowIso.split('T')[0]}]: ${observacao}`
                : e.observacoes,
          };
        } else if (novoStatusEq === 'MANUTENÇÃO') {
          return {
            ...e,
            status: novoStatusEq,
            obraAtualId: undefined,
            obraAtualNome: undefined,
            localizacaoAtual: 'Oficina / Manutenção',
            observacoes: observacao
              ? `${e.observacoes ? e.observacoes + ' | ' : ''}[Avaria ${nowIso.split('T')[0]}]: ${observacao}`
              : e.observacoes,
          };
        } else if (novoStatusEq === 'RETORNO PENDENTE') {
          return {
            ...e,
            status: novoStatusEq,
            observacoes: observacao
              ? `${e.observacoes ? e.observacoes + ' | ' : ''}[Não Localizado ${nowIso.split('T')[0]}]: ${observacao}`
              : e.observacoes,
          };
        }
      }
      return e;
    });

    // Atualiza Saída Item
    const updatedSaidaItens = db.saidaItens.map((si) => {
      if (si.id === item.id) {
        return {
          ...si,
          devolvido: true,
          estadoRetorno,
          observacaoDevolucao: observacao || si.observacaoDevolucao,
          fotoDevolucaoUrl: fotoUrl || si.fotoDevolucaoUrl,
          dataHoraDevolucao: nowIso,
          manutencaoId: novaManutencao?.id || si.manutencaoId,
          auditoriaUsuario: userNome,
          condicaoDevolucao:
            estadoRetorno === 'OK'
              ? 'Excelente'
              : estadoRetorno === 'DESGASTE NORMAL'
              ? 'Bom'
              : estadoRetorno === 'AVARIADO'
              ? 'Necessita Reparo'
              : 'Avarias Leves',
        };
      }
      return si;
    });

    // Registra Auditoria Completa da Movimentação (PROMPT 6)
    const novaMovimentacao: Movimentacao = {
      id: `mov-${Date.now()}-${eq.id}`,
      tipo:
        estadoRetorno === 'AVARIADO'
          ? 'MANUTENCAO_ABERTURA'
          : estadoRetorno === 'NÃO LOCALIZADO'
          ? 'RETORNO_PENDENTE'
          : 'DEVOLUCAO',
      equipamentoId: eq.id,
      codigoEquipamento: eq.codigo,
      nomeEquipamento: eq.nome,
      saidaId,
      codigoSaida: saida?.codigo,
      obraId: saida?.obraId,
      obraNome: saida?.obraNome,
      responsavelId: saida?.responsavelId,
      responsavelNome: saida?.responsavelNome,
      statusAnterior: eq.status,
      statusNovo: novoStatusEq,
      estadoRetorno,
      observacoes: observacao,
      fotoUrl: fotoUrl,
      dataHora: nowIso,
      usuarioNome: userNome,
      usuarioEmail: userEmail,
    };

    // Atualiza Saída (se todos foram devolvidos, encerra como Devolvido ou Devolvido Parcial)
    const todosItensDestaSaida = updatedSaidaItens.filter((si) => si.saidaId === saidaId);
    const todosDevolvidos =
      todosItensDestaSaida.length > 0 && todosItensDestaSaida.every((si) => si.devolvido);
    const temNaoLocalizado = todosItensDestaSaida.some((si) => si.estadoRetorno === 'NÃO LOCALIZADO');

    const updatedSaidas = db.saidas.map((s) => {
      if (s.id === saidaId) {
        if (todosDevolvidos) {
          return {
            ...s,
            status: temNaoLocalizado ? ('Devolvido Parcial' as const) : ('Devolvido' as const),
            dataDevolucaoReal: nowIso,
          };
        } else {
          const algumDevolvido = todosItensDestaSaida.some((si) => si.devolvido);
          if (algumDevolvido && s.status === 'Em Campo') {
            return {
              ...s,
              status: 'Devolvido Parcial' as const,
            };
          }
        }
      }
      return s;
    });

    const updatedManutencoes = novaManutencao ? [novaManutencao, ...db.manutencoes] : db.manutencoes;
    const updatedMovimentacoes = [novaMovimentacao, ...(db.movimentacoes || [])];

    const updatedDb: MBDatabase = {
      ...db,
      equipamentos: updatedEquipamentos,
      saidaItens: updatedSaidaItens,
      saidas: updatedSaidas,
      manutencoes: updatedManutencoes,
      movimentacoes: updatedMovimentacoes,
    };

    setDb(updatedDb);
    GoogleSheetsService.saveLocalDatabase(updatedDb);

    if (config.appsScriptUrl) {
      GoogleSheetsService.sendUpdateToAppsScript(config.appsScriptUrl, 'update', {
        table: 'SAIDA ITENS',
        keyField: 'ID',
        keyValue: item.id,
        data: {
          Devolvido: true,
          'Estado Retorno': estadoRetorno,
          'Observação Devolução': observacao,
          'Data/Hora Devolução': nowIso,
          'Auditoria Usuário': userNome,
          'Foto Devolução': fotoUrl,
          'Manutenção ID': novaManutencao?.id,
        },
      }).catch(console.error);

      GoogleSheetsService.sendUpdateToAppsScript(config.appsScriptUrl, 'update', {
        table: 'EQUIPAMENTOS',
        keyField: 'Código do Equipamento',
        keyValue: eq.codigo,
        data: {
          Status: novoStatusEq,
          'Localização Atual':
            novoStatusEq === 'DISPONÍVEL'
              ? eq.localizacaoPadrao || 'Escritorio Palmas'
              : novoStatusEq === 'MANUTENÇÃO'
              ? 'Oficina / Manutenção'
              : eq.localizacaoAtual,
        },
      }).catch(console.error);

      if (novaManutencao) {
        GoogleSheetsService.sendUpdateToAppsScript(config.appsScriptUrl, 'insert', {
          table: 'MANUTENCOES',
          data: novaManutencao,
        }).catch(console.error);
      }
    }

    return { statusNovo: novoStatusEq, manutencaoCriada: novaManutencao };
  };

  /**
   * Conclui devolução total da saída
   */
  const concluirDevolucaoSaida = async (saidaId: string, observacoesFinais?: string): Promise<Saida> => {
    const saida = db.saidas.find((s) => s.id === saidaId);
    if (!saida) throw new Error('Saída não encontrada.');

    const itens = db.saidaItens.filter((i) => i.saidaId === saidaId);
    const temNaoLocalizado = itens.some((i) => i.estadoRetorno === 'NÃO LOCALIZADO');
    const statusFinal = temNaoLocalizado ? ('Devolvido Parcial' as const) : ('Devolvido' as const);
    const nowIso = new Date().toISOString();

    const updatedSaidas = db.saidas.map((s) => {
      if (s.id === saidaId) {
        return {
          ...s,
          status: statusFinal,
          dataDevolucaoReal: nowIso,
          observacoes: observacoesFinais
            ? `${s.observacoes ? s.observacoes + ' | ' : ''}[Devolução Concluída]: ${observacoesFinais}`
            : s.observacoes,
        };
      }
      return s;
    });

    const updatedDb: MBDatabase = {
      ...db,
      saidas: updatedSaidas,
    };

    setDb(updatedDb);
    GoogleSheetsService.saveLocalDatabase(updatedDb);

    if (config.appsScriptUrl) {
      GoogleSheetsService.sendUpdateToAppsScript(config.appsScriptUrl, 'update', {
        table: 'SAIDAS',
        keyField: 'ID',
        keyValue: saidaId,
        data: {
          Status: statusFinal,
          'Data Devolução Real': nowIso,
        },
      }).catch(console.error);
    }

    return updatedSaidas.find((s) => s.id === saidaId)!;
  };

  /**
   * FLUXO 4: Devolução de Equipamentos com Inspeção
   */
  const realizarDevolucao = async (
    saidaId: string,
    itensCondicoes: { itemId: string; condicao: SaidaItem['condicaoDevolucao']; obs?: string; enviarManutencao?: boolean }[]
  ): Promise<void> => {
    const condicoesMap = new Map(itensCondicoes.map((i) => [i.itemId, i]));
    const novasManutencoes: Manutencao[] = [];

    const updatedItens = db.saidaItens.map((item) => {
      if (item.saidaId === saidaId && condicoesMap.has(item.id)) {
        const info = condicoesMap.get(item.id)!;
        return {
          ...item,
          condicaoDevolucao: info.condicao || 'Bom',
          observacaoDevolucao: info.obs,
        };
      }
      return item;
    });

    const saidaItens = db.saidaItens.filter((i) => i.saidaId === saidaId);
    const equipamentoIds = new Set(saidaItens.map((i) => i.equipamentoId));

    // Determina se item vai para manutenção ou volta para disponível
    const updatedEquipamentos = db.equipamentos.map((eq) => {
      if (equipamentoIds.has(eq.id)) {
        const item = saidaItens.find((i) => i.equipamentoId === eq.id);
        const cond = item ? condicoesMap.get(item.id) : undefined;
        const precisaManutencao = cond?.enviarManutencao || cond?.condicao === 'Necessita Reparo';

        if (precisaManutencao) {
          novasManutencoes.push({
            id: `man-${Date.now()}-${eq.id}`,
            equipamentoId: eq.id,
            codigoEquipamento: eq.codigo,
            nomeEquipamento: eq.nome,
            abertura: new Date().toISOString(),
            responsavel: currentUser?.nome || 'Operador Técnico',
            prioridade: 'Alta',
            tipo: 'Corretiva',
            descricao: cond?.obs || 'Identificado avaria na devolução de campo',
            dataEntrada: new Date().toISOString().split('T')[0],
            status: 'Em Andamento',
          });

          return {
            ...eq,
            status: 'MANUTENÇÃO' as const,
            obraAtualId: undefined,
            obraAtualNome: undefined,
          };
        }

        return {
          ...eq,
          status: 'DISPONÍVEL' as const,
          obraAtualId: undefined,
          obraAtualNome: undefined,
          responsavelAtualId: undefined,
          responsavelAtualNome: undefined,
        };
      }
      return eq;
    });

    const updatedSaidas = db.saidas.map((s) => {
      if (s.id === saidaId) {
        return {
          ...s,
          status: 'Devolvido' as const,
          dataDevolucaoReal: new Date().toISOString(),
        };
      }
      return s;
    });

    const updatedDb: MBDatabase = {
      ...db,
      equipamentos: updatedEquipamentos,
      saidas: updatedSaidas,
      saidaItens: updatedItens,
      manutencoes: [...novasManutencoes, ...db.manutencoes],
    };

    setDb(updatedDb);
    GoogleSheetsService.saveLocalDatabase(updatedDb);

    if (config.appsScriptUrl) {
      GoogleSheetsService.sendUpdateToAppsScript(config.appsScriptUrl, 'update', {
        table: 'SAIDAS',
        keyField: 'ID',
        keyValue: saidaId,
        data: { Status: 'Devolvido', 'Data Devolução Real': new Date().toISOString() },
      }).catch(console.error);
    }
  };

  /**
   * FLUXO 5: Registrar Manutenção
   */
  const registrarManutencao = async (novaManutencaoData: Omit<Manutencao, 'id'>): Promise<void> => {
    const novaManutencao: Manutencao = {
      ...novaManutencaoData,
      id: `man-${Date.now()}`,
    };

    // Atualiza equipamento para Manutenção / Calibração
    const statusEq = 'MANUTENÇÃO' as const;
    const updatedEquipamentos = db.equipamentos.map((eq) => {
      if (eq.id === novaManutencao.equipamentoId) {
        return { ...eq, status: statusEq };
      }
      return eq;
    });

    const updatedDb: MBDatabase = {
      ...db,
      manutencoes: [novaManutencao, ...db.manutencoes],
      equipamentos: updatedEquipamentos,
    };

    setDb(updatedDb);
    GoogleSheetsService.saveLocalDatabase(updatedDb);

    if (config.appsScriptUrl) {
      GoogleSheetsService.sendUpdateToAppsScript(config.appsScriptUrl, 'insert', {
        table: 'MANUTENCOES',
        data: novaManutencao,
      }).catch(console.error);
    }
  };

  /**
   * FLUXO 6: Concluir Manutenção (retorna para Disponível)
   */
  const concluirManutencao = async (manutencaoId: string): Promise<void> => {
    const man = db.manutencoes.find((m) => m.id === manutencaoId);
    if (!man) return;

    const updatedManutencoes = db.manutencoes.map((m) => {
      if (m.id === manutencaoId) {
        return {
          ...m,
          status: 'Concluída' as const,
          dataConclusao: new Date().toISOString().split('T')[0],
        };
      }
      return m;
    });

    const updatedEquipamentos = db.equipamentos.map((eq) => {
      if (eq.id === man.equipamentoId) {
        return { ...eq, status: 'DISPONÍVEL' as const };
      }
      return eq;
    });

    const agora = new Date().toISOString();
    const novaMovimentacao: Movimentacao = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      tipo: 'MANUTENCAO_CONCLUSAO',
      equipamentoId: man.equipamentoId,
      codigoEquipamento: man.codigoEquipamento,
      nomeEquipamento: man.nomeEquipamento || 'Equipamento',
      statusAnterior: 'MANUTENÇÃO',
      statusNovo: 'DISPONÍVEL',
      observacoes: `Manutenção concluída e liberada para o estoque. Laudo: ${man.conclusao || 'Reparo finalizado com sucesso'}`,
      dataHora: agora,
      usuarioNome: currentUser?.nome || 'Técnico Especialista',
      usuarioEmail: currentUser?.email,
    };

    const updatedDb: MBDatabase = {
      ...db,
      manutencoes: updatedManutencoes,
      equipamentos: updatedEquipamentos,
      movimentacoes: [novaMovimentacao, ...(db.movimentacoes || [])],
    };

    setDb(updatedDb);
    GoogleSheetsService.saveLocalDatabase(updatedDb);
  };

  /**
   * FLUXO 7: Atualizar Fotografia Real do Equipamento (PROMPT 4)
   * Foto do Equipamento = fotografia real do patrimônio da empresa
   * A foto real sempre tem prioridade sobre a Imagem Modelo
   */
  const atualizarFotoEquipamento = async (
    equipamentoId: string,
    novaFotoUrl: string,
    meta?: { fotoDrivePath?: string; fotoNomeArquivo?: string }
  ): Promise<void> => {
    const eq = db.equipamentos.find((e) => e.id === equipamentoId || e.codigo === equipamentoId);
    if (!eq) return;

    const agora = new Date().toISOString();
    const updatedEquipamentos = db.equipamentos.map((item) => {
      if (item.id === eq.id || item.codigo === eq.codigo) {
        return {
          ...item,
          fotoUrl: novaFotoUrl,
          fotoAtualizadaEm: agora,
          fotoDrivePath: meta?.fotoDrivePath || `M&B Controle Equipamentos/Fotos/${eq.codigo}/`,
          fotoNomeArquivo: meta?.fotoNomeArquivo || `${eq.codigo}_FOTO.jpg`,
        };
      }
      return item;
    });

    const updatedDb: MBDatabase = {
      ...db,
      equipamentos: updatedEquipamentos,
    };

    setDb(updatedDb);
    GoogleSheetsService.saveLocalDatabase(updatedDb);
  };

  /**
   * FLUXO 8: Remover Fotografia Real do Equipamento (PROMPT 4 - com confirmação)
   * Limpa a foto real, voltando a exibir a Imagem Modelo se houver.
   */
  const removerFotoEquipamento = async (equipamentoId: string): Promise<void> => {
    const eq = db.equipamentos.find((e) => e.id === equipamentoId || e.codigo === equipamentoId);
    if (!eq) return;

    const updatedEquipamentos = db.equipamentos.map((item) => {
      if (item.id === eq.id || item.codigo === eq.codigo) {
        return {
          ...item,
          fotoUrl: undefined,
          fotoAtualizadaEm: undefined,
          fotoDrivePath: undefined,
          fotoNomeArquivo: undefined,
        };
      }
      return item;
    });

    const updatedDb: MBDatabase = {
      ...db,
      equipamentos: updatedEquipamentos,
    };

    setDb(updatedDb);
    GoogleSheetsService.saveLocalDatabase(updatedDb);

    if (config.appsScriptUrl) {
      GoogleSheetsService.removeEquipmentPhoto(config.appsScriptUrl, eq.codigo).catch(console.error);
    }
  };

  /**
   * PROMPT 7: Ações de Autenticação e Gestão de Usuários
   */
  const loginWithGoogleEmail = async (email: string): Promise<boolean> => {
    const cleanEmail = email.trim().toLowerCase();
    GoogleAuthService.switchConnectedEmail(cleanEmail);
    setDetectedEmail(cleanEmail);
    const val = GoogleAuthService.validateUserAccess(cleanEmail, db.usuarios);
    setAuthValidation(val);
    if (val.status === 'AUTHORIZED' && val.user) {
      setCurrentUserState(val.user);
      GoogleAuthService.setCurrentUser(val.user);
      return true;
    } else {
      setCurrentUserState(val.user || null);
      return false;
    }
  };

  const logout = () => {
    GoogleAuthService.logout();
    setDetectedEmail('');
    setAuthValidation({ status: 'UNAUTHENTICATED' });
    setCurrentUserState(null);
  };

  const salvarUsuario = async (usuario: Usuario): Promise<void> => {
    if (!permissions.canAdministrarUsuarios) {
      throw new Error('Acesso negado: Apenas Administradores podem gerenciar usuários.');
    }

    const existe = db.usuarios.some((u) => u.id === usuario.id);
    const updatedUsuarios = existe
      ? db.usuarios.map((u) => (u.id === usuario.id ? usuario : u))
      : [...db.usuarios, usuario];

    const agora = new Date().toISOString();
    const novaMovimentacao: Movimentacao = {
      id: `mov-${Date.now()}-usr`,
      tipo: 'GOVERNANCA',
      observacoes: `[GOVERNANÇA]: ${existe ? 'Atualização' : 'Cadastro'} do usuário ${usuario.nome} (${usuario.email}) - Perfil: ${usuario.perfil} - Ativo: ${usuario.ativo}`,
      dataHora: agora,
      usuarioNome: currentUser?.nome || 'Administrador M&B',
      usuarioEmail: currentUser?.email,
    };

    const updatedDb: MBDatabase = {
      ...db,
      usuarios: updatedUsuarios,
      movimentacoes: [novaMovimentacao, ...(db.movimentacoes || [])],
    };

    setDb(updatedDb);
    GoogleSheetsService.saveLocalDatabase(updatedDb);

    if (config.appsScriptUrl) {
      GoogleSheetsService.sendUpdateToAppsScript(
        config.appsScriptUrl,
        existe ? 'update' : 'insert',
        {
          table: 'USUARIOS',
          keyField: 'ID',
          keyValue: usuario.id,
          data: usuario,
        }
      ).catch(console.error);
    }
  };

  const alternarStatusUsuario = async (usuarioId: string): Promise<void> => {
    if (!permissions.canAdministrarUsuarios) {
      throw new Error('Acesso negado: Apenas Administradores podem alterar o status de usuários.');
    }

    const target = db.usuarios.find((u) => u.id === usuarioId);
    if (!target) return;

    const novoStatus = !target.ativo;
    const updatedUsuarios = db.usuarios.map((u) =>
      u.id === usuarioId ? { ...u, ativo: novoStatus } : u
    );

    const agora = new Date().toISOString();
    const novaMovimentacao: Movimentacao = {
      id: `mov-${Date.now()}-status`,
      tipo: 'GOVERNANCA',
      observacoes: `[GOVERNANÇA]: Usuário ${target.nome} (${target.email}) foi ${novoStatus ? 'DESBLOQUEADO/ATIVADO' : 'BLOQUEADO/DESATIVADO'}`,
      dataHora: agora,
      usuarioNome: currentUser?.nome || 'Administrador M&B',
      usuarioEmail: currentUser?.email,
    };

    const updatedDb: MBDatabase = {
      ...db,
      usuarios: updatedUsuarios,
      movimentacoes: [novaMovimentacao, ...(db.movimentacoes || [])],
    };

    setDb(updatedDb);
    GoogleSheetsService.saveLocalDatabase(updatedDb);

    // Se o usuário afetado for o atual conectado, atualiza o status de validação
    if (currentUser?.id === usuarioId) {
      const val = GoogleAuthService.validateUserAccess(target.email, updatedUsuarios);
      setAuthValidation(val);
      if (!novoStatus) {
        setCurrentUserState({ ...target, ativo: false });
      }
    }
  };

  /**
   * PROMPT 7: Cadastrar Patrimônio (Apenas Administrador)
   */
  const cadastrarEquipamento = async (novoData: Omit<Equipamento, 'id'>): Promise<Equipamento> => {
    if (!permissions.canCadastrarPatrimonio) {
      throw new Error('Acesso negado: Somente Administradores podem cadastrar patrimônio.');
    }

    const id = novoData.codigo || `EQ-${Date.now()}`;
    const novoEquipamento: Equipamento = {
      ...novoData,
      id,
    };

    const agora = new Date().toISOString();
    const novaMovimentacao: Movimentacao = {
      id: `mov-${Date.now()}-${novoEquipamento.codigo}`,
      tipo: 'DEVOLUCAO',
      equipamentoId: novoEquipamento.id,
      codigoEquipamento: novoEquipamento.codigo,
      nomeEquipamento: novoEquipamento.nome,
      statusAnterior: 'DISPONÍVEL',
      statusNovo: novoEquipamento.status || 'DISPONÍVEL',
      observacoes: `[PATRIMÔNIO CADASTRADO]: ${novoEquipamento.nome} (${novoEquipamento.categoria}) adicionado ao inventário.`,
      dataHora: agora,
      usuarioNome: currentUser?.nome || 'Administrador M&B',
      usuarioEmail: currentUser?.email,
    };

    const updatedDb: MBDatabase = {
      ...db,
      equipamentos: [novoEquipamento, ...db.equipamentos],
      movimentacoes: [novaMovimentacao, ...(db.movimentacoes || [])],
    };

    setDb(updatedDb);
    GoogleSheetsService.saveLocalDatabase(updatedDb);

    if (config.appsScriptUrl) {
      GoogleSheetsService.sendUpdateToAppsScript(config.appsScriptUrl, 'insert', {
        table: 'EQUIPAMENTOS',
        data: novoEquipamento,
      }).catch(console.error);
    }

    return novoEquipamento;
  };

  /**
   * PROMPT 7: Editar Patrimônio (Apenas Administrador. UUID imutável)
   */
  const editarEquipamento = async (id: string, atualizacao: Partial<Equipamento>): Promise<Equipamento> => {
    if (!permissions.canEditarPatrimonio) {
      throw new Error('Acesso negado: Somente Administradores podem editar patrimônio.');
    }

    // Regra estrita do Prompt 7: OPERADOR não pode alterar UUID, e UUID deve ser imutável
    if ('id' in atualizacao && atualizacao.id !== id) {
      throw new Error('Regra de integridade violada: Não é permitido alterar o UUID do equipamento.');
    }

    const agora = new Date().toISOString();
    let updatedItem: Equipamento | null = null;

    const updatedEquipamentos = db.equipamentos.map((eq) => {
      if (eq.id === id || eq.codigo === id) {
        updatedItem = { ...eq, ...atualizacao, id: eq.id };
        return updatedItem;
      }
      return eq;
    });

    if (!updatedItem) throw new Error('Equipamento não encontrado.');

    const novaMovimentacao: Movimentacao = {
      id: `mov-${Date.now()}-${(updatedItem as Equipamento).codigo}`,
      tipo: 'DEVOLUCAO',
      equipamentoId: (updatedItem as Equipamento).id,
      codigoEquipamento: (updatedItem as Equipamento).codigo,
      nomeEquipamento: (updatedItem as Equipamento).nome,
      statusAnterior: (updatedItem as Equipamento).status,
      statusNovo: (updatedItem as Equipamento).status,
      observacoes: `[PATRIMÔNIO ATUALIZADO]: Registro alterado por ${currentUser?.nome || 'Administrador'} em ${agora.split('T')[0]} às ${agora.split('T')[1].substring(0, 5)}`,
      dataHora: agora,
      usuarioNome: currentUser?.nome || 'Administrador M&B',
      usuarioEmail: currentUser?.email,
    };

    const updatedDb: MBDatabase = {
      ...db,
      equipamentos: updatedEquipamentos,
      movimentacoes: [novaMovimentacao, ...(db.movimentacoes || [])],
    };

    setDb(updatedDb);
    GoogleSheetsService.saveLocalDatabase(updatedDb);

    if (config.appsScriptUrl) {
      GoogleSheetsService.sendUpdateToAppsScript(config.appsScriptUrl, 'update', {
        table: 'EQUIPAMENTOS',
        keyField: 'Código do Equipamento',
        keyValue: (updatedItem as Equipamento).codigo,
        data: updatedItem,
      }).catch(console.error);
    }

    return updatedItem;
  };

  /**
   * PROMPT 7: Excluir Patrimônio (Apenas Administrador. Bloqueado se em campo)
   */
  const excluirEquipamento = async (id: string): Promise<boolean> => {
    if (!permissions.canExcluirEquipamentos) {
      throw new Error('Acesso negado: Somente Administradores têm autorização para excluir patrimônio.');
    }

    const eq = db.equipamentos.find((e) => e.id === id || e.codigo === id);
    if (!eq) return false;

    if (eq.status === 'EM CAMPO') {
      throw new Error('Equipamento em campo não pode ser excluído.');
    }

    const agora = new Date().toISOString();
    const novaMovimentacao: Movimentacao = {
      id: `mov-${Date.now()}-${eq.codigo}`,
      tipo: 'DEVOLUCAO',
      equipamentoId: eq.id,
      codigoEquipamento: eq.codigo,
      nomeEquipamento: eq.nome,
      statusAnterior: eq.status,
      statusNovo: 'BAIXADO',
      observacoes: `[PATRIMÔNIO EXCLUÍDO/BAIXADO]: Equipamento ${eq.codigo} removido do inventário por ${currentUser?.nome || 'Administrador'}`,
      dataHora: agora,
      usuarioNome: currentUser?.nome || 'Administrador M&B',
      usuarioEmail: currentUser?.email,
    };

    const updatedDb: MBDatabase = {
      ...db,
      equipamentos: db.equipamentos.filter((e) => e.id !== eq.id && e.codigo !== eq.codigo),
      movimentacoes: [novaMovimentacao, ...(db.movimentacoes || [])],
    };

    setDb(updatedDb);
    GoogleSheetsService.saveLocalDatabase(updatedDb);
    return true;
  };

  /**
   * PROMPT 7: Apagar Saídas (Apenas Administrador. Bloqueado para saídas concluídas)
   */
  const excluirSaida = async (saidaId: string): Promise<boolean> => {
    if (!permissions.canApagarSaidas) {
      throw new Error('Acesso negado: Operadores não podem apagar saídas.');
    }

    const saida = db.saidas.find((s) => s.id === saidaId);
    if (!saida) return false;

    if (saida.status === 'Devolvido' || saida.status === 'Devolvido Parcial') {
      throw new Error('Regra de integridade: Saídas e devoluções concluídas são imutáveis e nunca podem ser apagadas.');
    }

    const agora = new Date().toISOString();
    const novaMovimentacao: Movimentacao = {
      id: `mov-${Date.now()}-${saida.codigo}`,
      tipo: 'SAIDA',
      saidaId: saida.id,
      codigoSaida: saida.codigo,
      statusAnterior: saida.status,
      statusNovo: 'Rascunho',
      observacoes: `[SAÍDA EXCLUÍDA]: Saída ${saida.codigo} cancelada/apagada por ${currentUser?.nome || 'Administrador'}`,
      dataHora: agora,
      usuarioNome: currentUser?.nome || 'Administrador M&B',
      usuarioEmail: currentUser?.email,
    };

    const updatedDb: MBDatabase = {
      ...db,
      saidas: db.saidas.filter((s) => s.id !== saidaId),
      saidaItens: db.saidaItens.filter((i) => i.saidaId !== saidaId),
      movimentacoes: [novaMovimentacao, ...(db.movimentacoes || [])],
    };

    setDb(updatedDb);
    GoogleSheetsService.saveLocalDatabase(updatedDb);
    return true;
  };

  const hasData = db.equipamentos.length > 0;
  const totalEquipamentos = db.equipamentos.length;

  return (
    <AppContext.Provider
      value={{
        db,
        hasData,
        totalEquipamentos,
        config,
        currentUser,
        activeView,
        isSyncing,
        isConnected,
        lastSyncTime,
        syncError,
        connectionModalOpen,
        qrScannerOpen,
        qrScanTarget,
        saidaParaDevolucaoId,
        setSaidaParaDevolucaoId,
        setActiveView,
        setConnectionModalOpen,
        openQrScanner,
        closeQrScanner,
        saveConfig,
        syncWithGoogleSheets,
        importExcelFile,
        setCurrentUser,
        findEquipamentoByCodigo,
        findEquipamentoById,
        criarNovaSaida,
        concluirSaidaKitComItens,
        confirmarItemChecklistQr,
        liberarSaidaParaCampo,
        registrarDevolucaoItem,
        concluirDevolucaoSaida,
        realizarDevolucao,
        registrarManutencao,
        concluirManutencao,
        atualizarFotoEquipamento,
        removerFotoEquipamento,
        permissions,
        authValidation,
        detectedEmail,
        loginWithGoogleEmail,
        logout,
        salvarUsuario,
        alternarStatusUsuario,
        cadastrarEquipamento,
        editarEquipamento,
        excluirEquipamento,
        excluirSaida,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp deve ser utilizado dentro de um AppProvider');
  }
  return context;
};
