/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '@/lib/api'
import { requireServerSuccess } from '@/lib/server-error-message'

import type { IdentityInput, InvoiceInput } from './schema'

export type Identity = IdentityInput & {
  revision: number
  id: number
  user_id: number
  status: string
  review_note: string
}
export type Invoice = InvoiceInput & {
  revision: number
  id: number
  user_id: number
  status: string
  review_note: string
  invoice_number: string
  money: number
  payment_method: string
}
export type Page<T> = { items: T[]; total: number; page: number }
export type Home = {
  quota: number
  used_quota: number
  request_count: number
  identity: Identity | null
  can_review: boolean
  can_report: boolean
  can_manage_report: boolean
  campaign: string
  support_wechat: string
  support_whatsapp: string
}
export type Report = {
  enabled: boolean
  suppressed?: boolean
  since: number
  until: number
  usage?: {
    requests: number
    tokens: number
    quota: number
    active_users: number
  }
}

export async function getPlatform<T>(path: string): Promise<T> {
  const response = await api.get<{ success: boolean; data: T }>(
    `/api/platform/${path}`
  )
  return requireServerSuccess(response.data).data
}
export function usePlatformQuery<T>(path: string, enabled = true) {
  return useQuery({
    queryKey: ['platform', path],
    queryFn: () => getPlatform<T>(path),
    enabled,
  })
}
export function usePlatformMutation<T>(path: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (data: T) => {
      const response = await api.post(`/api/platform/${path}`, data)
      return requireServerSuccess(response.data)
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['platform'] }),
  })
}
