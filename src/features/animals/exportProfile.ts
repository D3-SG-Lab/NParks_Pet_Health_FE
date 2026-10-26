import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { formatMicrochip } from '@/domain/describe';
import { theme } from '@/theme';
import { formatDateTime, isoToDdMmYyyy } from '@/utils/dates';

import type { AnimalProfile } from './animalsApi';

/** Escapes text for HTML so record content can never inject markup into the PDF. */
function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function profileHtml(profile: AnimalProfile, now: number = Date.now()): string {
  const { animal, summary, timeline, openCases } = profile;
  const e = escapeHtml;
  const statements = summary.statements
    .map((s) => `<li>${e(s.text)}${s.refs.map((r) => ` <sup>[${r}]</sup>`).join('')}</li>`)
    .join('');
  const sources = summary.sources.map((s, i) => `<li>[${i + 1}] ${e(s.label)}</li>`).join('');
  const rows = timeline
    .slice(0, 60)
    .map((t) => `<tr><td>${e(formatDateTime(t.at))}</td><td>${e(t.title)}</td><td>${e(t.text)}</td><td>${e(t.by)}</td></tr>`)
    .join('');
  const c = theme.colors;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:"IBM Plex Sans",-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${c.text};margin:32px;font-size:12px}
    h1{font-size:22px;margin:0 0 4px} h2{font-size:11px;margin:24px 0 8px;text-transform:uppercase;letter-spacing:.08em;color:${c.text2}}
    .muted{color:${c.text2}} table{width:100%;border-collapse:collapse} td{border-bottom:1px solid ${c.line};padding:6px 4px;vertical-align:top}
    .ai{background:${c.aiSoft};border:1px solid ${c.aiBorder};border-radius:${theme.radius.xl}px;padding:8px 16px}
  </style></head><body>
    <h1>${e(animal.name)}</h1>
    <div class="muted">${e(`${animal.kennel} · ${animal.species} · ${animal.sex} · ${formatMicrochip(animal.microchip)}`)}</div>
    <div class="muted">${e(`Stay ${isoToDdMmYyyy(animal.arrivalDate)} – ${animal.releaseDate ? isoToDdMmYyyy(animal.releaseDate) : 'not set'} · exported ${formatDateTime(now)}`)}</div>
    ${openCases.length ? `<h2>Open cases</h2><ul>${openCases.map((c) => `<li>${e(`${c.id} · ${c.finding}`)}</li>`).join('')}</ul>` : ''}
    <h2>AI 30-day summary</h2><div class="ai"><ul>${statements}</ul><ol style="list-style:none;padding:0" class="muted">${sources}</ol>
    <p class="muted">AI-generated from this animal's records.</p></div>
    <h2>Health record</h2><table>${rows}</table>
  </body></html>`;
}

/**
 * Export PDF (BE-024 is the server-side report later). Native: renders a PDF and opens the share sheet.
 * Web: opens the browser's print dialog, where "Save as PDF" is available.
 */
export async function exportProfilePdf(profile: AnimalProfile): Promise<'shared' | 'printed'> {
  const html = profileHtml(profile);
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return 'printed';
  }
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: `${profile.animal.name} health record` });
    return 'shared';
  }
  await Print.printAsync({ uri });
  return 'printed';
}