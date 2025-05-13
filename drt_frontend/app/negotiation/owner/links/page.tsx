// app/owner/links/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import fetchApi from '@/app/api/apiHelper';

type LinkEntry = {
  id: string
  name: string
  questionnaireId: string
  expiry: string
}

export default function OwnerLinks() {
  const params = useSearchParams()
  const email = params.get('email') || ''
  const router = useRouter()
  const [links, setLinks] = useState<LinkEntry[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!email) {
      router.replace('/negotiation/owner/email-entry')
      return
    }

    const loadLinks = async () => {
      try {
        
        
        // const loadRes = await fetchApi('/datastore/load-data/')
        // if (!loadRes.ok) {
        //   throw new Error('Failed to load data')
        // }
        
        
        const ownerRes = await fetchApi('/datastore/get_cached_data/owner_table')
        const ownerJson = await ownerRes.json()
        const ownerTable: Record<string, { owner_email: string }> =
          ownerJson.owner_table

        // find all owner_ids for this email
        const ownerIds = Object.entries(ownerTable)
          .filter(([, { owner_email }]) => owner_email === email)
          .map(([owner_id]) => owner_id)

        if (ownerIds.length === 0) {
          setLinks([])
          return
        }

        const linkRes = await fetchApi('/datastore/get_cached_data/link_table')
        const linkJson = await linkRes.json()
        const linkTable: Record<
          string,
          { questionnaire_id: string; owner_id: string; expiry: string; data_label: string }
        > = linkJson.link_table

        // filter only this owner’s rows
        const entries: LinkEntry[] = Object.entries(linkTable)
          .filter(([, data]) => ownerIds.includes(data.owner_id))
          .map(([linkId, data]) => ({
            id: linkId,
            name: data.data_label,
            questionnaireId: data.questionnaire_id,
            expiry: data.expiry,
          }))

        setLinks(entries)
      } catch (err) {
        console.error(err)
        setError('Failed to load links from cache')
      }
    }

    loadLinks()
  }, [email, router])

  if (error) {
    return (
      <main className="p-6 max-w-md mx-auto">
        <p className="text-red-500">{error}</p>
      </main>
    )
  }

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Your Link Library</h1>
      {links.length === 0 ? (
        <p>No links found for <strong>{email}</strong>.</p>
      ) : (
        <ul className="space-y-4">
          {links.map(({ id, name, questionnaireId, expiry }) => (
            <li key={id} className="border rounded p-4">
              <h2 className="font-semibold">{name}</h2>
              <p className="text-sm">
                Questionnaire: <code>{questionnaireId}</code><br/>
                Expires: <time>{expiry}</time>
              </p>
              <Link href={`/drt/generate_nlinks/${id}`}>
                <a className="text-blue-600 hover:underline">
                  Copy “Start Request” URL
                </a>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
