import React from 'react';
import { 
  Wallet, 
  CreditCard, 
  TrendingUp, 
  TrendingDown, 
  PieChart, 
  BarChart, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  Home, 
  Settings, 
  User, 
  Bell, 
  Search,
  Plus,
  Trash2,
  Edit,
  Calendar,
  Filter,
  Download,
  Share,
  RefreshCw
} from 'lucide-react';
import { AnimatedIcon, AnimationType } from './AnimatedIcon';

interface FinanceIconProps {
  size?: number;
  className?: string;
  animation?: AnimationType;
  onClick?: () => void;
}

// Finance-specific animated icons
export const AnimatedWallet: React.FC<FinanceIconProps> = (props) => (
  <AnimatedIcon icon={Wallet} animation="hover-scale" {...props} />
);

export const AnimatedCreditCard: React.FC<FinanceIconProps> = (props) => (
  <AnimatedIcon icon={CreditCard} animation="hover-rotate" {...props} />
);

export const AnimatedTrendingUp: React.FC<FinanceIconProps> = (props) => (
  <AnimatedIcon icon={TrendingUp} animation="hover-bounce" {...props} />
);

export const AnimatedTrendingDown: React.FC<FinanceIconProps> = (props) => (
  <AnimatedIcon icon={TrendingDown} animation="hover-bounce" {...props} />
);

export const AnimatedPieChart: React.FC<FinanceIconProps> = (props) => (
  <AnimatedIcon icon={PieChart} animation="hover-scale" {...props} />
);

export const AnimatedBarChart: React.FC<FinanceIconProps> = (props) => (
  <AnimatedIcon icon={BarChart} animation="hover-scale" {...props} />
);

export const AnimatedDollarSign: React.FC<FinanceIconProps> = (props) => (
  <AnimatedIcon icon={DollarSign} animation="pulse" {...props} />
);

export const AnimatedArrowUp: React.FC<FinanceIconProps> = (props) => (
  <AnimatedIcon icon={ArrowUpRight} animation="hover-bounce" {...props} />
);

export const AnimatedArrowDown: React.FC<FinanceIconProps> = (props) => (
  <AnimatedIcon icon={ArrowDownRight} animation="hover-bounce" {...props} />
);

// Navigation icons
export const AnimatedHome: React.FC<FinanceIconProps> = (props) => (
  <AnimatedIcon icon={Home} animation="hover-scale" {...props} />
);

export const AnimatedSettings: React.FC<FinanceIconProps> = (props) => (
  <AnimatedIcon icon={Settings} animation="hover-rotate" {...props} />
);

export const AnimatedUser: React.FC<FinanceIconProps> = (props) => (
  <AnimatedIcon icon={User} animation="hover-scale" {...props} />
);

export const AnimatedBell: React.FC<FinanceIconProps> = (props) => (
  <AnimatedIcon icon={Bell} animation="shake" {...props} />
);

// Action icons
export const AnimatedSearch: React.FC<FinanceIconProps> = (props) => (
  <AnimatedIcon icon={Search} animation="hover-scale" {...props} />
);

export const AnimatedPlus: React.FC<FinanceIconProps> = (props) => (
  <AnimatedIcon icon={Plus} animation="hover-scale" {...props} />
);

export const AnimatedTrash: React.FC<FinanceIconProps> = (props) => (
  <AnimatedIcon icon={Trash2} animation="hover-scale" {...props} />
);

export const AnimatedEdit: React.FC<FinanceIconProps> = (props) => (
  <AnimatedIcon icon={Edit} animation="hover-rotate" {...props} />
);

export const AnimatedCalendar: React.FC<FinanceIconProps> = (props) => (
  <AnimatedIcon icon={Calendar} animation="hover-scale" {...props} />
);

export const AnimatedFilter: React.FC<FinanceIconProps> = (props) => (
  <AnimatedIcon icon={Filter} animation="hover-rotate" {...props} />
);

export const AnimatedDownload: React.FC<FinanceIconProps> = (props) => (
  <AnimatedIcon icon={Download} animation="hover-bounce" {...props} />
);

export const AnimatedShare: React.FC<FinanceIconProps> = (props) => (
  <AnimatedIcon icon={Share} animation="hover-scale" {...props} />
);

export const AnimatedRefresh: React.FC<FinanceIconProps> = (props) => (
  <AnimatedIcon icon={RefreshCw} animation="spin" {...props} />
);
