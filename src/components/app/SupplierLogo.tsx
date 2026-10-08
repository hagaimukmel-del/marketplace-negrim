/**
 * A supplier's uploaded logo, small, beside its name. Renders nothing when the
 * supplier has none, so callers keep their own fallback (an icon, or just the
 * name). The logo comes from the supplier's Business tab (suppliers.logo_url).
 */
export default function SupplierLogo({ url, size = 22 }: { url: string | null | undefined; size?: number }) {
  if (!url) return null
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className="shrink-0 rounded-[5px] border border-hair bg-white object-contain p-px"
    />
  )
}
