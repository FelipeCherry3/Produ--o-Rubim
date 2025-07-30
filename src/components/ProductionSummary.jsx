import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { List } from 'lucide-react';

const ProductionSummary = ({ tasks, sector }) => {
  const summary = useMemo(() => {
    const productMap = new Map();

    tasks.forEach(task => {
      if (!task.products) return;
      task.products.forEach(product => {
        let key;
        let label;

        switch (sector) {
          case 'tapeçaria':
            key = `${product.name} - ${product.coatingColor || 'N/A'}`;
            label = `${product.name} (${product.coatingColor || 'N/A'})`;
            break;
          case 'lustracao':
            key = `${product.name} - ${product.woodColor || 'N/A'}`;
            label = `${product.name} (${product.woodColor || 'N/A'})`;
            break;
          default:
            key = product.name;
            label = product.name;
            break;
        }

        if (productMap.has(key)) {
          productMap.set(key, {
            ...productMap.get(key),
            quantity: productMap.get(key).quantity + product.quantity,
          });
        } else {
          productMap.set(key, {
            label: label,
            quantity: product.quantity,
          });
        }
      });
    });

    return Array.from(productMap.values()).sort((a, b) => b.quantity - a.quantity);
  }, [tasks, sector]);

  if (summary.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="p-3 border-b border-t bg-gray-50/50"
    >
      <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
        <List className="w-4 h-4" />
        Resumo da Produção
      </h4>
      <div className="max-h-32 overflow-y-auto pr-2 space-y-1">
        {summary.map((item, index) => (
          <div key={index} className="flex justify-between items-center text-xs text-gray-600">
            <span className="truncate pr-2">{item.label}</span>
            <span className="font-bold bg-gray-200 text-gray-800 rounded-full px-2 py-0.5">
              {item.quantity}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default ProductionSummary;