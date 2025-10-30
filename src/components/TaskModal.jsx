import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, Package, Hash, Pencil, Check, X } from 'lucide-react';
import api from '@/api/axios'; // ajuste se o caminho for diferente

const TaskModal = ({ isOpen, onClose, task, onSave, isEditing = false }) => {
  const initialFormData = {
    orderNumber: '',
    description: '',
    client: '',
    priority: 'media',
    sector: 'usinagem',
    dueDate: '',
    estimatedHours: '',
    products: []
  };

  const [formData, setFormData] = useState(initialFormData);
  const [editingProductId, setEditingProductId] = useState(null);
  const [editingSnapshot, setEditingSnapshot] = useState(null); // cópia do item quando entra na edição

  useEffect(() => {
    if (task && isEditing) {
      setFormData({
        ...task,
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
        products: task.products || []
      });
    } else {
      setFormData(initialFormData);
    }
    setEditingProductId(null);
    setEditingSnapshot(null);
  }, [task, isEditing, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const taskData = {
      ...formData,
      id: isEditing ? task.id : Date.now().toString(),
      createdAt: isEditing ? task.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      estimatedHours: parseInt(formData.estimatedHours) || 0
    };

    // DTO para o backend (patch). Envia dataEntrega e itens (id + campos editáveis)
    const dto = {
      id: isEditing ? task.id : null,
      priority: formData.priority || null,
      dataEntrega: formData.dueDate || null,
      itens: (formData.products || []).map(p => ({
        id: p.id ?? null, // o service só atualiza se existir
        descricao: p.name ?? null,
        quantidade: p.quantity ?? null,
        corMadeira: p.woodColor ?? null,
        corRevestimento: p.coatingColor ?? null,
        descricaoDetalhada: p.details ?? null,
        detalhesMedidas: p.detalhesMedidas ?? null,
      }))
    };

    try {
      if (dto.id) {
        await api.put('/api/pedidos-venda/atualizarDados', dto, {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      onSave?.(taskData);
      onClose();
    } catch (err) {
      console.error('Erro ao atualizar pedido:', err);
      // opcional: toast de erro aqui
    }
  };

  const startEditProduct = (product) => {
    setEditingProductId(product.id);
    // snapshot para permitir cancelar
    setEditingSnapshot({ ...product });
  };

  const cancelEditProduct = () => {
    if (editingSnapshot && editingProductId) {
      // restaura o item no estado
      setFormData(prev => ({
        ...prev,
        products: prev.products.map(p => (p.id === editingProductId ? editingSnapshot : p))
      }));
    }
    setEditingProductId(null);
    setEditingSnapshot(null);
  };

  const confirmEditProduct = () => {
    // nada especial a fazer além de sair do modo edição,
    // pois os inputs já atualizaram o estado do produto
    setEditingProductId(null);
    setEditingSnapshot(null);
  };

  // handlers de campos do item quando em edição inline
  const handleInlineChange = (productId, field, value) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.map(p =>
        p.id === productId ? { ...p, [field]: value } : p
      )
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? '✏️ Editar Pedido' : '➕ Novo Pedido'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                <Hash className="inline w-4 h-4 mr-1" />
                Número do Pedido
              </label>
              <Input
                value={formData.orderNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, orderNumber: e.target.value }))}
                placeholder="Ex: PED-001"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                <User className="inline w-4 h-4 mr-1" />
                Cliente
              </label>
              <Input
                value={formData.client}
                onChange={(e) => setFormData(prev => ({ ...prev, client: e.target.value }))}
                placeholder="Nome do cliente"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Descrição do Pedido</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Detalhes gerais do pedido..."
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Prioridade</label>
              <Select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Setor Inicial</label>
              <Select
                value={formData.sector}
                onChange={(e) => setFormData(prev => ({ ...prev, sector: e.target.value }))}
              >
                <option value="usinagem">Usinagem</option>
                <option value="marcenaria">Marcenaria</option>
                <option value="montagem">Montagem</option>
                <option value="tapeçaria">Tapeçaria</option>
                <option value="lustracao">Lustração</option>
                <option value="expedicao">Expedição</option>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                <Calendar className="inline w-4 h-4 mr-1" />
                Data de Entrega
              </label>
              <Input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                <Clock className="inline w-4 h-4 mr-1" />
                Horas Estimadas
              </label>
              <Input
                type="number"
                value={formData.estimatedHours}
                onChange={(e) => setFormData(prev => ({ ...prev, estimatedHours: e.target.value }))}
                placeholder="Ex: 8"
                min="1"
              />
            </div>
          </div>

          <div className="space-y-4 rounded-lg border p-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Package className="w-5 h-5" />
              Produtos
            </h3>

            {/* Lista de produtos com edição inline; sem campos de adicionar/remover */}
            <div className="space-y-2">
              {formData.products.map((product) => {
                const isEditingItem = editingProductId === product.id;
                return (
                  <div
                    key={product.id}
                    className="flex flex-col gap-2 rounded-md border p-3 bg-gray-50/50"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        {!isEditingItem ? (
                          <>
                            <p className="font-semibold break-words">
                              {product.quantity}x {product.name}
                            </p>
                            <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-gray-600 mt-1">
                              <Badge variant="secondary">Madeira: {product.woodColor || 'N/A'}</Badge>
                              <Badge variant="secondary">Revest.: {product.coatingColor || 'N/A'}</Badge>
                              <Badge variant="secondary">Medidas: {product.detalhesMedidas || 'N/A'}</Badge>
                            </div>
                            {product.details && (
                              <p className="text-xs text-gray-500 mt-1 break-words">
                                Detalhes: {product.details}
                              </p>
                            )}
                          </>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <Input
                              value={product.name ?? ''}
                              onChange={(e) => handleInlineChange(product.id, 'name', e.target.value)}
                              placeholder="Nome do Produto"
                            />
                            <Input
                              type="number"
                              min="1"
                              value={product.quantity ?? 1}
                              onChange={(e) =>
                                handleInlineChange(product.id, 'quantity', parseInt(e.target.value) || 1)
                              }
                              placeholder="Quantidade"
                            />
                            <Input
                              value={product.woodColor ?? ''}
                              onChange={(e) => handleInlineChange(product.id, 'woodColor', e.target.value)}
                              placeholder="Cor da Madeira"
                            />
                            <Input
                              value={product.coatingColor ?? ''}
                              onChange={(e) => handleInlineChange(product.id, 'coatingColor', e.target.value)}
                              placeholder="Cor do Revestimento"
                            />
                            <Input
                              value={product.detalhesMedidas ?? ''}
                              onChange={(e) => handleInlineChange(product.id, 'detalhesMedidas', e.target.value)}
                              placeholder="Detalhes das Medidas"
                            />
                            <Textarea
                              className="md:col-span-2"
                              rows={2}
                              value={product.details ?? ''}
                              onChange={(e) => handleInlineChange(product.id, 'details', e.target.value)}
                              placeholder="Detalhes específicos do produto..."
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {!isEditingItem ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => startEditProduct(product)}
                            title="Editar item"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        ) : (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-600"
                              onClick={confirmEditProduct}
                              title="Confirmar edição"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={cancelEditProduct}
                              title="Cancelar"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {formData.products.length === 0 && (
                <p className="text-sm text-center text-gray-500 py-4">
                  Nenhum produto vinculado a este pedido.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-indigo-500 to-purple-600">
              {isEditing ? 'Salvar Alterações' : 'Criar Pedido'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TaskModal;
