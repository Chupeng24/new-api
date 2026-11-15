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
import { cleanup, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, expect, test } from 'vitest'

import { useTopNavLinks } from '@/hooks/use-top-nav-links'
import { STATUS_QUERY_KEY } from '@/lib/status-query'

const clients: QueryClient[] = []

afterEach(() => {
  cleanup()
  clients.splice(0).forEach((client) => client.clear())
  localStorage.clear()
})

test.each([
  [undefined, '/docs', false],
  ['/docs', '/docs', false],
  ['https://help.example.com', 'https://help.example.com', true],
  ['javascript:alert(1)', '/docs', false],
])('docs setting %s produces a usable help link', (setting, href, external) => {
  const client = new QueryClient()
  clients.push(client)
  client.setQueryData(STATUS_QUERY_KEY, { docs_link: setting })
  const { result } = renderHook(() => useTopNavLinks(), {
    wrapper: (props: { children: ReactNode }) => (
      <QueryClientProvider client={client}>
        {props.children}
      </QueryClientProvider>
    ),
  })
  const docs = result.current.find((link) => link.title === 'Docs')
  expect(docs?.href).toBe(href)
  expect(Boolean(docs?.external)).toBe(external)
})
