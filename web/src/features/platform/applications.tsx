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

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'

import { usePlatformMutation } from './api'
import {
  identitySchema,
  invoiceSchema,
  type IdentityInput,
  type InvoiceInput,
} from './schema'

export function IdentityApplication() {
  const { t } = useTranslation()
  const mutation = usePlatformMutation<IdentityInput>('identity')
  const form = useForm<IdentityInput>({
    resolver: zodResolver(identitySchema),
    defaultValues: {
      kind: 'student',
      organization: '',
      contact_email: '',
      evidence_reference: '',
      consent: false,
    },
  })
  return (
    <form
      className='space-y-4'
      onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
    >
      <h3 className='font-semibold'>{t('Apply for identity verification')}</h3>
      <p className='text-muted-foreground text-sm'>
        {t(
          'Submit a verification reference, not an identity document. Staff will verify it manually. Approval does not grant administrator access.'
        )}
      </p>
      <Label htmlFor='identity-kind'>{t('Identity type')}</Label>
      <NativeSelect id='identity-kind' {...form.register('kind')}>
        <NativeSelectOption value='student'>{t('Student')}</NativeSelectOption>
        <NativeSelectOption value='teacher'>{t('Teacher')}</NativeSelectOption>
        <NativeSelectOption value='enterprise'>
          {t('Enterprise')}
        </NativeSelectOption>
      </NativeSelect>
      <Label htmlFor='identity-org'>{t('Organization')}</Label>
      <Input
        id='identity-org'
        maxLength={200}
        required
        {...form.register('organization')}
      />
      <Label htmlFor='identity-email'>{t('Contact email')}</Label>
      <Input
        id='identity-email'
        type='email'
        maxLength={254}
        required
        {...form.register('contact_email')}
      />
      <Label htmlFor='identity-proof'>{t('Verification reference')}</Label>
      <Input
        id='identity-proof'
        maxLength={200}
        required
        {...form.register('evidence_reference')}
      />
      <div className='flex items-start gap-2'>
        <Checkbox
          id='identity-consent'
          checked={form.watch('consent')}
          onCheckedChange={(value) =>
            form.setValue('consent', value === true, { shouldValidate: true })
          }
        />
        <Label htmlFor='identity-consent'>
          {t(
            'I consent to using these details only to review my institutional eligibility.'
          )}
        </Label>
      </div>
      {Object.keys(form.formState.errors).length > 0 && (
        <p role='alert'>{t('Complete all fields and confirm consent.')}</p>
      )}
      {mutation.isSuccess && <p role='status'>{t('Application submitted')}</p>}
      {mutation.isError && (
        <p role='alert'>
          {t('Submission failed. Your input is preserved; please retry.')}
        </p>
      )}
      <Button type='submit' disabled={mutation.isPending}>
        {t('Submit application')}
      </Button>
    </form>
  )
}

export function InvoiceApplication() {
  const { t } = useTranslation()
  const mutation = usePlatformMutation<InvoiceInput>('invoices')
  const form = useForm<InvoiceInput>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: { title: '', tax_id: '', email: '' },
  })
  return (
    <form
      className='space-y-4'
      onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
    >
      <h3 className='font-semibold'>{t('Request an invoice')}</h3>
      <p className='text-muted-foreground text-sm'>
        {t(
          'Use the order ID from Wallet history. Only your completed payments are eligible. Finance confirms currency and tax treatment before issuing.'
        )}
      </p>
      <Label htmlFor='invoice-order'>{t('Top-up order ID')}</Label>
      <Input
        id='invoice-order'
        type='number'
        min={1}
        step={1}
        required
        {...form.register('top_up_id', { valueAsNumber: true })}
      />
      <Label htmlFor='invoice-title'>{t('Invoice title')}</Label>
      <Input
        id='invoice-title'
        maxLength={200}
        required
        {...form.register('title')}
      />
      <Label htmlFor='invoice-tax'>{t('Tax ID')}</Label>
      <Input
        id='invoice-tax'
        maxLength={40}
        required
        {...form.register('tax_id')}
      />
      <Label htmlFor='invoice-email'>{t('Invoice email')}</Label>
      <Input
        id='invoice-email'
        type='email'
        maxLength={254}
        required
        {...form.register('email')}
      />
      {Object.keys(form.formState.errors).length > 0 && (
        <p role='alert'>{t('Please check the application fields.')}</p>
      )}
      {mutation.isSuccess && <p role='status'>{t('Application submitted')}</p>}
      {mutation.isError && (
        <p role='alert'>
          {t('Submission failed. Your input is preserved; please retry.')}
        </p>
      )}
      <Button type='submit' disabled={mutation.isPending}>
        {t('Submit application')}
      </Button>
    </form>
  )
}
