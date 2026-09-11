import React, { useState, useRef } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  HelpCircle,
  Camera,
  Upload,
  Trash2,
  Wrench,
  User,
  Calendar,
  DollarSign,
  Building2,
  Check,
  ShieldAlert,
} from 'lucide-react';
import {
  Equipamento,
  EstadoRetorno,
  PrioridadeManutencao,
  Saida,
  SaidaItem,
  Manutencao,
} from '../../types';
import { useApp } from '../../context/AppContext';

interface DevolucaoItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: SaidaItem;
  equipamento?: Equipamento;
  saida: Saida;
  onSuccess: () => void;
}

export const DevolucaoItemModal: React.FC<DevolucaoItemModalProps> = ({
  isOpen,
  onClose,
  item,
  equipamento,
  saida,
  onSuccess,
}) => {
  const { currentUser, registrarDevolucaoItem } = useApp();

  const [estadoRetorno, setEstadoRetorno] = useState<EstadoRetorno>(
    item.estadoRetorno || 'OK'
  );
  const [observacao, setObservacao] = useState<string>(
    item.observacaoDevolucao || ''
  );
  const [fotoUrl, setFotoUrl] = useState<string>(item.fotoDevolucaoUrl || '');
  const [isUploadingFoto, setIsUploadingFoto] = useState(false);

  // Dados da Manutenção (PROMPT 6: se AVARIADO, criar ou oferecer imediatamente registro na tabela MANUTENCOES)
  const [manutencaoDescricao, setManutencaoDescricao] = useState<string>(
    item.observacaoDevolucao ||
      `Avaria identificada no retorno da obra ${saida.obraNome}: `
  );
  const [manutencaoPrioridade, setManutencaoPrioridade] =
    useState<PrioridadeManutencao>('Alta');
  const [manutencaoFornecedor, setManutencaoFornecedor] = useState<string>(
    equipamento?.marca ? `${equipamento.marca} Assistência Autorizada` : 'Assistência Técnica Autorizada'
  );
  const [manutencaoCusto, setManutencaoCusto] = useState<string>('');
  const [manutencaoResponsavel, setManutencaoResponsavel] = useState<string>(
    currentUser?.nome || saida.responsavelNome || 'Operador Técnico'
  );
  const [manutencaoConclusao, setManutencaoConclusao] = useState<string>(
    'Encaminhado para triagem e diagnóstico laboratorial'
  );
  const [manutencaoStatus, setManutencaoStatus] =
    useState<Manutencao['status']>('Em Andamento');

  const [isSaving, setIsSaving] = useState(false);
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Upload simulado/local de fotografia
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFoto(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setFotoUrl(dataUrl);
      setIsUploadingFoto(false);
    };
    reader.onerror = () => {
      setErroMsg('Falha ao processar arquivo de imagem');
      setIsUploadingFoto(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSalvar = async () => {
    setIsSaving(true);
    setErroMsg(null);

    try {
      if (estadoRetorno === 'AVARIADO' && !manutencaoDescricao.trim()) {
        throw new Error('Por favor, detalhe a descrição da avaria para abrir a ordem de manutenção.');
      }
      if (estadoRetorno === 'NÃO LOCALIZADO' && !observacao.trim()) {
        throw new Error('Por favor, informe uma observação sobre o não retorno do equipamento.');
      }

      await registrarDevolucaoItem({
        saidaId: saida.id,
        itemId: item.id,
        estadoRetorno,
        observacao: observacao.trim() || undefined,
        fotoUrl: fotoUrl.trim() || undefined,
        dadosManutencao:
          estadoRetorno === 'AVARIADO'
            ? {
                descricao: manutencaoDescricao.trim(),
                prioridade: manutencaoPrioridade,
                fornecedor: manutencaoFornecedor.trim() || undefined,
                custo: manutencaoCusto ? parseFloat(manutencaoCusto) : undefined,
                responsavel: manutencaoResponsavel.trim() || currentUser?.nome || 'Operador M&B',
                status: manutencaoStatus,
                conclusao: manutencaoConclusao.trim() || undefined,
              }
            : undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setErroMsg(err.message || 'Erro ao registrar devolução.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-blue-950 text-blue-400 border border-blue-900">
              {item.codigoEquipamento}
            </span>
            <div>
              <h2 className="text-sm font-bold text-white leading-tight">
                {item.nomeEquipamento || equipamento?.nome || 'Equipamento'}
              </h2>
              <p className="text-[11px] text-slate-400">
                Saída {saida.codigo} • {saida.obraNome}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 max-h-[78vh] overflow-y-auto">
          {erroMsg && (
            <div className="p-3 bg-red-950/80 border border-red-800 rounded-xl text-xs text-red-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{erroMsg}</span>
            </div>
          )}

          {/* Seleção do Estado no Retorno (PROMPT 6) */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              1. Estado no Retorno (Obrigatório)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Opção OK */}
              <div
                onClick={() => setEstadoRetorno('OK')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                  estadoRetorno === 'OK'
                    ? 'bg-emerald-950/60 border-emerald-500 shadow-sm shadow-emerald-900/30'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    estadoRetorno === 'OK'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-emerald-400'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">OK</span>
                    <span className="text-[10px] bg-emerald-950 border border-emerald-800 text-emerald-300 px-1.5 py-0.2 rounded font-medium">
                      → DISPONÍVEL
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Equipamento íntegro, limpo e testado. Pronto para novo uso imediato.
                  </p>
                </div>
              </div>

              {/* Opção DESGASTE NORMAL */}
              <div
                onClick={() => setEstadoRetorno('DESGASTE NORMAL')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                  estadoRetorno === 'DESGASTE NORMAL'
                    ? 'bg-blue-950/60 border-blue-500 shadow-sm shadow-blue-900/30'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    estadoRetorno === 'DESGASTE NORMAL'
                      ? 'bg-blue-500 text-slate-950'
                      : 'bg-slate-800 text-blue-400'
                  }`}
                >
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">DESGASTE NORMAL</span>
                    <span className="text-[10px] bg-blue-950 border border-blue-800 text-blue-300 px-1.5 py-0.2 rounded font-medium">
                      → DISPONÍVEL
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Marcas cosméticas leves de campo. Mantém observação no cadastro.
                  </p>
                </div>
              </div>

              {/* Opção AVARIADO */}
              <div
                onClick={() => setEstadoRetorno('AVARIADO')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                  estadoRetorno === 'AVARIADO'
                    ? 'bg-rose-950/60 border-rose-500 shadow-sm shadow-rose-900/30'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    estadoRetorno === 'AVARIADO'
                      ? 'bg-rose-500 text-white'
                      : 'bg-slate-800 text-rose-400'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">AVARIADO</span>
                    <span className="text-[10px] bg-rose-950 border border-rose-800 text-rose-300 px-1.5 py-0.2 rounded font-medium">
                      → MANUTENÇÃO
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Avaria, erro elétrico, impacto ou quebra. Abre ordem de manutenção técnica.
                  </p>
                </div>
              </div>

              {/* Opção NÃO LOCALIZADO */}
              <div
                onClick={() => setEstadoRetorno('NÃO LOCALIZADO')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                  estadoRetorno === 'NÃO LOCALIZADO'
                    ? 'bg-amber-950/60 border-amber-500 shadow-sm shadow-amber-900/30'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    estadoRetorno === 'NÃO LOCALIZADO'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 text-amber-400'
                  }`}
                >
                  <AlertOctagon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">NÃO LOCALIZADO</span>
                    <span className="text-[10px] bg-amber-950 border border-amber-800 text-amber-300 px-1.5 py-0.2 rounded font-medium">
                      → RETORNO PENDENTE
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Equipamento não retornado pela equipe ou esquecido na obra.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Observação e Foto de Retorno */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                2. Observação do Retorno / Laudo Visual
              </label>
              <textarea
                rows={2}
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder={
                  estadoRetorno === 'OK'
                    ? 'Ex: Hélices perfeitas, câmera limpa, cabos conferidos...'
                    : estadoRetorno === 'DESGASTE NORMAL'
                    ? 'Ex: Pequenos riscos no corpo plástico, sem folga...'
                    : estadoRetorno === 'AVARIADO'
                    ? 'Descreva onde está a avaria ou o erro acusado...'
                    : 'Descreva onde o item pode ter ficado na obra...'
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Foto de Evidência */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                3. Foto de Inspeção / Evidência
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-colors"
                >
                  <Camera className="w-4 h-4 text-blue-400" />
                  {fotoUrl ? 'Substituir Foto' : 'Tirar Foto ou Selecionar'}
                </button>

                {fotoUrl && (
                  <button
                    type="button"
                    onClick={() => setFotoUrl('')}
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 py-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remover Foto
                  </button>
                )}

                {isUploadingFoto && (
                  <span className="text-xs text-blue-400 animate-pulse">
                    Processando imagem...
                  </span>
                )}
              </div>

              {fotoUrl && (
                <div className="mt-2.5 relative inline-block rounded-xl overflow-hidden border border-slate-700 max-w-xs">
                  <img
                    src={fotoUrl}
                    alt="Evidência do Retorno"
                    className="max-h-36 object-cover"
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-slate-950/80 px-2 py-0.5 text-[10px] text-slate-300">
                    Foto anexada ao laudo
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Se AVARIADO: Seção de Abertura Imediata na Tabela MANUTENCOES (PROMPT 6) */}
          {estadoRetorno === 'AVARIADO' && (
            <div className="bg-rose-950/30 border border-rose-800/80 rounded-2xl p-4.5 space-y-3.5 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-rose-900/50 pb-2.5">
                <h3 className="text-xs font-bold text-rose-300 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-rose-400" />
                  Abertura Imediata na Tabela MANUTENCOES
                </h3>
                <span className="text-[10px] bg-rose-900/80 text-rose-200 px-2 py-0.5 rounded font-mono font-bold">
                  Ordem Corretiva
                </span>
              </div>

              <p className="text-[11px] text-rose-200/90 leading-relaxed">
                Conforme a regra do sistema, o status deste ativo passará para{' '}
                <strong className="text-white">MANUTENÇÃO</strong> e um registro com histórico completo de auditoria será gerado imediatamente.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-rose-200 mb-1">
                    Descrição do Defeito / Avaria *
                  </label>
                  <input
                    type="text"
                    value={manutencaoDescricao}
                    onChange={(e) => setManutencaoDescricao(e.target.value)}
                    placeholder="Ex: Célula 3 com desbalanceamento de voltagem (erro BS65)..."
                    className="w-full bg-slate-950 border border-rose-900/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-rose-200 mb-1">
                    Prioridade
                  </label>
                  <select
                    value={manutencaoPrioridade}
                    onChange={(e) =>
                      setManutencaoPrioridade(e.target.value as PrioridadeManutencao)
                    }
                    className="w-full bg-slate-950 border border-rose-900/80 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                    <option value="Urgente">Urgente (Impacta Operação)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-rose-200 mb-1">
                    Responsável pela Abertura
                  </label>
                  <input
                    type="text"
                    value={manutencaoResponsavel}
                    onChange={(e) => setManutencaoResponsavel(e.target.value)}
                    className="w-full bg-slate-950 border border-rose-900/80 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-rose-200 mb-1">
                    Fornecedor / Oficina Autorizada
                  </label>
                  <input
                    type="text"
                    value={manutencaoFornecedor}
                    onChange={(e) => setManutencaoFornecedor(e.target.value)}
                    placeholder="Ex: DJI Enterprise Brasil"
                    className="w-full bg-slate-950 border border-rose-900/80 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-rose-200 mb-1">
                    Custo Estimado (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={manutencaoCusto}
                    onChange={(e) => setManutencaoCusto(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-rose-900/80 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-rose-200 mb-1">
                    Conclusão / Próxima Ação
                  </label>
                  <input
                    type="text"
                    value={manutencaoConclusao}
                    onChange={(e) => setManutencaoConclusao(e.target.value)}
                    placeholder="Ex: Aguardando envio para serviço autorizado"
                    className="w-full bg-slate-950 border border-rose-900/80 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Dados de Auditoria */}
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-blue-400" />
              <span>Auditoria: {currentUser?.nome || 'Operador Técnico'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Data/Hora: {new Date().toLocaleString('pt-BR')}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSalvar}
            className={`px-5 py-2.5 text-xs font-bold rounded-xl shadow flex items-center gap-2 transition-all ${
              estadoRetorno === 'AVARIADO'
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            <Check className="w-4 h-4" />
            {isSaving ? 'Gravando...' : 'Confirmar Retorno do Equipamento'}
          </button>
        </div>
      </div>
    </div>
  );
};
