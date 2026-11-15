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
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { usePlatformMutation } from './api'

const accessSchema = z.object({
  user_id: z.number().int().positive(),
  enabled: z.boolean(),
})
type AccessInput = z.infer<typeof accessSchema>

export function ReportAccess() {
  const { t } = useTranslation()
  const mutation = usePlatformMutation<AccessInput>('report-access')
  const form = useForm<AccessInput>({
    resolver: zodResolver(accessSchema),
    defaultValues: { enabled: false },
  })
  return (
    <form
      className='max-w-xl space-y-4 rounded-xl border p-5'
      onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
    >
      <h3 className='font-semibold'>{t('Partner report access')}</h3>
      <p className='text-muted-foreground text-sm'>
        {t(
          'Grant or revoke anonymous report access for an ordinary account. This never grants administrator privileges.'
        )}
      </p>
      <Label htmlFor='report-user'>{t('User ID')}</Label>
      <Input
        id='report-user'
        type='number'
        min={1}
        step={1}
        required
        {...form.register('user_id', { valueAsNumber: true })}
      />
      <div className='flex items-center gap-2'>
        <Checkbox
          id='report-enabled'
          checked={form.watch('enabled')}
          onCheckedChange={(value) => form.setValue('enabled', value === true)}
        />
        <Label htmlFor='report-enabled'>{t('Enable report access')}</Label>
      </div>
      {Object.keys(form.formState.errors).length > 0 && (
        <p role='alert'>{t('Please check the application fields.')}</p>
      )}
      {mutation.isSuccess && <p role='status'>{t('Report access updated')}</p>}
      {mutation.isError && (
        <p role='alert'>
          {t('Submission failed. Your input is preserved; please retry.')}
        </p>
      )}
      <Button type='submit' disabled={mutation.isPending}>
        {t('Save')}
      </Button>
    </form>
  )
}
