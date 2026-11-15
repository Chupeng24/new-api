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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  cleanup,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'

import { IdentityApplication, InvoiceApplication } from '../applications'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
vi.mock('@/lib/api', () => ({ api: { post: vi.fn() } }))
afterEach(cleanup)

describe('Platform application forms', () => {
  it('prevents identity submission without consent', async () => {
    const client = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    })
    render(
      <QueryClientProvider client={client}>
        <IdentityApplication />
      </QueryClientProvider>
    )
    fireEvent.change(screen.getByLabelText('Organization'), {
      target: { value: 'University' },
    })
    fireEvent.change(screen.getByLabelText('Contact email'), {
      target: { value: 'a@example.edu' },
    })
    fireEvent.change(screen.getByLabelText('Verification reference'), {
      target: { value: '123' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Submit application' }))
    await screen.findByRole('alert')
    expect(api.post).not.toHaveBeenCalled()
  })
  it('preserves invoice data and reports a rejected server response', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { success: false, message: 'Order is not eligible' },
    })
    const client = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    })
    render(
      <QueryClientProvider client={client}>
        <InvoiceApplication />
      </QueryClientProvider>
    )
    fireEvent.change(screen.getByLabelText('Top-up order ID'), {
      target: { value: '7' },
    })
    fireEvent.change(screen.getByLabelText('Invoice title'), {
      target: { value: 'Example Ltd' },
    })
    fireEvent.change(screen.getByLabelText('Tax ID'), {
      target: { value: '12345678' },
    })
    fireEvent.change(screen.getByLabelText('Invoice email'), {
      target: { value: 'a@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Submit application' }))
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Submission failed')
    )
    expect(screen.getByLabelText('Invoice title')).toHaveValue('Example Ltd')
    expect(screen.queryByText('Application submitted')).not.toBeInTheDocument()
  })
})
