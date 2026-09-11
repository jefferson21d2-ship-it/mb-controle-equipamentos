import React, { useState } from 'react';
import {
  Box,
  Search,
  Filter,
  QrCode,
  MapPin,
  CheckCircle2,
  Wrench,
  Truck,
  Clock,
  Layers,
  User,
  ShieldCheck,
  AlertCircle,
  X,
  SlidersHorizontal,
  Printer,
  Eye,
  Camera,
  Plus,
  Edit2,
  Trash2,
  Lock,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Equipamento } from '../../types';
import { EquipamentoImage } from '../EquipamentoImage';
import { EquipamentoDetailModal } from '../EquipamentoDetailModal';
import { QRCodeViewModal } from '../QRCodeViewModal';
import { EtiquetasPrintModal } from '../EtiquetasPrintModal';
import { FotoGerenciadorModal } from '../FotoGerenciadorModal';
import { EquipamentoEditModal } from '../EquipamentoEditModal';

export const EquipamentosView: React.FC = () => {
  const { db, openQrScanner, permissions, excluirEquipamento } = useApp();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedKit, setSelectedKit] = useState<string>('all');
  const [activeEquipamento, setActiveEquipamento] = useState<Equipamento | null>(null);
  const [qrViewEquipamento, setQrViewEquipamento] = useState<Equipamento | null>(null);
  const [fotoManageEquipamento, setFotoManageEquipamento] = useState<Equipamento | null>(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printInitialId, setPrintInitialId] = useState<string | undefined>(undefined);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingEquipamento, setEditingEquipamento] = useState<Equipamento | null>(null);

  // Lista única de categorias
  const categories = Array.from(
    new Set(db.equipamentos.map((e) => e.categoria).filter(Boolean))
  ).sort();

  // Lista única de kits
  const kitsList = Array.from(
    new Set(db.equipamentos.map((e) => e.kit).filter(Boolean) as string[])
  ).sort();

  // Filtro completo: código, nome, fabricante (marca), modelo e serial
  const filteredEquipamentos = db.equipamentos.filter((eq) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      eq.codigo.toLowerCase().includes(q) ||
      eq.nome.toLowerCase().includes(q) ||
      (eq.marca && eq.marca.toLowerCase().includes(q)) ||
      (eq.modelo && eq.modelo.toLowerCase().includes(q)) ||
      (eq.modeloNumero && eq.modeloNumero.toLowerCase().includes(q)) ||
      (eq.numeroSerie && eq.numeroSerie.toLowerCase().includes(q));

    // Filtro Categoria
    const matchesCategory =
      selectedCategory === 'all' || eq.categoria === selectedCategory;

    // Filtro Status (Normalizado para suportar maiúsculas/minúsculas)
    const matchesStatus =
      selectedStatus === 'all' ||
      eq.status.toUpperCase() === selectedStatus.toUpperCase();

    // Filtro Kit
    const matchesKit =
      selectedKit === 'all' ||
      (selectedKit === 'sem_kit' ? !eq.kit : eq.kit === selectedKit);

    return matchesSearch && matchesCategory && matchesStatus && matchesKit;
  });

  const getStatusBadge = (status: Equipamento['status']) => {
    const s = (status || '').toUpperCase();
    if (s === 'DISPONÍVEL' || s === 'DISPONIVEL') {
      return {
        label: 'DISPONÍVEL',
        icon: CheckCircle2,
        classes: 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80',
      };
    }
    if (s === 'EM CAMPO') {
      return {
        label: 'EM CAMPO',
        icon: Truck,
        classes: 'bg-blue-950/80 text-blue-400 border-blue-800/80',
      };
    }
    if (s === 'RETORNO PENDENTE') {
      return {
        label: 'RETORNO PENDENTE',
        icon: Clock,
        classes: 'bg-amber-950/80 text-amber-400 border-amber-800/80',
      };
    }
    if (s === 'MANUTENÇÃO' || s === 'MANUTENCAO' || s === 'CALIBRAÇÃO' || s === 'CALIBRACAO') {
      return {
        label: 'MANUTENÇÃO',
        icon: Wrench,
        classes: 'bg-rose-950/80 text-rose-400 border-rose-800/80',
      };
    }
    if (s === 'BLOQUEADO') {
      return {
        label: 'BLOQUEADO',
        icon: AlertCircle,
        classes: 'bg-purple-950/80 text-purple-400 border-purple-800/80',
      };
    }
    return {
      label: 'BAIXADO',
      icon: Box,
      classes: 'bg-slate-800 text-slate-400 border-slate-700',
    };
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedCategory('all');
    setSelectedStatus('all');
    setSelectedKit('all');
  };

  const hasActiveFilters =
    search !== '' ||
    selectedCategory !== 'all' ||
    selectedStatus !== 'all' ||
    selectedKit !== 'all';

  return (
    <div className="space-y-6 pb-20 lg:pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Box className="w-5 h-5 text-blue-400" />
            Catálogo de Equipamentos M&B
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {filteredEquipamentos.length} de {db.equipamentos.length} equipamentos cadastrados com código patrimonial MB e QR Code.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {permissions.canCadastrarPatrimonio && (
            <button
              onClick={() => {
                setEditingEquipamento(null);
                setEditModalOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Patrimônio
            </button>
          )}

          <button
            onClick={() => {
              setPrintInitialId(undefined);
              setPrintModalOpen(true);
            }}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all border border-slate-700 shadow"
          >
            <Printer className="w-4 h-4 text-slate-300" />
            Imprimir Etiquetas
          </button>

          <button
            onClick={() => openQrScanner({ mode: 'lookup' })}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow"
          >
            <QrCode className="w-4 h-4" />
            Escanear QR Code
          </button>
        </div>
      </div>

      {/* Aviso de Perfil RBAC para Operadores */}
      {!permissions.isAdmin && (
        <div className="p-3 bg-blue-950/40 border border-blue-900/60 rounded-xl flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-400 shrink-0" />
            <span>
              <strong>Perfil OPERADOR ativo:</strong> Você tem permissão para consultar, escanear QR Code, realizar saídas, checklists e devoluções. Edição de patrimônio, alteração de UUID e exclusão são restritos a Administradores.
            </span>
          </div>
          <span className="text-[10px] font-bold text-blue-400 bg-blue-900/50 px-2 py-0.5 rounded uppercase shrink-0">
            Segurança M&B
          </span>
        </div>
      )}

      {/* Barra de Pesquisa e Filtros (Categorias, Status e Kits) */}
      <div className="space-y-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Pesquisa por código, nome, fabricante, modelo e serial */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar código (MB-...), nome, fabricante, modelo, serial..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-8 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtro por Categoria */}
          <div className="sm:col-span-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="all">Categorias (Todas)</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Status (6 status oficiais) */}
          <div className="sm:col-span-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="all">Status (Todos)</option>
              <option value="DISPONÍVEL">DISPONÍVEL</option>
              <option value="EM CAMPO">EM CAMPO</option>
              <option value="RETORNO PENDENTE">RETORNO PENDENTE</option>
              <option value="MANUTENÇÃO">MANUTENÇÃO</option>
              <option value="BLOQUEADO">BLOQUEADO</option>
              <option value="BAIXADO">BAIXADO</option>
            </select>
          </div>

          {/* Filtro por Kit */}
          <div className="sm:col-span-3">
            <select
              value={selectedKit}
              onChange={(e) => setSelectedKit(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="all">Kits Operacionais (Todos)</option>
              {kitsList.map((kit) => (
                <option key={kit} value={kit}>
                  {kit}
                </option>
              ))}
              <option value="sem_kit">Sem Kit Vinculado</option>
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400">
            <span>Filtros ativos aplicados. Exibindo {filteredEquipamentos.length} de {db.equipamentos.length}.</span>
            <button
              onClick={clearFilters}
              className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Limpar Filtros
            </button>
          </div>
        )}
      </div>

      {/* Grid de Cards de Equipamentos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
        {filteredEquipamentos.map((eq) => {
          const statusConfig = getStatusBadge(eq.status);
          const StatusIcon = statusConfig.icon;
          const responsavelAtual =
            eq.responsavelAtualNome || 'Base Central Palmas';

          return (
            <div
              key={eq.id}
              onClick={() => setActiveEquipamento(eq)}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg flex flex-col justify-between group active:scale-[0.99]"
            >
              <div className="space-y-3">
                {/* 1. Imagem: Foto real -> Imagem Modelo -> Placeholder profissional */}
                <div className="w-full aspect-[16/10] overflow-hidden rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-center p-2 relative">
                  <EquipamentoImage
                    equipamento={eq}
                    className="w-full h-full"
                    size="md"
                  />
                  {/* Categoria Badge sobreposta */}
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-950/80 text-blue-300 border border-slate-800 backdrop-blur-sm">
                    {eq.categoria}
                  </span>
                </div>

                {/* 2. Top Tag (Código) & Status */}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-blue-950 text-blue-300 border border-blue-900/80 tracking-wide">
                    {eq.codigo}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border uppercase tracking-wider ${statusConfig.classes}`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {statusConfig.label}
                  </span>
                </div>

                {/* 3. Nome & Modelo */}
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors line-clamp-1">
                    {eq.nome}
                  </h3>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {eq.marca ? `${eq.marca} • ` : ''}
                    {eq.modelo || eq.modeloNumero || 'Modelo Padrão'}
                  </p>
                </div>

                {/* 4. Responsável Atual & Localização */}
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/70 space-y-1 text-[11px]">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-500 flex items-center gap-1 shrink-0">
                      <User className="w-3 h-3 text-slate-500" />
                      Responsável:
                    </span>
                    <span className="font-semibold truncate max-w-[170px] text-right">
                      {responsavelAtual}
                    </span>
                  </div>

                  {eq.kit && (
                    <div className="flex items-center justify-between text-slate-400 pt-0.5 border-t border-slate-800/60">
                      <span className="text-slate-500 flex items-center gap-1 shrink-0">
                        <Layers className="w-3 h-3 text-slate-500" />
                        Kit:
                      </span>
                      <span className="text-[10px] font-medium text-blue-300 truncate max-w-[170px] text-right">
                        {eq.kit}
                      </span>
                    </div>
                  )}

                  {eq.numeroSerie && (
                    <div className="flex items-center justify-between text-slate-400 pt-0.5 border-t border-slate-800/60">
                      <span className="text-slate-500 shrink-0">N/S:</span>
                      <span className="font-mono text-[10px] text-slate-300 truncate max-w-[170px] text-right">
                        {eq.numeroSerie}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer do Card com Ação de Detalhes, Foto & QR Code */}
              <div className="mt-3 pt-2.5 border-t border-slate-800/90 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFotoManageEquipamento(eq);
                    }}
                    title="Gerenciar / Tirar foto do equipamento"
                    className="text-slate-400 hover:text-white flex items-center gap-1 font-semibold text-[11px] px-2 py-1 rounded-lg hover:bg-slate-800 border border-slate-800/80 transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5 text-blue-400" />
                    Foto
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setQrViewEquipamento(eq);
                    }}
                    title="Ver QR Code individual"
                    className="text-slate-400 hover:text-white flex items-center gap-1 font-semibold text-[11px] px-2 py-1 rounded-lg hover:bg-slate-800 border border-slate-800/80 transition-colors"
                  >
                    <QrCode className="w-3.5 h-3.5 text-blue-400" />
                    QR
                  </button>

                  {permissions.canEditarPatrimonio && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingEquipamento(eq);
                        setEditModalOpen(true);
                      }}
                      title="Editar Ativo (Administrador)"
                      className="text-slate-400 hover:text-white flex items-center gap-1 font-semibold text-[11px] px-2 py-1 rounded-lg hover:bg-slate-800 border border-slate-800/80 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-emerald-400" />
                      Editar
                    </button>
                  )}

                  {permissions.canExcluirEquipamentos && eq.status !== 'EM CAMPO' && (
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (window.confirm(`Tem certeza que deseja baixar/excluir o equipamento ${eq.codigo} (${eq.nome})? Esta operação será registrada para auditoria.`)) {
                          try {
                            await excluirEquipamento(eq.id);
                          } catch (err: any) {
                            alert(err?.message || 'Erro ao excluir equipamento.');
                          }
                        }
                      }}
                      title="Baixar/Excluir Ativo (Administrador)"
                      className="text-slate-400 hover:text-rose-400 flex items-center gap-1 font-semibold text-[11px] px-2 py-1 rounded-lg hover:bg-rose-950/40 border border-slate-800/80 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <span className="text-blue-400 flex items-center gap-1 font-semibold group-hover:underline text-[11px]">
                  <Eye className="w-3.5 h-3.5" />
                  Detalhes
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredEquipamentos.length === 0 && (
        <div className="text-center py-12 text-slate-400 text-xs bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
          <p className="font-semibold text-white">Nenhum equipamento encontrado.</p>
          <p className="text-slate-500">Tente ajustar seus termos de busca ou remover os filtros aplicados.</p>
          <button
            onClick={clearFilters}
            className="mt-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg font-semibold"
          >
            Limpar todos os filtros
          </button>
        </div>
      )}

      {/* Modal de Cadastro e Edição de Patrimônio (Apenas Administrador) */}
      <EquipamentoEditModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingEquipamento(null);
        }}
        equipamento={editingEquipamento}
      />

      {/* Modal de Detalhes Profissional (PROMPT 2 REQUISITO) */}
      <EquipamentoDetailModal
        equipamento={activeEquipamento}
        onClose={() => setActiveEquipamento(null)}
        onOpenPrintModal={(eqId) => {
          setPrintInitialId(eqId);
          setPrintModalOpen(true);
        }}
      />

      {/* Modal Individual de Visualização de QR Code (PROMPT 3 REQUISITO) */}
      <QRCodeViewModal
        equipamento={qrViewEquipamento}
        onClose={() => setQrViewEquipamento(null)}
        onOpenPrintModal={(eqId) => {
          setPrintInitialId(eqId);
          setPrintModalOpen(true);
        }}
      />

      {/* Modal Administrativo de Impressão de Etiquetas (PROMPT 3 REQUISITO) */}
      <EtiquetasPrintModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        initialEquipamentoId={printInitialId}
      />

      {/* Modal de Gerenciamento de Fotos (PROMPT 4) */}
      <FotoGerenciadorModal
        equipamento={fotoManageEquipamento}
        isOpen={Boolean(fotoManageEquipamento)}
        onClose={() => setFotoManageEquipamento(null)}
      />
    </div>
  );
};
