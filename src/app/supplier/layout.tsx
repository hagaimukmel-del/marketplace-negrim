import SupplierNav from '@/components/SupplierNav'

export const metadata = {
  title: 'Supplier Dashboard - Marketplace Negrim',
  description: 'Manage your products, orders, and sales'
}

export default function SupplierLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <SupplierNav />
      <main className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
