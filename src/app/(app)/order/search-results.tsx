'use client'

import { SearchResult, SelectedOffer } from './order-search-client'

interface SearchResultsProps {
  results: SearchResult[]
  onSelectOffer: (offer: SelectedOffer) => void
  onBack: () => void
}

export default function SearchResults({
  results,
  onSelectOffer,
  onBack,
}: SearchResultsProps) {
  return (
    <div className="space-y-4">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="text-blue-600 hover:text-blue-800 font-medium text-sm"
      >
        ← חזרה לחיפוש
      </button>

      {/* Results */}
      <div className="grid gap-4">
        {results.map((product, idx) => (
          <div
            key={product.productId}
            className="bg-white rounded-lg shadow p-6 space-y-4"
          >
            {/* Product Info */}
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {String.fromCharCode(65 + idx)}) {product.productName}
              </h2>

              {/* Specs */}
              {product.specs.length > 0 && (
                <div className="mt-3 space-y-1">
                  {product.specs.slice(0, 3).map((spec) => (
                    <p key={spec.key} className="text-sm text-slate-600">
                      • {spec.key}: {spec.value}
                      {spec.unit && ` ${spec.unit}`}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Offers */}
            {product.offers && product.offers.length > 0 ? (
              <div className="space-y-2 border-t pt-4">
                {product.offers.map((offer) => (
                  <div
                    key={offer.supplierId}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">
                        {offer.supplierName}
                      </p>
                      <p className="text-sm text-slate-600">
                        מחיר: ₪{offer.priceExclVat} • מלאי: {offer.stockQty} יחידות
                        {offer.leadTimeDays !== null &&
                          ` • הסעה: ${
                            offer.leadTimeDays === 0
                              ? 'היום'
                              : offer.leadTimeDays === 1
                                ? 'מחר'
                                : `${offer.leadTimeDays} ימים`
                          }`}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        onSelectOffer({
                          productId: product.productId,
                          productName: product.productName,
                          supplierId: offer.supplierId,
                          supplierName: offer.supplierName,
                          priceExclVat: offer.priceExclVat,
                          quantity: offer.minOrderQty,
                        })
                      }
                      className="ml-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium whitespace-nowrap transition-colors"
                    >
                      בחר
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-slate-600">
                לא מצאנו ספקים עם מלאי
              </div>
            )}

            {/* Source */}
            {product.sourceDocuments.length > 0 && (
              <p className="text-xs text-slate-500 border-t pt-3">
                מידע מתוך {product.sourceDocuments.length} מסמך/ים מאושר/ים
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
