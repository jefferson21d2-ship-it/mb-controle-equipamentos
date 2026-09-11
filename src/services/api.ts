/**
 * Camada de Serviços para Google Sheets, Google Apps Script e Google Drive
 * Preserva estritamente os dados reais e os IDs UUID.
 */

import * as XLSX from 'xlsx';
import {
  Equipamento,
  GoogleSheetsConfig,
  Kit,
  KitRequisito,
  Manutencao,
  MBDatabase,
  Obra,
  Saida,
  SaidaItem,
  Usuario,
} from '../types';

const STORAGE_KEY_DATA = 'mb_equipamentos_data_v1';
const STORAGE_KEY_CONFIG = 'mb_equipamentos_sheets_config_v1';

// Mapeador flexível de colunas do Google Sheets / AppSheet para entidades TypeScript
export class GoogleSheetsService {
  /**
   * Salva configurações de conexão no LocalStorage
   */
  static saveConfig(config: GoogleSheetsConfig): void {
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    } catch (e) {
      console.error('Erro ao salvar config no LocalStorage', e);
    }
  }

  /**
   * Carrega configurações salvas
   */
  static loadConfig(): GoogleSheetsConfig {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Erro ao ler config do LocalStorage', e);
    }
    return {
      appsScriptUrl: '',
      spreadsheetId: '',
      driveFolderId: '',
      autoSync: true,
    };
  }

  /**
   * Salva o estado atual do banco no cache local offline (PWA)
   */
  static saveLocalDatabase(db: MBDatabase): void {
    try {
      localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(db));
    } catch (e) {
      console.error('Erro ao salvar cache do banco local', e);
    }
  }

  /**
   * Carrega dados do cache local offline
   */
  static loadLocalDatabase(): MBDatabase | null {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DATA);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Erro ao ler cache do banco local', e);
    }
    return null;
  }

  /**
   * Testa a conexão com o Google Apps Script Web App
   */
  static async testConnection(appsScriptUrl: string): Promise<{
    success: boolean;
    message: string;
    spreadsheetName?: string;
    sheets?: string[];
  }> {
    if (!appsScriptUrl || !appsScriptUrl.startsWith('http')) {
      throw new Error('A URL do Google Apps Script fornecida é inválida.');
    }

    const separator = appsScriptUrl.includes('?') ? '&' : '?';
    const testUrl = `${appsScriptUrl}${separator}action=ping&t=${Date.now()}`;

    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP ao conectar: status ${response.status}`);
    }

    const json = await response.json();
    if (json.status === 'success' || json.code === 200 || json.data) {
      const info = json.data || json;
      return {
        success: true,
        message: info.message || 'Conectado com sucesso ao Google Sheets!',
        spreadsheetName: info.spreadsheetName,
        sheets: info.sheets,
      };
    } else {
      throw new Error(json.error || 'Resposta inesperada do Apps Script.');
    }
  }

  /**
   * Busca todas as 8 tabelas reais diretamente do Google Sheets via Apps Script
   */
  static async fetchAllFromAppsScript(appsScriptUrl: string): Promise<MBDatabase> {
    if (!appsScriptUrl || !appsScriptUrl.startsWith('http')) {
      throw new Error('URL da API do Google Apps Script não configurada.');
    }

    const separator = appsScriptUrl.includes('?') ? '&' : '?';
    const url = `${appsScriptUrl}${separator}action=getAll&t=${Date.now()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Falha ao obter dados: ${response.statusText}`);
    }

    const result = await response.json();
    const data = result.data || result;

    return {
      equipamentos: this.mapEquipamentos(data.equipamentos || []),
      kits: this.mapKits(data.kits || []),
      kitRequisitos: this.mapKitRequisitos(data.kit_requisitos || data['kit requisitos'] || []),
      usuarios: this.mapUsuarios(data.usuarios || data['usuários'] || []),
      obras: this.mapObras(data.obras || []),
      saidas: this.mapSaidas(data.saidas || []),
      saidaItens: this.mapSaidaItens(data.saida_itens || data['saida itens'] || []),
      manutencoes: this.mapManutencoes(data.manutencoes || []),
    };
  }

  /**
   * Importa e processa o arquivo Excel original: MB_Controle_Equipamentos_AppSheet_PRONTO.xlsx
   * Preserva fielmente todos os 35 equipamentos, IDs UUID e códigos originais.
   */
  static async parseExcelFile(file: File): Promise<MBDatabase> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const buffer = e.target?.result;
          if (!buffer) {
            throw new Error('Arquivo vazio ou não pôde ser lido.');
          }

          const workbook = XLSX.read(buffer, { type: 'binary', cellDates: true });
          const sheetNames = workbook.SheetNames;

          const findSheet = (needle: string) => {
            const normalizedNeedle = needle.toLowerCase().replace(/[^a-z0-9]/g, '');
            const match = sheetNames.find((name) =>
              name.toLowerCase().replace(/[^a-z0-9]/g, '').includes(normalizedNeedle)
            );
            return match ? workbook.Sheets[match] : null;
          };

          const sheetToJson = (sheet: XLSX.WorkSheet | null): Record<string, any>[] => {
            if (!sheet) return [];
            return XLSX.utils.sheet_to_json(sheet, { defval: '' });
          };

          const rawEquipamentos = sheetToJson(findSheet('EQUIPAMENTOS'));
          const rawKits = sheetToJson(findSheet('KITS'));
          const rawKitRequisitos = sheetToJson(findSheet('KIT REQUISITOS') || findSheet('REQUISITOS'));
          const rawUsuarios = sheetToJson(findSheet('USUARIOS') || findSheet('USUÁRIOS'));
          const rawObras = sheetToJson(findSheet('OBRAS'));
          const rawSaidas = sheetToJson(findSheet('SAIDAS'));
          const rawSaidaItens = sheetToJson(findSheet('SAIDA ITENS') || findSheet('ITENS'));
          const rawManutencoes = sheetToJson(findSheet('MANUTENCOES') || findSheet('MANUTENÇÕES'));

          const db: MBDatabase = {
            equipamentos: this.mapEquipamentos(rawEquipamentos),
            kits: this.mapKits(rawKits),
            kitRequisitos: this.mapKitRequisitos(rawKitRequisitos),
            usuarios: this.mapUsuarios(rawUsuarios),
            obras: this.mapObras(rawObras),
            saidas: this.mapSaidas(rawSaidas),
            saidaItens: this.mapSaidaItens(rawSaidaItens),
            manutencoes: this.mapManutencoes(rawManutencoes),
          };

          resolve(db);
        } catch (err: any) {
          reject(new Error(`Erro ao processar planilha: ${err?.message || 'Arquivo inválido'}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Erro ao ler arquivo'));
      };

      reader.readAsBinaryString(file);
    });
  }

  /**
   * Mapeamento de EQUIPAMENTOS
   */
  private static mapEquipamentos(raw: Record<string, any>[]): Equipamento[] {
    return raw.map((row, index) => {
      const id = String(row['ID'] || row['Id'] || row['UUID'] || `eq-${index + 1}`).trim();
      const codigo = String(
        row['Código do Equipamento'] ||
        row['Codigo do Equipamento'] ||
        row['Código'] ||
        row['Codigo'] ||
        row['CODIGO'] ||
        `MB-EQ-${String(index + 1).padStart(3, '0')}`
      ).trim();

      const nome = String(
        row['Nome'] ||
        row['Descrição'] ||
        row['Descricao'] ||
        row['Nome do Equipamento'] ||
        codigo
      ).trim();

      const categoria = String(
        row['Categoria'] ||
        row['Tipo'] ||
        row['CATEGORIA'] ||
        'Acessório'
      ).trim();

      const statusRaw = String(
        row['Status'] ||
        row['STATUS'] ||
        row['Situação'] ||
        'Disponível'
      ).trim();

      let status: Equipamento['status'] = 'Disponível';
      if (/campo|obra|sa[íi]da/i.test(statusRaw)) status = 'Em Campo';
      else if (/manuten[çc][ãa]o/i.test(statusRaw)) status = 'Manutenção';
      else if (/calibra[çc][ãa]o/i.test(statusRaw)) status = 'Calibração';
      else if (/baixa|inativ/i.test(statusRaw)) status = 'Baixado';

      return {
        id,
        codigo,
        nome,
        categoria,
        marca: String(row['Marca'] || row['MARCA'] || '').trim(),
        modelo: String(row['Modelo'] || row['MODELO'] || '').trim(),
        numeroSerie: String(row['Número de Série'] || row['Numero de Serie'] || row['Serial'] || row['N/S'] || '').trim(),
        status,
        obraAtualId: row['Obra ID'] ? String(row['Obra ID']).trim() : undefined,
        obraAtualNome: row['Obra'] ? String(row['Obra']).trim() : undefined,
        responsavelAtualNome: row['Responsável'] ? String(row['Responsável']).trim() : undefined,
        localizacaoPadrao: row['Localização Padrão'] || row['Localizacao Padrao'] || undefined,
        localizacaoAtual: row['Localização Atual'] || row['Localizacao Atual'] || undefined,
        kit: row['Kit'] ? String(row['Kit']).trim() : undefined,
        fotoUrl: (row['Foto'] || row['Foto URL'] || row['Foto Real'] || row['Foto Real URL']) 
          ? String(row['Foto'] || row['Foto URL'] || row['Foto Real'] || row['Foto Real URL']).trim() 
          : undefined,
        imagemModelo: (row['Imagem Modelo'] || row['Modelo Imagem'] || row['URL Imagem Modelo'])
          ? String(row['Imagem Modelo'] || row['Modelo Imagem'] || row['URL Imagem Modelo']).trim()
          : undefined,
        urlFonteImagem: (row['URL Fonte Imagem'] || row['Url Fonte Imagem'] || row['Fonte Imagem'])
          ? String(row['URL Fonte Imagem'] || row['Url Fonte Imagem'] || row['Fonte Imagem']).trim()
          : undefined,
        estadoFisico: row['Estado Físico'] || row['Estado Fisico'] || undefined,
        tipoUso: row['Tipo de Uso'] || row['Tipo Uso'] || undefined,
        parBateria: row['Par Bateria'] || row['Par de Bateria'] || undefined,
        capacidadeBateria: row['Capacidade'] || row['Capacidade Bateria'] || undefined,
        dataAquisicao: row['Data Aquisição'] || row['Data Aquisicao'] ? String(row['Data Aquisição'] || row['Data Aquisicao']) : undefined,
        proximaCalibracao: row['Próxima Calibração'] || row['Proxima Calibracao'] ? String(row['Próxima Calibração'] || row['Proxima Calibracao']) : undefined,
        observacoes: row['Observações'] || row['Observacoes'] ? String(row['Observações'] || row['Observacoes']) : undefined,
      };
    });
  }

  /**
   * Mapeamento de KITS
   */
  private static mapKits(raw: Record<string, any>[]): Kit[] {
    return raw.map((row, index) => ({
      id: String(row['ID'] || row['Id'] || `kit-${index + 1}`).trim(),
      nome: String(row['Nome'] || row['Nome do Kit'] || row['Kit'] || `Kit ${index + 1}`).trim(),
      descricao: row['Descrição'] || row['Descricao'] ? String(row['Descrição'] || row['Descricao']).trim() : undefined,
      categoria: row['Categoria'] ? String(row['Categoria']).trim() : undefined,
      ativo: row['Ativo'] !== false && String(row['Ativo']).toLowerCase() !== 'não',
    }));
  }

  /**
   * Mapeamento de KIT REQUISITOS
   */
  private static mapKitRequisitos(raw: Record<string, any>[]): KitRequisito[] {
    return raw.map((row, index) => {
      const categoria = String(row['Categoria'] || row['Item'] || row['Equipamento'] || '').trim();
      const especificacao = row['Especificação'] || row['Especificacao'] ? String(row['Especificação'] || row['Especificacao']).trim() : undefined;
      const tipoChecklist = String(row['Tipo Checklist'] || row['TipoChecklist'] || especificacao || categoria || 'Item').trim();
      const obrigatorio = row['Obrigatório'] !== false && String(row['Obrigatorio'] || '').toLowerCase() !== 'não';

      return {
        id: String(row['ID'] || row['Id'] || `req-${index + 1}`).trim(),
        kitId: String(row['Kit ID'] || row['KitId'] || row['Kit'] || '').trim(),
        categoria,
        quantidade: Number(row['Quantidade'] || row['Qtd'] || 1),
        tipoChecklist,
        obrigatorio,
        especificacao,
      };
    });
  }

  /**
   * Mapeamento de USUÁRIOS
   */
  private static mapUsuarios(raw: Record<string, any>[]): Usuario[] {
    return raw.map((row, index) => ({
      id: String(row['ID'] || row['Id'] || `usr-${index + 1}`).trim(),
      nome: String(row['Nome'] || row['Usuário'] || row['Colaborador'] || `Usuário ${index + 1}`).trim(),
      email: String(row['Email'] || row['E-mail'] || '').trim(),
      cargo: String(row['Cargo'] || row['Função'] || 'Operador').trim(),
      perfil: (row['Perfil'] || 'Operador') as Usuario['perfil'],
      telefone: row['Telefone'] || row['Contato'] ? String(row['Telefone'] || row['Contato']).trim() : undefined,
      fotoUrl: row['Foto'] ? String(row['Foto']) : undefined,
      ativo: row['Ativo'] !== false && String(row['Ativo']).toLowerCase() !== 'não',
    }));
  }

  /**
   * Mapeamento de OBRAS
   */
  private static mapObras(raw: Record<string, any>[]): Obra[] {
    return raw.map((row, index) => ({
      id: String(row['ID'] || row['Id'] || `obr-${index + 1}`).trim(),
      codigo: String(row['Código'] || row['Codigo'] || `OBR-${String(index + 1).padStart(3, '0')}`).trim(),
      nome: String(row['Nome'] || row['Nome da Obra'] || row['Projeto'] || `Obra ${index + 1}`).trim(),
      cliente: row['Cliente'] ? String(row['Cliente']).trim() : undefined,
      localizacao: row['Localização'] || row['Localizacao'] || row['Endereço'] ? String(row['Localização'] || row['Localizacao'] || row['Endereço']).trim() : undefined,
      cidade: row['Cidade'] ? String(row['Cidade']).trim() : undefined,
      uf: row['UF'] || row['Estado'] ? String(row['UF'] || row['Estado']).trim() : undefined,
      responsavelId: row['Responsável ID'] ? String(row['Responsável ID']).trim() : undefined,
      responsavelNome: row['Responsável'] || row['Engenheiro'] ? String(row['Responsável'] || row['Engenheiro']).trim() : undefined,
      dataInicio: row['Data Início'] || row['Data Inicio'] ? String(row['Data Início'] || row['Data Inicio']) : undefined,
      previsaoTermino: row['Previsão Término'] || row['Previsao Termino'] ? String(row['Previsão Término'] || row['Previsao Termino']) : undefined,
      status: String(row['Status'] || 'Ativa').toLowerCase().includes('concl') ? 'Concluída' : 'Ativa',
    }));
  }

  /**
   * Mapeamento de SAIDAS
   */
  private static mapSaidas(raw: Record<string, any>[]): Saida[] {
    return raw.map((row, index) => {
      const statusRaw = String(row['Status'] || 'Liberado para Campo').trim();
      let status: Saida['status'] = 'Liberado para Campo';
      if (/rascunho/i.test(statusRaw)) status = 'Rascunho';
      else if (/checklist/i.test(statusRaw)) status = 'Aguardando Checklist';
      else if (/campo/i.test(statusRaw)) status = 'Em Campo';
      else if (/devolvido/i.test(statusRaw)) status = 'Devolvido';

      return {
        id: String(row['ID'] || row['Id'] || `sai-${index + 1}`).trim(),
        codigo: String(row['Código'] || row['Codigo'] || row['Código Saída'] || `SAI-${index + 1}`).trim(),
        obraId: String(row['Obra ID'] || row['ObraId'] || '').trim(),
        obraNome: row['Obra'] ? String(row['Obra']).trim() : undefined,
        responsavelId: String(row['Responsável ID'] || row['Usuario ID'] || '').trim(),
        responsavelNome: row['Responsável'] || row['Colaborador'] ? String(row['Responsável'] || row['Colaborador']).trim() : undefined,
        kitId: row['Kit ID'] ? String(row['Kit ID']).trim() : undefined,
        kitNome: row['Kit'] ? String(row['Kit']).trim() : undefined,
        dataSaida: String(row['Data Saída'] || row['Data Saida'] || new Date().toISOString().split('T')[0]).trim(),
        previsaoDevolucao: row['Previsão Devolução'] || row['Previsao Devolucao'] ? String(row['Previsão Devolução'] || row['Previsao Devolucao']).trim() : undefined,
        dataDevolucaoReal: row['Data Devolução Real'] || row['Data Devolucao Real'] ? String(row['Data Devolução Real'] || row['Data Devolucao Real']).trim() : undefined,
        status,
        observacoes: row['Observações'] || row['Observacoes'] ? String(row['Observações'] || row['Observacoes']).trim() : undefined,
      };
    });
  }

  /**
   * Mapeamento de SAIDA ITENS
   */
  private static mapSaidaItens(raw: Record<string, any>[]): SaidaItem[] {
    return raw.map((row, index) => {
      const devolvido = row['Devolvido'] === true || String(row['Devolvido'] || '').toLowerCase() === 'sim' || !!row['Estado Retorno'] || !!row['Data Devolução'];
      const estadoRetorno = (row['Estado Retorno'] || row['Estado no Retorno'] || (devolvido ? 'OK' : undefined)) as SaidaItem['estadoRetorno'];

      return {
        id: String(row['ID'] || row['Id'] || `item-${index + 1}`).trim(),
        saidaId: String(row['Saída ID'] || row['Saida ID'] || row['SaidaId'] || '').trim(),
        equipamentoId: String(row['Equipamento ID'] || row['EquipamentoId'] || '').trim(),
        codigoEquipamento: String(row['Código do Equipamento'] || row['Codigo'] || '').trim(),
        nomeEquipamento: row['Nome'] || row['Equipamento'] ? String(row['Nome'] || row['Equipamento']).trim() : undefined,
        categoriaEquipamento: row['Categoria'] ? String(row['Categoria']).trim() : undefined,
        checklistQrConfirmado: row['Checklist QR Confirmado'] === true || String(row['Checklist QR Confirmado']).toLowerCase() === 'sim',
        dataHoraChecklist: row['Data/Hora Leitura'] ? String(row['Data/Hora Leitura']) : undefined,
        condicaoSaida: (row['Condição Saída'] || row['Condicao Saida'] || 'Bom') as SaidaItem['condicaoSaida'],
        condicaoDevolucao: row['Condição Devolução'] || row['Condicao Devolucao'] ? (row['Condição Devolução'] || row['Condicao Devolucao']) as SaidaItem['condicaoDevolucao'] : undefined,
        observacaoSaida: row['Observação Saída'] ? String(row['Observação Saída']) : undefined,
        observacaoDevolucao: row['Observação Devolução'] ? String(row['Observação Devolução']) : undefined,
        devolvido,
        estadoRetorno,
        dataHoraDevolucao: row['Data/Hora Devolução'] || row['Data Devolução'] ? String(row['Data/Hora Devolução'] || row['Data Devolução']) : undefined,
        fotoDevolucaoUrl: row['Foto Devolução'] || row['Foto'] ? String(row['Foto Devolução'] || row['Foto']) : undefined,
        manutencaoId: row['Manutenção ID'] || row['ManutencaoId'] ? String(row['Manutenção ID'] || row['ManutencaoId']) : undefined,
        auditoriaUsuario: row['Auditoria Usuário'] || row['Usuário Devolução'] ? String(row['Auditoria Usuário'] || row['Usuário Devolução']) : undefined,
      };
    });
  }

  /**
   * Mapeamento de MANUTENCOES (PROMPT 6)
   * Deve possuir: equipamento, abertura, responsável, descrição, foto, prioridade, fornecedor, custo, status e conclusão.
   */
  private static mapManutencoes(raw: Record<string, any>[]): Manutencao[] {
    return raw.map((row, index) => {
      const dataEntrada = String(row['Data Entrada'] || row['Data Início'] || row['Abertura'] || new Date().toISOString().split('T')[0]).trim();
      const abertura = String(row['Abertura'] || row['Data Abertura'] || dataEntrada).trim();
      const responsavel = String(row['Responsável'] || row['Responsavel'] || row['Técnico'] || 'M&B Operações').trim();
      const descricao = String(row['Descrição'] || row['Descricao'] || row['Problema'] || 'Manutenção').trim();
      const prioridade = (row['Prioridade'] || 'Média') as Manutencao['prioridade'];
      const status = (row['Status'] || 'Em Andamento') as Manutencao['status'];
      const conclusao = row['Conclusão'] || row['Conclusao'] || row['Data Conclusão'] ? String(row['Conclusão'] || row['Conclusao'] || row['Data Conclusão']).trim() : undefined;
      const foto = row['Foto'] || row['Foto URL'] || row['Laudo'] ? String(row['Foto'] || row['Foto URL'] || row['Laudo']).trim() : undefined;

      return {
        id: String(row['ID'] || row['Id'] || `man-${index + 1}`).trim(),
        equipamentoId: String(row['Equipamento ID'] || row['EquipamentoId'] || '').trim(),
        codigoEquipamento: String(row['Código do Equipamento'] || row['Codigo'] || '').trim(),
        nomeEquipamento: row['Nome'] || row['Equipamento'] ? String(row['Nome'] || row['Equipamento']).trim() : undefined,
        abertura,
        responsavel,
        descricao,
        foto,
        prioridade,
        fornecedor: row['Fornecedor'] || row['Oficina'] ? String(row['Fornecedor'] || row['Oficina']).trim() : undefined,
        custo: row['Custo'] || row['Valor'] ? Number(row['Custo'] || row['Valor']) : undefined,
        status,
        conclusao,
        tipo: (row['Tipo'] || 'Corretiva') as Manutencao['tipo'],
        dataEntrada,
        previsaoRetorno: row['Previsão Retorno'] ? String(row['Previsão Retorno']).trim() : undefined,
        dataConclusao: conclusao,
        observacoes: row['Observações'] ? String(row['Observações']).trim() : undefined,
      };
    });
  }

  /**
   * Envia atualização para o Google Apps Script (quando conectado)
   */
  static async sendUpdateToAppsScript(
    appsScriptUrl: string,
    action:
      | 'insert'
      | 'update'
      | 'uploadPhoto'
      | 'checkout'
      | 'criarSaida'
      | 'devolucao'
      | 'concluirDevolucao'
      | 'batchUpdate',
    payload: Record<string, any>
  ): Promise<any> {
    if (!appsScriptUrl || !appsScriptUrl.startsWith('http')) {
      console.warn('Apps Script URL não configurada. Ação mantida no cache local.');
      return { localOnly: true };
    }

    try {
      const response = await fetch(appsScriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8', // Apps Script handles text/plain CORS natively
        },
        body: JSON.stringify({
          action,
          ...payload,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro na API Google Apps Script: ${response.statusText}`);
      }

      return await response.json();
    } catch (e: any) {
      console.error('Erro ao enviar para Google Apps Script:', e);
      throw e;
    }
  }

  /**
   * Envia fotografia otimizada para o Google Drive na pasta
   * M&B Controle Equipamentos/Fotos/[CODIGO]/ e salva no Sheets apenas a URL
   */
  static async uploadEquipmentPhoto(
    appsScriptUrl: string,
    params: {
      codigo: string;
      fileName: string;
      base64: string;
      mimeType?: string;
    }
  ): Promise<{
    success: boolean;
    url: string;
    driveUrl?: string;
    folderPath?: string;
    fileName?: string;
  }> {
    if (!appsScriptUrl || !appsScriptUrl.startsWith('http')) {
      // Modo local / offline
      return {
        success: true,
        url: `data:${params.mimeType || 'image/jpeg'};base64,${params.base64}`,
        folderPath: `M&B Controle Equipamentos/Fotos/${params.codigo}/ (Armazenamento Local)`,
        fileName: params.fileName,
      };
    }

    const res = await this.sendUpdateToAppsScript(appsScriptUrl, 'uploadPhoto', {
      codigo: params.codigo,
      fileName: params.fileName,
      base64: params.base64,
      mimeType: params.mimeType || 'image/jpeg',
      createSubfolder: true,
      updateSheet: true,
    });

    const data = res.data || res;
    return {
      success: true,
      url: data.url || data.downloadUrl,
      driveUrl: data.driveUrl,
      folderPath: data.folderPath || `M&B Controle Equipamentos/Fotos/${params.codigo}/`,
      fileName: data.fileName || params.fileName,
    };
  }

  /**
   * Remove a fotografia real vinculada ao equipamento no Google Sheets
   */
  static async removeEquipmentPhoto(appsScriptUrl: string, codigo: string): Promise<boolean> {
    if (!appsScriptUrl || !appsScriptUrl.startsWith('http')) {
      return true;
    }

    try {
      await this.sendUpdateToAppsScript(appsScriptUrl, 'update', {
        table: 'EQUIPAMENTOS',
        keyField: 'Código do Equipamento',
        keyValue: codigo,
        data: { Foto: '' },
      });
    } catch (err) {
      console.warn('Tentando fallback para removePhoto', err);
      await this.sendUpdateToAppsScript(appsScriptUrl, 'update', {
        table: 'EQUIPAMENTOS',
        keyField: 'ID',
        keyValue: codigo,
        data: { Foto: '' },
      }).catch(console.error);
    }
    return true;
  }
}
