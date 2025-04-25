import React from 'react';

type LoaderProps = {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-3',
  lg: 'w-12 h-12 border-4',
};

const Loader: React.FC<LoaderProps> = ({ size = 'md', className = '' }) => {
  return (
    <div className={`flex justify-center items-center ${className}`}>
      <div
        className={`${sizeClasses[size]} rounded-full border-primary-600 border-t-transparent animate-spin`}
      ></div>
    </div>
  );
};

export default Loader;