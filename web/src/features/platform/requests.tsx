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
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { LoadingState } from '@/components/loading-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { toIntlLocale } from '@/i18n/languages'
import { formatNumber } from '@/lib/format'

import {
  usePlatformMutation,
  usePlatformQuery,
  type Identity,
  type Invoice,
  type Page,
} from './api'

const reviewSchema = z
  .object({
    status: z.string(),
    note: z.string().trim().min(1).max(500),
    invoice_number: z.string().trim().max(100),
  })
  .refine((data) => data.status !== 'issued' || data.invoice_number.length > 0)
type ReviewInput = z.infer<typeof reviewSchema>

function ReviewForm(props: {
  id: number
  revision: number
  resource: 'identities' | 'invoices'
}) {
  const { t } = useTranslation()
  const mutation = usePlatformMutation<ReviewInput & { revision: number }>(
    `admin/${props.resource}/${props.id}/review`
  )
  const successStatus = props.resource === 'identities' ? 'approved' : 'issued'
  const form = useForm<ReviewInput>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { status: 'rejected', note: '', invoice_number: '' },
  })
  const prefix = `${props.resource}-${props.id}`
  return (
    <form
      className='mt-4 grid gap-3 border-t pt-4'
      onSubmit={form.handleSubmit((data) =>
        mutation.mutate({ ...data, revision: props.revision })
      )}
    >
      <Label htmlFor={`${prefix}-status`}>{t('Review decision')}</Label>
      <NativeSelect id={`${prefix}-status`} {...form.register('status')}>
        <NativeSelectOption value='rejected'>
          {t('rejected')}
        </NativeSelectOption>
        <NativeSelectOption value={successStatus}>
          {t(successStatus)}
        </NativeSelectOption>
      </NativeSelect>
      {props.resource === 'invoices' && (
        <>
          <Label htmlFor={`${prefix}-number`}>{t('Invoice number')}</Label>
          <Input
            id={`${prefix}-number`}
            maxLength={100}
            {...form.register('invoice_number')}
          />
        </>
      )}
      <Label htmlFor={`${prefix}-note`}>{t('Review note')}</Label>
      <Input
        id={`${prefix}-note`}
        maxLength={500}
        required
        {...form.register('note')}
      />
      {Object.keys(form.formState.errors).length > 0 && (
        <p role='alert'>
          {t('Provide a review note and an invoice number when issuing.')}
        </p>
      )}
      {mutation.isError && (
        <p role='alert'>
          {t('Review failed. Refresh the list before retrying.')}
        </p>
      )}
      <Button type='submit' disabled={mutation.isPending}>
        {t('Save review')}
      </Button>
    </form>
  )
}

export function PlatformRequests(props: {
  admin?: boolean
  resource: 'identities' | 'invoices'
}) {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const [page, setPage] = useState(1)
  const query = usePlatformQuery<Page<Identity | Invoice>>(
    `${props.admin ? 'admin/' : ''}${props.resource}?page=${page}`
  )
  if (query.isPending) return <LoadingState />
  if (query.isError) return <ErrorState onRetry={() => void query.refetch()} />
  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <h3 className='font-semibold'>
          {props.resource === 'identities'
            ? t('Identity applications')
            : t('Invoice applications')}
        </h3>
        <Button variant='outline' onClick={() => void query.refetch()}>
          {t('Refresh')}
        </Button>
      </div>
      {query.data.items.length === 0 && (
        <EmptyState title={t('No applications yet')} />
      )}
      <div className='grid gap-4 lg:grid-cols-2'>
        {query.data.items.map((record) => (
          <article key={record.id} className='min-w-0 rounded-xl border p-4'>
            <div className='flex justify-between gap-3'>
              <h4 className='font-medium break-words'>
                {'organization' in record ? record.organization : record.title}
              </h4>
              <span className='bg-muted shrink-0 rounded-full px-2 py-1 text-xs'>
                {t(record.status)}
              </span>
            </div>
            {props.admin && (
              <p className='mt-2 text-sm'>
                {t('User ID')}: {record.user_id}
              </p>
            )}
            {'organization' in record ? (
              <dl className='mt-3 space-y-2 text-sm break-words'>
                <div>
                  <dt>{t('Identity type')}</dt>
                  <dd>{t(record.kind)}</dd>
                </div>
                <div>
                  <dt>{t('Contact email')}</dt>
                  <dd>{record.contact_email}</dd>
                </div>
                <div>
                  <dt>{t('Verification reference')}</dt>
                  <dd>{record.evidence_reference}</dd>
                </div>
              </dl>
            ) : (
              <dl className='mt-3 space-y-2 text-sm break-words'>
                <div>
                  <dt>{t('Top-up order ID')}</dt>
                  <dd>{record.top_up_id}</dd>
                </div>
                <div>
                  <dt>{t('Original order amount')}</dt>
                  <dd>
                    {formatNumber(record.money, locale)} ·{' '}
                    {record.payment_method}
                  </dd>
                </div>
                <div>
                  <dt>{t('Tax ID')}</dt>
                  <dd>{record.tax_id}</dd>
                </div>
                <div>
                  <dt>{t('Invoice email')}</dt>
                  <dd>{record.email}</dd>
                </div>
                {record.invoice_number && (
                  <div>
                    <dt>{t('Invoice number')}</dt>
                    <dd>{record.invoice_number}</dd>
                  </div>
                )}
              </dl>
            )}
            {record.review_note && (
              <p className='mt-3 text-sm break-words'>
                {t('Review note')}: {record.review_note}
              </p>
            )}
            {props.admin && record.status === 'pending' && (
              <ReviewForm
                key={record.revision}
                id={record.id}
                revision={record.revision}
                resource={props.resource}
              />
            )}
          </article>
        ))}
      </div>
      <div className='flex items-center gap-3'>
        <Button
          variant='outline'
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          {t('Previous')}
        </Button>
        <span>
          {t('Page')} {formatNumber(page, locale)}
        </span>
        <Button
          variant='outline'
          disabled={page * 20 >= query.data.total}
          onClick={() => setPage(page + 1)}
        >
          {t('Next')}
        </Button>
      </div>
    </div>
  )
}
