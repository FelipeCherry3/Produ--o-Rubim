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

function App() {
  const [tasks, setTasks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedTask, setDraggedTask] = useState(null);
  const { toast } = useToast();

  const sectors = ['usinagem', 'marcenaria', 'montagem', 'tapeçaria', 'lustracao', 'expedicao'];

  useEffect(() => {
    const savedTasks = localStorage.getItem('furniture-production-tasks');
    if (savedTasks) {
      setTasks(JSON.parse(savedTasks));
    } else {
      const sampleTasks = [
        {
          id: '1',
          orderNumber: 'PED-001',
          description: 'Pedido grande para cliente corporativo',
          client: 'João Silva',
          priority: 'alta',
          sector: 'usinagem',
          dueDate: '2025-08-15',
          estimatedHours: 40,
          products: [
            { id: 1, name: 'Mesa de Jantar Rústica', quantity: 2, woodColor: 'Nogueira', coatingColor: 'N/A', details: 'Pés torneados' },
            { id: 2, name: 'Cadeira Estofada', quantity: 8, woodColor: 'Nogueira', coatingColor: 'Linho Bege', details: 'Tecido impermeável' }
          ],
          createdAt: '2025-07-20T10:00:00Z'
        },
        {
          id: '2',
          orderNumber: 'PED-002',
          description: 'Móveis para quarto de casal',
          client: 'Maria Santos',
          priority: 'media',
          sector: 'montagem',
          dueDate: '2025-08-20',
          estimatedHours: 25,
          products: [
            { id: 1, name: 'Guarda-roupa Planejado', quantity: 1, woodColor: 'Branco Neve', coatingColor: 'N/A', details: '3 portas de correr com espelho' }
          ],
          createdAt: '2025-07-18T14:30:00Z'
        },
        {
          id: '3',
          orderNumber: 'PED-003',
          description: 'Móvel para sala de estar',
          client: 'Pedro Costa',
          priority: 'baixa',
          sector: 'lustracao',
          dueDate: '2025-08-25',
          estimatedHours: 8,
          products: [
            { id: 1, name: 'Estante para Livros', quantity: 1, woodColor: 'Freijó', coatingColor: 'N/A', details: '5 prateleiras ajustáveis' }
          ],
          createdAt: '2025-07-15T09:15:00Z'
        },
        {
          id: '4',
          orderNumber: 'PED-004',
          description: 'Sofá e poltronas',
          client: 'Ana Pereira',
          priority: 'alta',
          sector: 'tapeçaria',
          dueDate: '2025-08-18',
          estimatedHours: 30,
          products: [
            { id: 1, name: 'Sofá 3 lugares', quantity: 1, woodColor: 'Eucalipto', coatingColor: 'Suede Cinza', details: 'Pés de metal' },
            { id: 2, name: 'Poltrona', quantity: 2, woodColor: 'Eucalipto', coatingColor: 'Suede Cinza', details: 'Mesmo tecido do sofá' }
          ],
          createdAt: '2025-07-22T11:00:00Z'
        },
        {
          id: '5',
          orderNumber: 'PED-005',
          description: 'Cozinha planejada',
          client: 'Carlos Souza',
          priority: 'media',
          sector: 'marcenaria',
          dueDate: '2025-09-01',
          estimatedHours: 60,
          products: [
            { id: 1, name: 'Armário Aéreo', quantity: 3, woodColor: 'MDF Grafite', coatingColor: 'N/A', details: 'Com portas de vidro' },
            { id: 2, name: 'Balcão de Pia', quantity: 1, woodColor: 'MDF Grafite', coatingColor: 'N/A', details: 'Tampo de granito não incluso' }
          ],
          createdAt: '2025-07-25T09:00:00Z'
        }
      ];
      setTasks(sampleTasks);
      localStorage.setItem('furniture-production-tasks', JSON.stringify(sampleTasks));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('furniture-production-tasks', JSON.stringify(tasks));
  }, [tasks]);

  const handleSaveTask = (taskData) => {
    if (isEditing) {
      setTasks(prev => prev.map(task => 
        task.id === taskData.id ? taskData : task
      ));
      toast({
        title: "✅ Pedido atualizado!",
        description: "As alterações foram salvas com sucesso.",
      });
    } else {
      setTasks(prev => [...prev, taskData]);
      toast({
        title: "🎉 Novo pedido criado!",
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

  const handleDrop = (e, newSector) => {
    e.preventDefault();
    
    if (draggedTask && draggedTask.sector !== newSector) {
      setTasks(prev => prev.map(task =>
        task.id === draggedTask.id
          ? { ...task, sector: newSector, updatedAt: new Date().toISOString() }
          : task
      ));
      
      const sectorNames = {
        usinagem: 'Usinagem',
        marcenaria: 'Marcenaria',
        montagem: 'Montagem',
        tapeçaria: 'Tapeçaria',
        lustracao: 'Lustração',
        expedicao: 'Expedição'
      };
      
      toast({
        title: "📋 Pedido movido!",
        description: `Pedido "${draggedTask.orderNumber}" foi movido para ${sectorNames[newSector]}.`,
      });
    }
    
    setDraggedTask(null);
  };

  const filteredTasks = tasks.filter(task =>
    task.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.products.some(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStats = () => {
    const total = tasks.length;
    const completed = tasks.filter(task => task.sector === 'expedicao').length;
    const inProgress = tasks.filter(task => task.sector !== 'expedicao').length;
    const highPriority = tasks.filter(task => task.priority === 'alta').length;
    
    return { total, completed, inProgress, highPriority };
  };

  const stats = getStats();

  return (
    <>
      <Helmet>
        <title>Sistema de Produção de Móveis - Gerenciamento Kanban</title>
        <meta name="description" content="Sistema completo para gerenciamento de produção de móveis com controle por setores: Usinagem, Marcenaria, Montagem, Tapeçaria, Lustração e Expedição." />
      </Helmet>

      <div className="min-h-screen p-6">
        <div className="max-w-screen-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                  🏭 Sistema de Produção
                </h1>
                <p className="text-gray-600">
                  Gerenciamento completo da produção de móveis
                </p>
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
                  onClick={() => toast({
                    title: "🚧 Filtros não implementados ainda",
                    description: "Mas não se preocupe! Você pode solicitar isso no seu próximo prompt! 🚀"
                  })}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filtros
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => toast({
                    title: "🚧 Relatórios não implementados ainda",
                    description: "Mas não se preocupe! Você pode solicitar isso no seu próximo prompt! 🚀"
                  })}
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