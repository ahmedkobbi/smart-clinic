'use client'

import { useApp } from '@/lib/store'
import { getDict, formatCurrency, formatDate, type Locale } from '@/lib/i18n'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  Package, AlertTriangle, Calendar, DollarSign, Boxes, Pill, Stethoscope,
} from 'lucide-react'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'

async function fetchInventory() {
  const res = await fetch('/api/inventory', { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

const CATEGORY_ICONS: Record<string, any> = {
  consumable: Boxes,
  medication: Pill,
  equipment: Stethoscope,
}

const CATEGORY_COLORS: Record<string, string> = {
  consumable: 'text-info bg-info/10',
  medication: 'text-glass-accent bg-glass-accent/10',
  equipment: 'text-glass-warm bg-glass-warm/10',
}

export function InventoryView({ locale }: { locale: Locale }) {
  const t = getDict(locale)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')

  const { data, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: fetchInventory,
    refetchInterval: 60_000,
  })

  const filtered = (data?.items || []).filter((item: any) => {
    if (category !== 'all' && item.category !== category) return false
    if (!search) return true
    const s = search.toLowerCase()
    return item.name.toLowerCase().includes(s)
  })

  const lowStock = (data?.items || []).filter((i: any) => i.stock <= i.reorderAt)
  const expiringSoon = (data?.items || []).filter((i: any) => {
    if (!i.expiryDate) return false
    const days = (new Date(i.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    return days < 180
  })
  const totalValue = (data?.items || []).reduce((s: number, i: any) => s + i.stock * i.unitPrice, 0)

  return (
    <div className="p-4 md:p-6 space-y-4 pb-24">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard label={locale === 'fr' ? 'Articles' : 'Items'} value={String(data?.items?.length || 0)} icon={Package} variant="primary" />
        <SummaryCard label={t.inventory.lowStock} value={String(lowStock.length)} icon={AlertTriangle} variant={lowStock.length > 0 ? 'danger' : 'success'} />
        <SummaryCard label={t.inventory.expiringSoon} value={String(expiringSoon.length)} icon={Calendar} variant={expiringSoon.length > 0 ? 'warning' : 'success'} />
        <SummaryCard label={t.inventory.totalValue} value={formatCurrency(totalValue, locale)} icon={DollarSign} variant="success" />
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={locale === 'fr' ? 'Rechercher un article…' : 'Search item…'}
          className="glass-base border-0 md:flex-1"
        />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full md:w-48 glass-base border-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="glass-floating">
            <SelectItem value="all">{locale === 'fr' ? 'Toutes catégories' : 'All categories'}</SelectItem>
            <SelectItem value="consumable">{t.inventory.categories.consumable}</SelectItem>
            <SelectItem value="medication">{t.inventory.categories.medication}</SelectItem>
            <SelectItem value="equipment">{t.inventory.categories.equipment}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Inventory table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 gap-3 px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40">
          <div className="col-span-4 md:col-span-4">{t.inventory.name}</div>
          <div className="col-span-2 hidden md:block">{t.inventory.category}</div>
          <div className="col-span-3 md:col-span-2">{t.inventory.stock}</div>
          <div className="col-span-2 hidden md:block">{t.inventory.expiry}</div>
          <div className="col-span-3 md:col-span-2 text-right">{t.inventory.unitPrice}</div>
        </div>
        <ScrollArea className="h-[60vh]">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">{t.common.loading}</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
              {t.common.noResults}
            </div>
          ) : (
            filtered.map((item: any, i: number) => {
              const Icon = CATEGORY_ICONS[item.category] || Package
              const colorClass = CATEGORY_COLORS[item.category] || 'text-muted-foreground bg-muted'
              const isLow = item.stock <= item.reorderAt
              const expiringDays = item.expiryDate ? (new Date(item.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24) : null
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 12 }}
                  className="grid grid-cols-12 gap-3 px-4 py-3 hover:bg-accent/30 transition-colors border-b border-border/20"
                >
                  <div className="col-span-4 md:col-span-4 flex items-center gap-2 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground">{item.unit}</p>
                    </div>
                  </div>
                  <div className="col-span-2 hidden md:flex items-center">
                    <Badge variant="outline" className="text-[10px]">
                      {t.inventory.categories[item.category as keyof typeof t.inventory.categories]}
                    </Badge>
                  </div>
                  <div className="col-span-3 md:col-span-2 flex items-center gap-2">
                    <span className={`text-sm font-medium tabular-nums ${isLow ? 'text-destructive' : ''}`}>
                      {item.stock}
                    </span>
                    {isLow && (
                      <Badge variant="destructive" className="text-[9px]">
                        {t.inventory.lowStock}
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground">/ {item.reorderAt}</span>
                  </div>
                  <div className="col-span-2 hidden md:flex items-center text-xs text-muted-foreground">
                    {item.expiryDate ? (
                      <span className={expiringDays !== null && expiringDays < 180 ? 'text-warning' : ''}>
                        {formatDate(item.expiryDate, locale)}
                      </span>
                    ) : '—'}
                  </div>
                  <div className="col-span-3 md:col-span-2 text-right">
                    <p className="text-xs font-medium tabular-nums">{formatCurrency(item.unitPrice, locale)}</p>
                    <p className="text-[10px] text-muted-foreground tabular-nums">
                      Total: {formatCurrency(item.stock * item.unitPrice, locale)}
                    </p>
                  </div>
                </motion.div>
              )
            })
          )}
        </ScrollArea>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, icon: Icon, variant }: any) {
  const variantClass = {
    primary: 'text-primary bg-primary/10',
    success: 'text-success bg-success/10',
    warning: 'text-warning bg-warning/10',
    danger: 'text-destructive bg-destructive/10',
  }[variant]
  return (
    <motion.div
      initial={{ y: 8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="glass-card rounded-xl p-4 flex items-center justify-between gap-3"
    >
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold tabular-nums mt-1">{value}</p>
      </div>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${variantClass}`}>
        <Icon className="w-4 h-4" />
      </div>
    </motion.div>
  )
}
