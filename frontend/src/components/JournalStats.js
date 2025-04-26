import React, { useMemo } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

const JournalStats = ({ journals }) => {
  const stats = useMemo(() => {
    const now = new Date();
    const startOfCurrentMonth = startOfMonth(now);
    const endOfCurrentMonth = endOfMonth(now);

    // Word count distribution over time
    const wordCountTrend = journals.reduce((acc, journal) => {
      const date = format(parseISO(journal.date), 'MMM d');
      const wordCount = journal.metadata?.wordCount || 0;
      acc[date] = (acc[date] || 0) + wordCount;
      return acc;
    }, {});

    // Writing time patterns (hour of day distribution)
    const hourDistribution = journals.reduce((acc, journal) => {
      if (journal.metadata?.lastModified) {
        const hour = format(parseISO(journal.metadata.lastModified), 'HH');
        acc[hour] = (acc[hour] || 0) + 1;
      }
      return acc;
    }, {});

    // Monthly writing streak calendar
    const daysInMonth = eachDayOfInterval({
      start: startOfCurrentMonth,
      end: endOfCurrentMonth
    });

    const streakData = daysInMonth.map(day => {
      const hasEntry = journals.some(journal => 
        isSameDay(parseISO(journal.date), day) && 
        (journal.preview?.trim() || journal.metadata?.wordCount > 0)
      );
      return {
        date: format(day, 'MMM d'),
        value: hasEntry ? 1 : 0
      };
    });

    // Average word count by day of week
    const wordsByDay = journals.reduce((acc, journal) => {
      const dayOfWeek = format(parseISO(journal.date), 'EEE');
      const wordCount = journal.metadata?.wordCount || 0;
      if (!acc[dayOfWeek]) {
        acc[dayOfWeek] = { total: 0, count: 0 };
      }
      acc[dayOfWeek].total += wordCount;
      acc[dayOfWeek].count++;
      return acc;
    }, {});

    // Format data for charts
    const wordCountData = Object.entries(wordCountTrend).map(([date, count]) => ({
      date,
      count
    }));

    const hourData = Array.from({ length: 24 }, (_, i) => {
      const hour = i.toString().padStart(2, '0');
      return {
        hour: `${hour}:00`,
        count: hourDistribution[hour] || 0
      };
    });

    const avgWordsByDay = Object.entries(wordsByDay).map(([day, data]) => ({
      day,
      average: Math.round(data.total / data.count)
    }));

    // Calculate total stats
    const totalEntries = journals.length;
    const totalWords = journals.reduce((sum, journal) => sum + (journal.metadata?.wordCount || 0), 0);
    const avgWordsPerEntry = Math.round(totalWords / totalEntries);
    const longestEntry = Math.max(...journals.map(j => j.metadata?.wordCount || 0));

    return {
      wordCountData,
      hourData,
      streakData,
      avgWordsByDay,
      totalEntries,
      totalWords,
      avgWordsPerEntry,
      longestEntry
    };
  }, [journals]);

  return (
    <div className="space-y-8 p-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Journal Analytics</h2>
        <div className="flex gap-6 text-sm">
          <div className="flex flex-col items-end">
            <span className="text-gray-500">Total Entries</span>
            <span className="text-xl font-bold text-gray-900">{stats.totalEntries}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-gray-500">Total Words</span>
            <span className="text-xl font-bold text-gray-900">{stats.totalWords}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-gray-500">Avg Words/Entry</span>
            <span className="text-xl font-bold text-gray-900">{stats.avgWordsPerEntry}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Word Count Trend */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Word Count Trend</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.wordCountData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Writing Time Patterns */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Writing Time Patterns</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.hourData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Writing Streak */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Monthly Writing Streak</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.streakData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 1]} ticks={[0, 1]} />
                <Tooltip />
                <Line type="stepAfter" dataKey="value" stroke="#10b981" dot={{ fill: '#10b981' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Average Words by Day */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Average Words by Day</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={stats.avgWordsByDay}>
                <PolarGrid />
                <PolarAngleAxis dataKey="day" />
                <PolarRadiusAxis />
                <Radar name="Words" dataKey="average" stroke="#6366f1" fill="#6366f1" fillOpacity={0.5} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JournalStats; 