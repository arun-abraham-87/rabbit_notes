import React, { Fragment, useEffect, useState } from 'react';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/solid';
import moment from 'moment';
import { getAgeInStringFmt } from '../utils/DateUtils';
import { getTrackerOverdueThreshold, isCustomXDaysTrackerCadence } from '../utils/TrackerQuestionUtils';

const getAllowedWeekdayNumbers = (tracker) => {
    if (!Array.isArray(tracker.days) || tracker.days.length === 0) return [];

    const weekdayMap = {
        sun: 0,
        mon: 1,
        tue: 2,
        wed: 3,
        thu: 4,
        fri: 5,
        sat: 6
    };

    return tracker.days
        .map(day => {
            if (typeof day === 'number') return day;
            const normalized = String(day).trim().toLowerCase();
            if (/^\d+$/.test(normalized)) return parseInt(normalized, 10);
            return weekdayMap[normalized.slice(0, 3)];
        })
        .filter(day => Number.isInteger(day) && day >= 0 && day <= 6);
};

const getTableLogDate = (tracker, answers = []) => {
    const today = moment().startOf('day');
    const endDate = tracker.endDate && moment(tracker.endDate).isValid()
        ? moment.min(today, moment(tracker.endDate).startOf('day'))
        : today;
    const startDate = tracker.startDate && moment(tracker.startDate).isValid()
        ? moment(tracker.startDate).startOf('day')
        : null;
    const allowedWeekdays = getAllowedWeekdayNumbers(tracker);

    if (isCustomXDaysTrackerCadence(tracker.cadence)) {
        const latestAnswer = [...answers].sort((a, b) => moment(b.date).valueOf() - moment(a.date).valueOf())[0];
        if (!latestAnswer?.date) return endDate;
        const { days } = getTrackerOverdueThreshold(tracker);
        return moment.min(moment(latestAnswer.date).startOf('day').add(days, 'days'), endDate);
    }

    if (allowedWeekdays.length === 0) return endDate;

    const cursor = moment(endDate);
    for (let i = 0; i < 14; i++) {
        if ((!startDate || cursor.isSameOrAfter(startDate)) && allowedWeekdays.includes(cursor.day())) {
            return cursor;
        }
        cursor.subtract(1, 'day');
    }

    return endDate;
};

const getDateAgeLabel = (date) => {
    const days = moment().startOf('day').diff(moment(date).startOf('day'), 'days');
    if (days === 0) return 'today';
    if (days > 0) return `${days} day${days !== 1 ? 's' : ''} ago`;
    const daysAhead = Math.abs(days);
    return `in ${daysAhead} day${daysAhead !== 1 ? 's' : ''}`;
};

const formatDateWithWeekday = (date) => moment(date).format('YYYY-MM-DD (ddd)');

const formatShortDateWithWeekday = (date) => moment(date).format('MMM D, YYYY (ddd)');

const getAnswerDisplayValue = (answer) => {
    const value = answer?.value || answer?.answer || '';
    return value || 'Logged';
};

const isYesNoTrackerType = (type) => type === 'yes,no' || type === 'yesno' || type === 'yes/no';

const getOverdueProgress = (tracker, answers) => {
    const { days: validThreshold } = getTrackerOverdueThreshold(tracker);

    if (!answers.length) {
        return {
            label: `No entries yet`,
            detail: `${validThreshold} day threshold`,
            percent: 0,
            tone: 'empty'
        };
    }

    const lastAnswer = [...answers].sort((a, b) => moment(b.date).valueOf() - moment(a.date).valueOf())[0];
    const daysSince = moment().startOf('day').diff(moment(lastAnswer.date).startOf('day'), 'days');
    const daysRemaining = validThreshold - daysSince;
    const percent = Math.min(100, Math.max(0, (daysSince / validThreshold) * 100));

    if (daysRemaining <= 0) {
        const overdueDays = Math.abs(daysRemaining);
        return {
            label: overdueDays === 0 ? 'Overdue today' : `Overdue by ${overdueDays} day${overdueDays !== 1 ? 's' : ''}`,
            detail: `${daysSince}/${validThreshold} days`,
            percent: 100,
            tone: 'overdue'
        };
    }

    return {
        label: `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left`,
        detail: `${daysSince}/${validThreshold} days`,
        percent,
        tone: daysRemaining <= Math.ceil(validThreshold * 0.2) ? 'warning' : 'normal'
    };
};

const TrackerEntryControl = ({ tracker, answers, logDateStr, logDateAge, onToggleDay }) => {
    const type = tracker.type ? tracker.type.toLowerCase() : '';
    const isYesNoTracker = isYesNoTrackerType(type);
    const isValueTracker = type === 'value' || type === 'adhoc_value';
    const isDateTracker = type.includes('date');
    const logDateAnswer = answers.find(ans => ans.date === logDateStr);
    const latestAnswer = [...answers].sort((a, b) => moment(b.date).valueOf() - moment(a.date).valueOf())[0];
    const customXDaysIsDue = !isCustomXDaysTrackerCadence(tracker.cadence) || !latestAnswer?.date
        || moment().startOf('day').diff(moment(latestAnswer.date).startOf('day'), 'days') >= getTrackerOverdueThreshold(tracker).days;
    const [showOtherDay, setShowOtherDay] = useState(false);
    const [otherDate, setOtherDate] = useState(moment().format('YYYY-MM-DD'));
    const activeDateStr = showOtherDay ? otherDate : logDateStr;
    const activeDateAge = showOtherDay ? getDateAgeLabel(activeDateStr) : logDateAge;
    const activeDateAnswer = answers.find(ans => ans.date === activeDateStr);
    const activeDateValue = activeDateAnswer ? (activeDateAnswer.value || activeDateAnswer.answer || '') : '';
    const [entryValue, setEntryValue] = useState(activeDateValue || (isDateTracker ? activeDateStr : ''));

    useEffect(() => {
        setEntryValue(activeDateValue || (isDateTracker ? activeDateStr : ''));
    }, [activeDateStr, activeDateValue, isDateTracker]);

    const saveValue = () => {
        const nextValue = entryValue.trim();
        if (!nextValue) return;
        onToggleDay(tracker.id, activeDateStr, nextValue);
    };

    const clearValue = () => {
        onToggleDay(tracker.id, activeDateStr, null);
    };

    const moveOtherDate = (days) => {
        setOtherDate(currentDate => moment(currentDate).add(days, 'days').format('YYYY-MM-DD'));
    };

    const renderDateHeader = () => (
        <div className="flex flex-col gap-1">
            {showOtherDay && (
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => moveOtherDate(-1)}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50"
                        title="Previous day"
                    >
                        &lt;
                    </button>
                    <input
                        type="date"
                        value={otherDate}
                        onChange={event => setOtherDate(event.target.value)}
                        className="w-32 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                        type="button"
                        onClick={() => moveOtherDate(1)}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50"
                        title="Next day"
                    >
                        &gt;
                    </button>
                </div>
            )}
            <span className="text-xs font-medium text-gray-900">{formatDateWithWeekday(activeDateStr)}</span>
            <span className="text-xs text-gray-500">{activeDateAge}</span>
        </div>
    );

    if ((logDateAnswer || !customXDaysIsDue) && !showOtherDay) {
        return (
            <div className="flex flex-col items-start gap-2">
                <span className="rounded-md border border-green-500/40 bg-green-500/15 px-2.5 py-1 text-xs font-bold text-green-700">
                    Up to date
                </span>
                <button
                    type="button"
                    onClick={() => setShowOtherDay(true)}
                    className="px-2.5 py-1 rounded-md text-xs font-bold border border-blue-500 bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                >
                    Log another day
                </button>
            </div>
        );
    }

    if (isYesNoTracker) {
        const normalizedValue = activeDateValue.toLowerCase();
        const isYes = normalizedValue === 'yes';
        const isNo = normalizedValue === 'no';

        return (
            <div className="flex flex-col items-start gap-2">
                {renderDateHeader()}
                <div className="flex flex-wrap gap-1.5">
                    <button
                        type="button"
                        onClick={() => onToggleDay(tracker.id, activeDateStr, 'yes')}
                        className={`px-2.5 py-1 rounded-md text-xs font-bold border transition-colors ${isYes
                            ? 'bg-green-600 text-white border-green-500'
                            : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                            }`}
                    >
                        Yes
                    </button>
                    <button
                        type="button"
                        onClick={() => onToggleDay(tracker.id, activeDateStr, 'no')}
                        className={`px-2.5 py-1 rounded-md text-xs font-bold border transition-colors ${isNo
                            ? 'bg-red-600 text-white border-red-500'
                            : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                            }`}
                    >
                        No
                    </button>
                    <button
                        type="button"
                        onClick={clearValue}
                        className="px-2.5 py-1 rounded-md text-xs font-bold border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        Clear
                    </button>
                </div>
            </div>
        );
    }

    if (isValueTracker || isDateTracker) {
        return (
            <div className="flex flex-col items-start gap-2 min-w-[180px]">
                {renderDateHeader()}
                <div className="flex flex-wrap items-center gap-1.5">
                    <input
                        type={isDateTracker ? 'date' : 'text'}
                        value={entryValue}
                        onChange={event => setEntryValue(event.target.value)}
                        placeholder={isDateTracker ? 'Date' : 'Value'}
                        className="w-28 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                        type="button"
                        onClick={saveValue}
                        className="px-2.5 py-1 rounded-md text-xs font-bold border border-blue-500 bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                    >
                        Save
                    </button>
                    <button
                        type="button"
                        onClick={clearValue}
                        className="px-2.5 py-1 rounded-md text-xs font-bold border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        Clear
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-start gap-2">
            {renderDateHeader()}
            <div className="flex flex-wrap gap-1.5">
                <button
                    type="button"
                    onClick={() => onToggleDay(tracker.id, activeDateStr, 'yes')}
                    className="px-2.5 py-1 rounded-md text-xs font-bold border border-blue-500 bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                >
                    Done
                </button>
                <button
                    type="button"
                    onClick={clearValue}
                    className="px-2.5 py-1 rounded-md text-xs font-bold border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
                >
                    Clear
                </button>
            </div>
        </div>
    );
};

const TrackerTable = ({ trackers, trackerAnswers = {}, onEdit, onTrackerDeleted, onToggleDay, isFocusMode, groupBy = 'none', showPastSeven = true }) => {
    if (trackers.length === 0) return null;

    const showTags = groupBy !== 'tags';
    const showCadence = groupBy !== 'cadence';
    const showType = groupBy !== 'type';

    return (
        <div className="tracker-table w-full overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{showTags ? 'Title & Tags' : 'Title'}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overdue In</th>
                        {showCadence && (
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cadence</th>
                        )}
                        {showType && (
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        )}
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entry</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {trackers.map(tracker => {
                        const answers = trackerAnswers[String(tracker.id)] || [];
                        const trackerType = tracker.type ? tracker.type.toLowerCase() : '';
                        const isDateTracker = trackerType.includes('date');
                        const overdueProgress = getOverdueProgress(tracker, answers);
                        const recentAnswers = [...answers]
                            .sort((a, b) => moment(b.date).valueOf() - moment(a.date).valueOf())
                            .slice(0, 7)
                            .sort((a, b) => moment(a.date).valueOf() - moment(b.date).valueOf());
                        const logDate = getTableLogDate(tracker, answers);
                        const logDateStr = logDate.format('YYYY-MM-DD');
                        const logDateAge = getDateAgeLabel(logDate);
                        const historyColSpan = 4 + (showCadence ? 1 : 0) + (showType ? 1 : 0);
                        const handleEditRecordedValue = (answer) => {
                            const currentValue = getAnswerDisplayValue(answer);
                            let nextValue;

                            if (isYesNoTrackerType(trackerType)) {
                                nextValue = window.prompt('Edit answer (yes/no)', currentValue.toLowerCase());
                                if (nextValue === null) return;
                                nextValue = nextValue.trim().toLowerCase();
                                if (!['yes', 'no'].includes(nextValue)) {
                                    window.alert('Please enter yes or no');
                                    return;
                                }
                            } else if (trackerType.includes('date')) {
                                nextValue = window.prompt('Edit date value', currentValue);
                                if (nextValue === null || nextValue.trim() === '') return;
                                nextValue = nextValue.trim();
                            } else {
                                nextValue = window.prompt('Edit value', currentValue);
                                if (nextValue === null || nextValue.trim() === '') return;
                                nextValue = nextValue.trim();
                            }

                            onToggleDay(tracker.id, answer.date, nextValue);
                        };

                        const renderPastSevenRow = () => (
                            <tr className="tracker-past-row border-t-0 bg-gray-50/70">
                                <td colSpan={historyColSpan} className="px-6 py-2">
                                    <div className="flex items-center gap-3">
                                        <div className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                                            Past 7
                                        </div>
                                        {recentAnswers.length > 0 ? (
                                            <div className="flex min-w-0 flex-1 items-stretch gap-1.5 overflow-x-auto pb-1">
                                                {recentAnswers.map((answer, index) => {
                                                    const displayValue = getAnswerDisplayValue(answer);
                                                    const valueAge = isDateTracker && displayValue !== 'Logged' ? getAgeInStringFmt(displayValue) : '';
                                                    const recordedAge = getDateAgeLabel(answer.date);
                                                    const isLatestEntry = index === recentAnswers.length - 1;
                                                    const shortRecordedDate = moment(answer.date).format('MMM D');

                                                    return (
                                                        <button
                                                            key={answer.id || `${answer.date}-${index}`}
                                                            type="button"
                                                            onClick={() => handleEditRecordedValue(answer)}
                                                            className={`tracker-past-entry flex min-w-[92px] max-w-[110px] shrink-0 flex-col justify-between rounded-md border px-2 py-1 text-left focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-colors ${isLatestEntry
                                                                ? 'tracker-past-entry-latest border-green-500 bg-green-600/15 hover:bg-green-600/25 hover:border-green-400'
                                                                : 'border-gray-200 bg-white hover:bg-gray-100 hover:border-blue-300'
                                                                }`}
                                                            title="Edit recorded value"
                                                        >
                                                            <div className="truncate text-xs font-semibold text-gray-900" title={displayValue}>
                                                                {displayValue}
                                                            </div>
                                                            {valueAge && valueAge !== 'Invalid date' && (
                                                                <div className="truncate text-[10px] leading-tight text-gray-500">{valueAge}</div>
                                                            )}
                                                            <div className="truncate text-[10px] leading-tight text-gray-500">{recordedAge}</div>
                                                            <div className="truncate text-[10px] leading-tight text-gray-500" title={formatShortDateWithWeekday(answer.date)}>{shortRecordedDate}</div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <span className="text-xs italic text-gray-400">No entries yet</span>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );

                        return (
                            <Fragment key={tracker.id}>
                            <tr className={`${showPastSeven ? 'tracker-main-row-with-history' : ''} hover:bg-gray-50 transition-colors`}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-sm font-semibold text-gray-900">{tracker.title}</span>
                                        {showTags && tracker.tags && Array.isArray(tracker.tags) && tracker.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {tracker.tags.map((tag, idx) => (
                                                    <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 min-w-[180px]">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className={`text-xs font-semibold ${overdueProgress.tone === 'overdue'
                                                ? 'text-red-600'
                                                : overdueProgress.tone === 'warning'
                                                    ? 'text-yellow-700'
                                                    : 'text-gray-700'
                                                }`}>
                                                {overdueProgress.label}
                                            </span>
                                            {overdueProgress.tone !== 'overdue' && (
                                                <span className="text-[10px] text-gray-500 whitespace-nowrap">{overdueProgress.detail}</span>
                                            )}
                                        </div>
                                        <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${overdueProgress.tone === 'overdue'
                                                    ? 'bg-red-500'
                                                    : overdueProgress.tone === 'warning'
                                                        ? 'bg-yellow-500'
                                                        : overdueProgress.tone === 'empty'
                                                            ? 'bg-gray-400'
                                                            : 'bg-blue-500'
                                                    }`}
                                                style={{ width: `${overdueProgress.percent}%` }}
                                            />
                                        </div>
                                    </div>
                                </td>
                                {showCadence && (
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${tracker.cadence === 'Daily' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
                                            }`}>
                                            {tracker.cadence}
                                        </span>
                                    </td>
                                )}
                                {showType && (
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500">{tracker.type}</div>
                                    </td>
                                )}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <TrackerEntryControl
                                        tracker={tracker}
                                        answers={answers}
                                        logDateStr={logDateStr}
                                        logDateAge={logDateAge}
                                        onToggleDay={onToggleDay}
                                    />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex justify-end gap-3">
                                        <button
                                            onClick={() => onEdit(tracker)}
                                            className="text-blue-600 hover:text-blue-900 transition-colors"
                                            title="Edit Tracker"
                                        >
                                            <PencilIcon className="h-4 w-4" />
                                        </button>
                                        {!isFocusMode && (
                                            <button
                                                onClick={() => onTrackerDeleted(tracker.id)}
                                                className="text-red-600 hover:text-red-900 transition-colors"
                                                title="Delete Tracker"
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                            {showPastSeven && renderPastSevenRow()}
                            </Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default TrackerTable;
