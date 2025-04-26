import React, { useMemo } from 'react';
import { format, differenceInDays, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer
} from 'recharts';

const TodoStats = ({ todos }) => {
  // Calculate various statistics
  const stats = useMemo(() => {
    const now = new Date();
    
    // Priority distribution
    const priorityDistribution = todos.reduce((acc, todo) => {
      const tagMatch = todo.content.match(/meta::(high|medium|low)/i);
      const priority = tagMatch ? tagMatch[1].toLowerCase() : 'low';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {});

    // Age distribution (in days)
    const ageDistribution = todos.reduce((acc, todo) => {
      const todoDateMatch = todo.content.match(/meta::todo::([^\n]+)/);
      const createdDate = todoDateMatch ? todoDateMatch[1] : todo.created_datetime;
      const age = differenceInDays(now, parseISO(createdDate));
      const ageGroup = age <= 1 ? '1 day' : 
                      age <= 3 ? '2-3 days' :
                      age <= 7 ? '4-7 days' : '> 7 days';
      acc[ageGroup] = (acc[ageGroup] || 0) + 1;
      return acc;
    }, {});

    // Weekly creation trend
    const weeklyTrend = todos.reduce((acc, todo) => {
      const todoDateMatch = todo.content.match(/meta::todo::([^\n]+)/);
      const createdDate = parseISO(todoDateMatch ? todoDateMatch[1] : todo.created_datetime);
      const weekStart = format(startOfWeek(createdDate), 'yyyy-MM-dd');
      acc[weekStart] = (acc[weekStart] || 0) + 1;
      return acc;
    }, {});

    // Average completion time by priority
    const completionTimes = todos.reduce((acc, todo) => {
      const tagMatch = todo.content.match(/meta::(high|medium|low)/i);
      const priority = tagMatch ? tagMatch[1].toLowerCase() : 'low';
      const todoDateMatch = todo.content.match(/meta::todo::([^\n]+)/);
      const createdDate = parseISO(todoDateMatch ? todoDateMatch[1] : todo.created_datetime);
      const age = differenceInDays(now, createdDate);
      
      if (!acc[priority]) {
        acc[priority] = { total: 0, count: 0 };
      }
      acc[priority].total += age;
      acc[priority].count++;
      return acc;
    }, {});

    // Format data for charts
    const priorityData = Object.entries(priorityDistribution).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value
    }));

    const ageData = Object.entries(ageDistribution).map(([name, value]) => ({
      name,
      value
    }));

    const trendData = Object.entries(weeklyTrend)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, count]) => ({
        week: format(parseISO(week), 'MMM d'),
        count
      }));

    const avgCompletionData = Object.entries(completionTimes).map(([priority, data]) => ({
      name: priority.charAt(0).toUpperCase() + priority.slice(1),
      days: Math.round(data.total / data.count)
    }));

    return {
      priorityData,
      ageData,
      trendData,
      avgCompletionData,
      totalTodos: todos.length
    };
  }, [todos]);

  const COLORS = {
    high: '#f43f5e',    // Rose
    medium: '#f59e0b',  // Amber
    low: '#10b981',     // Emerald
    default: ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7']  // Blues and purples
  };

  return (
    <div className="space-y-8 p-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Todo Analytics</h2>
        <div className="text-sm text-gray-500">
          Total Todos: {stats.totalTodos}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Priority Distribution */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Priority Distribution</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.priorityData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {stats.priorityData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[entry.name.toLowerCase()] || COLORS.default[index % COLORS.default.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Age Distribution */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Age Distribution</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.ageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Creation Trend */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Weekly Creation Trend</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Average Completion Time by Priority */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Avg. Age by Priority (Days)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.avgCompletionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="days">
                  {stats.avgCompletionData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[entry.name.toLowerCase()] || COLORS.default[index % COLORS.default.length]} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TodoStats; 