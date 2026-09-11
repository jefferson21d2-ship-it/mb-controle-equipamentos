import React, { useState, useEffect } from 'react';
import {
  Box,
  X,
  ShieldCheck,
  Save,
  AlertTriangle,
  Lock,
  Tag,
  MapPin,
  Barcode,
  Layers,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Equipamento, StatusEquipamento } from '../types';

interface EquipamentoEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipamento?: Equipamento | null; // se null, é cadastro de novo equipamento
}

export const EquipamentoEditModal: React.FC<EquipamentoEditModalProps> = ({
  isOpen,
  onClose,
  equipamento,
}) => {
  const { cadastrarEquipamento, editarEquipamento, permissions } = useApp();

  const isEditing = Boolean(equipamento);

  const [codigo, setCodigo] = useState('');
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('Drones / VANT');
  const [marca, setMarca] = useState('DJI Enterprise');
  const [modelo, setModelo] = useState('');
  const [modeloNumero, setModeloNumero] = useState('');
  const [numeroSerie, setNumeroSerie] = useState('');
  const [status, setStatus] = useState<StatusEquipamento>('DISPONÍVEL');
  const [kit, setKit] = useState('');
  const [localizacaoPadrao, setLocalizacaoPadrao] = useState('Escritório Palmas');
  const [localizacaoAtual, setLocalizacaoAtual] = useState('Escritório Palmas');
  const [observacoes, setObservacoes] = useState('');
  const [valorEstimado, setValorEstimado] = useState<number | ''>('');

  useEffect(() => {
    if (equipamento) {
      setCodigo(equipamento.codigo);
      setNome(equipamento.nome);
      setCategoria(equipamento.categoria);
      setMarca(equipamento.marca || '');
      setModelo(equipamento.modelo || '');
      setModeloNumero(equipamento.modeloNumero || '');
      setNumeroSerie(equipamento.numeroSerie || '');
      setStatus(equipamento.status);
      setKit(equipamento.kit || '');
      setLocalizacaoPadrao(equipamento.localizacaoPadrao || 'Escritório Palmas');
      setLocalizacaoAtual(equipamento.localizacaoAtual || 'Escritório Palmas');
      setObservacoes(equipamento.observacoes || '');
      setValorEstimado(equipamento.valorEstimado || '');
    } else {
      setCodigo('');
      setNome('');
      setCategoria('Drones / VANT');
      setMarca('DJI Enterprise');
      setModelo('');
      setModeloNumero('');
      setNumeroSerie('');
      setStatus('DISPONÍVEL');
      setKit('');
      setLocalizacaoPadrao('Escritório Palmas');
      setLocalizacaoAtual('Escritório Palmas');
      setObservacoes('');
      setValorEstimado('');
    }
  }, [equipamento, isOpen]);

  if (!isOpen) return null;

  if (!permissions.canCadastrarPatrimonio && !isEditing) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm p-5 text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
          <h3 className="text-sm font-bold text-white">Acesso Restrito</h3>
          <p className="text-xs text-slate-400">
            Apenas usuários com perfil de Administrador podem cadastrar novos equipamentos patrimoniais.
          </p>
          <button onClick={onClose} className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold">
            Fechar
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !codigo.trim()) {
      alert('Informe o Código do Equipamento (MB-XX) e a Descrição.');
      return;
    }

    try {
      if (isEditing && equipamento) {
        await editarEquipamento(equipamento.id, {
          nome: nome.trim(),
          categoria,
          marca: marca.trim() || undefined,
          modelo: modelo.trim() || undefined,
          modeloNumero: modeloNumero.trim() || undefined,
          numeroSerie: numeroSerie.trim() || undefined,
          status,
          kit: kit.trim() || undefined,
          localizacaoPadrao,
          localizacaoAtual,
          observacoes: observacoes.trim() || undefined,
          valorEstimado: valorEstimado !== '' ? Number(valorEstimado) : undefined,
        });
      } else {
        await cadastrarEquipamento({
          codigo: codigo.trim().toUpperCase(),
          nome: nome.trim(),
          categoria,
          marca: marca.trim() || undefined,
          modelo: modelo.trim() || undefined,
          modeloNumero: modeloNumero.trim() || undefined,
          numeroSerie: numeroSerie.trim() || undefined,
          status,
          kit: kit.trim() || undefined,
          localizacaoPadrao,
          localizacaoAtual,
          observacoes: observacoes.trim() || undefined,
          valorEstimado: valorEstimado !== '' ? Number(valorEstimado) : undefined,
        });
      }
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Erro ao salvar patrimônio.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-950 border border-blue-800 text-blue-400 flex items-center justify-center">
              <Box className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {isEditing ? `Editar Ativo: ${equipamento?.codigo}` : 'Cadastrar Novo Patrimônio M&B'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isEditing ? 'Atualização de especificações e inventário' : 'Registro oficial de novo ativo e geração de QR Code'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Alerta de UUID Imutável */}
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-850 flex items-center gap-2 text-[11px] text-slate-400">
            <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              <strong>Regra de Integridade M&B:</strong> O UUID e o código patrimonial são imutáveis após o cadastro para manter sincronismo com o Google Sheets.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Código Patrimonial MB <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                disabled={isEditing}
                placeholder="Ex: MB-036"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                className={`w-full bg-slate-950 border rounded-xl px-3 py-2 text-white font-mono font-bold ${
                  isEditing ? 'border-slate-800 text-slate-500 cursor-not-allowed' : 'border-slate-700'
                }`}
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Categoria <span className="text-rose-400">*</span>
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium"
              >
                <option value="Drones / VANT">Drones / VANT</option>
                <option value="Baterias VANT">Baterias VANT</option>
                <option value="Carregadores / Hubs">Carregadores / Hubs</option>
                <option value="Câmeras e Sensores">Câmeras e Sensores</option>
                <option value="GNSS / RTK">GNSS / RTK</option>
                <option value="Estação Total">Estação Total</option>
                <option value="Níveis Ópticos / Digitais">Níveis Ópticos / Digitais</option>
                <option value="Acessórios Topografia">Acessórios Topografia</option>
                <option value="Rádios / Comunicação">Rádios / Comunicação</option>
                <option value="Outros Equipamentos">Outros Equipamentos</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Nome / Descrição do Ativo <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Drone DJI Matrice 350 RTK"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Marca / Fabricante</label>
              <input
                type="text"
                placeholder="Ex: DJI, Leica, Topcon"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Modelo</label>
              <input
                type="text"
                placeholder="Ex: Matrice 350 RTK"
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Número de Série (S/N)</label>
              <input
                type="text"
                placeholder="Ex: 1581F5G8..."
                value={numeroSerie}
                onChange={(e) => setNumeroSerie(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Status Operacional</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusEquipamento)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium"
              >
                <option value="DISPONÍVEL">DISPONÍVEL (No Estoque)</option>
                <option value="MANUTENÇÃO">MANUTENÇÃO (Em Oficina)</option>
                <option value="RETORNO PENDENTE">RETORNO PENDENTE</option>
                <option value="BAIXADO">BAIXADO (Inativo)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Vinculado ao Kit</label>
              <input
                type="text"
                placeholder="Ex: Kit Matrice 350 RTK Completo"
                value={kit}
                onChange={(e) => setKit(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Localização Padrão</label>
              <input
                type="text"
                value={localizacaoPadrao}
                onChange={(e) => setLocalizacaoPadrao(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Localização Atual</label>
              <input
                type="text"
                value={localizacaoAtual}
                onChange={(e) => setLocalizacaoAtual(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Observações Técnicas</label>
            <textarea
              rows={2}
              placeholder="Histórico de calibragem, detalhes técnicos adicionais..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white resize-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-800 text-slate-300 px-4 py-2 rounded-xl hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow"
            >
              <Save className="w-4 h-4" />
              {isEditing ? 'Salvar Alterações' : 'Concluir Cadastro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
