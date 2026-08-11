'use client'

import { getDict, type Locale } from '@/lib/i18n'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, UserPlus } from 'lucide-react'

async function fetchBranches() {
  const res = await fetch('/api/settings?section=tenant', { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

export function PatientForm({ open, onOpenChange, locale }: { open: boolean; onOpenChange: (b: boolean) => void; locale: Locale }) {
  const t = getDict(locale)
  const qc = useQueryClient()
  const { data: branchesData } = useQuery({ queryKey: ['branches'], queryFn: fetchBranches })
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    birthDate: '',
    sex: 'unknown' as 'male' | 'female' | 'other' | 'unknown',
    phone: '',
    email: '',
    addressLine: '',
    postalCode: '',
    city: '',
    ssn: '',
    mutuelle: '',
    bloodType: '',
    heightCm: '',
    weightKg: '',
    branchId: '',
  })

  const handleSubmit = async () => {
    if (!form.firstName || !form.lastName) {
      toast.error(locale === 'fr' ? 'Nom et prénom requis' : 'First and last name required')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          birthDate: form.birthDate || undefined,
          heightCm: form.heightCm ? parseInt(form.heightCm) : undefined,
          weightKg: form.weightKg ? parseFloat(form.weightKg) : undefined,
          email: form.email || undefined,
          branchId: form.branchId || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed')
      }
      const patient = await res.json()
      toast.success(`${locale === 'fr' ? 'Patient créé' : 'Patient created'}: ${patient.firstName} ${patient.lastName}`)
      qc.invalidateQueries({ queryKey: ['patients'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      onOpenChange(false)
      // Reset form
      setForm({
        firstName: '', lastName: '', birthDate: '', sex: 'unknown',
        phone: '', email: '', addressLine: '', postalCode: '', city: '',
        ssn: '', mutuelle: '', bloodType: '', heightCm: '', weightKg: '', branchId: '',
      })
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-floating max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            {t.patients.new}
          </DialogTitle>
          <DialogDescription>{t.patients.subtitle}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">{t.common.name} *</Label>
            <Input id="firstName" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">{locale === 'fr' ? 'Nom' : 'Last name'} *</Label>
            <Input id="lastName" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="birthDate">{locale === 'fr' ? 'Date de naissance' : 'Birth date'}</Label>
            <Input id="birthDate" type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>{t.patients.sex}</Label>
            <Select value={form.sex} onValueChange={(v) => setForm({ ...form, sex: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="glass-floating">
                <SelectItem value="male">{locale === 'fr' ? 'Homme' : 'Male'}</SelectItem>
                <SelectItem value="female">{locale === 'fr' ? 'Femme' : 'Female'}</SelectItem>
                <SelectItem value="other">{locale === 'fr' ? 'Autre' : 'Other'}</SelectItem>
                <SelectItem value="unknown">{locale === 'fr' ? 'Inconnu' : 'Unknown'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">{t.common.phone}</Label>
            <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">{t.common.email}</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label htmlFor="address">{t.common.address}</Label>
            <Input id="address" value={form.addressLine} onChange={(e) => setForm({ ...form, addressLine: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="postal">{t.common.postalCode}</Label>
            <Input id="postal" value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city">{t.common.city}</Label>
            <Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ssn">{t.patients.ssn}</Label>
            <Input id="ssn" value={form.ssn} onChange={(e) => setForm({ ...form, ssn: e.target.value })} className="font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mutuelle">{t.patients.mutuelle}</Label>
            <Input id="mutuelle" value={form.mutuelle} onChange={(e) => setForm({ ...form, mutuelle: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>{t.patients.bloodType}</Label>
            <Select value={form.bloodType} onValueChange={(v) => setForm({ ...form, bloodType: v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent className="glass-floating">
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="height">{t.patients.height} (cm)</Label>
            <Input id="height" type="number" value={form.heightCm} onChange={(e) => setForm({ ...form, heightCm: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="weight">{t.patients.weight} (kg)</Label>
            <Input id="weight" type="number" step="0.1" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>{locale === 'fr' ? 'Site' : 'Branch'}</Label>
            <Select value={form.branchId} onValueChange={(v) => setForm({ ...form, branchId: v })}>
              <SelectTrigger><SelectValue placeholder={locale === 'fr' ? 'Sélectionner' : 'Select'} /></SelectTrigger>
              <SelectContent className="glass-floating">
                {(branchesData?.branches || []).map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t.common.cancel}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
