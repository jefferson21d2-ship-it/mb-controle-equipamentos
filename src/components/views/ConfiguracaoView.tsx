import React, { useState } from 'react';
import {
  Settings,
  Sheet,
  Copy,
  Check,
  RefreshCw,
  UploadCloud,
  FileSpreadsheet,
  ShieldCheck,
  HelpCircle,
  Database,
  Trash2,
  HardHat,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { GOOGLE_APPS_SCRIPT_CODE } from '../../services/appsScriptTemplate';

export const ConfiguracaoView: React.FC = () => {
  const {
    config,
    saveConfig,
    syncWithGoogleSheets,
    importExcelFile,
    isSyncing,
    isConnected,
    lastSyncTime,
    syncError,
    currentUser,
    setCurrentUser,
    db,
    setConnectionModalOpen,
  } = useApp();

  const [appsScriptUrl, setAppsScriptUrl] = useState(config.appsScriptUrl || '');
  const [spreadsheetId, setSpreadsheetId] = useState(config.spreadsheetId || '');
  const [copiedCode, setCopiedCode] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveAndSync = async () => {
    saveConfig({
      ...config,
      appsScriptUrl: appsScriptUrl.trim(),
      spreadsheetId: spreadsheetId.trim(),
    });

    if (appsScriptUrl.trim()) {
      await syncWithGoogleSheets(appsScriptUrl.trim());
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-12 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-400" />
            Configuração da Conexão & Integrações
          </h1>
          <p className="text-xs text-slate-400">
            Gerenciamento do banco Google Sheets, API Google Apps Script e autenticação Google Workspace.
          </p>
        </div>
      </div>

      {/* Card: Status da Conexão */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isConnected
                  ? 'bg-emerald-950 border border-emerald-800 text-emerald-400'
                  : 'bg-amber-950 border border-amber-800 text-amber-400'
              }`}
            >
              <Sheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Google Sheets Banco de Dados
              </h3>
              <p className="text-xs text-slate-400">
                Status:{' '}
                <span
                  className={`font-semibold ${
                    isConnected ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {isConnected ? 'Conectado e Sincronizado' : 'Aguardando Configuração'}
                </span>
                {lastSyncTime && ` • Última sincronização: ${lastSyncTime}`}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => syncWithGoogleSheets()}
              disabled={isSyncing || !config.appsScriptUrl}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-1.5 disabled:opacity-50 transition-all shadow"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              Sincronizar
            </button>
            <button
              onClick={() => setConnectionModalOpen(true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3.5 py-2 rounded-xl border border-slate-700 transition-all"
            >
              Abrir Assistente
            </button>
          </div>
        </div>

        {syncError && (
          <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs">
            {syncError}
          </div>
        )}

        {/* Estatísticas do Banco */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-xs">
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850">
            <span className="text-[10px] text-slate-500 block">Equipamentos</span>
            <span className="font-bold text-white text-sm">{db.equipamentos.length}</span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850">
            <span className="text-[10px] text-slate-500 block">Kits Cadastrados</span>
            <span className="font-bold text-white text-sm">{db.kits.length}</span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850">
            <span className="text-[10px] text-slate-500 block">Obras Ativas</span>
            <span className="font-bold text-white text-sm">{db.obras.length}</span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850">
            <span className="text-[10px] text-slate-500 block">Usuários Workspace</span>
            <span className="font-bold text-white text-sm">{db.usuarios.length}</span>
          </div>
        </div>
      </div>

      {/* Formulário de Configuração do Web App */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-400" />
          Configuração do Google Apps Script
        </h3>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              URL do Web App do Google Apps Script
            </label>
            <input
              type="url"
              placeholder="https://script.google.com/macros/s/.../exec"
              value={appsScriptUrl}
              onChange={(e) => setAppsScriptUrl(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              ID da Planilha Google Sheets
            </label>
            <input
              type="text"
              placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
              value={spreadsheetId}
              onChange={(e) => setSpreadsheetId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
            />
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={handleCopyCode}
              className="text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedCode ? 'Código Copiado!' : 'Copiar Código Google Apps Script (Code.gs)'}</span>
            </button>

            <button
              onClick={handleSaveAndSync}
              disabled={isSyncing}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-xl transition-all"
            >
              {saveSuccess ? 'Salvo com Sucesso!' : 'Salvar Alterações'}
            </button>
          </div>
        </div>
      </div>

      {/* Perfil Google Workspace */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <HardHat className="w-4 h-4 text-blue-400" />
          Usuário Google Workspace Ativo
        </h3>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400 font-bold">
              {currentUser?.nome?.[0] || 'U'}
            </div>
            <div>
              <h4 className="font-bold text-white">{currentUser?.nome}</h4>
              <p className="text-slate-400">{currentUser?.email}</p>
              <p className="text-[11px] text-blue-400 font-medium">
                {currentUser?.cargo} • Perfil: {currentUser?.perfil}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
