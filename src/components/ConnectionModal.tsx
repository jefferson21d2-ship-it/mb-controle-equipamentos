import React, { useState } from 'react';
import {
  X,
  Sheet,
  Check,
  Copy,
  UploadCloud,
  FileSpreadsheet,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  FolderSync,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GOOGLE_APPS_SCRIPT_CODE } from '../services/appsScriptTemplate';

export const ConnectionModal: React.FC = () => {
  const {
    connectionModalOpen,
    setConnectionModalOpen,
    config,
    saveConfig,
    syncWithGoogleSheets,
    importExcelFile,
    isSyncing,
    isConnected,
    syncError,
    lastSyncTime,
    db,
  } = useApp();

  const [appsScriptUrl, setAppsScriptUrl] = useState(config.appsScriptUrl || '');
  const [spreadsheetId, setSpreadsheetId] = useState(config.spreadsheetId || '');
  const [activeTab, setActiveTab] = useState<'connect' | 'upload' | 'script' | 'guide'>('connect');
  const [copiedScript, setCopiedScript] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);

  if (!connectionModalOpen) return null;

  const handleTestAndSave = async () => {
    setTestResult(null);
    if (!appsScriptUrl.trim()) {
      setTestResult({ success: false, message: 'Por favor, informe a URL do Web App do Google Apps Script.' });
      return;
    }

    saveConfig({
      ...config,
      appsScriptUrl: appsScriptUrl.trim(),
      spreadsheetId: spreadsheetId.trim(),
    });

    const success = await syncWithGoogleSheets(appsScriptUrl.trim());
    if (success) {
      setTestResult({ success: true, message: 'Conexão validada! Dados sincronizados com sucesso.' });
    } else {
      setTestResult({ success: false, message: syncError || 'Falha ao conectar. Verifique as permissões de acesso do Web App.' });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadSuccessMsg(null);
      const res = await importExcelFile(file);
      setUploadSuccessMsg(`Planilha importada com sucesso! ${res.count} equipamentos reais carregados.`);
    } catch (err: any) {
      alert(`Erro na importação: ${err.message}`);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center">
              <Sheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Conexão Google Sheets & Apps Script
              </h2>
              <p className="text-xs text-slate-400">
                Arquitetura de Custo Zero (Google Sheets como Banco + Apps Script API)
              </p>
            </div>
          </div>
          <button
            onClick={() => setConnectionModalOpen(false)}
            aria-label="Fechar janela"
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Bar */}
        <div className="bg-slate-800/60 px-6 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected ? 'bg-emerald-400 ring-2 ring-emerald-950' : 'bg-amber-400'
              }`}
            />
            <span className="font-medium text-slate-200">
              {isConnected ? 'Sincronizado' : 'Aguardando Conexão'}
            </span>
            {lastSyncTime && (
              <span className="text-slate-400">({lastSyncTime})</span>
            )}
          </div>
          <div className="text-slate-300 font-medium">
            {db.equipamentos.length} Equipamentos Reais Carregados
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-900 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('connect')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'connect'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderSync className="w-4 h-4" />
            URL da API (Web App)
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'upload'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            Importar Arquivo .xlsx
          </button>
          <button
            onClick={() => setActiveTab('script')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'script'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Copy className="w-4 h-4" />
            Código Apps Script
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'guide'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            Instruções Passo a Passo
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: CONNECT VIA APPS SCRIPT URL */}
          {activeTab === 'connect' && (
            <div className="space-y-4">
              <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700 text-xs text-slate-300 leading-relaxed space-y-2">
                <div className="flex items-center gap-2 font-semibold text-blue-400 text-sm">
                  <ShieldCheck className="w-4 h-4" />
                  API Google Apps Script em Tempo Real
                </div>
                <p>
                  O aplicativo conecta-se diretamente ao seu Google Apps Script implantado na sua planilha Google Sheets, permitindo leitura e gravação dos equipamentos, saídas e manutenções com custo zero e autenticação Google Workspace.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  URL do Web App do Google Apps Script <span className="text-rose-400">*</span>
                </label>
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  value={appsScriptUrl}
                  onChange={(e) => setAppsScriptUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Obtida ao implantar o script como Aplicativo da Web (acesso: "Qualquer pessoa").
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  ID da Planilha Google Sheets (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                  value={spreadsheetId}
                  onChange={(e) => setSpreadsheetId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                    testResult.success
                      ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
                      : 'bg-rose-950/70 border-rose-800 text-rose-300'
                  }`}
                >
                  {testResult.success ? (
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleTestAndSave}
                  disabled={isSyncing}
                  className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSyncing ? 'Conectando e Carregando...' : 'Salvar e Sincronizar Agora'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: UPLOAD DIRECT .XLSX */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700 text-xs text-slate-300">
                <p className="font-semibold text-slate-200 mb-1">
                  Importação Direta da Planilha Original
                </p>
                <p className="text-slate-400">
                  Carregue diretamente o arquivo <code className="text-blue-400 font-mono">MB_Controle_Equipamentos_AppSheet_PRONTO.xlsx</code> do seu computador para inicializar as 8 tabelas com os 35 equipamentos reais sem dados simulados.
                </p>
              </div>

              <div className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-2xl p-8 text-center bg-slate-950/50 transition-colors">
                <FileSpreadsheet className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-white mb-1">
                  Selecione o arquivo da planilha
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Suporta arquivos .xlsx com as abas EQUIPAMENTOS, KITS, OBRAS, USUÁRIOS, etc.
                </p>

                <label className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer border border-slate-600 transition-all">
                  <UploadCloud className="w-4 h-4 text-blue-400" />
                  <span>Escolher Arquivo .xlsx</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </div>

              {uploadSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{uploadSuccessMsg}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: APPS SCRIPT CODE */}
          {activeTab === 'script' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-300 font-medium">
                  Copie e cole este código no Apps Script da sua planilha:
                </p>
                <button
                  onClick={handleCopyScript}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg transition-all"
                >
                  {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedScript ? 'Copiado!' : 'Copiar Código'}</span>
                </button>
              </div>

              <div className="relative bg-slate-950 rounded-xl p-3 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-72">
                <pre>{GOOGLE_APPS_SCRIPT_CODE}</pre>
              </div>
            </div>
          )}

          {/* TAB 4: STEP BY STEP GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs text-slate-300">
              <h3 className="text-sm font-bold text-white mb-2">
                Como Conectar a Planilha Google Sheets (Passo a Passo)
              </h3>

              <div className="space-y-3">
                <div className="flex gap-3 bg-slate-800/40 p-3.5 rounded-xl border border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Abra a Planilha no Google Drive</h4>
                    <p className="text-slate-400 mt-0.5">
                      Abra a planilha <span className="text-slate-200 font-mono">MB_Controle_Equipamentos_AppSheet_PRONTO</span> com as 8 abas existentes (EQUIPAMENTOS, KITS, KIT REQUISITOS, USUÁRIOS, OBRAS, SAIDAS, SAIDA ITENS, MANUTENCOES).
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 bg-slate-800/40 p-3.5 rounded-xl border border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Abra o Editor de Apps Script</h4>
                    <p className="text-slate-400 mt-0.5">
                      No menu superior da planilha, clique em <strong className="text-slate-200">Extensões → Apps Script</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 bg-slate-800/40 p-3.5 rounded-xl border border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Cole o Código e Salve</h4>
                    <p className="text-slate-400 mt-0.5">
                      Substitua todo o conteúdo do arquivo <code className="text-blue-400">Código.gs</code> pelo script fornecido na aba <strong className="text-slate-200">"Código Apps Script"</strong> e clique no ícone de Salvar (Ctrl+S).
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 bg-slate-800/40 p-3.5 rounded-xl border border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    4
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Implantar como Aplicativo da Web</h4>
                    <p className="text-slate-400 mt-0.5">
                      Clique no botão azul <strong className="text-slate-200">Implantar → Nova implantação</strong>. Escolha o tipo <strong>"Aplicativo da Web"</strong>. Defina <em>Executar como: Eu</em> e <em>Quem tem acesso: Qualquer pessoa</em>.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 bg-slate-800/40 p-3.5 rounded-xl border border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    5
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Copie a URL e Cole no App</h4>
                    <p className="text-slate-400 mt-0.5">
                      Copie a URL do Web App gerada (terminada em <code className="text-blue-400 font-mono">/exec</code>) e cole no campo <strong className="text-slate-200">"URL da API"</strong> na primeira aba deste modal.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between text-xs text-slate-400">
          <span>Prioridade: Custo Zero com Google Workspace</span>
          <button
            onClick={() => setConnectionModalOpen(false)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-all"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
