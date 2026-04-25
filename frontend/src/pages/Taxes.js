import React, { useState, useEffect, useRef } from 'react';
import { PlusIcon, TrashIcon, PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { loadAllNotes, createNote, updateNoteById } from '../utils/ApiUtils';

const TAXES_META = 'meta::taxes_data';

// Australian Resident Tax Rates (2024-25 & 2025-26)
const TAX_BRACKETS = [
  { min: 0,       max: 18200,    rate: 0,    label: '$0 – $18,200',          rateLabel: 'Nil' },
  { min: 18201,   max: 45000,    rate: 0.16, label: '$18,201 – $45,000',     rateLabel: '16%' },
  { min: 45001,   max: 135000,   rate: 0.30, label: '$45,001 – $135,000',    rateLabel: '30%' },
  { min: 135001,  max: 190000,   rate: 0.37, label: '$135,001 – $190,000',   rateLabel: '37%' },
  { min: 190001,  max: Infinity, rate: 0.45, label: '$190,001 and over',     rateLabel: '45%' },
];

function calcTaxOnIncome(income) {
  const inc = parseFloat(income) || 0;
  let tax = 0;
  if (inc <= 18200) return 0;
  if (inc <= 45000) return (inc - 18200) * 0.16;
  tax += (45000 - 18200) * 0.16;
  if (inc <= 135000) return tax + (inc - 45000) * 0.30;
  tax += (135000 - 45000) * 0.30;
  if (inc <= 190000) return tax + (inc - 135000) * 0.37;
  tax += (190000 - 135000) * 0.37;
  return tax + (inc - 190000) * 0.45;
}

function getBracketForIncome(income) {
  const inc = parseFloat(income) || 0;
  for (let i = TAX_BRACKETS.length - 1; i >= 0; i--) {
    if (inc >= TAX_BRACKETS[i].min) return TAX_BRACKETS[i];
  }
  return TAX_BRACKETS[0];
}

function fmt(n) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);
}

function toAmount(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value !== 'string') return 0;
  const normalized = value.replace(/[$,\s]/g, '');
  const amount = parseFloat(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

function entryValue(entry, keys) {
  for (const key of keys) {
    if (entry && entry[key] !== undefined && entry[key] !== null && entry[key] !== '') {
      return toAmount(entry[key]);
    }
  }
  return 0;
}

function getEntryBreakdown(entry) {
  const grossSalary = entryValue(entry, ['grossSalary', 'salary', 'baseSalary', 'wages']);
  const essIncome = entryValue(entry, ['essIncome', 'ess', 'rsuIncome', 'shareSchemeIncome']);
  const otherIncome = entryValue(entry, ['otherIncome', 'allowancesAndInterest']);
  const deductions = entryValue(entry, ['deductions', 'deduction', 'workDeductions']);
  const hasDetailedIncome = grossSalary !== 0 || essIncome !== 0 || otherIncome !== 0 || deductions !== 0;
  const taxableIncome = hasDetailedIncome
    ? grossSalary + essIncome + otherIncome - deductions
    : toAmount(entry?.income);

  return {
    grossSalary,
    essIncome,
    otherIncome,
    deductions,
    taxableIncome,
    hasDetailedIncome,
  };
}

// Generate a list of financial years from 2015-16 to current+1
function getFYOptions() {
  const now = new Date();
  const thisCalYear = now.getFullYear();
  const fyEnd = now.getMonth() >= 6 ? thisCalYear + 1 : thisCalYear;
  const options = [];
  for (let y = fyEnd + 1; y >= 2010; y--) {
    const short = String(y).slice(2);
    options.push(`${y - 1}-${short}`);
  }
  return options;
}

function parseNote(notes) {
  const note = notes.find(n =>
    typeof n.content === 'string' && n.content.split('\n').some(l => l.trim() === TAXES_META)
  );
  if (!note) return null;
  try {
    const lines = note.content.split('\n');
    const jsonLine = lines.find(l => l.startsWith('data::'));
    const entries = jsonLine ? JSON.parse(jsonLine.replace('data::', '')) : [];
    return { noteId: note.id, entries };
  } catch {
    return null;
  }
}

function buildContent(entries) {
  return [`Taxes data`, `data::${JSON.stringify(entries)}`, TAXES_META].join('\n');
}

const EMPTY_ENTRY = { fy: '', income: '', taxPaid: '' };

export default function Taxes() {
  const [entries, setEntries] = useState([]);
  const [noteId, setNoteId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_ENTRY);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_ENTRY);
  const saveTimer = useRef(null);
  const fyOptions = getFYOptions();

  useEffect(() => {
    loadAllNotes().then(notes => {
      const parsed = parseNote(notes);
      if (parsed) {
        setNoteId(parsed.noteId);
        setEntries(parsed.entries);
      }
    }).catch(() => {});
  }, []);

  const persist = (next, existingNoteId) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const content = buildContent(next);
      try {
        if (existingNoteId) {
          await updateNoteById(existingNoteId, content);
        } else {
          const created = await createNote(content);
          setNoteId(created.id);
        }
      } catch { /* silently fail */ }
    }, 400);
  };

  const applyEntries = (next) => {
    setEntries(next);
    persist(next, noteId);
  };

  const handleAdd = () => {
    if (!form.fy) return;
    const next = [
      ...entries,
      { id: Date.now(), fy: form.fy, income: form.income, taxPaid: form.taxPaid },
    ].sort((a, b) => b.fy.localeCompare(a.fy));
    applyEntries(next);
    setForm(EMPTY_ENTRY);
    setAdding(false);
  };

  const handleDelete = (id) => {
    applyEntries(entries.filter(e => e.id !== id));
  };

  const handleEditSave = (id) => {
    applyEntries(
      entries.map(e => e.id === id ? { ...e, ...editForm } : e)
        .sort((a, b) => b.fy.localeCompare(a.fy))
    );
    setEditingId(null);
  };

  const breakdowns = entries.map(getEntryBreakdown);
  const hasDetailedSummary = breakdowns.some(b => b.hasDetailedIncome);
  const totalGrossSalary = breakdowns.reduce((s, b) => s + b.grossSalary, 0);
  const totalEssIncome = breakdowns.reduce((s, b) => s + b.essIncome, 0);
  const totalOtherIncome = breakdowns.reduce((s, b) => s + b.otherIncome, 0);
  const totalDeductions = breakdowns.reduce((s, b) => s + b.deductions, 0);
  const totalIncome = breakdowns.reduce((s, b) => s + b.taxableIncome, 0);
  const totalTaxPaid = entries.reduce((s, e) => s + toAmount(e.taxPaid), 0);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Taxes</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track income and tax paid by financial year</p>
      </div>

      {/* Tax Bracket Reference */}
      <div className="mb-8 bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700">Australian Resident Tax Rates — 2024–25 &amp; 2025–26</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {TAX_BRACKETS.map((b, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3">
              <span className="text-sm text-gray-700">{b.label}</span>
              <span className={`text-sm font-semibold px-2.5 py-0.5 rounded-full ${
                b.rate === 0 ? 'bg-green-50 text-green-700' :
                b.rate <= 0.16 ? 'bg-blue-50 text-blue-700' :
                b.rate <= 0.30 ? 'bg-yellow-50 text-yellow-700' :
                b.rate <= 0.37 ? 'bg-orange-50 text-orange-700' :
                'bg-red-50 text-red-700'
              }`}>{b.rateLabel}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tax History Table */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden mb-4">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Tax History</h2>
          <button
            onClick={() => { setAdding(true); setForm(EMPTY_ENTRY); }}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            Add Year
          </button>
        </div>

        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">FY</th>
              <th className="px-5 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Income</th>
              <th className="px-5 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tax Paid</th>
              <th className="px-5 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Est. Tax</th>
              <th className="px-5 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Eff. Rate</th>
              <th className="px-5 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Bracket</th>
              <th className="px-5 py-2.5 w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {/* Add row */}
            {adding && (
              <tr className="bg-blue-50">
                <td className="px-5 py-3">
                  <select
                    value={form.fy}
                    onChange={e => setForm(f => ({ ...f, fy: e.target.value }))}
                    className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                    autoFocus
                  >
                    <option value="">Select FY…</option>
                    {fyOptions.map(fy => (
                      <option key={fy} value={fy}>{fy}</option>
                    ))}
                  </select>
                </td>
                <td className="px-5 py-3 text-right">
                  <input
                    type="number"
                    value={form.income}
                    onChange={e => setForm(f => ({ ...f, income: e.target.value }))}
                    placeholder="0"
                    className="w-28 border border-gray-200 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </td>
                <td className="px-5 py-3 text-right">
                  <input
                    type="number"
                    value={form.taxPaid}
                    onChange={e => setForm(f => ({ ...f, taxPaid: e.target.value }))}
                    placeholder="0"
                    onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false); }}
                    className="w-28 border border-gray-200 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </td>
                <td colSpan={3} />
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button onClick={handleAdd} className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors">
                      <CheckIcon className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setAdding(false)} className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
                      <XMarkIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {entries.length === 0 && !adding && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-400">
                  No entries yet. Click "Add Year" to get started.
                </td>
              </tr>
            )}

            {entries.map(e => {
              const income = getEntryBreakdown(e).taxableIncome;
              const taxPaid = toAmount(e.taxPaid);
              const estTax = calcTaxOnIncome(income);
              const effRate = income > 0 ? (taxPaid / income) * 100 : 0;
              const bracket = getBracketForIncome(income);
              const isEditing = editingId === e.id;

              if (isEditing) {
                return (
                  <tr key={e.id} className="bg-yellow-50">
                    <td className="px-5 py-2.5">
                      <select
                        value={editForm.fy}
                        onChange={ev => setEditForm(f => ({ ...f, fy: ev.target.value }))}
                        className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                      >
                        {fyOptions.map(fy => (
                          <option key={fy} value={fy}>{fy}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <input
                        type="number"
                        value={editForm.income}
                        onChange={ev => setEditForm(f => ({ ...f, income: ev.target.value }))}
                        className="w-28 border border-gray-200 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-300"
                      />
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <input
                        type="number"
                        value={editForm.taxPaid}
                        onChange={ev => setEditForm(f => ({ ...f, taxPaid: ev.target.value }))}
                        onKeyDown={ev => { if (ev.key === 'Enter') handleEditSave(e.id); if (ev.key === 'Escape') setEditingId(null); }}
                        className="w-28 border border-gray-200 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-300"
                      />
                    </td>
                    <td colSpan={3} />
                    <td className="px-5 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => handleEditSave(e.id)} className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors">
                          <CheckIcon className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
                          <XMarkIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={e.id} className="hover:bg-gray-50 group">
                  <td className="px-5 py-3 text-sm font-semibold text-gray-800">FY {e.fy}</td>
                  <td className="px-5 py-3 text-sm text-right text-gray-700">{income ? fmt(income) : '—'}</td>
                  <td className="px-5 py-3 text-sm text-right font-medium text-gray-900">{taxPaid ? fmt(taxPaid) : '—'}</td>
                  <td className="px-5 py-3 text-sm text-right text-gray-500">{income ? fmt(Math.round(estTax)) : '—'}</td>
                  <td className="px-5 py-3 text-sm text-right">
                    {income ? (
                      <span className={`font-semibold ${effRate > 30 ? 'text-red-600' : effRate > 20 ? 'text-orange-500' : 'text-green-600'}`}>
                        {effRate.toFixed(1)}%
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {income ? (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        bracket.rate === 0 ? 'bg-green-50 text-green-700' :
                        bracket.rate <= 0.16 ? 'bg-blue-50 text-blue-700' :
                        bracket.rate <= 0.30 ? 'bg-yellow-50 text-yellow-700' :
                        bracket.rate <= 0.37 ? 'bg-orange-50 text-orange-700' :
                        'bg-red-50 text-red-700'
                      }`}>{bracket.rateLabel}</span>
                    ) : '—'}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingId(e.id); setEditForm({ fy: e.fy, income: e.income, taxPaid: e.taxPaid }); }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <PencilIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(e.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Totals footer */}
          {entries.length > 0 && (
            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
              <tr>
                <td className="px-5 py-3 text-sm font-bold text-gray-800">
                  Total ({entries.length} yr{entries.length > 1 ? 's' : ''})
                </td>
                <td className="px-5 py-3 text-sm font-bold text-right text-gray-800">{fmt(totalIncome)}</td>
                <td className="px-5 py-3 text-sm font-bold text-right text-gray-800">{fmt(totalTaxPaid)}</td>
                <td className="px-5 py-3 text-sm text-right text-gray-500 font-medium">
                  {fmt(Math.round(calcTaxOnIncome(totalIncome / entries.length) * entries.length))}
                </td>
                <td className="px-5 py-3 text-sm font-bold text-right">
                  {totalIncome > 0 ? (
                    <span className={`${(totalTaxPaid / totalIncome * 100) > 30 ? 'text-red-600' : (totalTaxPaid / totalIncome * 100) > 20 ? 'text-orange-500' : 'text-green-600'}`}>
                      {(totalTaxPaid / totalIncome * 100).toFixed(1)}%
                    </span>
                  ) : '—'}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Summary Cards */}
      {entries.length > 0 && (
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${hasDetailedSummary ? 'xl:grid-cols-5' : 'xl:grid-cols-3'} gap-4`}>
          {hasDetailedSummary && (
            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
              <div className="text-xs text-gray-500 mb-1">1. Gross Salary</div>
              <div className="text-xl font-bold text-gray-900">{fmt(totalGrossSalary)}</div>
              <div className="text-xs text-gray-400 mt-0.5">base wages before tax</div>
            </div>
          )}
          {hasDetailedSummary && (
            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
              <div className="text-xs text-gray-500 mb-1">2. ESS Income</div>
              <div className="text-xl font-bold text-gray-900">{fmt(totalEssIncome)}</div>
              <div className="text-xs text-gray-400 mt-0.5">+ share schemes</div>
            </div>
          )}
          {hasDetailedSummary && (
            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
              <div className="text-xs text-gray-500 mb-1">3. Other Income</div>
              <div className="text-xl font-bold text-gray-900">{fmt(totalOtherIncome)}</div>
              <div className="text-xs text-gray-400 mt-0.5">+ allowances, interest, etc.</div>
            </div>
          )}
          {hasDetailedSummary && (
            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
              <div className="text-xs text-gray-500 mb-1">4. Deductions</div>
              <div className="text-xl font-bold text-gray-900">-{fmt(totalDeductions)}</div>
              <div className="text-xs text-gray-400 mt-0.5">subtract from taxable income</div>
            </div>
          )}
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div className="text-xs text-gray-500 mb-1">{hasDetailedSummary ? '5. Taxable Income' : 'Total Taxable Income'}</div>
            <div className="text-xl font-bold text-gray-900">{fmt(totalIncome)}</div>
            <div className="text-xs text-gray-400 mt-0.5">
              {hasDetailedSummary
                ? `${fmt(totalGrossSalary)} + ${fmt(totalEssIncome)} + ${fmt(totalOtherIncome)} - ${fmt(totalDeductions)} = ${fmt(totalIncome)}`
                : `across ${entries.length} year${entries.length > 1 ? 's' : ''}`}
            </div>
          </div>
          {!hasDetailedSummary && (
            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
              <div className="text-xs text-gray-500 mb-1">Total Tax Paid</div>
              <div className="text-xl font-bold text-gray-900">{fmt(totalTaxPaid)}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                avg {fmt(Math.round(totalTaxPaid / entries.length))} / yr
              </div>
            </div>
          )}
          {!hasDetailedSummary && (
            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
              <div className="text-xs text-gray-500 mb-1">Avg Effective Rate</div>
              <div className={`text-xl font-bold ${
                totalIncome > 0 && (totalTaxPaid / totalIncome * 100) > 30 ? 'text-red-600' :
                totalIncome > 0 && (totalTaxPaid / totalIncome * 100) > 20 ? 'text-orange-500' :
                'text-green-600'
              }`}>
                {totalIncome > 0 ? `${(totalTaxPaid / totalIncome * 100).toFixed(1)}%` : '—'}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">tax paid ÷ income</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
