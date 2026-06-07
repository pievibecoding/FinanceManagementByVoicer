# Animated Icons - Hướng Dẫn Sử Dụng

## Tổng quan

Animated Icons là hệ thống icon sống động được xây dựng trên Lucide Icons + Framer Motion, được thiết kế riêng cho Finance Management dashboard.

## Cài đặt

Đã cài đặt sẵn:
```bash
npm install framer-motion
```

## Cách sử dụng

### 1. Sử dụng AnimatedIcon component trực tiếp

```tsx
import { AnimatedIcon } from './components/AnimatedIcon';
import { Wallet } from 'lucide-react';

// Icon với animation mặc định (hover-scale)
<AnimatedIcon icon={Wallet} size={24} />

// Icon với animation type khác
<AnimatedIcon 
  icon={Wallet} 
  size={24} 
  animation="hover-rotate" 
/>

// Icon với onClick handler
<AnimatedIcon 
  icon={Wallet} 
  size={24} 
  onClick={() => console.log('clicked')} 
/>

// Icon với custom className
<AnimatedIcon 
  icon={Wallet} 
  size={24} 
  className="text-celadon" 
/>
```

### 2. Sử dụng pre-configured Finance Icons

```tsx
import { 
  AnimatedWallet, 
  AnimatedTrendingUp, 
  AnimatedPieChart,
  AnimatedSettings 
} from './components/FinanceIcons';

// Finance icons với animation đã được pre-configured
<AnimatedWallet size={24} />
<AnimatedTrendingUp size={24} />
<AnimatedPieChart size={24} />
<AnimatedSettings size={24} />

// Override animation type
<AnimatedWallet size={24} animation="pulse" />
```

## Animation Types

| Animation Type | Mô tả | Use Case |
|----------------|-------|----------|
| `hover-scale` | Phóng to khi hover | Navigation buttons, menu items |
| `hover-rotate` | Xoay nhẹ khi hover | Settings, edit icons |
| `hover-bounce` | Nhảy lên khi hover | Action buttons, add/delete |
| `pulse` | Nhấp nháy liên tục | Loading states, important alerts |
| `spin` | Xoay liên tục | Loading spinners, refresh |
| `shake` | Rung khi hover | Notifications, alerts |
| `none` | Không animation | Static icons |

## Ví dụ thực tế

### Navigation Sidebar

```tsx
import { AnimatedHome, AnimatedSettings, AnimatedUser } from './components/FinanceIcons';

<div className="flex flex-col gap-4">
  <AnimatedHome size={24} onClick={() => navigate('/dashboard')} />
  <AnimatedSettings size={24} onClick={() => navigate('/settings')} />
  <AnimatedUser size={24} onClick={() => navigate('/profile')} />
</div>
```

### Transaction List Actions

```tsx
import { AnimatedEdit, AnimatedTrash, AnimatedShare } from './components/FinanceIcons';

<div className="flex gap-2">
  <AnimatedEdit size={16} onClick={() => editTransaction(id)} />
  <AnimatedTrash size={16} onClick={() => deleteTransaction(id)} />
  <AnimatedShare size={16} onClick={() => shareTransaction(id)} />
</div>
```

### Loading State

```tsx
import { AnimatedRefresh } from './components/FinanceIcons';

<AnimatedRefresh size={24} animation="spin" />
```

### Dashboard Cards

```tsx
import { AnimatedWallet, AnimatedTrendingUp, AnimatedDollarSign } from './components/FinanceIcons';

<div className="flex items-center gap-3">
  <AnimatedWallet size={32} className="text-celadon" />
  <div>
    <p class="text-sm text-gray-500">Tổng tài sản</p>
    <p class="text-2xl font-bold">{formatCurrency(totalBalance)}</p>
  </div>
</div>
```

## Custom Animation

Nếu cần custom animation, có thể truyền trực tiếp vào AnimatedIcon:

```tsx
import { AnimatedIcon } from './components/AnimatedIcon';
import { Wallet } from 'lucide-react';

<AnimatedIcon 
  icon={Wallet}
  size={24}
  initial={{ opacity: 0, scale: 0.5 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.3 }}
/>
```

## Tailwind Integration

AnimatedIcon hỗ trợ full Tailwind classes:

```tsx
<AnimatedWallet 
  size={24} 
  className="text-celadon hover:text-sage-green transition-colors" 
/>
```

## Performance Tips

1. **Sử dụng animation type phù hợp:** `hover-scale` nhẹ hơn `spin`
2. **Giới hạn số lượng animated icons:** Không animate tất cả icons
3. **Dùng `animation="none"` cho static icons:** Icons không cần interaction
4. **Avoid nested animations:** Không lồng nhiều animated components

## Troubleshooting

**Icon không animate:**
- Kiểm tra có import Framer Motion đúng chưa
- Đảm bảo animation type hợp lệ
- Check console có error không

**Animation chậm:**
- Giảm số lượng animated icons
- Dùng animation type nhẹ hơn (hover-scale thay vì spin)
- Check performance tab trong DevTools

## Migration từ Lucide Icons cũ

```tsx
// Trước (static icon)
import { Wallet } from 'lucide-react';
<Wallet size={24} />

// Sau (animated icon)
import { AnimatedWallet } from './components/FinanceIcons';
<AnimatedWallet size={24} />
```

Hoặc giữ nguyên import, chỉ wrap với AnimatedIcon:

```tsx
import { Wallet } from 'lucide-react';
import { AnimatedIcon } from './components/AnimatedIcon';

<AnimatedIcon icon={Wallet} size={24} />
```
