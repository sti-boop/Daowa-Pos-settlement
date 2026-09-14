import { redirect } from 'next/navigation';

/**
 * The accounting module now lives inside the single-app shell at `/` (one
 * shared left sidebar, no separate app). Redirect legacy deep links to home.
 */
export default function AccountingPage() {
  redirect('/');
}
