import React from 'react';
import {Link} from 'react-router-dom'
const FeatureCard = ({features}) => {
  return (
    <>
    <Link  to={features.toLink}>
    <div className="group relative overflow-hidden bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 hover:border-green-500/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-green-500/10">
      {/* Animated background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
      
      {/* Icon with animated background */}
      <div className="relative mb-6">
        <div className={`inline-flex p-4 rounded-xl bg-gradient-to-r ${features.gradient} group-hover:scale-110 transition-transform duration-300`}>
          <features.icon className="h-8 w-8 text-black" />
        </div>
      </div>
      
      {/* Content */}
      <div className="relative mt-6">
        <h3 className="text-xl font-bold text-white mb-3 group-hover:text-green-400 transition-colors duration-300">
          {features.title}
        </h3>
        <p className="text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors duration-300">
          {features.description}
        </p>
      </div>
      
      {/* Hover effect line */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-emerald-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
    </div>
    </Link>
    </>
  );
};

export default FeatureCard;
