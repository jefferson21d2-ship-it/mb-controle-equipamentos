/**
 * Template oficial do Google Apps Script (Code.gs)
 * M&B CONTROLE DE EQUIPAMENTOS - BACKEND API PROFISSIONAL
 *
 * Instruções de Implantação:
 * 1. Abra a Planilha Oficial Google Sheets da M&B Topografia.
 * 2. Acesse: Extensões -> Apps Script.
 * 3. Substitua todo o conteúdo de Code.gs por este código.
 * 4. Clique em "Implantar" -> "Nova implantação" -> Selecione o tipo "Aplicativo da Web".
 * 5. Configurações:
 *    - Executar como: "Eu (seu e-mail Google Workspace)"
 *    - Quem pode acessar: "Qualquer pessoa" (ou "Qualquer pessoa no domínio")
 * 6. Copie a URL gerada (terminada em /exec) e insira nas Configurações do App.
 *
 * PROMPT 8 HOMOLOGAÇÃO:
 * - LockService nas operações críticas para impedir checkout concorrente.
 * - Revalidação de disponibilidade no servidor antes de confirmar saída.
 * - Idempotência completa para evitar registros duplicados.
 * - Nenhuma foto pública (armazenamento restrito no Google Drive corporativo).
 * - batchUpdate e endpoints reais sem placeholders.
 */

export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * M&B CONTROLE DE EQUIPAMENTOS - GOOGLE APPS SCRIPT API
 * Versão: 2.0.0 - Homologação Produção
 */

const SHEETS = {
  EQUIPAMENTOS: 'EQUIPAMENTOS',
  KITS: 'KITS',
  KIT_REQUISITOS: 'KIT REQUISITOS',
  USUARIOS: 'USUÁRIOS',
  OBRAS: 'OBRAS',
  SAIDAS: 'SAIDAS',
  SAIDA_ITENS: 'SAIDA ITENS',
  MANUTENCOES: 'MANUTENCOES',
  MOVIMENTACOES: 'MOVIMENTACOES'
};

const DRIVE_ROOT_FOLDER = 'M&B Controle Equipamentos';
const DRIVE_FOTOS_SUBFOLDER = 'Fotos';

function createResponse(data, status = 200) {
  const output = ContentService.createTextOutput(JSON.stringify({
    status: status === 200 ? 'success' : 'error',
    code: status,
    timestamp: new Date().toISOString(),
    data: data
  }));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * Ponto de entrada GET: Leitura com suporte a Ping, Tabelas Individuais ou Todas as Tabelas
 */
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'ping';
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'ping') {
      return createResponse({
        message: 'M&B API online e conectada com sucesso!',
        spreadsheetName: ss.getName(),
        spreadsheetId: ss.getId(),
        sheets: ss.getSheets().map(s => s.getName())
      });
    }

    if (action === 'getAll') {
      const result = {};
      for (const [key, sheetName] of Object.entries(SHEETS)) {
        result[key.toLowerCase()] = readSheetAsJson(ss, sheetName);
      }
      return createResponse(result);
    }

    if (action === 'getTable') {
      const table = e.parameter.table;
      if (!table) throw new Error('Parâmetro table não fornecido.');
      const data = readSheetAsJson(ss, table);
      return createResponse(data);
    }

    return createResponse({ error: 'Ação GET desconhecida' }, 400);

  } catch (err) {
    return createResponse({ error: err.message, stack: err.stack }, 500);
  }
}

/**
 * Ponto de entrada POST: Operações Transacionais com LockService
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  let hasLock = false;

  try {
    let payload = {};
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else {
      payload = e.parameter || {};
    }

    const action = payload.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Upload de Foto no Google Drive (RESTRIÇÃO DE PRIVACIDADE: NENHUMA FOTO PÚBLICA)
    if (action === 'uploadPhoto') {
      const base64Data = payload.base64;
      const codigo = String(payload.codigo || 'EQUIP').trim().toUpperCase();
      const fileName = payload.fileName || (codigo + '_FOTO_' + Date.now() + '.jpg');
      const mimeType = payload.mimeType || 'image/jpeg';

      const rootFolder = getOrCreateFolder(DRIVE_ROOT_FOLDER);
      const fotosFolder = getOrCreateSubfolder(rootFolder, DRIVE_FOTOS_SUBFOLDER);
      const targetFolder = payload.createSubfolder !== false ? getOrCreateSubfolder(fotosFolder, codigo) : fotosFolder;

      const decodedBytes = Utilities.base64Decode(base64Data);
      const blob = Utilities.newBlob(decodedBytes, mimeType, fileName);
      const file = targetFolder.createFile(blob);

      // SEGURANÇA: Foto restrita à organização / Workspace. NUNCA ANYONE_WITH_LINK.
      try {
        file.setSharing(DriveApp.Access.DOMAIN, DriveApp.Permission.VIEW);
      } catch (errDomain) {
        // Se a conta for Gmail pessoal ou não estiver em domínio G Suite, mantém apenas permissões privadas do proprietário
        Logger.log('Permissão mantida privada: ' + errDomain);
      }

      const fileId = file.getId();
      const driveUrl = file.getUrl();
      const directViewUrl = 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w1000';

      if (payload.updateSheet !== false && codigo) {
        const sheet = ss.getSheetByName(SHEETS.EQUIPAMENTOS);
        if (sheet) {
          updatePhotoInSheet(sheet, codigo, directViewUrl);
        }
      }

      return createResponse({
        fileId: fileId,
        url: directViewUrl,
        driveUrl: driveUrl,
        folderPath: DRIVE_ROOT_FOLDER + '/' + DRIVE_FOTOS_SUBFOLDER + '/' + codigo + '/',
        fileName: fileName,
        savedInSheet: true
      });
    }

    // 2. Operações de Modificação de Dados - Exigem LockService (Concurrency Control)
    hasLock = lock.tryLock(30000);
    if (!hasLock) {
      return createResponse({
        error: 'O servidor de dados está processando outra operação concorrente. Tente novamente em alguns segundos.'
      }, 409);
    }

    // 2.1 Checkout / Criação de Saída com Revalidação de Disponibilidade no Servidor e Idempotência
    if (action === 'checkout' || action === 'criarSaida') {
      const saidaData = payload.saida;
      const itensData = payload.itens || []; // [{ equipamentoId, codigoEquipamento, ... }]

      if (!saidaData || !saidaData.id) {
        throw new Error('Dados da saída inválidos ou ID ausente.');
      }

      // Checagem de Idempotência: Se a saída já foi gravada, retorna os dados sem duplicar
      const sheetSaidas = ss.getSheetByName(SHEETS.SAIDAS);
      if (sheetSaidas && recordExists(sheetSaidas, 'ID', saidaData.id)) {
        return createResponse({
          success: true,
          message: 'Saída já processada anteriormente (idempotência garantida).',
          saidaId: saidaData.id
        });
      }

      // Revalidação de Disponibilidade de todos os equipamentos solicitados
      const sheetEquip = ss.getSheetByName(SHEETS.EQUIPAMENTOS);
      if (!sheetEquip) throw new Error('Aba EQUIPAMENTOS não encontrada.');

      const equipValues = sheetEquip.getDataRange().getValues();
      const headersEquip = equipValues[0].map(h => String(h).trim());
      const colCodigo = headersEquip.findIndex(h => /c[oó]digo/i.test(h));
      const colStatus = headersEquip.findIndex(h => /^status$/i.test(h));
      const colObra = headersEquip.findIndex(h => /obra/i.test(h));
      const colResp = headersEquip.findIndex(h => /respons[aá]vel/i.test(h));

      for (const item of itensData) {
        const itemCod = String(item.codigoEquipamento || item.codigo || '').trim().toUpperCase();
        for (let i = 1; i < equipValues.length; i++) {
          const rowCod = String(equipValues[i][colCodigo] || '').trim().toUpperCase();
          if (rowCod === itemCod) {
            const currentStatus = String(equipValues[i][colStatus] || '').trim().toUpperCase();
            if (currentStatus === 'EM CAMPO' || currentStatus === 'MANUTENÇÃO' || currentStatus === 'BLOQUEADO') {
              throw new Error('Conflito de checkout: O equipamento ' + itemCod + ' já se encontra com status ' + currentStatus + '.');
            }
          }
        }
      }

      // Grava na aba SAIDAS
      insertRow(ss, SHEETS.SAIDAS, saidaData);

      // Grava na aba SAIDA ITENS
      const sheetSaidaItens = ss.getSheetByName(SHEETS.SAIDA_ITENS);
      if (sheetSaidaItens) {
        itensData.forEach(item => {
          insertRow(ss, SHEETS.SAIDA_ITENS, item);
        });
      }

      // Atualiza status de cada equipamento para 'EM CAMPO'
      itensData.forEach(item => {
        const itemCod = String(item.codigoEquipamento || item.codigo || '').trim().toUpperCase();
        for (let i = 1; i < equipValues.length; i++) {
          const rowCod = String(equipValues[i][colCodigo] || '').trim().toUpperCase();
          if (rowCod === itemCod) {
            if (colStatus !== -1) sheetEquip.getRange(i + 1, colStatus + 1).setValue('EM CAMPO');
            if (colObra !== -1 && saidaData.obraNome) sheetEquip.getRange(i + 1, colObra + 1).setValue(saidaData.obraNome);
            if (colResp !== -1 && saidaData.responsavelNome) sheetEquip.getRange(i + 1, colResp + 1).setValue(saidaData.responsavelNome);
            break;
          }
        }
      });

      return createResponse({
        success: true,
        message: 'Saída confirmada e equipamentos liberados com sucesso.',
        saidaId: saidaData.id
      });
    }

    // 2.2 Devolução de Saída com Conferência de Estados e Registro Idempotente
    if (action === 'devolucao' || action === 'concluirDevolucao') {
      const saidaId = payload.saidaId;
      const statusFinalSaida = payload.statusSaida || 'Devolvido';
      const itensDevolucao = payload.itensDevolucao || []; // [{ itemId, codigo, estadoRetorno, statusNovo, obs, avariado }]
      const manutencoesNovas = payload.manutencoesNovas || [];

      // Atualiza a linha da saída
      updateRow(ss, SHEETS.SAIDAS, 'ID', saidaId, {
        Status: statusFinalSaida,
        'Data Devolução Real': new Date().toISOString()
      });

      // Atualiza itens na aba SAIDA ITENS
      itensDevolucao.forEach(dev => {
        if (dev.itemId) {
          updateRow(ss, SHEETS.SAIDA_ITENS, 'ID', dev.itemId, {
            'Estado Retorno': dev.estadoRetorno,
            'Observação Retorno': dev.obs || '',
            'Data Devolução': new Date().toISOString()
          });
        }
      });

      // Atualiza status de cada equipamento
      const sheetEquip = ss.getSheetByName(SHEETS.EQUIPAMENTOS);
      if (sheetEquip) {
        itensDevolucao.forEach(dev => {
          const cod = String(dev.codigo || '').trim().toUpperCase();
          const novoStatus = dev.statusNovo || (dev.avariado ? 'MANUTENÇÃO' : 'DISPONÍVEL');
          updateRow(ss, SHEETS.EQUIPAMENTOS, 'Código do Equipamento', cod, {
            Status: novoStatus,
            Obra: '',
            Responsável: '',
            'Localização Atual': dev.avariado ? 'Oficina / Manutenção' : 'Escritorio Palmas'
          });
        });
      }

      // Registra novas manutenções se houver avaria
      if (manutencoesNovas.length > 0) {
        const sheetManut = ss.getSheetByName(SHEETS.MANUTENCOES);
        if (sheetManut) {
          manutencoesNovas.forEach(m => {
            if (!recordExists(sheetManut, 'ID', m.id)) {
              insertRow(ss, SHEETS.MANUTENCOES, m);
            }
          });
        }
      }

      return createResponse({
        success: true,
        message: 'Devolução registrada e inventário atualizado.',
        saidaId: saidaId
      });
    }

    // 2.3 Inserção Padrão com Idempotência
    if (action === 'insert') {
      const sheetName = payload.table;
      const rowData = payload.data;
      const keyField = payload.keyField || 'ID';
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) throw new Error('Aba ' + sheetName + ' não encontrada.');

      if (rowData[keyField] && recordExists(sheet, keyField, rowData[keyField])) {
        return createResponse({ success: true, message: 'Registro já existe (idempotente).', id: rowData[keyField] });
      }

      const result = insertRow(ss, sheetName, rowData);
      return createResponse(result);
    }

    // 2.4 Atualização Padrão
    if (action === 'update') {
      const sheetName = payload.table;
      const keyField = payload.keyField || 'ID';
      const keyValue = payload.keyValue;
      const updatedData = payload.data;
      const result = updateRow(ss, sheetName, keyField, keyValue, updatedData);
      return createResponse(result);
    }

    // 2.5 Batch Update Real Completo (Sem placeholders)
    if (action === 'batchUpdate') {
      const sheetName = payload.table;
      const rows = payload.rows || [];
      const keyField = payload.keyField || 'ID';
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) throw new Error('Aba ' + sheetName + ' não encontrada.');

      let updatedCount = 0;
      let insertedCount = 0;

      rows.forEach(item => {
        const keyVal = item[keyField];
        if (keyVal && recordExists(sheet, keyField, keyVal)) {
          updateRow(ss, sheetName, keyField, keyVal, item);
          updatedCount++;
        } else {
          insertRow(ss, sheetName, item);
          insertedCount++;
        }
      });

      return createResponse({
        success: true,
        table: sheetName,
        updatedCount: updatedCount,
        insertedCount: insertedCount,
        total: rows.length
      });
    }

    return createResponse({ error: 'Ação POST não suportada: ' + action }, 400);

  } catch (err) {
    return createResponse({ error: err.message, stack: err.stack }, 500);
  } finally {
    if (hasLock) {
      lock.releaseLock();
    }
  }
}

function readSheetAsJson(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  const headers = values[0].map(h => String(h).trim());
  const rows = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (row.every(cell => cell === '')) continue;

    const rowObj = {};
    for (let j = 0; j < headers.length; j++) {
      const key = headers[j];
      if (!key) continue;
      let val = row[j];
      if (val instanceof Date) {
        val = val.toISOString();
      }
      rowObj[key] = val;
    }
    rows.push(rowObj);
  }
  return rows;
}

function insertRow(ss, sheetName, dataObj) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Aba ' + sheetName + ' não encontrada.');

  const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
  const newRow = headers.map(header => dataObj[header] !== undefined ? dataObj[header] : '');

  sheet.appendRow(newRow);
  return { success: true, inserted: dataObj };
}

function updateRow(ss, sheetName, keyField, keyValue, dataObj) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Aba ' + sheetName + ' não encontrada.');

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => String(h).trim());
  
  let keyColIndex = headers.indexOf(keyField);
  if (keyColIndex === -1) {
    keyColIndex = headers.findIndex(h => h.toLowerCase() === keyField.toLowerCase());
  }
  if (keyColIndex === -1) throw new Error('Coluna chave ' + keyField + ' não encontrada na aba ' + sheetName);

  let targetRowIndex = -1;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][keyColIndex]).trim().toUpperCase() === String(keyValue).trim().toUpperCase()) {
      targetRowIndex = i + 1;
      break;
    }
  }

  if (targetRowIndex === -1) {
    throw new Error('Registro com ' + keyField + ' = ' + keyValue + ' não encontrado para atualização.');
  }

  for (const [key, val] of Object.entries(dataObj)) {
    let colIndex = headers.indexOf(key);
    if (colIndex === -1) {
      colIndex = headers.findIndex(h => h.toLowerCase() === key.toLowerCase());
    }
    if (colIndex !== -1) {
      sheet.getRange(targetRowIndex, colIndex + 1).setValue(val);
    }
  }

  return { success: true, updatedKey: keyValue };
}

function recordExists(sheet, keyField, keyValue) {
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return false;

  const headers = values[0].map(h => String(h).trim().toUpperCase());
  const keyIndex = headers.indexOf(String(keyField).trim().toUpperCase());
  if (keyIndex === -1) return false;

  const searchVal = String(keyValue).trim().toUpperCase();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][keyIndex]).trim().toUpperCase() === searchVal) {
      return true;
    }
  }
  return false;
}

function getOrCreateFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(folderName);
}

function getOrCreateSubfolder(parentFolder, subfolderName) {
  const folders = parentFolder.getFoldersByName(subfolderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parentFolder.createFolder(subfolderName);
}

function updatePhotoInSheet(sheet, codigo, photoUrl) {
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return;

  const headers = values[0].map(h => String(h).trim());
  let codeColIndex = headers.findIndex(h => /c[oó]digo/i.test(h));
  if (codeColIndex === -1) codeColIndex = headers.indexOf('ID');
  if (codeColIndex === -1) codeColIndex = 0;

  let photoColIndex = headers.findIndex(h => /^foto$/i.test(h) || /^foto\s*url$/i.test(h));
  if (photoColIndex === -1) {
    photoColIndex = headers.length;
    sheet.getRange(1, photoColIndex + 1).setValue('Foto');
  }

  for (let i = 1; i < values.length; i++) {
    const rowCode = String(values[i][codeColIndex] || '').trim().toUpperCase();
    if (rowCode === String(codigo).trim().toUpperCase()) {
      sheet.getRange(i + 1, photoColIndex + 1).setValue(photoUrl);
      break;
    }
  }
}
`;
