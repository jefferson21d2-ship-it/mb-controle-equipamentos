/**
 * Controle de Permissões e Perfis de Acesso (RBAC) - M&B Topografia & Aerolevantamento
 * Conforme especificação oficial do PROMPT 7:
 *
 * ADMINISTRADOR:
 * - acesso total;
 * - cadastrar/editar patrimônio;
 * - administrar usuários, kits e obras;
 * - visualizar histórico;
 * - corrigir registros autorizados.
 *
 * OPERADOR:
 * - consultar equipamentos;
 * - iniciar saída;
 * - escanear QR;
 * - realizar checklist;
 * - devolver;
 * - informar avaria;
 * - abrir manutenção.
 *
 * OPERADOR NÃO PODE:
 * - excluir equipamentos;
 * - alterar UUID;
 * - alterar histórico concluído;
 * - apagar saídas.
 */

import { Usuario } from '../types';

export interface UserPermissions {
  isAdmin: boolean;
  isOperador: boolean;
  isAtivo: boolean;

  // Patrimônio / Equipamentos
  canConsultarEquipamentos: boolean;
  canCadastrarPatrimonio: boolean;
  canEditarPatrimonio: boolean;
  canExcluirEquipamentos: boolean;
  canAlterarUUID: boolean;

  // Operacional
  canIniciarSaida: boolean;
  canEscanearQR: boolean;
  canRealizarChecklist: boolean;
  canDevolver: boolean;
  canInformarAvaria: boolean;
  canAbrirManutencao: boolean;
  canConcluirManutencao: boolean;

  // Governança e Administração
  canAdministrarUsuarios: boolean;
  canAdministrarKits: boolean;
  canAdministrarObras: boolean;
  canVisualizarHistorico: boolean;
  canAlterarHistoricoConcluido: boolean;
  canApagarSaidas: boolean;
}

export function getUserPermissions(user: Usuario | null | undefined): UserPermissions {
  if (!user || !user.ativo) {
    return {
      isAdmin: false,
      isOperador: false,
      isAtivo: false,
      canConsultarEquipamentos: false,
      canCadastrarPatrimonio: false,
      canEditarPatrimonio: false,
      canExcluirEquipamentos: false,
      canAlterarUUID: false,
      canIniciarSaida: false,
      canEscanearQR: false,
      canRealizarChecklist: false,
      canDevolver: false,
      canInformarAvaria: false,
      canAbrirManutencao: false,
      canConcluirManutencao: false,
      canAdministrarUsuarios: false,
      canAdministrarKits: false,
      canAdministrarObras: false,
      canVisualizarHistorico: false,
      canAlterarHistoricoConcluido: false,
      canApagarSaidas: false,
    };
  }

  const isAdmin = user.perfil === 'Administrador';
  const isOperador = user.perfil === 'Operador';

  return {
    isAdmin,
    isOperador,
    isAtivo: true,

    // Patrimônio
    canConsultarEquipamentos: true,
    canCadastrarPatrimonio: isAdmin,
    canEditarPatrimonio: isAdmin,
    canExcluirEquipamentos: isAdmin, // OPERADOR não pode excluir equipamentos
    canAlterarUUID: false, // Regra estrita: UUID é imutável para garantir integridade com Google Sheets

    // Operacional
    canIniciarSaida: true,
    canEscanearQR: true,
    canRealizarChecklist: true,
    canDevolver: true,
    canInformarAvaria: true,
    canAbrirManutencao: true,
    canConcluirManutencao: true,

    // Governança
    canAdministrarUsuarios: isAdmin,
    canAdministrarKits: isAdmin,
    canAdministrarObras: isAdmin,
    canVisualizarHistorico: true,
    canAlterarHistoricoConcluido: false, // "Nunca apagar registros de saída ou devolução concluídos"
    canApagarSaidas: isAdmin, // OPERADOR não pode apagar saídas
  };
}
