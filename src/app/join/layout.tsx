import AppFrame from '@/components/app/AppFrame'

export const dynamic = 'force-dynamic'

/** Registration sits in the app's own frame, so the first page a carpenter sees is the site they will use. */
export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return <AppFrame>{children}</AppFrame>
}
