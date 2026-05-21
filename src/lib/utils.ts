import { format, parseISO } from 'date-fns'

export function formatDate(date: string) {
  return format(parseISO(date), 'dd MMM yyyy')
}

export function formatDateTime(date: string) {
  return format(parseISO(date), 'dd MMM yyyy, hh:mm a')
}

export function formatTime(date: string) {
  return format(parseISO(date), 'hh:mm a')
}

export function formatCurrency(amount: number) {
  return `RM ${amount.toFixed(2)}`
}

export function formatHours(hours: number) {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function hoursToDisplay(hours: number) {
  if (hours === 2) return '2 Hours'
  if (hours === 4) return 'Half Day'
  if (hours === 8) return '1 Day'
  return `${hours}h`
}

export function getMonthName(month: number) {
  return new Date(2000, month - 1).toLocaleString('en', { month: 'long' })
}

export function generateWhatsAppLink(phone: string, message: string) {
  const cleaned = phone.replace(/\D/g, '')
  const encoded = encodeURIComponent(message)
  return `https://wa.me/${cleaned}?text=${encoded}`
}

export function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-700',
    present: 'bg-green-100 text-green-700',
    late: 'bg-orange-100 text-orange-700',
    absent: 'bg-red-100 text-red-700',
    on_leave: 'bg-blue-100 text-blue-700',
    draft: 'bg-gray-100 text-gray-700',
    paid: 'bg-green-100 text-green-700',
  }
  return colors[status] || 'bg-gray-100 text-gray-700'
}

export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}
