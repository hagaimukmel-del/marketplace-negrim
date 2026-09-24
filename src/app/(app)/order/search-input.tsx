'use client'

import { FormEvent, useState } from 'react'

interface SearchInputProps {
  onSearch: (query: string) => void
  loading?: boolean
}

export default function SearchInput({ onSearch, loading }: SearchInputProps) {
  const [query, setQuery] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSearch(query)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            מה אתה צריך?
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="דבק לבירץ, צבע לאלון, וכו..."
              className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 font-medium transition-colors"
            >
              {loading ? 'חופש...' : 'חפש'}
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          תן לי כמה פרטים: סוג מוצר, עץ, או יישום. אני אחפש בתיעוד הספקים.
        </p>
      </div>
    </form>
  )
}
