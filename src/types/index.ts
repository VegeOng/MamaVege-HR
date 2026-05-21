export type UserRole = 'employee' | 'supervisor' | 'hr' | 'director'
export type ShiftType = 'A' | 'B' | 'C'
export type ClockMethod = 'gps' | 'wifi' | 'both'

export interface Profile {
  id: string
  employee_id: string
  full_name: string
  email: string
  phone?: string
  role: UserRole
  department?: string
  position?: string
  ic_number?: string
  ic_type?: 'nric' | 'work_permit' | 'passport'
  bank_name?: string
  bank_account?: string
  epf_number?: string
  socso_number?: string
  tax_number?: string
  basic_salary: number
  shift: ShiftType
  clock_in_method: ClockMethod
  join_date?: string
  is_active: boolean
  avatar_url?: string
  whatsapp_number?: string
  created_at: string
  updated_at: string
}

export interface LeaveType {
  id: string
  name: string
  code: string
  is_paid: boolean
  requires_document: boolean
  document_label?: string
  max_claim_per_occurrence?: number
  max_claim_per_year?: number
}

export interface LeaveEntitlement {
  id: string
  employee_id: string
  leave_type_id: string
  year: number
  entitled_hours: number
  used_hours: number
  carried_forward_hours: number
  leave_type?: LeaveType
}

export interface LeaveRequest {
  id: string
  employee_id: string
  leave_type_id: string
  start_date: string
  end_date: string
  start_time?: string
  end_time?: string
  duration_type: '2hours' | 'half_day' | 'full_day' | 'multi_day'
  half_day_period?: 'morning' | 'afternoon'
  total_hours: number
  reason?: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  mc_amount?: number
  mc_document_url?: string
  reviewed_by?: string
  reviewed_at?: string
  reviewer_notes?: string
  applied_at: string
  employee?: Profile
  leave_type?: LeaveType
}

export interface Attendance {
  id: string
  employee_id: string
  date: string
  clock_in?: string
  clock_out?: string
  clock_in_lat?: number
  clock_in_lng?: number
  clock_out_lat?: number
  clock_out_lng?: number
  clock_in_wifi?: string
  clock_out_wifi?: string
  total_hours?: number
  overtime_hours: number
  is_late: boolean
  late_minutes: number
  status: 'present' | 'late' | 'absent' | 'half_day' | 'on_leave' | 'public_holiday'
  notes?: string
}

export interface OTRequest {
  id: string
  employee_id: string
  date: string
  start_time: string
  end_time: string
  total_hours?: number
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  supervisor_id?: string
  ot_pay?: number
  employee?: Profile
}

export interface Claim {
  id: string
  employee_id: string
  claim_type_id: string
  month: number
  year: number
  amount: number
  description?: string
  receipt_url?: string
  status: 'pending' | 'approved' | 'rejected'
  is_hr_input: boolean
  reviewed_by?: string
  reviewed_at?: string
  reviewer_notes?: string
  created_at: string
  employee?: Profile
  claim_type?: ClaimType
}

export interface ClaimType {
  id: string
  name: string
  code: string
  requires_receipt: boolean
}

export interface ClaimLimit {
  id: string
  employee_id: string
  claim_type_id: string
  monthly_limit?: number
  is_active: boolean
  claim_type?: ClaimType
}

export interface Payroll {
  id: string
  employee_id: string
  month: number
  year: number
  basic_salary: number
  total_allowances: number
  overtime_pay: number
  commission: number
  total_claims: number
  gross_salary?: number
  epf_employee: number
  epf_employer: number
  socso_employee: number
  socso_employer: number
  eis_employee: number
  eis_employer: number
  pcb: number
  hrdf: number
  unpaid_leave_deduction: number
  late_deduction: number
  total_deductions?: number
  net_salary?: number
  working_days: number
  present_days: number
  leave_days: number
  absent_days: number
  ot_hours: number
  status: 'draft' | 'approved' | 'paid'
  employee?: Profile
}

export interface Suggestion {
  id: string
  employee_id: string
  is_anonymous: boolean
  category: 'company_operations' | 'teamwork' | 'work_environment' | 'salary_benefits' | 'others'
  title: string
  content: string
  status: 'unread' | 'read' | 'replied'
  director_reply?: string
  replied_at?: string
  created_at: string
  employee?: Profile
}

export interface EmployeeDocument {
  id: string
  employee_id: string
  document_type: 'offer_letter' | 'contract' | 'warning_letter' | 'promotion_letter' | 'nda' | 'ic_copy' | 'others'
  title: string
  file_url: string
  file_name: string
  file_size?: number
  uploaded_by?: string
  notes?: string
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  is_read: boolean
  link?: string
  created_at: string
}
