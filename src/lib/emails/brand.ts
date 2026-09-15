import 'server-only'

import { siteUrl } from '../email'

/**
 * The logo at the top of every email.
 *
 * A PNG, not SVG: Gmail and Outlook refuse SVG images. Width and height are set
 * in the tag so the layout does not jump while the image loads, and the alt text
 * carries the name for clients that block images until asked.
 */
export function emailLogo(): string {
  return `<img src="${siteUrl()}/brand/email-logo.png" width="220" height="56" alt="Nagarim · שוק הנגרים" style="display:block;margin:0 auto;border:0;outline:none;height:56px;width:220px">`
}
