/**
 * Shown inside the app frame the moment a link is tapped. Every app page is
 * read fresh from the database, and without this the tap gave no sign at all,
 * so people tapped again (and again) thinking it hadn't registered.
 */
export default function AppLoading() {
  return (
    <div role="status" aria-label="טוען" className="grid grid-cols-[minmax(0,1fr)] gap-4 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-hair" />
      <div className="h-28 rounded-2xl bg-white" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="h-24 rounded-2xl bg-white" />
        <div className="h-24 rounded-2xl bg-white" />
        <div className="h-24 rounded-2xl bg-white" />
        <div className="h-24 rounded-2xl bg-white" />
      </div>
      <div className="h-40 rounded-2xl bg-white" />
    </div>
  )
}
