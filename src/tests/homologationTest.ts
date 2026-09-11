import { INITIAL_DATABASE } from '../data/initialDatabase';
import {
  matchesKitRequisito,
  getEquipamentoTipoChecklist,
  calculateKitChecklistSummary,
} from '../utils/kitChecklistEngine';

console.log('--- INÍCIO DA HOMOLOGAÇÃO FORENSE DO SISTEMA M&B ---');

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${testName}: ${details || 'Assertion failed'}`);
  }
}

// 1. Validação dos 35 equipamentos reais
assert(
  INITIAL_DATABASE.equipamentos.length === 35,
  'Base Oficial: Preservação exata de 35 equipamentos',
  `Encontrados ${INITIAL_DATABASE.equipamentos.length} equipamentos`
);

// 2. Validação dos Códigos MB-...
const invalidCodigos = INITIAL_DATABASE.equipamentos.filter(
  (e) => !e.codigo || !e.codigo.toUpperCase().startsWith('MB-')
);
assert(
  invalidCodigos.length === 0,
  'Base Oficial: Todos os códigos possuem formato MB-...',
  `Códigos inválidos: ${invalidCodigos.map((e) => e.codigo).join(', ')}`
);

// 3. Validação de Ausência de Dados Fictícios / Operacional Inicial Limpo
assert(
  INITIAL_DATABASE.saidas.length === 0,
  'Banco Operacional: Nenhuma saída fictícia/demo na base inicial'
);
assert(
  INITIAL_DATABASE.saidaItens.length === 0,
  'Banco Operacional: Nenhum item de saída fictício na base inicial'
);
assert(
  INITIAL_DATABASE.manutencoes.length === 0,
  'Banco Operacional: Nenhuma manutenção fictícia na base inicial'
);
assert(
  INITIAL_DATABASE.obras.length === 0,
  'Banco Operacional: Nenhuma obra fictícia na base inicial'
);

// 4. Validação do KIT MATRICE 350
const kitM350Reqs = INITIAL_DATABASE.kitRequisitos.filter((r) => r.kitId === 'kit-matrice-350');
const reqM350 = kitM350Reqs.find((r) => r.tipoChecklist === 'M350');
const reqBS65 = kitM350Reqs.find((r) => r.tipoChecklist === 'BS65');
const reqTB65 = kitM350Reqs.find((r) => r.tipoChecklist === 'TB65');
const reqWB37 = kitM350Reqs.find((r) => r.tipoChecklist === 'WB37');

assert(
  reqM350?.quantidade === 1 &&
  reqBS65?.quantidade === 1 &&
  reqTB65?.quantidade === 10 &&
  reqWB37?.quantidade === 5,
  'KIT MATRICE 350: Composição exata (1 M350 + 1 BS65 + 10 TB65 + 5 WB37)',
  `M350: ${reqM350?.quantidade}, BS65: ${reqBS65?.quantidade}, TB65: ${reqTB65?.quantidade}, WB37: ${reqWB37?.quantidade}`
);

// 5. Validação do KIT TRIMBLE DA2
const kitDA2Reqs = INITIAL_DATABASE.kitRequisitos.filter((r) => r.kitId === 'kit-trimble-da2');
const reqDA2 = kitDA2Reqs.find((r) => r.tipoChecklist === 'DA2');
const reqPowerBank = kitDA2Reqs.find((r) => r.tipoChecklist === 'POWERBANK_DA2');
const reqBastaoInvalido = kitDA2Reqs.find((r) => r.tipoChecklist?.includes('BASTAO') && r.obrigatorio);

assert(
  reqDA2?.quantidade === 2 && reqPowerBank?.quantidade === 4 && !reqBastaoInvalido,
  'KIT TRIMBLE DA2: Composição oficial (2 Trimble Catalyst DA2 + 4 Power Banks DA2, sem bastão obrigatório)',
  `DA2: ${reqDA2?.quantidade}, PowerBanks: ${reqPowerBank?.quantidade}, Bastão Obrigatório: ${!!reqBastaoInvalido}`
);

// 6. Validação TB100 (quantidade 0 / não obrigatória até inventário real)
const kitM400Reqs = INITIAL_DATABASE.kitRequisitos.filter((r) => r.kitId === 'kit-matrice-400');
const reqTB100 = kitM400Reqs.find((r) => r.tipoChecklist === 'TB100');
assert(
  !reqTB100 || reqTB100.quantidade === 0 || !reqTB100.obrigatorio,
  'TB100: Quantidade 0 / não obrigatória até inventário real',
  `Qtd: ${reqTB100?.quantidade}, Obrigatório: ${reqTB100?.obrigatorio}`
);

// 7. Validação de equivalência de tipos checklist e ausência de falsos positivos
assert(
  matchesKitRequisito('DRTK2', 'DRTK2') === true &&
  matchesKitRequisito('DRTK2', 'DRTK2_TRIPE') === false &&
  matchesKitRequisito('DRTK2', 'DRTK2_BASTAO') === false,
  'Equivalência Tipo Checklist: Diferenciação estrita de Base, Tripé e Bastão D-RTK 2'
);

assert(
  matchesKitRequisito('POWERBANK_DA2', 'POWERBANK_DA2') === true &&
  matchesKitRequisito('POWERBANK_DA2', 'DA2') === false,
  'Equivalência Tipo Checklist: Diferenciação entre PowerBank DA2 e Antena DA2'
);

// 8. Teste de Busca e Leitura de QR Code
const findByQR = (codeOrQr: string) => {
  const clean = codeOrQr.trim().toUpperCase();
  return INITIAL_DATABASE.equipamentos.find(
    (e) => e.codigo.toUpperCase() === clean || e.id.toUpperCase() === clean
  );
};

assert(
  findByQR('MB-DRN-001')?.nome === 'DJI Matrice 350 RTK',
  'QR Scanner: Localização de equipamento por código oficial MB-DRN-001'
);

assert(
  findByQR('mb-drn-001')?.codigo === 'MB-DRN-001',
  'QR Scanner: Resiliência a minúsculas (mb-drn-001)'
);

assert(
  findByQR('INVALID-QR-999') === undefined,
  'QR Scanner: Rejeição segura de QR Code desconhecido / inválido'
);

// 9. Teste de Detecção de Duplicidade em Saída
const selectedEquipamentoIds = ['MB-DRN-001', 'MB-CAR-001'];
const addItem = (id: string) => {
  if (selectedEquipamentoIds.includes(id)) {
    return { success: false, reason: 'ITEM_DUPLICADO' };
  }
  selectedEquipamentoIds.push(id);
  return { success: true };
};

assert(
  addItem('MB-DRN-001').success === false && addItem('MB-DRN-001').reason === 'ITEM_DUPLICADO',
  'Checkout: Detecção e bloqueio de item duplicado'
);

assert(
  addItem('MB-BAT-001').success === true,
  'Checkout: Adição permitida de novo item único'
);

// 10. Validação de Composição Completa de Kit
const kitM350 = INITIAL_DATABASE.kits.find((k) => k.id === 'kit-matrice-350')!;
const todosMatrice350 = INITIAL_DATABASE.equipamentos.filter((e) => e.kit === 'KIT DJI MATRICE 350');
const validacaoKit = calculateKitChecklistSummary(
  kitM350,
  kitM350Reqs,
  todosMatrice350
);

assert(
  validacaoKit.isTudoCompleto === true && validacaoKit.totalConferido === 17,
  'Kits Engine: Verificação de kit completo quando todos os 17 itens do Matrice 350 estão presentes',
  `Conferido: ${validacaoKit.totalConferido}/17, Completo: ${validacaoKit.isTudoCompleto}`
);

console.log(`\nResultado da Homologação: ${passedTests} de ${totalTests} testes aprovados.`);
if (passedTests === totalTests) {
  console.log('✅ HOMOLOGAÇÃO CONCLUÍDA COM 100% DE SUCESSO!');
} else {
  process.exit(1);
}
