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
import { expect, test } from 'vitest'

import { isSiteUrl } from '@/lib/site-url'

test.each([
  '/branding/modelflow.svg',
  'https://cdn.example.com/logo.svg',
  'http://localhost:3000/logo.svg',
])('accepts logo location %s', (url) => {
  expect(isSiteUrl(url)).toBe(true)
})

test.each([
  '',
  '//example.com/logo.svg',
  '/\\example.com/logo.svg',
  'javascript:alert(1)',
  'https://user:secret@example.com/logo.svg',
  'logo.svg',
])('rejects unsupported logo location %s', (url) => {
  expect(isSiteUrl(url)).toBe(false)
})
