import {
  LayoutDashboard,
  Landmark,
  Wallet,
  CreditCard,
  TrendingUp,
  PieChart,
  BarChart,
  Settings,
  UserCog,
  HelpCircle,
  Bell,
  Calendar,
  Filter,
  LogOut,
  HandCoins,
  PiggyBank,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'Finance User',
    email: 'user@example.com',
    avatar: '/avatars/default.jpg',
  },
  teams: [
    {
      name: 'Finance Management',
      logo: Landmark,
      plan: 'Personal Finance',
    },
  ],
  navGroups: [
    {
      title: 'Finance',
      items: [
        {
          title: 'Dashboard',
          url: '/',
          icon: LayoutDashboard,
        },
        {
          title: 'Transactions',
          url: '/transactions',
          icon: Wallet,
        },
        {
          title: 'Accounts',
          url: '/accounts',
          icon: CreditCard,
        },
        {
          title: 'Debts',
          url: '/debts',
          icon: HandCoins,
        },
        {
          title: 'Savings',
          url: '/savings',
          icon: PiggyBank,
        },
        {
          title: 'Categories',
          url: '/categories',
          icon: PieChart,
        },
        {
          title: 'Analytics',
          url: '/analytics',
          icon: BarChart,
        },
        {
          title: 'Budgets',
          url: '/budgets',
          icon: TrendingUp,
        },
      ],
    },
    {
      title: 'Settings',
      items: [
        {
          title: 'Profile',
          url: '/settings',
          icon: UserCog,
        },
        {
          title: 'Notifications',
          url: '/settings/notifications',
          icon: Bell,
        },
        {
          title: 'Help Center',
          url: '/help',
          icon: HelpCircle,
        },
        {
          title: 'Sign Out',
          url: '/signout',
          icon: LogOut,
        },
      ],
    },
  ],
}
