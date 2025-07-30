
import React from 'react';
import { motion } from 'framer-motion';

const StatsCard = ({ title, value, icon, color, description }) => {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-xl p-6 shadow-lg"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {description && (
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
    </motion.div>
  );
};

export default StatsCard;
