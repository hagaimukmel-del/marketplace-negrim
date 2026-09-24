'use client'

import { useState } from 'react'
import SearchInput from './search-input'
import SearchResults from './search-results'
import OrderConfirmation from './order-confirmation'

interface OrderSearchClientProps {
  carpenterId: string
}

export interface SearchResult {
  productId: string
  productName: string
  specs: Array<{ key: string; value: string; unit?: string | null }>
  sourceDocuments: string[]
  confidence: number
  offers?: Array<{
    supplierId: string
    supplierName: string
    priceExclVat: number
    stockQty: number
    minOrderQty: number
    leadTimeDays?: number | null
    isActive: boolean
  }>
}

export interface SelectedOffer {
  productId: string
  productName: string
  supplierId: string
  supplierName: string
  priceExclVat: number
  quantity: number
}

type PageState = 'search' | 'results' | 'confirmation'

export default function OrderSearchClient({ carpenterId }: OrderSearchClientProps) {
  const [pageState, setPageState] = useState<PageState>('search')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedOffer, setSelectedOffer] = useState<SelectedOffer | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setError('בואי תכתוב מה אתה צריך')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/carpenter/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query }),
      })

      if (!response.ok) {
        throw new Error('חיפוש נכשל')
      }

      const data = await response.json()

      if (!data.success) {
        setError(data.message || 'חיפוש לא הצליח')
        return
      }

      if (!data.matchedProducts || data.matchedProducts.length === 0) {
        setError('לא מצאנו מוצרים שמתאימים. נסה לחפש משהו אחר.')
        return
      }

      setResults(data.matchedProducts)
      setPageState('results')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בחיפוש')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectOffer = (offer: SelectedOffer) => {
    setSelectedOffer(offer)
    setPageState('confirmation')
  }

  const handleBackToResults = () => {
    setPageState('results')
    setSelectedOffer(null)
  }

  const handleBackToSearch = () => {
    setPageState('search')
    setResults([])
    setSelectedOffer(null)
    setError(null)
  }

  const handleOrderComplete = () => {
    setPageState('search')
    setResults([])
    setSelectedOffer(null)
    setError(null)
    alert('ההזמנה נוצרה בהצלחה!')
  }

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Search State */}
      {pageState === 'search' && (
        <SearchInput onSearch={handleSearch} loading={loading} />
      )}

      {/* Results State */}
      {pageState === 'results' && (
        <SearchResults
          results={results}
          onSelectOffer={handleSelectOffer}
          onBack={handleBackToSearch}
        />
      )}

      {/* Confirmation State */}
      {pageState === 'confirmation' && selectedOffer && (
        <OrderConfirmation
          carpenterId={carpenterId}
          offer={selectedOffer}
          onComplete={handleOrderComplete}
          onBack={handleBackToResults}
        />
      )}
    </div>
  )
}
