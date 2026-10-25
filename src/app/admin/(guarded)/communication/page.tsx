import { loadCommunicationHealth } from '@/lib/communication-health'
import CommunicationAdmin from './CommunicationAdmin'

export const dynamic = 'force-dynamic'

export default async function CommunicationPage() {
  const health = await loadCommunicationHealth()
  return <CommunicationAdmin health={health} />
}
