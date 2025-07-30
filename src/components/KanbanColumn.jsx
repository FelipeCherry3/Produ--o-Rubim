import React from 'react';
import { motion } from 'framer-motion';
import TaskCard from '@/components/TaskCard';
import ProductionSummary from '@/components/ProductionSummary';

const KanbanColumn = ({ 
  sector, 
  tasks, 
  onDrop, 
  onDragOver, 
  onTaskClick,
  onDragStart,
  onDragEnd 
}) => {
  const sectorConfig = {
    usinagem: { 
      title: 'Usinagem', 
      icon: '🔧', 
      color: 'usinagem',
      description: 'Corte e preparação'
    },
    marcenaria: {
      title: 'Marcenaria',
      icon: '🪵',
      color: 'marcenaria',
      description: 'Estrutura e montagem'
    },
    montagem: { 
      title: 'Montagem', 
      icon: '🔨', 
      color: 'montagem',
      description: 'Junção das peças'
    },
    tapeçaria: {
      title: 'Tapeçaria',
      icon: '🧵',
      color: 'tapeçaria',
      description: 'Estofados e tecidos'
    },
    lustracao: { 
      title: 'Lustração', 
      icon: '✨', 
      color: 'lustracao',
      description: 'Acabamento e pintura'
    },
    expedicao: { 
      title: 'Expedição', 
      icon: '📦', 
      color: 'expedicao',
      description: 'Embalagem e envio'
    }
  };

  const config = sectorConfig[sector];
  const sectorTasks = tasks.filter(task => task.sector === sector);
  const totalProducts = sectorTasks.reduce((sum, task) => {
    return sum + (task.products ? task.products.reduce((prodSum, prod) => prodSum + prod.quantity, 0) : 0);
  }, 0);

  return (
    <div className="kanban-column min-h-[600px] w-96 flex-shrink-0 flex flex-col">
      <div className={`sector-header ${config.color}`}>
        <div className="flex items-center justify-center gap-2">
          <span className="text-2xl">{config.icon}</span>
          <div>
            <h2 className="text-lg font-bold">{config.title}</h2>
            <p className="text-xs opacity-90">{config.description}</p>
          </div>
        </div>
        <div className="text-center mt-1 flex justify-center gap-4">
          <span className="bg-white/20 px-2 py-1 rounded-full text-xs">
            {sectorTasks.length} pedidos
          </span>
          <span className="bg-white/20 px-2 py-1 rounded-full text-xs">
            {totalProducts} produtos
          </span>
        </div>
      </div>

      <ProductionSummary tasks={sectorTasks} sector={sector} />
      
      <div 
        className="p-4 flex-grow overflow-y-auto"
        onDrop={(e) => onDrop(e, sector)}
        onDragOver={onDragOver}
      >
        <motion.div layout className="space-y-3">
          {sectorTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onClick={onTaskClick}
            />
          ))}
          
          {sectorTasks.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 text-gray-400"
            >
              <div className="text-4xl mb-2">{config.icon}</div>
              <p className="text-sm">Nenhum pedido neste setor</p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default KanbanColumn;