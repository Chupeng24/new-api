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
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { ErrorState } from '@/components/error-state'
import { SectionPageLayout } from '@/components/layout'
import { LoadingState } from '@/components/loading-state'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toIntlLocale } from '@/i18n/languages'
import { formatNumber, formatQuota } from '@/lib/format'

import { usePlatformQuery, type Home, type Report } from './api'
import { IdentityApplication, InvoiceApplication } from './applications'
import { ReportAccess } from './report-access'
import { PlatformRequests } from './requests'

function PlatformReport() {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const query = usePlatformQuery<Report>('report')
  if (query.isPending) return <LoadingState />
  if (query.isError) return <ErrorState onRetry={() => void query.refetch()} />
  if (!query.data.enabled) {
    return (
      <p>
        {t(
          'Usage aggregation is disabled. Ask the operator to enable dashboard data collection.'
        )}
      </p>
    )
  }
  if (query.data.suppressed) {
    return (
      <p>
        {t(
          'Fewer than five active users: aggregate results are hidden to protect privacy.'
        )}
      </p>
    )
  }
  return (
    <div className='space-y-4'>
      <h3 className='font-semibold'>
        {t('Aggregate usage · previous calendar month')}
      </h3>
      <p className='text-sm'>
        {new Date(query.data.since * 1000).toISOString().slice(0, 10)}
        {' → '}
        {new Date(query.data.until * 1000).toISOString().slice(0, 10)}
        {' (UTC) · '}
        {t('End date excluded')}
      </p>
      <p className='text-muted-foreground text-sm'>
        {t(
          'This report is operational evidence, not a subsidy claim or tax invoice. No personal conversations or identity documents are included.'
        )}
      </p>
      <dl className='grid gap-4 sm:grid-cols-3'>
        <div className='rounded-xl border p-5'>
          <dt>{t('Active users')}</dt>
          <dd className='mt-2 text-2xl'>
            {formatNumber(query.data.usage?.active_users, locale)}
          </dd>
        </div>
        <div className='rounded-xl border p-5'>
          <dt>{t('Requests')}</dt>
          <dd className='mt-2 text-2xl'>
            {formatNumber(query.data.usage?.requests, locale)}
          </dd>
        </div>
        <div className='rounded-xl border p-5'>
          <dt>{t('Usage')}</dt>
          <dd className='mt-2 text-2xl'>
            {formatQuota(query.data.usage?.quota ?? 0)}
          </dd>
        </div>
      </dl>
    </div>
  )
}

function IndustryTemplates() {
  const { t } = useTranslation()
  const templates = [
    {
      title: t('Research assistant'),
      description: t(
        'Turn a research question into a reproducible reading plan.'
      ),
      prompt: t(
        'Help me develop a research plan. Ask about my discipline, question and available data first. Separate verified sources from hypotheses and never invent citations.'
      ),
    },
    {
      title: t('Coding partner'),
      description: t('Move from a reproducible problem to a tested change.'),
      prompt: t(
        'Help me solve a coding problem. First ask for the expected behavior, minimal reproduction and environment. Explain the root cause, propose a small change, and give verification steps.'
      ),
    },
    {
      title: t('Short drama studio'),
      description: t('Develop characters, scene beats and production prompts.'),
      prompt: t(
        'Help me write a short drama. Ask for the audience, episode duration, genre and budget. Produce a character sheet, story beats and a shot list. Flag copyright and likeness permissions needed.'
      ),
    },
    {
      title: t('Commerce workspace'),
      description: t('Create product copy grounded in actual product facts.'),
      prompt: t(
        'Help me create an ecommerce listing. Ask for verified product specifications, target market and platform. Provide a title, benefits and image brief without inventing certifications or performance claims.'
      ),
    },
  ]
  return (
    <div className='grid gap-4 md:grid-cols-2'>
      {templates.map((item) => (
        <article
          key={item.title}
          className='bg-card flex min-w-0 flex-col gap-3 rounded-2xl border p-5'
        >
          <h3 className='text-lg font-semibold'>{item.title}</h3>
          <p className='text-muted-foreground text-sm'>{item.description}</p>
          <p className='flex-1 text-sm leading-6'>{item.prompt}</p>
          <div className='flex flex-wrap gap-2'>
            <CopyButton value={item.prompt} variant='outline' size='sm'>
              {t('Copy task prompt')}
            </CopyButton>
            <Button
              render={<Link to='/playground' />}
              variant='secondary'
              size='sm'
            >
              {t('Open Playground')}
            </Button>
          </div>
        </article>
      ))}
    </div>
  )
}

export function PlatformWorkspace() {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const query = usePlatformQuery<Home>('home')
  if (query.isPending) return <LoadingState />
  if (query.isError) return <ErrorState onRetry={() => void query.refetch()} />
  const data = query.data
  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>
        {t('Industry workspace')}
      </SectionPageLayout.Title>
      <SectionPageLayout.Actions>
        <Button render={<Link to='/wallet' />}>{t('Top up')}</Button>
      </SectionPageLayout.Actions>
      <SectionPageLayout.Content>
        <div className='space-y-6 pb-8'>
          <section className='via-background relative overflow-hidden rounded-2xl border bg-gradient-to-br from-indigo-500/15 to-teal-500/10 p-6 sm:p-9'>
            <p className='text-sm font-medium tracking-wide'>
              {t('One account. A workspace for your next idea.')}
            </p>
            <h1 className='mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl'>
              {t('From a question to work you can use.')}
            </h1>
            <p className='text-muted-foreground mt-4 max-w-2xl leading-7'>
              {t(
                'Research, code, stories and commerce. Start with a guided task, choose an available model, and track every charge in one wallet.'
              )}
            </p>
            <div className='mt-5 flex flex-wrap gap-3'>
              <Button render={<Link to='/playground' />}>
                {t('Start creating')}
              </Button>
              <Button variant='outline' render={<Link to='/keys' />}>
                {t('API Keys')}
              </Button>
              <Button
                variant='outline'
                render={
                  <Link
                    to='/usage-logs/$section'
                    params={{ section: 'common' }}
                  />
                }
              >
                {t('Usage Logs')}
              </Button>
            </div>
          </section>
          <dl className='grid gap-4 sm:grid-cols-3'>
            <div className='rounded-xl border p-5'>
              <dt className='text-muted-foreground text-sm'>
                {t('Available balance')}
              </dt>
              <dd className='mt-2 text-2xl font-semibold'>
                {formatQuota(data.quota)}
              </dd>
            </div>
            <div className='rounded-xl border p-5'>
              <dt className='text-muted-foreground text-sm'>
                {t('Total usage')}
              </dt>
              <dd className='mt-2 text-2xl font-semibold'>
                {formatQuota(data.used_quota)}
              </dd>
            </div>
            <div className='rounded-xl border p-5'>
              <dt className='text-muted-foreground text-sm'>{t('Requests')}</dt>
              <dd className='mt-2 text-2xl font-semibold'>
                {formatNumber(data.request_count, locale)}
              </dd>
            </div>
          </dl>
          {data.campaign && (
            <aside className='rounded-xl border border-indigo-400/40 bg-indigo-500/5 p-5'>
              <h2 className='font-semibold'>{t('Community activities')}</h2>
              <p className='mt-2 break-words whitespace-pre-wrap'>
                {data.campaign}
              </p>
            </aside>
          )}
          <Tabs defaultValue='create'>
            <TabsList className='h-auto flex-wrap justify-start'>
              <TabsTrigger value='create'>{t('Create')}</TabsTrigger>
              <TabsTrigger value='identity'>
                {t('Identity verification')}
              </TabsTrigger>
              <TabsTrigger value='invoices'>{t('Invoices')}</TabsTrigger>
              {data.can_review && (
                <TabsTrigger value='operations'>
                  {t('Institutional reviews')}
                </TabsTrigger>
              )}
              {data.can_report && (
                <TabsTrigger value='report'>{t('Partner report')}</TabsTrigger>
              )}
            </TabsList>
            <TabsContent value='create' className='mt-5'>
              <IndustryTemplates />
            </TabsContent>
            <TabsContent value='identity' className='mt-5 space-y-5'>
              {data.identity && (
                <div className='rounded-xl border p-5'>
                  <h3 className='font-semibold'>
                    {data.identity.organization} · {t(data.identity.status)}
                  </h3>
                  <p className='mt-2 break-words'>
                    {data.identity.review_note}
                  </p>
                </div>
              )}
              {(!data.identity || data.identity.status === 'rejected') && (
                <div className='max-w-xl rounded-xl border p-5'>
                  <IdentityApplication />
                </div>
              )}
            </TabsContent>
            <TabsContent value='invoices' className='mt-5 space-y-6'>
              <div className='max-w-xl rounded-xl border p-5'>
                <InvoiceApplication />
              </div>
              <PlatformRequests resource='invoices' />
            </TabsContent>
            {data.can_review && (
              <TabsContent value='operations' className='mt-5 space-y-8'>
                <PlatformRequests admin resource='identities' />
                <PlatformRequests admin resource='invoices' />
                {data.can_manage_report && <ReportAccess />}
              </TabsContent>
            )}
            {data.can_report && (
              <TabsContent value='report' className='mt-5'>
                <PlatformReport />
              </TabsContent>
            )}
          </Tabs>
          {(data.support_wechat || data.support_whatsapp) && (
            <aside className='flex flex-wrap items-center gap-3 rounded-xl border p-4'>
              <span>{t('Contact support')}</span>
              {data.support_wechat && (
                <CopyButton
                  value={data.support_wechat}
                  variant='outline'
                  size='sm'
                >
                  WeChat: {data.support_wechat}
                </CopyButton>
              )}
              {data.support_whatsapp && (
                <CopyButton
                  value={data.support_whatsapp}
                  variant='outline'
                  size='sm'
                >
                  WhatsApp: {data.support_whatsapp}
                </CopyButton>
              )}
              <span className='text-muted-foreground text-xs'>
                {t(
                  'Contact is optional and does not authorize sharing your conversations.'
                )}
              </span>
            </aside>
          )}
        </div>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
