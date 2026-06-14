import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { AppCard } from '@/components/common';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Category } from '@/api/categories';
import type { Account } from '@/api/accounts';
import { FILTER_TRANSACTION_TYPE_OPTIONS } from '@/lib/transaction-types';

interface FilterPanelProps {
  filters: {
    startDate?: string;
    endDate?: string;
    types: string[];
    categoryIds: string[];
    accountIds: string[];
    minAmount?: number;
    maxAmount?: number;
    search?: string;
  };
  categories: Category[];
  accounts: Account[];
  amountBounds: {
    min: number;
    max: number;
  };
  onFiltersChange: (filters: FilterPanelProps['filters']) => void;
  onClearFilters: () => void;
}

const INPUT_CLS = 'w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary';
const FILTER_BUTTON_CLS = 'h-11 rounded-lg bg-secondary px-5 text-secondary-foreground hover:bg-secondary/80 focus-visible:ring-2 focus-visible:ring-primary';
const FILTER_DROPDOWN_TRIGGER_CLS = 'h-11 w-full justify-between rounded-lg bg-secondary px-4 text-secondary-foreground hover:bg-secondary/80 focus-visible:ring-2 focus-visible:ring-primary';

function toggleValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value]
}

export function FilterPanel({
  filters,
  categories,
  accounts,
  amountBounds,
  onFiltersChange,
  onClearFilters,
}: FilterPanelProps) {
  const { t } = useTranslation();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const hasAmountFilter = filters.minAmount !== undefined || filters.maxAmount !== undefined;
  const lowerAmount = Math.max(amountBounds.min, filters.minAmount ?? amountBounds.min);
  const upperAmount = Math.min(amountBounds.max, filters.maxAmount ?? amountBounds.max);
  const rangeMax = Math.max(amountBounds.max, 1);
  const activeFilterCount =
    filters.types.length +
    filters.categoryIds.length +
    filters.accountIds.length +
    (hasAmountFilter ? 1 : 0) +
    (filters.startDate ? 1 : 0) +
    (filters.endDate ? 1 : 0) +
    (filters.search ? 1 : 0);
  const formatAmount = (value: number) => new Intl.NumberFormat('vi-VN').format(value);
  const updateAmountRange = (nextMin: number, nextMax: number) => {
    const boundedMin = Math.max(amountBounds.min, Math.min(nextMin, nextMax));
    const boundedMax = Math.min(amountBounds.max, Math.max(nextMax, boundedMin));
    onFiltersChange({
      ...filters,
      minAmount: boundedMin <= amountBounds.min ? undefined : boundedMin,
      maxAmount: boundedMax >= amountBounds.max ? undefined : boundedMax,
    });
  };
  const activeChips = [
    ...filters.types.map((type) => ({
      key: `type-${type}`,
      label: t(`operationTypes.${type}`, type),
      remove: () => onFiltersChange({ ...filters, types: filters.types.filter((item) => item !== type) }),
    })),
    ...filters.categoryIds.map((categoryId) => {
      const category = categories.find((item) => String(item.category_id) === categoryId)
      return {
        key: `category-${categoryId}`,
        label: category?.category_name ?? `#${categoryId}`,
        remove: () => onFiltersChange({ ...filters, categoryIds: filters.categoryIds.filter((item) => item !== categoryId) }),
      }
    }),
    ...filters.accountIds.map((accountId) => {
      const account = accounts.find((item) => String(item.account_id) === accountId)
      return {
        key: `account-${accountId}`,
        label: account?.account_name ?? `#${accountId}`,
        remove: () => onFiltersChange({ ...filters, accountIds: filters.accountIds.filter((item) => item !== accountId) }),
      }
    }),
    ...(filters.startDate ? [{
      key: 'startDate',
      label: `${t('transactions.startDate')}: ${filters.startDate}`,
      remove: () => onFiltersChange({ ...filters, startDate: undefined }),
    }] : []),
    ...(filters.endDate ? [{
      key: 'endDate',
      label: `${t('transactions.endDate')}: ${filters.endDate}`,
      remove: () => onFiltersChange({ ...filters, endDate: undefined }),
    }] : []),
    ...(filters.search ? [{
      key: 'search',
      label: `${t('transactions.search')}: ${filters.search}`,
      remove: () => onFiltersChange({ ...filters, search: undefined }),
    }] : []),
    ...(hasAmountFilter ? [{
      key: 'amount',
      label: `${t('transactions.amountRange')}: ${formatAmount(lowerAmount)} - ${formatAmount(upperAmount)}`,
      remove: () => onFiltersChange({ ...filters, minAmount: undefined, maxAmount: undefined }),
    }] : []),
  ];

  return (
    <AppCard variant="toolbar" className="mb-4 rounded-[var(--radius)] p-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[150px]">
          <label className="block text-muted-foreground text-sm mb-1">{t('transactions.search')}</label>
          <input type="text" placeholder={t('transactions.searchPlaceholder')} value={filters.search || ''}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className={INPUT_CLS} />
        </div>

        <div className="flex-1 min-w-[150px]">
          <label className="block text-muted-foreground text-sm mb-1">{t('transactions.startDate')}</label>
          <input type="date" value={filters.startDate || ''}
            onChange={(e) => onFiltersChange({ ...filters, startDate: e.target.value })}
            className={INPUT_CLS} />
        </div>

        <div className="flex-1 min-w-[150px]">
          <label className="block text-muted-foreground text-sm mb-1">{t('transactions.endDate')}</label>
          <input type="date" value={filters.endDate || ''}
            onChange={(e) => onFiltersChange({ ...filters, endDate: e.target.value })}
            className={INPUT_CLS} />
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={() => setFiltersOpen((open) => !open)}
          aria-expanded={filtersOpen}
          className={FILTER_BUTTON_CLS}
        >
          <SlidersHorizontal className="size-4" />
          {t('transactions.filters')}
          {activeFilterCount > 0 ? (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              {activeFilterCount}
            </span>
          ) : null}
          <ChevronDown className={`size-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
        </Button>

        <Button variant="secondary" onClick={onClearFilters} className={FILTER_BUTTON_CLS}>
          {t('transactions.clearFilters')}
        </Button>
      </div>

      {filtersOpen ? (
        <div className="mt-3 rounded-lg border border-border/70 bg-popover p-3 shadow-lg">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <FilterDropdown
              title={t('transactions.type')}
              fallbackLabel={t('transactions.allTypes')}
              options={FILTER_TRANSACTION_TYPE_OPTIONS.map((type) => ({
                value: type,
                label: t(`operationTypes.${type}`),
              }))}
              values={filters.types}
              emptyLabel={t('common.none')}
              onValuesChange={(types) => onFiltersChange({ ...filters, types })}
            />
            <FilterDropdown
              title={t('transactions.category')}
              fallbackLabel={t('transactions.selectCategory')}
              options={categories.map((category) => ({
                value: String(category.category_id),
                label: category.category_name,
              }))}
              values={filters.categoryIds}
              emptyLabel={t('common.none')}
              onValuesChange={(categoryIds) => onFiltersChange({ ...filters, categoryIds })}
            />
            <FilterDropdown
              title={t('transactions.account')}
              fallbackLabel={t('transactions.selectAccount')}
              options={accounts.map((account) => ({
                value: String(account.account_id),
                label: account.account_name,
              }))}
              values={filters.accountIds}
              emptyLabel={t('common.none')}
              onValuesChange={(accountIds) => onFiltersChange({ ...filters, accountIds })}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="secondary" className={FILTER_DROPDOWN_TRIGGER_CLS}>
                  <span className="truncate">
                    {hasAmountFilter
                      ? `${formatAmount(lowerAmount)} - ${formatAmount(upperAmount)}`
                      : t('transactions.amountRange')}
                  </span>
                  <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-80 p-3">
                <DropdownMenuLabel className="px-0 pt-0 text-xs uppercase text-muted-foreground">
                  {t('transactions.amountRange')}
                </DropdownMenuLabel>
                <div className="space-y-4" onClick={(event) => event.stopPropagation()}>
                  <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span>{formatAmount(lowerAmount)}</span>
                    <span>{formatAmount(upperAmount)}</span>
                  </div>
                  <div className="space-y-3">
                    <input
                      type="range"
                      min={amountBounds.min}
                      max={rangeMax}
                      step={10000}
                      value={lowerAmount}
                      onChange={(event) => updateAmountRange(Number(event.target.value), upperAmount)}
                      className="w-full accent-primary"
                    />
                    <input
                      type="range"
                      min={amountBounds.min}
                      max={rangeMax}
                      step={10000}
                      value={upperAmount}
                      onChange={(event) => updateAmountRange(lowerAmount, Number(event.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => onFiltersChange({ ...filters, minAmount: undefined, maxAmount: undefined })}
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {t('transactions.resetAmount')}
                  </button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ) : null}

      {activeChips.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.remove}
              className="rounded-full border border-border bg-muted/30 px-3 py-1 text-xs text-foreground transition-colors hover:bg-muted"
            >
              {chip.label} ×
            </button>
          ))}
        </div>
      ) : null}
    </AppCard>
  );
}

function FilterDropdown({
  title,
  fallbackLabel,
  options,
  values,
  emptyLabel,
  onValuesChange,
}: {
  title: string;
  fallbackLabel: string;
  options: { value: string; label: string }[];
  values: string[];
  emptyLabel: string;
  onValuesChange: (values: string[]) => void;
}) {
  const selectedOptions = options.filter((option) => values.includes(option.value));
  const triggerLabel = selectedOptions.length === 0
    ? fallbackLabel
    : selectedOptions.length === 1
      ? selectedOptions[0].label
      : `${title} (${selectedOptions.length})`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="secondary" className={FILTER_DROPDOWN_TRIGGER_CLS}>
          <span className="truncate">{triggerLabel}</span>
          <ChevronDown className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs uppercase text-muted-foreground">{title}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.length > 0 ? options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={values.includes(option.value)}
            onCheckedChange={() => onValuesChange(toggleValue(values, option.value))}
            onSelect={(event) => event.preventDefault()}
          >
            <span className="truncate">{option.label}</span>
          </DropdownMenuCheckboxItem>
        )) : (
          <p className="px-2 py-1.5 text-sm text-muted-foreground">{emptyLabel}</p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
