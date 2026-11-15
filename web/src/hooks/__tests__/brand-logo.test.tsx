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
import { act, cleanup, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, expect, test, vi } from 'vitest'

import { useSystemConfig } from '@/hooks/use-system-config'
import { DEFAULT_LOGO } from '@/lib/constants'
import { useSystemConfigStore } from '@/stores/system-config-store'

let client: QueryClient
afterEach(() => {
  cleanup()
  client?.clear()
  vi.unstubAllGlobals()
  useSystemConfigStore.setState(useSystemConfigStore.getInitialState(), true)
  localStorage.clear()
  document.querySelectorAll('link[rel="icon"]').forEach((link) => link.remove())
})

test('an unavailable custom logo falls back to the bundled logo and favicon', () => {
  const images: {
    onerror: null | (() => void)
    onload: null | (() => void)
    src: string
  }[] = []
  vi.stubGlobal(
    'Image',
    class {
      onerror = null
      onload = null
      src = ''
      constructor() {
        images.push(this)
      }
    }
  )
  useSystemConfigStore
    .getState()
    .setConfig({ logo: 'https://cdn.example.com/missing.svg' })
  client = new QueryClient()
  const { result } = renderHook(() => useSystemConfig(), {
    wrapper: (props: { children: ReactNode }) => (
      <QueryClientProvider client={client}>
        {props.children}
      </QueryClientProvider>
    ),
  })
  act(() => images[0].onerror?.())
  expect(result.current.logo).toBe(DEFAULT_LOGO)
  expect(document.querySelector('link[rel="icon"]')).toHaveAttribute(
    'href',
    DEFAULT_LOGO
  )
})
