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
import { z } from 'zod'

export const identitySchema = z.object({
  kind: z.enum(['enterprise', 'student', 'teacher']),
  organization: z.string().trim().min(1).max(200),
  contact_email: z.email().max(254),
  evidence_reference: z.string().trim().min(1).max(200),
  consent: z.boolean().refine((value) => value),
})
export const invoiceSchema = z.object({
  top_up_id: z.number().int().positive(),
  title: z.string().trim().min(1).max(200),
  tax_id: z.string().trim().min(1).max(40),
  email: z.email().max(254),
})
export type IdentityInput = z.infer<typeof identitySchema>
export type InvoiceInput = z.infer<typeof invoiceSchema>
