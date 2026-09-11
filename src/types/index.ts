/**
 * Tipos e Interfaces do M&B Controle de Equipamentos
 * Compatível com o schema do AppSheet / Google Sheets:
 * Tabelas: EQUIPAMENTOS, KITS, KIT REQUISITOS, USUÁRIOS, OBRAS, SAIDAS, SAIDA ITENS e MANUTENCOES.
 */

// Categorias oficiais de equipamentos
export type CategoriaEquipamento =
  | 'Topografia'
  | 'GNSS'
  | 'Drone'
  | 'Bateria'
  | 'Carregador'
  | 'Tripé'
  | 'Bastão'
  | 'Acessório'
  | 'Outro';

// Status do Equipamento conforme PROMPT 2:
// DISPONÍVEL, EM CAMPO, RETORNO PENDENTE, MANUTENÇÃO, BLOQUEADO e BAIXADO.
export type StatusEquipamento =
  | 'DISPONÍVEL'
  | 'EM CAMPO'
  | 'RETORNO PENDENTE'
  | 'MANUTENÇÃO'
  | 'BLOQUEADO'
  | 'BAIXADO'
  | 'Disponível'
  | 'Em Campo'
  | 'Manutenção'
  | 'Calibração'
  | 'Baixado';

// Status de Saída
export type StatusSaida =
  | 'Rascunho'
  | 'Aguardando Checklist'
  | 'Liberado para Campo'
  | 'Em Campo'
  | 'Devolvido'
  | 'Devolvido Parcial';

// Status da Manutenção
export type StatusManutencao =
  | 'Agendada'
  | 'Em Andamento'
  | 'Aguardando Peça'
  | 'Concluída'
  | 'Cancelada';

export type TipoManutencao = 'Preventiva' | 'Corretiva' | 'Calibração';

// 1. Tabela: EQUIPAMENTOS
export interface Equipamento {
  id: string; // UUID original ou Tag
  codigo: string; // Ex: MB-DRN-001, MB-GNSS-001, MB-BAT-001 (Usado no QR Code)
  nome: string;
  categoria: CategoriaEquipamento | string;
  marca?: string;
  modelo?: string;
  modeloNumero?: string;
  numeroSerie?: string;
  status: StatusEquipamento;
  obraAtualId?: string;
  obraAtualNome?: string;
  responsavelAtualId?: string;
  responsavelAtualNome?: string;
  localizacaoPadrao?: string;
  localizacaoAtual?: string;
  kit?: string;
  tipoChecklist?: string; // Tipo de item para conferência por kit (ex: 'Matrice 350', 'BS65', 'TB65', 'WB37')
  fotoUrl?: string; // Foto real do equipamento (Google Drive ou Upload)
  fotoAtualizadaEm?: string; // Data e hora da última atualização da foto real
  fotoDrivePath?: string; // Caminho no Google Drive: M&B Controle Equipamentos/Fotos/MB-XXX-000/
  fotoNomeArquivo?: string; // Ex: MB-GNSS-001_FOTO.jpg
  imagemModelo?: string; // Imagem do modelo (referência)
  urlFonteImagem?: string; // URL web direta da imagem modelo
  estadoFisico?: string;
  tipoUso?: string;
  parBateria?: string;
  capacidadeBateria?: string;
  ciclosBateria?: number;
  dataAquisicao?: string;
  valorEstimado?: number;
  ultimaCalibracao?: string;
  proximaCalibracao?: string;
  observacoes?: string;
  revisar?: boolean;
}

// 2. Tabela: KITS
export interface Kit {
  id: string; // UUID
  nome: string; // Ex: "Kit Drone Mavic 3 Enterprise", "Kit Base + Rover RTK"
  descricao?: string;
  categoria?: string;
  ativo: boolean;
}

// 3. Tabela: KIT REQUISITOS
export interface KitRequisito {
  id: string; // UUID
  kitId: string; // UUID ref KITS
  categoria: string;
  tipoChecklist: string; // Ex: 'Matrice 350', 'BS65', 'TB65', 'WB37'
  quantidade: number;
  especificacao?: string;
  obrigatorio?: boolean;
}

// 4. Tabela: USUÁRIOS
export interface Usuario {
  id: string; // UUID
  nome: string;
  email: string; // Google Workspace Email
  cargo: string;
  perfil: 'Administrador' | 'Operador' | 'Visualizador';
  telefone?: string;
  fotoUrl?: string;
  ativo: boolean;
}

// 5. Tabela: OBRAS
export interface Obra {
  id: string; // UUID
  codigo: string; // Ex: OBR-001
  nome: string;
  cliente?: string;
  localizacao?: string;
  cidade?: string;
  uf?: string;
  responsavelId?: string;
  responsavelNome?: string;
  dataInicio?: string;
  previsaoTermino?: string;
  status: 'Ativa' | 'Concluída' | 'Pausada';
}

// 6. Tabela: SAIDAS
export interface Saida {
  id: string; // UUID
  codigo: string; // Ex: SAI-2026-001
  obraId: string;
  obraNome?: string;
  responsavelId: string;
  responsavelNome?: string;
  kitId?: string;
  kitNome?: string;
  dataSaida: string; // ISO String ou YYYY-MM-DD
  previsaoDevolucao?: string;
  dataDevolucaoReal?: string;
  status: StatusSaida;
  observacoes?: string;
  termoAssinadoUrl?: string;
  criadoPor?: string;
  criadoEm?: string;
}

// Estados no Retorno do Equipamento conforme PROMPT 6:
// OK, DESGASTE NORMAL, AVARIADO e NÃO LOCALIZADO
export type EstadoRetorno = 'OK' | 'DESGASTE NORMAL' | 'AVARIADO' | 'NÃO LOCALIZADO';

export type PrioridadeManutencao = 'Baixa' | 'Média' | 'Alta' | 'Crítica' | 'Urgente';

// 7. Tabela: SAIDA ITENS
export interface SaidaItem {
  id: string; // UUID
  saidaId: string; // UUID ref SAIDAS
  equipamentoId: string; // UUID ref EQUIPAMENTOS
  codigoEquipamento: string; // MB-XXX-000
  nomeEquipamento?: string;
  categoriaEquipamento?: string;
  checklistQrConfirmado: boolean;
  dataHoraChecklist?: string;
  condicaoSaida: 'Excelente' | 'Bom' | 'Avarias Leves' | 'Necessita Reparo';
  condicaoDevolucao?: 'Excelente' | 'Bom' | 'Avarias Leves' | 'Necessita Reparo';
  observacaoSaida?: string;
  observacaoDevolucao?: string;
  // Campos PROMPT 6 (Devolução e Manutenção):
  devolvido?: boolean;
  estadoRetorno?: EstadoRetorno;
  dataHoraDevolucao?: string;
  fotoDevolucaoUrl?: string;
  manutencaoId?: string;
  auditoriaUsuario?: string;
}

// 8. Tabela: MANUTENCOES (PROMPT 6)
// Deve possuir: equipamento, abertura, responsável, descrição, foto, prioridade, fornecedor, custo, status e conclusão.
export interface Manutencao {
  id: string; // UUID
  equipamentoId: string;
  codigoEquipamento: string;
  nomeEquipamento?: string;
  abertura: string; // Data/hora da abertura da manutenção
  responsavel: string; // Responsável pela abertura ou técnico
  descricao: string; // Descrição detalhada da avaria / defeito
  foto?: string; // URL da fotografia comprobatória da avaria
  prioridade: PrioridadeManutencao; // 'Baixa' | 'Média' | 'Alta' | 'Crítica'
  fornecedor?: string; // Fornecedor / Assistência Técnica autorizada
  custo?: number; // Custo estimado ou efetivo em R$
  status: StatusManutencao | 'Aberta' | 'Em Andamento' | 'Aguardando Peça' | 'Concluída' | 'Cancelada';
  conclusao?: string; // Data ou laudo de conclusão
  tipo?: TipoManutencao; // 'Preventiva' | 'Corretiva' | 'Calibração'
  dataEntrada?: string;
  previsaoRetorno?: string;
  dataConclusao?: string;
  laudoUrl?: string;
  observacoes?: string;
}

// 9. Auditoria e Rastreabilidade Completa de Movimentações (PROMPT 6 e 7)
export interface Movimentacao {
  id: string;
  tipo: 'SAIDA' | 'DEVOLUCAO' | 'MANUTENCAO_ABERTURA' | 'MANUTENCAO_CONCLUSAO' | 'BLOQUEIO' | 'RETORNO_PENDENTE' | 'GOVERNANCA';
  equipamentoId?: string;
  codigoEquipamento?: string;
  nomeEquipamento?: string;
  saidaId?: string;
  codigoSaida?: string;
  obraId?: string;
  obraNome?: string;
  responsavelId?: string;
  responsavelNome?: string;
  statusAnterior?: string;
  statusNovo?: string;
  estadoRetorno?: EstadoRetorno;
  observacoes?: string;
  fotoUrl?: string;
  dataHora: string; // ISO String completa
  usuarioNome: string; // Usuário executor da ação para auditoria
  usuarioEmail?: string;
}

// Configuração da Conexão com Google Sheets / Apps Script
export interface GoogleSheetsConfig {
  appsScriptUrl: string; // Web App URL do Google Apps Script
  spreadsheetId: string; // ID da Planilha Google Sheets
  driveFolderId?: string; // ID da pasta do Google Drive para fotos
  lastSyncedAt?: string;
  autoSync: boolean;
}

// Navegação do Sistema (Fluxo solicitado pelo usuário)
export type AppView =
  | 'dashboard'
  | 'equipamentos'
  | 'nova-saida'
  | 'em-campo'
  | 'devolucao'
  | 'kits'
  | 'manutencao'
  | 'historico'
  | 'usuarios'
  | 'configuracao';

// Estrutura agregada do banco de dados M&B
export interface MBDatabase {
  equipamentos: Equipamento[];
  kits: Kit[];
  kitRequisitos: KitRequisito[];
  usuarios: Usuario[];
  obras: Obra[];
  saidas: Saida[];
  saidaItens: SaidaItem[];
  manutencoes: Manutencao[];
  movimentacoes?: Movimentacao[];
}
