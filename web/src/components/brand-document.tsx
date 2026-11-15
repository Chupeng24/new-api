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
import { RichContent } from '@/components/rich-content'
import { useSystemConfig } from '@/hooks/use-system-config'

/** Repository Markdown is shared by the built-in about and help pages. */
export function BrandDocument(props: { content: string }) {
  const { systemName } = useSystemConfig()
  // A configured name is plain text, never Markdown or HTML supplied as content.
  const safeName = Array.from(
    systemName,
    (char) => `&#${char.codePointAt(0)};`
  ).join('')
  return (
    <div className='mx-auto max-w-4xl px-2 py-8 sm:px-4'>
      <RichContent
        mode='markdown'
        content={props.content.replaceAll('{{SYSTEM_NAME}}', safeName)}
        className='prose-neutral dark:prose-invert max-w-none'
      />
    </div>
  )
}
