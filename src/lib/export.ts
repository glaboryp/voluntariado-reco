import ExcelJS from 'exceljs';
import type { Activity } from './rules';
import type { SignupPerson } from './signups';

const MAX = 31;
const stamp = new Intl.DateTimeFormat('es-ES', {
  timeZone: 'Europe/Madrid', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

export function sheetNames(titles: string[]): string[] {
  const used = new Set<string>();
  return titles.map((title) => {
    // Excel also rejects names that start or end with an apostrophe, and the reserved name 'History'
    const trimQuotes = (s: string) => s.replace(/^'+|'+$/g, '').trim();
    let base = trimQuotes(trimQuotes(title.replace(/[[\]:*?/\\]/g, '').replace(/\s+/g, ' ')).slice(0, MAX)) || 'Voluntariado';
    if (base.toLowerCase() === 'history') base = 'History (voluntariado)';
    let name = base;
    // Excel compares sheet names case-insensitively
    for (let n = 2; used.has(name.toLowerCase()); n++) {
      const suffix = ` (${n})`;
      name = base.slice(0, MAX - suffix.length).trimEnd() + suffix;
    }
    used.add(name.toLowerCase());
    return name;
  });
}

export async function buildWorkbook(groups: { activity: Activity; people: SignupPerson[] }[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const names = sheetNames(groups.map((g) => g.activity.title));
  groups.forEach(({ people }, i) => {
    const ws = wb.addWorksheet(names[i]);
    ws.columns = [
      { header: 'Nombre y apellidos', key: 'name', width: 30 },
      { header: 'Teléfono', key: 'phone', width: 16 },
      { header: 'Email', key: 'email', width: 32 },
      { header: 'Mayor de edad', key: 'adult', width: 14 },
      { header: 'Quién la ha invitado', key: 'referredBy', width: 26 },
      { header: 'Fecha de inscripción', key: 'date', width: 20 },
    ];
    ws.getRow(1).font = { bold: true };
    for (const p of people) {
      ws.addRow({ name: p.fullName, phone: p.phone, email: p.email, adult: p.isAdult ? 'Sí' : 'No', referredBy: p.referredBy ?? '', date: stamp.format(p.createdAt) });
    }
  });
  return Buffer.from(await wb.xlsx.writeBuffer());
}
