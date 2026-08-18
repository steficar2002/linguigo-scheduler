"use client";

import { Suspense, useState } from "react";
import { classesForDay } from "@/lib/schedule";
import { PageHeader } from "@/components/admin/page-header";
import { ClassList } from "@/components/teacher/class-list";
import { TwoWeekCalendar } from "@/components/schedule/two-week-calendar";
import { DayDetailDialog } from "@/components/schedule/day-detail-dialog";
import { ScheduleHistoryPanel } from "@/components/schedule/schedule-history-panel";
import {
  createScheduledClass,
  rescheduleClass,
  deleteScheduledClass,
  approveRescheduleRequest,
  denyRescheduleRequest,
} from "@/app/admin/teachers/[teacherId]/schedule/actions";
import { TeacherStatsPanel } from "@/components/admin/teacher-stats-panel";
import type {
  ClassScheduleEventWithRelations,
  CourseType,
  RescheduleRequest,
  ScheduleClass,
  Student,
  TeacherStats,
} from "@/lib/types/database";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TeacherScheduleProps = {
  classes: ScheduleClass[];
  calendarClasses: ScheduleClass[];
  events: ClassScheduleEventWithRelations[];
  pendingRequests: RescheduleRequest[];
  students: Student[];
  courseTypes: CourseType[];
  teacherId: string;
  stats: TeacherStats;
  salaryPerHour: number;
};

export function TeacherSchedule({
  classes,
  calendarClasses,
  events,
  pendingRequests,
  students,
  courseTypes,
  teacherId,
  stats,
  salaryPerHour,
}: TeacherScheduleProps) {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const dayClasses = selectedDay
    ? classesForDay(calendarClasses, selectedDay)
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Schedule"
        description="Upcoming classes assigned to you."
      />

      <Tabs defaultValue="calendar">
        <TabsList className="bg-white">
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="calendar" className="mt-4 animate-fade-in">
          <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" />}>
            <TwoWeekCalendar
              classes={calendarClasses}
              mode="edit"
              basePath="/teacher/schedule"
              onDayClick={setSelectedDay}
              showTimezoneToggle
            />
          </Suspense>
          <DayDetailDialog
            day={selectedDay}
            classes={dayClasses}
            allClasses={calendarClasses}
            students={students}
            courseTypes={courseTypes}
            teacherId={teacherId}
            pendingRequests={pendingRequests}
            canDelete={false}
            canReschedule={false}
            onClose={() => setSelectedDay(null)}
            onCreate={createScheduledClass}
            onDelete={deleteScheduledClass}
            onReschedule={rescheduleClass}
            onApproveRequest={approveRescheduleRequest}
            onDenyRequest={denyRescheduleRequest}
          />
        </TabsContent>
        <TabsContent value="list" className="mt-4 animate-fade-in">
          <ClassList classes={classes} />
        </TabsContent>
        <TabsContent value="analytics" className="mt-4 animate-fade-in">
          <TeacherStatsPanel
            teacherId={teacherId}
            salaryPerHour={salaryPerHour}
            stats={stats}
          />
        </TabsContent>
        <TabsContent value="history" className="mt-4 animate-fade-in">
          <ScheduleHistoryPanel events={events} title="Reschedule history" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
