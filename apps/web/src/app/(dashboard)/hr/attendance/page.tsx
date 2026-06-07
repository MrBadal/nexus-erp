'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock, Users, Calendar, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAttendance } from '@/hooks/use-hr';

interface AttendanceRow {
  id: string;
  name: string;
  empId: string;
  checkIn: string;
  checkOut: string;
  status: string;
  hours: string;
}

const statusColors: Record<string, string> = {
  present: 'bg-emerald-100 text-emerald-700', absent: 'bg-red-100 text-red-700', late: 'bg-amber-100 text-amber-700',
  half_day: 'bg-blue-100 text-blue-700', on_leave: 'bg-purple-100 text-purple-700',
};

export default function AttendancePage() {
  const router = useRouter();
  const { data: apiAttendance, isLoading } = useAttendance();

  const todayAttendance: AttendanceRow[] = (apiAttendance ?? []).map((a) => ({
    id: a.id,
    name: a.employeeName || 'Employee',
    empId: a.empId || '',
    checkIn: a.checkIn || '-',
    checkOut: a.checkOut || '-',
    status: a.status,
    hours: a.workingHours || '\u2014',
  }));

  const present = todayAttendance.filter(a => a.status === 'present' || a.status === 'late').length;
  const absent = todayAttendance.filter(a => a.status === 'absent').length;
  const onLeave = todayAttendance.filter(a => a.status === 'on_leave').length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
            <Link href="/hr" className="hover:text-foreground">HR</Link><span>&rsaquo;</span><span>Attendance</span>
          </div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-sm text-muted-foreground">Track employee attendance and working hours</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Total Employees</div><div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-12" /> : todayAttendance.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" /> Present Today</div><div className="text-2xl font-bold text-emerald-600">{isLoading ? <Skeleton className="h-8 w-12" /> : present}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Absent</div><div className="text-2xl font-bold text-red-600">{isLoading ? <Skeleton className="h-8 w-12" /> : absent}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">On Leave</div><div className="text-2xl font-bold text-purple-600">{isLoading ? <Skeleton className="h-8 w-12" /> : onLeave}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Today&apos;s Attendance &mdash; {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Employee</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Check In</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Check Out</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Working Hours</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-4 py-3" colSpan={5}><Skeleton className="h-5 w-full" /></td>
                    </tr>
                  ))
                ) : todayAttendance.length === 0 ? (
                  <tr><td className="px-4 py-12 text-center text-sm text-muted-foreground" colSpan={5}>No attendance records for today.</td></tr>
                ) : (
                  todayAttendance.map((a) => (
                    <tr key={a.id} className="border-b hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => router.push(`/hr/attendance/${a.id}`)}>
                      <td className="px-4 py-3"><div className="font-medium">{a.name}</div><div className="text-xs text-muted-foreground">{a.empId}</div></td>
                      <td className="px-4 py-3 font-mono">{a.checkIn}</td>
                      <td className="px-4 py-3 font-mono">{a.checkOut}</td>
                      <td className="px-4 py-3 font-mono">{a.hours}</td>
                      <td className="px-4 py-3"><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[a.status] || ''}`}>{a.status.replace('_', ' ')}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
