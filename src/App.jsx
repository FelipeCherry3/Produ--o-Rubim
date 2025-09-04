import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Filter, BarChart3 } from 'lucide-react';
import KanbanColumn from '@/components/KanbanColumn';
import TaskModal from '@/components/TaskModal';
import StatsCard from '@/components/StatsCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/components/ui/use-toast';
import axios from 'axios';

function App() {
  const [tasks, setTasks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedTask, setDraggedTask] = useState(null);
  const { toast } = useToast();

  const sectorMap = {
    usinagem: { id: 1, name: 'Usinagem' },
    marcenaria: { id: 2, name: 'Marcenaria' },
    montagem: { id: 3, name: 'Montagem' },
    tapeçaria: { id: 4, name: 'Tapeçaria' },
    lustracao: { id: 5, name: 'Lustração' },
    expedicao: { id: 6, name: 'Expedição' },
  };
  const sectors = Object.keys(sectorMap);

  const fetchPedidos = async () => {
    try {
      const dataInicial = new Date('2024-01-01'); // Ajustado para cobrir um período amplo
      const dataFinal = new Date('2025-12-31');
      console.log('Buscando pedidos:', { dataInicial, dataFinal });

      const response = await axios.get('http://localhost:8080/api/pedidos-venda', {
        params: {
          dataInicial: dataInicial.toISOString().split('T')[0],
          dataFinal: dataFinal.toISOString().split('T')[0],
        },
      });

      console.log('Resposta do backend:', response.data);

      const fetchedTasks = response.data.map((pedido) => {
        console.log('Mapeando pedido:', pedido);
        return {
          id: pedido.id,
          orderNumber: pedido.numero.toString(),
          client: pedido.cliente?.nome || 'Cliente Desconhecido',
          description: pedido.itens?.map((item) => item.descricao).join(', ') || '',
          products: pedido.itens?.map((item) => ({
            name: item.descricao || 'Sem descrição',
            madeira: item.corMadeira || '',
            revestimento: item.corRevestimento || '',
            tamanho: item.detalhesMedidas || '',
            detalhes: item.descricaoDetalhada || '',
          })) || [],
          sector: mapSectorFromId(pedido.setor?.id),
          priority: 'normal', // Ajuste se prioridade for adicionada ao DTO
          updatedAt: new Date().toISOString(),
        };
      });

      console.log('Tasks mapeadas:', fetchedTasks);
      setTasks(fetchedTasks);
    } catch (error) {
      toast({
        title: '❌ Erro ao carregar pedidos',
        description: 'Não foi possível buscar os pedidos do servidor.',
        variant: 'destructive',
      });
      console.error('Erro ao buscar pedidos:', error.response?.data || error.message);
    }
  };

  const mapSectorFromId = (setorId) => {
    if (!setorId) {
      console.warn('setorId não definido, usando padrão: usinagem');
      return 'usinagem';
    }
    for (const [sector, { id }] of Object.entries(sectorMap)) {
      if (id === setorId) return sector;
    }
    console.warn(`setorId ${setorId} não encontrado, usando padrão: usinagem`);
    return 'usinagem';
  };

  useEffect(() => {
    fetchPedidos();
  }, []);

  useEffect(() => {
    localStorage.setItem('furniture-production-tasks', JSON.stringify(tasks));
  }, [tasks]);

  const handleSaveTask = (taskData) => {
    if (isEditing) {
      setTasks((prev) => prev.map((task) => (task.id === taskData.id ? taskData : task)));
      toast({
        title: '✅ Pedido atualizado!',
        description: 'As alterações foram salvas com sucesso.',
      });
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

  const handleDragEnd = () => {
    setDraggedTask(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, newSector) => {
    e.preventDefault();

    if (draggedTask && draggedTask.sector !== newSector) {
      const oldSector = draggedTask.sector;
      setTasks((prev) =>
        prev.map((task) =>
          task.id === draggedTask.id
            ? { ...task, sector: newSector, updatedAt: new Date().toISOString() }
            : task
        )
      );

      try {
        await axios.put('http://localhost:8080/api/pedidos-venda/atualizarSetor', {
          idPedido: draggedTask.id,
          idNovoSetor: sectorMap[newSector].id,
        });
        toast({
          title: '📋 Pedido movido!',
          description: `Pedido "${draggedTask.orderNumber}" foi movido para ${sectorMap[newSector].name}.`,
        });
      } catch (error) {
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
        console.error('Erro ao atualizar setor:', error.response?.data || error.message);
      }
    }

    setDraggedTask(null);
  };

  const filteredTasks = tasks.filter((task) =>
    task.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.products.some((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStats = () => {
    const total = tasks.length;
    const completed = tasks.filter((task) => task.sector === 'expedicao').length;
    const inProgress = tasks.filter((task) => task.sector !== 'expedicao').length;
    const highPriority = tasks.filter((task) => task.priority === 'alta').length;

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
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          >
            <StatsCard
              title="Total de Pedidos"
              value={stats.total}
              icon="📋"
              color="bg-blue-100"
              description="Todos os pedidos de produção"
            />
            <StatsCard
              title="Em Produção"
              value={stats.inProgress}
              icon="⚙️"
              color="bg-orange-100"
              description="Pedidos em andamento"
            />
            <StatsCard
              title="Finalizados"
              value={stats.completed}
              icon="✅"
              color="bg-green-100"
              description="Pedidos expedidos"
            />
            <StatsCard
              title="Alta Prioridade"
              value={stats.highPriority}
              icon="🔥"
              color="bg-red-100"
              description="Pedidos urgentes"
            />
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

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleNewTask}
            className="floating-add-btn"
          >
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