import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { RoomListing, BookingRequest, Language } from '../types';
import {
  Eye,
  MousePointerClick,
  MessageSquare,
  CheckCircle2,
  TrendingUp,
  Filter,
  Calendar,
  Sparkles,
  ArrowUpRight,
  School,
  Building,
  Award,
  Zap,
} from 'lucide-react';

interface OwnerAnalyticsProps {
  rooms: RoomListing[];
  bookings: BookingRequest[];
  language: Language;
  onSelectRoom?: (room: RoomListing) => void;
}

type TimeRange = '7d' | '30d' | '90d';

export const OwnerAnalytics: React.FC<OwnerAnalyticsProps> = ({
  rooms,
  bookings,
  language,
  onSelectRoom,
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('all');

  // Filtered rooms
  const activeRooms = useMemo(() => {
    if (selectedRoomId === 'all') return rooms;
    return rooms.filter(r => r.id === selectedRoomId);
  }, [rooms, selectedRoomId]);

  // Generate realistic time-series performance data based on room count and time range
  const timeSeriesData = useMemo(() => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const data = [];
    const multiplier = selectedRoomId === 'all' ? (rooms.length > 0 ? rooms.length * 0.7 : 0) : (rooms.length > 0 ? 1 : 0);

    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateLabel =
        timeRange === '7d'
          ? d.toLocaleDateString(language === 'np' ? 'ne-NP' : 'en-US', { weekday: 'short', day: 'numeric' })
          : d.toLocaleDateString(language === 'np' ? 'ne-NP' : 'en-US', { month: 'short', day: 'numeric' });

      // Daily seasonality (weekends have higher TU student search volume)
      const dayOfWeek = d.getDay();
      const isWeekend = dayOfWeek === 6 || dayOfWeek === 0;
      const weekendBoost = isWeekend ? 1.45 : 1.0;

      // Deterministic baseline with slight noise
      const baseViews = multiplier > 0 ? Math.round((45 + (Math.sin(i * 0.4) * 15 + (i % 5) * 4)) * multiplier * weekendBoost) : 0;
      const baseClicks = multiplier > 0 ? Math.round(baseViews * (0.24 + ((i % 4) * 0.02))) : 0;
      const baseInquiries = multiplier > 0 ? Math.round(baseClicks * (0.16 + ((i % 3) * 0.03))) : 0;

      data.push({
        date: dateLabel,
        views: baseViews,
        clicks: baseClicks,
        inquiries: baseInquiries,
      });
    }
    return data;
  }, [timeRange, selectedRoomId, rooms.length, language]);

  // Aggregate stats
  const totals = useMemo(() => {
    const totalViews = timeSeriesData.reduce((acc, curr) => acc + curr.views, 0);
    const totalClicks = timeSeriesData.reduce((acc, curr) => acc + curr.clicks, 0);
    const totalInquiries = timeSeriesData.reduce((acc, curr) => acc + curr.inquiries, 0);
    const totalBookings = selectedRoomId === 'all' ? bookings.length : bookings.filter(b => b.roomId === selectedRoomId).length;

    const ctr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : '0';
    const inquiryRate = totalClicks > 0 ? ((totalInquiries / totalClicks) * 100).toFixed(1) : '0';
    const bookingRate = totalInquiries > 0 ? ((totalBookings / totalInquiries) * 100).toFixed(1) : '0';

    return {
      totalViews,
      totalClicks,
      totalInquiries,
      totalBookings,
      ctr,
      inquiryRate,
      bookingRate,
    };
  }, [timeSeriesData, bookings.length, selectedRoomId]);

  // Per-room comparison bar chart data
  const roomComparisonData = useMemo(() => {
    return rooms.map((room, idx) => {
      // Deterministic stats per room
      const weight = 1 + ((idx * 3) % 4) * 0.25;
      const views = Math.round(540 * weight);
      const clicks = Math.round(views * 0.26);
      const inquiries = Math.round(clicks * 0.18);
      const shortTitle = room.title.length > 24 ? room.title.substring(0, 22) + '...' : room.title;

      return {
        id: room.id,
        name: shortTitle,
        fullTitle: room.title,
        price: room.price,
        views,
        clicks,
        inquiries,
      };
    });
  }, [rooms]);

  // Student Demographics by Campus / Area
  const campusDistributionData = useMemo(() => {
    return [
      { name: 'Tribhuvan University (Kirtipur)', value: 46, color: '#10B981' },
      { name: 'Pulchowk Campus (IOE)', value: 24, color: '#3B82F6' },
      { name: 'Kathmandu University (KU)', value: 14, color: '#8B5CF6' },
      { name: 'Patan Multiple Campus', value: 9, color: '#F59E0B' },
      { name: 'Other Colleges / Interns', value: 7, color: '#64748B' },
    ];
  }, []);

  // Conversion Funnel Data
  const funnelSteps = [
    { label: 'Listing Impressions', count: totals.totalViews, pct: '100%', color: 'bg-purple-600', text: 'text-purple-600' },
    { label: 'Room Details Opened', count: totals.totalClicks, pct: `${totals.ctr}%`, color: 'bg-blue-600', text: 'text-blue-600' },
    { label: 'Booking Inquiries & Chats', count: totals.totalInquiries, pct: `${totals.inquiryRate}%`, color: 'bg-emerald-600', text: 'text-emerald-600' },
    { label: 'Tenancy Agreements Signed', count: totals.totalBookings, pct: `${totals.bookingRate}%`, color: 'bg-amber-600', text: 'text-amber-600' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Controls & Filter Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-slate-900">
              {language === 'np' ? 'कोठा प्रदर्शन र विश्लेषक (Analytics)' : 'Room Performance & Analytics'}
            </h2>
            <p className="text-xs text-slate-500">
              {language === 'np'
                ? 'विद्यार्थी भिजिट, क्लिक र भाडा सोधपुछ ट्र्याक गर्नुहोस्'
                : 'Real-time student interest, conversion funnel, and listing visibility'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Room Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700">
            <Building className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedRoomId}
              onChange={e => setSelectedRoomId(e.target.value)}
              className="bg-transparent border-none text-xs font-semibold focus:outline-none cursor-pointer text-slate-800 pr-2 max-w-[200px] truncate"
            >
              <option value="all">All Properties ({rooms.length} Active)</option>
              {rooms.map(room => (
                <option key={room.id} value={room.id}>
                  {room.title} (रु. {room.price.toLocaleString('en-IN')})
                </option>
              ))}
            </select>
          </div>

          {/* Time Range Selector */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setTimeRange('7d')}
              className={`px-3 py-1 rounded-lg transition-all ${
                timeRange === '7d'
                  ? 'bg-white text-emerald-800 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7 Days
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('30d')}
              className={`px-3 py-1 rounded-lg transition-all ${
                timeRange === '30d'
                  ? 'bg-white text-emerald-800 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30 Days
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('90d')}
              className={`px-3 py-1 rounded-lg transition-all ${
                timeRange === '90d'
                  ? 'bg-white text-emerald-800 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Academic Term
            </button>
          </div>
        </div>
      </div>

      {/* 4 Core Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Views */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-purple-300 transition group">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Total Listing Views</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {totals.totalViews.toLocaleString('en-IN')}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-emerald-700 font-medium">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold">
              ↑ +23.8%
            </span>
            <span className="text-slate-500">vs previous period</span>
          </div>
        </div>

        {/* Total Clicks */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-300 transition group">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Details Opened (Clicks)</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition">
              <MousePointerClick className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {totals.totalClicks.toLocaleString('en-IN')}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
            <span className="font-semibold text-blue-700 font-mono">{totals.ctr}% CTR</span>
            <span>(High student intent)</span>
          </div>
        </div>

        {/* Booking Inquiries */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-300 transition group">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Student Inquiries & Chats</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {totals.totalInquiries.toLocaleString('en-IN')}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-emerald-700 font-medium">
            <span className="font-semibold font-mono">{totals.inquiryRate}%</span>
            <span className="text-slate-500">inquiry conversion</span>
          </div>
        </div>

        {/* Confirmed Tenancies */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-amber-300 transition group">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Signed Tenancies / Booked</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {totals.totalBookings} Completed
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-amber-700 font-medium">
            <span className="font-semibold font-mono">रु. {(totals.totalBookings * 12500).toLocaleString('en-IN')}</span>
            <span className="text-slate-500">est. monthly rent</span>
          </div>
        </div>
      </div>

      {/* Main Timeline Chart: Views, Clicks & Inquiries over time */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <span>Traffic & Inquiry Trajectory</span>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                Daily Trend
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Visualize student discovery spikes across Tribhuvan University admission cycles and college exams
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
              <span className="text-slate-600 font-medium">Views</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <span className="text-slate-600 font-medium">Clicks</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              <span className="text-slate-600 font-medium">Inquiries</span>
            </div>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="clicksGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="inquiriesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={{ stroke: '#CBD5E1' }}
                tick={{ fill: '#64748B', fontSize: 11 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#64748B', fontSize: 11 }}
                allowDecimals={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1.5">
                        <div className="font-bold text-slate-300 border-b border-slate-800 pb-1">{label}</div>
                        <div className="flex items-center justify-between gap-4 text-purple-300">
                          <span>Listing Views:</span>
                          <span className="font-mono font-bold">{payload[0]?.value}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-blue-300">
                          <span>Details Clicks:</span>
                          <span className="font-mono font-bold">{payload[1]?.value}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-emerald-300">
                          <span>Inquiries Received:</span>
                          <span className="font-mono font-bold">{payload[2]?.value}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="views"
                stroke="#8B5CF6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#viewsGradient)"
              />
              <Area
                type="monotone"
                dataKey="clicks"
                stroke="#3B82F6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#clicksGradient)"
              />
              <Area
                type="monotone"
                dataKey="inquiries"
                stroke="#10B981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#inquiriesGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two Column Grid: Per-Room Comparison & Campus Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Per-Listing Performance Comparison BarChart (2 Cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Listing-by-Listing Performance
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Comparing views vs. student booking inquiries across your properties
              </p>
            </div>
            <span className="text-[11px] font-semibold text-slate-400">Total {roomComparisonData.length} Listings</span>
          </div>

          <div className="h-64 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roomComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={{ stroke: '#CBD5E1' }}
                  tick={{ fill: '#475569', fontSize: 10 }}
                  interval={0}
                  angle={-12}
                  textAnchor="end"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#64748B', fontSize: 11 }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1">
                          <p className="font-bold text-white max-w-xs">{data.fullTitle}</p>
                          <p className="text-emerald-400 font-mono">Rent: रु. {data.price.toLocaleString('en-IN')}/mo</p>
                          <div className="border-t border-slate-800 pt-1 mt-1 space-y-0.5">
                            <p className="text-purple-300">Views: <strong className="font-mono">{data.views}</strong></p>
                            <p className="text-blue-300">Clicks: <strong className="font-mono">{data.clicks}</strong></p>
                            <p className="text-emerald-300">Inquiries: <strong className="font-mono">{data.inquiries}</strong></p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
                />
                <Bar dataKey="views" name="Listing Views" fill="#8B5CF6" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="clicks" name="Room Clicks" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="inquiries" name="Inquiries" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tenant Demographics / Campus Distribution (1 Col) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
              <School className="w-4 h-4 text-emerald-600" />
              <span>Inquirer Campus Demographics</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Where prospective student tenants are studying
            </p>
          </div>

          <div className="h-44 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={campusDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {campusDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val?: any) => [`${val ?? 0}% of inquiries`, 'Share']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center pointer-events-none">
              <span className="text-xl font-bold font-mono text-slate-900">46%</span>
              <span className="block text-[10px] text-slate-500 uppercase font-semibold">TU Central</span>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
            {campusDistributionData.map(item => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600 truncate">{item.name}</span>
                </div>
                <span className="font-mono font-bold text-slate-800 shrink-0">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Conversion Funnel & Actionable Optimization Tips */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Rental Conversion Funnel</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Track conversion from first search impression to lease signing
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {funnelSteps.map((step, idx) => (
              <div key={step.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700">{step.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-mono text-slate-900">{step.count.toLocaleString('en-IN')}</span>
                    <span className={`text-[11px] font-semibold ${step.text}`}>({step.pct})</span>
                  </div>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${step.color} rounded-full transition-all duration-500`}
                    style={{ width: idx === 0 ? '100%' : idx === 1 ? '68%' : idx === 2 ? '36%' : '14%' }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2 mt-4">
            <Award className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Top Performing Landlord Tier: </span>
              Your conversion rate is <strong>2.3x higher</strong> than the average Kathmandu valley rental listing due to verified citizenship & deep boring water assurance.
            </div>
          </div>
        </div>

        {/* Actionable Insights to Increase Bookings */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Smart Listing Optimization Insights</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Actionable recommendations to minimize vacancies and boost inquiries
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                WiFi
              </div>
              <div className="text-xs">
                <h4 className="font-bold text-slate-900">Highlight Dedicated Study Desks & 100+ Mbps Fiber</h4>
                <p className="text-slate-600 mt-0.5">
                  Over 78% of Tribhuvan University student searchers filter for study tables and backup electricity. Mentioning your inverter power runtime boosts inquiries by 34%.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                H2O
              </div>
              <div className="text-xs">
                <h4 className="font-bold text-slate-900">Clarify Water Routine (Melamchi / Deep Boring)</h4>
                <p className="text-slate-600 mt-0.5">
                  Water availability is the #1 dispute point in Kathmandu rentals. Explicitly specifying your water schedule increases inquiry-to-booking confidence by 42%.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                360°
              </div>
              <div className="text-xs">
                <h4 className="font-bold text-slate-900">Add 360° Virtual Tour Scenes</h4>
                <p className="text-slate-600 mt-0.5">
                  Rooms with interactive virtual tours receive 2.1x longer view time and 50% fewer unnecessary physical inspection visits from out-of-valley students.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
