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
import { readFileSync } from 'node:fs'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'

import { BrandDocument } from '@/components/brand-document'
import { useSystemConfigStore } from '@/stores/system-config-store'

const aboutContent = readFileSync('../PLATFORM_ABOUT.md', 'utf8')
const helpContent = readFileSync('../PLATFORM_HELP.md', 'utf8')

const clients: QueryClient[] = []
afterEach(() => {
  cleanup()
  clients.splice(0).forEach((client) => client.clear())
  useSystemConfigStore.setState(useSystemConfigStore.getInitialState(), true)
  localStorage.clear()
})

test.each([aboutContent, helpContent])(
  'repository content uses the configured brand as plain text',
  (content) => {
    useSystemConfigStore
      .getState()
      .setConfig({ systemName: 'Research [lab](https://example.com)' })
    const client = new QueryClient()
    clients.push(client)
    render(
      <QueryClientProvider client={client}>
        <BrandDocument content={content} />
      </QueryClientProvider>
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Research [lab](https://example.com)'
    )
    expect(screen.queryByRole('link', { name: 'lab' })).not.toBeInTheDocument()
  }
)

test('built-in about content links to our help and preserves upstream attribution', () => {
  const client = new QueryClient()
  clients.push(client)
  render(
    <QueryClientProvider client={client}>
      <BrandDocument content={aboutContent} />
    </QueryClientProvider>
  )
  expect(screen.getByRole('link', { name: '平台使用帮助' })).toHaveAttribute(
    'href',
    '/docs'
  )
  expect(screen.getByRole('link', { name: 'New API' })).toHaveAttribute(
    'href',
    'https://github.com/QuantumNous/new-api'
  )
})
