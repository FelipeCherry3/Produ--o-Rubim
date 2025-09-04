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
import axios from 'axios';
import api from './api/axios';

// === AXIOS CONFIG ===
// Use proxy no Vite (vite.config.ts) para /login e /api apontarem para http://localhost:8080

function App() {
  const [tasks, setTasks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedTask, setDraggedTask] = useState(null);
  const [csrfToken, setCsrfToken] = useState(null);
  const { toast } = useToast();

  const sectorMap = {
    usinagem:   { id: 1, name: 'Usinagem' },
    marcenaria: { id: 2, name: 'Marcenaria' },
    montagem:   { id: 3, name: 'Montagem' },
    tapeçaria:  { id: 4, name: 'Tapeçaria' },
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
  // Compatível com CookieCsrfTokenRepository: backend expõe /api/csrf → { headerName, parameterName, token }
  const fetchCsrfToken = async () => {
    try {
      const { data } = await api.get('/api/csrf');
      // Normalmente headerName = "X-XSRF-TOKEN"
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
        products: (pedido.itens || []).map((item) => ({
          name: item.descricao || 'Sem descrição',
          madeira: item.corMadeira || '',
          revestimento: item.corRevestimento || '',
          tamanho: item.detalhesMedidas || '',
          detalhes: item.descricaoDetalhada || '',
        })),
        sector: mapSectorFromId(pedido.setor?.id),
        priority: 'normal',
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

  const handleDrop = async (e, newSector) => {
    e.preventDefault();
    if (!draggedTask || draggedTask.sector === newSector) {
      setDraggedTask(null);
      return;
    }

    const oldSector = draggedTask.sector;
    // otimista
    setTasks((prev) =>
      prev.map((task) =>
        task.id === draggedTask.id
          ? { ...task, sector: newSector, updatedAt: new Date().toISOString() }
          : task
      )
    );

    try {
      await api.put('/api/pedidos-venda/atualizarSetor', {
        idPedido: draggedTask.id,
        idNovoSetor: sectorMap[newSector].id,
      });
      toast({
        title: '📋 Pedido movido!',
        description: `Pedido "${draggedTask.orderNumber}" → ${sectorMap[newSector].name}.`,
      });
    } catch (error) {
      // rollback
      setTasks((prev) =>
        prev.map((task) =>
          task.id === draggedTask.id
            ? { ...task, sector: oldSector, updatedAt: new Date().toISOString() }
            : task
        )
      );
      toast({
        title: '❌ Erro ao mover pedido',
        description: 'Não foi possível atualizar o setor no servidor.',
        variant: 'destructive',
      });
      console.error('Erro atualizar setor:', error?.response?.data || error?.message);
    } finally {
      setDraggedTask(null);
    }
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
                <h1 className="text-4xl font-bold text-gray-900 mb-2">🏭 Sistema de Produção</h1>
                <p className="text-gray-600">Gerenciamento completo da produção de móveis</p>
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
                      description: 'Mas não se preocupe! Você pode solicitar isso no seu próximo prompt! 🚀',
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
                      description: 'Mas não se preocupe! Você pode solicitar isso no seu próximo prompt! 🚀',
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
    </>
  );
}

export default App;
