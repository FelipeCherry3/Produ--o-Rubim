import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, User, AlertCircle, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const TaskCard = ({ task, onDragStart, onDragEnd, onClick }) => {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'alta': return 'bg-red-100 text-red-800 border-red-200';
      case 'media': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'baixa': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityIcon = (priority) => {
    if (priority === 'alta') {
      return <AlertCircle className="w-3 h-3" />;
    }
    return null;
  };

  const totalProducts = task.products.reduce((sum, product) => sum + product.quantity, 0);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -2 }}
      className={`task-card p-4 mb-3 priority-${task.priority}`}
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onDragEnd={onDragEnd}
      onClick={() => onClick(task)}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-sm font-semibold text-gray-700">#{task.orderNumber}</span>
        <Badge className={`${getPriorityColor(task.priority)} flex items-center gap-1`}>
          {getPriorityIcon(task.priority)}
          {task.priority}
        </Badge>
      </div>
      
      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
        {task.description}
      </p>
      
      <div className="space-y-2">
        <div className="flex items-center text-xs text-gray-500">
          <User className="w-3 h-3 mr-1" />
          <span>{task.client}</span>
        </div>
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center">
            <Calendar className="w-3 h-3 mr-1" />
            {/*  Data vem assim ->  2025-03-03 */}
            <span>{new Date(task.dueDate).toLocaleDateString('pt-BR')}</span>
          </div>
          
          <div className="flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            <span>{task.estimatedHours}h</span>
          </div>
        </div>
      </div>
      
      {task.products && task.products.length > 0 && (
        <div className="mt-3 pt-2 border-t border-gray-100">
          <div className="flex items-center text-xs text-gray-500 font-medium">
            <Package className="w-3 h-3 mr-1" />
            <span>{totalProducts} {totalProducts > 1 ? 'produtos' : 'produto'}</span>
          </div>
          <ul className="text-xs text-gray-500 list-disc list-inside mt-1">
            {task.products.slice(0, 2).map(p => (
              <li key={p.id} className="truncate">{p.quantity}x {p.name}</li>
            ))}
            {task.products.length > 2 && <li className="font-semibold">...e mais</li>}
          </ul>
        </div>
      )}
    </motion.div>
  );
};

export default TaskCard;