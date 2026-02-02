import React from 'react';
import { motion } from 'framer-motion';
import './LoadingScreen.css'; // 아래 CSS 참고

const LoadingScreen = () => {
  return (
    <motion.div 
      className="loading-container"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      <div className="text-wrapper">
        <motion.p 
          className="brand-name"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 1 }}
        >
          ANNECT
        </motion.p>
        <motion.h1 
          className="main-title"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
        >
          lOADING...
        </motion.h1>
      </div>
      
      {/* 하단 구름 이미지/문양 */}
      <div className="bottom-clouds" />
    </motion.div>
  );
};

export default LoadingScreen;