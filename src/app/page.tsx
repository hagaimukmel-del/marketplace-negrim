import { redirect } from 'next/navigation'

/**
 * The root used to read the signed-in role and route on it, but every
 * destination it named was wrong: `/carpenter` and `/admin/dashboard` do not
 * exist, and `/supplier` has been removed. Every role landed on a 404.
 *
 * There is no longer a role to branch on. A carpenter arrives through their own
 * offer link, the operator goes to /admin, and the catalogue is public — so the
 * root simply opens the catalogue.
 */
export default function Home() {
  redirect('/carpenter/catalog')
}
