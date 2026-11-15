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
import i18next from 'i18next'
import { expect, it } from 'vitest'

import zh from '@/i18n/locales/zh.json'

it('shows Chinese workspace and consent copy with the application resource shape', async () => {
  const instance = i18next.createInstance()
  await instance.init({
    lng: 'zh',
    resources: { zh },
    keySeparator: false,
    interpolation: { escapeValue: false },
  })
  expect(instance.t('Industry workspace')).toBe('行业工作台')
  expect(instance.t('Top up')).toBe('充值')
  expect(instance.t('Institutional reviews')).toBe('运营审核')
  expect(
    instance.t(
      'I consent to using these details only to review my institutional eligibility.'
    )
  ).toBe('我同意仅将以上信息用于审核我的机构身份资格。')
})
