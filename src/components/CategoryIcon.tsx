import {
  Columns3,
  Droplets,
  Factory,
  Hammer,
  Layers,
  Package,
  Paintbrush,
  Ruler,
  SprayCan,
  TreePine,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

/**
 * The icons a main category can wear, by the key stored in categories.icon.
 * One list, so the catalogue hub and the admin picker never disagree.
 */
export const CATEGORY_ICONS: { key: string; label: string; Icon: LucideIcon }[] = [
  { key: 'boards', label: 'לוחות', Icon: Layers },
  { key: 'wood', label: 'עץ', Icon: TreePine },
  { key: 'edge', label: 'קנטים', Icon: Ruler },
  { key: 'cladding', label: 'חיפויים', Icon: Columns3 },
  { key: 'glue', label: 'דבקים', Icon: Droplets },
  { key: 'hardware', label: 'פרזול', Icon: Wrench },
  { key: 'finish', label: 'גימור', Icon: Paintbrush },
  { key: 'tools', label: 'כלים', Icon: Hammer },
  { key: 'machines', label: 'מכונות', Icon: Factory },
  { key: 'care', label: 'תחזוקה', Icon: SprayCan },
  { key: 'other', label: 'אחר', Icon: Package },
]

export default function CategoryIcon({ icon, size = 22 }: { icon: string | null; size?: number }) {
  const Icon = CATEGORY_ICONS.find((item) => item.key === icon)?.Icon ?? Package
  return <Icon size={size} strokeWidth={1.8} />
}
