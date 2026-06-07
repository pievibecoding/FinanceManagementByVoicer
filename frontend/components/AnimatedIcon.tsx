import React from 'react';
import { motion, MotionProps } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

export type AnimationType = 
  | 'hover-scale'
  | 'hover-rotate'
  | 'hover-bounce'
  | 'pulse'
  | 'spin'
  | 'shake'
  | 'none';

interface AnimatedIconProps extends Omit<MotionProps, 'children'> {
  icon: LucideIcon;
  size?: number;
  className?: string;
  animation?: AnimationType;
  onClick?: () => void;
}

const animationVariants: Record<AnimationType, any> = {
  'hover-scale': {
    hover: { scale: 1.1 },
    tap: { scale: 0.95 },
  },
  'hover-rotate': {
    hover: { rotate: 5 },
    tap: { scale: 0.95 },
  },
  'hover-bounce': {
    hover: { y: -3 },
    tap: { scale: 0.95 },
  },
  'pulse': {
    animate: { scale: [1, 1.05, 1] },
    transition: { duration: 2, repeat: Infinity },
  },
  'spin': {
    animate: { rotate: 360 },
    transition: { duration: 1, repeat: Infinity, ease: 'linear' },
  },
  'shake': {
    hover: { x: [0, -2, 2, -2, 2, 0] },
    transition: { duration: 0.3 },
  },
  'none': {},
};

export const AnimatedIcon: React.FC<AnimatedIconProps> = ({
  icon: Icon,
  size = 24,
  className = '',
  animation = 'hover-scale',
  onClick,
  ...motionProps
}) => {
  const variant = animationVariants[animation];

  return (
    <motion.div
      {...variant}
      whileTap={animation.includes('hover') ? { scale: 0.95 } : undefined}
      onClick={onClick}
      className={`inline-flex items-center justify-center ${className}`}
      {...motionProps}
    >
      <Icon size={size} />
    </motion.div>
  );
};
