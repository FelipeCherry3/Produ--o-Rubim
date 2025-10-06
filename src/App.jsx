import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Filter, BarChart3, Download } from 'lucide-react';
import KanbanColumn from '@/components/KanbanColumn';
import TaskModal from '@/components/TaskModal';
import StatsCard from '@/components/StatsCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/components/ui/use-toast';
import api from './api/axios';

// ▶️ NOVO: Dialog (shadcn/ui)
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

function App() {
  const [tasks, setTasks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedTask, setDraggedTask] = useState(null);
  const [csrfToken, setCsrfToken] = useState(null);
  const { toast } = useToast();

  // ▶️ NOVO: estado para confirmação de movimento
  const [confirmMove, setConfirmMove] = useState({ open: false, task: null, newSector: null });
  const [isMoving, setIsMoving] = useState(false);

  const sectorMap = {
    usinagem:   { id: 1, name: 'Usinagem' },
    montagem:   { id: 3, name: 'Montagem' },
    lustracao:  { id: 5, name: 'Lustração' },
    expedicao:  { id: 6, name: 'Expedição' },
  };
  const sectors = Object.keys(sectorMap);

  // === LOGIN ===
  const login = async () => {
    try {
      const form = new URLSearchParams();
      form.set('username', 'admin');
      form.set('password', 'senha123');

      const res = await api.post('/login', form.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      console.log('Login OK:', res.status);
      return true;
    } catch (error) {
      toast({
        title: '❌ Erro ao fazer login',
        description: error?.message || 'Não foi possível autenticar no servidor.',
        variant: 'destructive',
      });
      console.error('Erro login:', error?.response?.data || error?.message);
      return false;
    }
  };

  // === CSRF ===
  const fetchCsrfToken = async () => {
    try {
      const { data } = await api.get('/api/csrf');
      const headerName = data?.headerName || 'X-XSRF-TOKEN';
      api.defaults.headers.common[headerName] = data?.token;
      setCsrfToken(data?.token);
      console.log('CSRF OK:', headerName, data?.token);
      return true;
    } catch (error) {
      toast({
        title: '❌ Erro ao obter CSRF',
        description: error?.message || 'Não foi possível obter o token CSRF.',
        variant: 'destructive',
      });
      console.error('Erro CSRF:', error?.response?.data || error?.message);
      return false;
    }
  };

  // === BUSCAR PEDIDOS ===
  const fetchPedidos = async () => {
    try {
      const dataInicial = new Date('2024-01-01');
      const dataFinal = new Date('2025-12-31');

      const { data } = await api.get('/api/pedidos-venda', {
        params: {
          dataInicial: dataInicial.toISOString().split('T')[0],
          dataFinal:   dataFinal.toISOString().split('T')[0],
        },
      });

      const fetchedTasks = (data || []).map((pedido) => ({
        id: pedido.id,
        orderNumber: String(pedido.numero ?? ''),
        client: pedido.cliente?.nome || 'Cliente Desconhecido',
        description: (pedido.itens || []).map((i) => i?.descricao).filter(Boolean).join(', '),
        dataEmissao: pedido.dataEmissao || new Date().toISOString(),
        dataFinal: pedido.dataPrevista || new Date().toISOString(),
        dueDate: pedido.dataEntrega || '',
        estimatedHours: pedido.horasEstimadas || 1,
        orderValue: pedido.valorTotal || 0,
        orderStatus: pedido.status || 'PENDENTE',
        dataEntrega: pedido.dataEntrega || '',
        products: (pedido.itens || []).map((item) => ({
          id: item.id,                               // 👉 ESSENCIAL para o patch no back
          name: item.descricao || 'Sem descrição',
          quantity: item.quantidade ?? 1,
          woodColor: item.corMadeira || '',
          coatingColor: item.corRevestimento || '',
          details: item.descricaoDetalhada || '',
        })),
        sector: mapSectorFromId(pedido.setor?.id),
        priority: pedido.priority || 'normal',
        createdAt: pedido.dataCriacao || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      setTasks(fetchedTasks);
      toast({
        title: '✅ Pedidos carregados!',
        description: `${fetchedTasks.length} pedidos foram carregados com sucesso.`,
      });
    } catch (error) {
      toast({
        title: '❌ Erro ao carregar pedidos',
        description: 'Não foi possível buscar os pedidos do servidor.',
        variant: 'destructive',
      });
      console.error('Erro buscar pedidos:', error?.response?.data || error?.message);
    }
  };

  const handleLoadPedidos = async () => {
    const okLogin = await login();
    if (!okLogin) return;
    const okCsrf = await fetchCsrfToken();
    if (!okCsrf) return;
    await fetchPedidos();
  };

  const mapSectorFromId = (setorId) => {
    if (!setorId) return 'usinagem';
    for (const [sector, { id }] of Object.entries(sectorMap)) {
      if (id === setorId) return sector;
    }
    return 'usinagem';
  };

  useEffect(() => {
    localStorage.setItem('furniture-production-tasks', JSON.stringify(tasks));
  }, [tasks]);

  const handleSaveTask = (taskData) => {
    if (isEditing) {
      setTasks((prev) => prev.map((t) => (t.id === taskData.id ? taskData : t)));
      toast({ title: '✅ Pedido atualizado!', description: 'As alterações foram salvas com sucesso.' });
    } else {
      setTasks((prev) => [...prev, taskData]);
      toast({
        title: '🎉 Novo pedido criado!',
        description: `Pedido "${taskData.orderNumber}" adicionado ao setor ${taskData.sector}.`,
      });
    }
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleNewTask = () => {
    setSelectedTask(null);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => setDraggedTask(null);
  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };

  // ⤵️ ALTERADO: não move mais de forma otimista; abre modal de confirmação
  const handleDrop = (e, newSector) => {
    e.preventDefault();
    if (!draggedTask || draggedTask.sector === newSector) {
      setDraggedTask(null);
      return;
    }
    setConfirmMove({ open: true, task: draggedTask, newSector });
    setDraggedTask(null);
  };

  // ▶️ NOVO: confirmar movimento
  const confirmMoveAction = async () => {
    const task = confirmMove.task;
    const newSector = confirmMove.newSector;
    if (!task || !newSector) return;

    const oldSector = task.sector;
    setIsMoving(true);
    try {
      await api.put('/api/pedidos-venda/atualizarSetor', {
        idPedido: task.id,
        idNovoSetor: sectorMap[newSector].id,
      });

      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, sector: newSector, updatedAt: new Date().toISOString() } : t))
      );

      toast({
        title: '📋 Pedido movido!',
        description: `Pedido "${task.orderNumber}" → ${sectorMap[newSector].name}.`,
      });
    } catch (error) {
      toast({
        title: '❌ Erro ao mover pedido',
        description: error?.response?.data?.message || 'Não foi possível atualizar o setor no servidor.',
        variant: 'destructive',
      });
      console.error('Erro atualizar setor:', error?.response?.data || error?.message);
    } finally {
      setIsMoving(false);
      setConfirmMove({ open: false, task: null, newSector: null });
    }
  };

  // ▶️ NOVO: cancelar movimento
  const cancelMoveAction = () => {
    setConfirmMove({ open: false, task: null, newSector: null });
  };

  const filteredTasks = tasks.filter((task) =>
    task.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.products.some((p) => (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStats = () => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.sector === 'expedicao').length;
    const inProgress = total - completed;
    const highPriority = tasks.filter((t) => t.priority === 'alta').length;
    return { total, completed, inProgress, highPriority };
  };

  const stats = getStats();

  // helper para nome do setor
  const sectorLabel = (key) => sectorMap[key]?.name || key;

  return (
    <>
      <Helmet>
        <title>Sistema de Produção de Móveis - Gerenciamento Kanban</title>
        <meta
          name="description"
          content="Sistema completo para gerenciamento de produção de móveis com controle por setores: Usinagem, Marcenaria, Montagem, Tapeçaria, Lustração e Expedição."
        />
      </Helmet>

      <div className="min-h-screen p-6">
        <div className="max-w-screen-2xl mx-auto">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">🏭 Produção Rubim</h1>
                <p className="text-gray-600">Gerenciamento de Produção Rubim Mesas e Cadeiras</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar pedidos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() =>
                    toast({
                      title: '🚧 Filtros não implementados ainda',
                      description: 'Logo sai',
                    })
                  }
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filtros
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    toast({
                      title: '🚧 Relatórios não implementados ainda',
                      description: 'Logo sai',
                    })
                  }
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Relatórios
                </Button>
                <Button variant="default" onClick={handleLoadPedidos}>
                  <Download className="w-4 h-4 mr-2" />
                  Carregar Pedidos
                </Button>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          >
            <StatsCard title="Total de Pedidos" value={stats.total} icon="📋" color="bg-blue-100" description="Todos os pedidos de produção" />
            <StatsCard title="Em Produção" value={stats.inProgress} icon="⚙️" color="bg-orange-100" description="Pedidos em andamento" />
            <StatsCard title="Finalizados" value={stats.completed} icon="✅" color="bg-green-100" description="Pedidos expedidos" />
            <StatsCard title="Alta Prioridade" value={stats.highPriority} icon="🔥" color="bg-red-100" description="Pedidos urgentes" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex gap-6 overflow-x-auto pb-6"
          >
            {sectors.map((sector) => (
              <KanbanColumn
                key={sector}
                sector={sector}
                tasks={filteredTasks}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onTaskClick={handleTaskClick}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              />
            ))}
          </motion.div>

          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleNewTask} className="floating-add-btn">
            <Plus className="w-6 h-6" />
          </motion.button>

          <AnimatePresence>
            {isModalOpen && (
              <TaskModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                task={selectedTask}
                onSave={handleSaveTask}
                isEditing={isEditing}
              />
            )}
          </AnimatePresence>
        </div>
        <Toaster />
      </div>

      {/* ▶️ NOVO: Modal de Confirmação de Apontamento */}
      <Dialog open={confirmMove.open} onOpenChange={(open) => !isMoving && setConfirmMove((prev) => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Confirmar apontamento</DialogTitle>
            <DialogDescription>
              {confirmMove.task && (
                <span>
                  Confirmar apontamento do Pedido Nº <b>{confirmMove.task.orderNumber}</b> do setor{' '}
                  <b>{sectorLabel(confirmMove.task.sector)}</b> para o setor{' '}
                  <b>{sectorLabel(confirmMove.newSector)}</b>?
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Informações adicionais do pedido */}
          {confirmMove.task && (
            <div className="mt-4 space-y-2 text-sm text-gray-700">
              <div><b>Cliente:</b> {confirmMove.task.client}</div>
              <div><b>Descrição:</b> {confirmMove.task.description || '—'}</div>
              <div className="text-xs text-gray-500">Última atualização: {new Date(confirmMove.task.updatedAt || Date.now()).toLocaleString()}</div>
            </div>
          )}

          <DialogFooter className="mt-6 gap-2 sm:gap-0">
            <Button variant="outline" onClick={cancelMoveAction} disabled={isMoving}>
              Cancelar
            </Button>
            <Button onClick={confirmMoveAction} disabled={isMoving}>
              {isMoving ? 'Movendo…' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default App;
