export const TIMER_CADENCE_PREFIX = 'meta::timer_cadence::';
export const TIMER_DUE_PREFIX = 'meta::timer_due::';
export const TIMER_ONCE_META = 'meta::timer_once::true';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const formatTimerDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const parseDateOnly = (dateText) => {
  if (!dateText) return null;
  const [year, month, day] = dateText.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const getMonthDate = (year, monthIndex, requestedDay) => {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return new Date(year, monthIndex, Math.min(requestedDay, lastDay));
};

export const parseTimerMeta = (content) => {
  const lines = (content || '').split('\n').map(line => line.trim());
  const cadenceLine = lines.find(line => line.startsWith(TIMER_CADENCE_PREFIX));
  if (!cadenceLine) return null;

  const parts = cadenceLine.split('::');
  return {
    cadenceType: parts[2] || '',
    cadenceValue: parts[3] || '',
    dueDate: lines.find(line => line.startsWith(TIMER_DUE_PREFIX))?.replace(TIMER_DUE_PREFIX, '').trim() || '',
    once: lines.includes(TIMER_ONCE_META)
  };
};

export const getNextTimerDueDate = (cadenceType, cadenceValue, fromDate = new Date()) => {
  const today = startOfDay(fromDate);

  if (cadenceType === 'monthly') {
    const day = parseInt(cadenceValue, 10);
    if (!Number.isFinite(day) || day < 1) return null;
    const thisMonth = getMonthDate(today.getFullYear(), today.getMonth(), day);
    return today <= thisMonth
      ? thisMonth
      : getMonthDate(today.getFullYear(), today.getMonth() + 1, day);
  }

  if (cadenceType === 'weekly') {
    const targetDow = parseInt(cadenceValue, 10);
    if (!Number.isFinite(targetDow) || targetDow < 1 || targetDow > 7) return null;
    const todayDow = today.getDay() || 7;
    let diff = targetDow - todayDow;
    if (diff < 0) diff += 7;
    const target = new Date(today);
    target.setDate(today.getDate() + diff);
    return target;
  }

  return null;
};

export const removeTimerMetaLines = (content) => (
  (content || '')
    .split('\n')
    .filter(line => {
      const trimmed = line.trim();
      return !trimmed.startsWith(TIMER_CADENCE_PREFIX) &&
        !trimmed.startsWith(TIMER_DUE_PREFIX) &&
        trimmed !== TIMER_ONCE_META;
    })
    .join('\n')
);

export const withTimerMeta = (content, cadenceType, cadenceValue, { once = false } = {}) => {
  const cleaned = removeTimerMetaLines(content).trim();
  const timerLines = [`${TIMER_CADENCE_PREFIX}${cadenceType}::${cadenceValue}`];

  if (once) {
    const dueDate = getNextTimerDueDate(cadenceType, cadenceValue);
    if (dueDate) timerLines.push(`${TIMER_DUE_PREFIX}${formatTimerDate(dueDate)}`);
    timerLines.push(TIMER_ONCE_META);
  }

  return cleaned
    ? `${cleaned}\n${timerLines.join('\n')}`
    : timerLines.join('\n');
};

export const withOneTimeTimerDueDate = (content, dueDate) => {
  const cleaned = removeTimerMetaLines(content).trim();
  const due = dueDate instanceof Date ? dueDate : parseDateOnly(dueDate);
  const timerLines = [
    `${TIMER_CADENCE_PREFIX}once::event`,
    due ? `${TIMER_DUE_PREFIX}${formatTimerDate(due)}` : '',
    TIMER_ONCE_META
  ].filter(Boolean);

  return cleaned
    ? `${cleaned}\n${timerLines.join('\n')}`
    : timerLines.join('\n');
};

export const getTimerStatus = (note, now = new Date()) => {
  const meta = parseTimerMeta(note?.content);
  if (!meta) return null;

  const dueDate = meta.once && meta.dueDate
    ? parseDateOnly(meta.dueDate)
    : getNextTimerDueDate(meta.cadenceType, meta.cadenceValue, now);

  if (!dueDate) return { ...meta, days: null, expired: false, shouldCleanup: false };

  const today = startOfDay(now);
  const due = startOfDay(dueDate);
  const days = Math.round((due - today) / MS_PER_DAY);

  if (!meta.once) {
    return { ...meta, dueDate: formatTimerDate(due), days, expired: false, shouldCleanup: false };
  }

  const daysExpired = Math.round((today - due) / MS_PER_DAY);
  return {
    ...meta,
    dueDate: formatTimerDate(due),
    days,
    daysExpired,
    expired: daysExpired >= 1,
    shouldCleanup: daysExpired >= 2
  };
};
