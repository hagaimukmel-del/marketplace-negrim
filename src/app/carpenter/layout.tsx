import CarpenterNav from '@/components/CarpenterNav'

export default function CarpenterLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CarpenterNav />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {children}
      </main>
    </>
  )
}
