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

  const [sortBy, setSortBy] = React.useState('prazo'); // 'prazo' ou 'priority'
  const [sortOrder, setSortOrder] = React.useState('asc'); // 'asc' ou 'desc'
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
  // Todas as tasks deste setor
  const sectorTasks = tasks.filter(task => task.sector === sector);
  // As tasks de usinagem + montagem (para o resumo)
  // if (sector === 'usinagem') {
  //   const montagemTasks = tasks.filter(task => task.sector === 'montagem');
  //   sectorTasks.push(...montagemTasks);
  // }
  const montagemTasks = tasks.filter(task => task.sector === 'montagem'); // todas as de montagem
   
  // [ADD] rank de prioridade para ordenação
  const priorityRank = (p) => {
    const v = String(p || '').toLowerCase();
    if (v === 'alta') return 0;
    if (v === 'media' || v === 'média') return 1;
    if (v === 'baixa') return 2;
    return 3;
  };

  // [ADD] util: obter timestamp do prazo (dueDate | dataEntrega)
  const getDueMs = (t) => {
    const d = t?.dueDate || t?.dataEntrega;
    const ms = d ? new Date(d).getTime() : NaN;
    return isNaN(ms) ? null : ms;
  };

  // [ADD] aplica ordenação por COLUNA (usa sortBy/sortOrder locais)
  const sortedSectorTasks = React.useMemo(() => {
    const list = sectorTasks.slice().sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'priority') {
        cmp = priorityRank(a.priority) - priorityRank(b.priority);
      } else {
        const da = getDueMs(a);
        const db = getDueMs(b);
        if (da === null && db === null) cmp = 0;
        else if (da === null) cmp = 1;   // sem data vai pro fim (ASC)
        else if (db === null) cmp = -1;
        else cmp = da - db;              // mais cedo primeiro
      }
      // desempate por número/id
      if (cmp === 0) {
        const oa = Number(a.orderNumber || a.id || 0);
        const ob = Number(b.orderNumber || b.id || 0);
        cmp = oa - ob;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [sectorTasks, sortBy, sortOrder]);

  // [ADD] marcar cards: overdue (vermelho), soon (amarelo), normal
  const flaggedTasks = React.useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    const todayMs = today.getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    return sortedSectorTasks.map(t => {
      const due = getDueMs(t);
      let flag = 'normal';
      if (due !== null) {
        if (due < todayMs) flag = 'overdue';
        else if (due <= todayMs + sevenDaysMs) flag = 'soon';
      }
      return { ...t, __deadlineFlag: flag };
    });
  }, [sortedSectorTasks]);
  
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
        <div className="mt-2 grid grid-cols-2 gap-2">
          <select
            className="bg-white/20 px-2 py-1 rounded text-xs"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="prazo">Prazo</option>
            <option value="priority">Prioridade</option>
          </select>
          <select
            className="bg-white/20 px-2 py-1 rounded text-xs"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="asc">Asc ↑</option>
            <option value="desc">Desc ↓</option>
          </select>
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

      <ProductionSummary tasks={sectorTasks} sector={sector} extraTasksForSummary={sector === 'usinagem' ? montagemTasks : []} />
      
      <div 
        className="p-4 flex-grow overflow-y-auto"
        onDrop={(e) => onDrop(e, sector)}
        onDragOver={onDragOver}
      >
        <motion.div layout className="space-y-3">
          {flaggedTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              deadlineFlag = {task.__deadlineFlag}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onClick={onTaskClick}
            />
          ))}
          
          {flaggedTasks.length === 0 && (
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