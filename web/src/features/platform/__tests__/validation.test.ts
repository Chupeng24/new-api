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
import { describe, expect, it } from 'vitest'

import { identitySchema, invoiceSchema } from '../schema'

describe('Platform applications', () => {
  it('requires explicit consent and a supported identity', () => {
    const request = {
      kind: 'student',
      organization: 'University',
      contact_email: 'a@example.edu',
      evidence_reference: 'Verification ID',
      consent: true,
    }
    expect(identitySchema.safeParse(request).success).toBe(true)
    expect(
      identitySchema.safeParse({ ...request, consent: false }).success
    ).toBe(false)
    expect(identitySchema.safeParse({ ...request, kind: 'root' }).success).toBe(
      false
    )
    expect(
      identitySchema.safeParse({ ...request, organization: ' ' }).success
    ).toBe(false)
  })
  it('rejects invalid order identifiers and oversized invoice titles', () => {
    const request = {
      top_up_id: 1,
      title: 'Example Ltd',
      tax_id: '1234567890',
      email: 'a@example.com',
    }
    expect(invoiceSchema.safeParse(request).success).toBe(true)
    expect(invoiceSchema.safeParse({ ...request, top_up_id: -1 }).success).toBe(
      false
    )
    expect(
      invoiceSchema.safeParse({ ...request, top_up_id: 1.5 }).success
    ).toBe(false)
    expect(
      invoiceSchema.safeParse({ ...request, title: 'a'.repeat(201) }).success
    ).toBe(false)
  })
})
