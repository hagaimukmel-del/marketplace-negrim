import CarpenterNav from '@/components/CarpenterNav'

export default function CarpenterLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CarpenterNav />
      {/* Same max width as the nav. They were 7xl and 3xl, so the header and
          the content it sits above did not line up. */}
      <main className="w-full flex-1 px-4 py-5">
        <div className="mx-auto max-w-3xl">{children}</div>
      </main>
    </>
  )
}
