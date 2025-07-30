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
import { Calendar, Clock, User, Package, Hash, Trash2 } from 'lucide-react';

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

  const initialProductData = {
    name: '',
    quantity: 1,
    woodColor: '',
    coatingColor: '',
    details: ''
  };

  const [formData, setFormData] = useState(initialFormData);
  const [productData, setProductData] = useState(initialProductData);

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
  }, [task, isEditing, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const taskData = {
      ...formData,
      id: isEditing ? task.id : Date.now().toString(),
      createdAt: isEditing ? task.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      estimatedHours: parseInt(formData.estimatedHours) || 0
    };

    onSave(taskData);
    onClose();
  };

  const addProduct = () => {
    if (productData.name.trim() && productData.quantity > 0) {
      setFormData(prev => ({
        ...prev,
        products: [...prev.products, { ...productData, id: Date.now() }]
      }));
      setProductData(initialProductData);
    }
  };

  const removeProduct = (productId) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.filter(p => p.id !== productId)
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
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 border-b pb-4">
              <Input value={productData.name} onChange={e => setProductData(p => ({...p, name: e.target.value}))} placeholder="Nome do Produto" />
              <Input type="number" value={productData.quantity} onChange={e => setProductData(p => ({...p, quantity: parseInt(e.target.value) || 1}))} placeholder="Quantidade" min="1" />
              <Input value={productData.woodColor} onChange={e => setProductData(p => ({...p, woodColor: e.target.value}))} placeholder="Cor da Madeira" />
              <Input value={productData.coatingColor} onChange={e => setProductData(p => ({...p, coatingColor: e.target.value}))} placeholder="Cor do Revestimento" />
              <Textarea className="lg:col-span-2" value={productData.details} onChange={e => setProductData(p => ({...p, details: e.target.value}))} placeholder="Detalhes específicos do produto..." rows={2} />
              <div className="lg:col-span-2 flex justify-end">
                <Button type="button" onClick={addProduct} variant="outline">Adicionar Produto</Button>
              </div>
            </div>

            <div className="space-y-2">
              {formData.products.map((product) => (
                <div key={product.id} className="flex items-start justify-between gap-4 rounded-md border p-3 bg-gray-50/50">
                  <div>
                    <p className="font-semibold">{product.quantity}x {product.name}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 mt-1">
                      <span><Badge variant="secondary">Madeira: {product.woodColor || 'N/A'}</Badge></span>
                      <span><Badge variant="secondary">Revest.: {product.coatingColor || 'N/A'}</Badge></span>
                    </div>
                    {product.details && <p className="text-xs text-gray-500 mt-1">Detalhes: {product.details}</p>}
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="text-red-500 hover:bg-red-100 h-8 w-8" onClick={() => removeProduct(product.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {formData.products.length === 0 && <p className="text-sm text-center text-gray-500 py-4">Nenhum produto adicionado a este pedido.</p>}
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