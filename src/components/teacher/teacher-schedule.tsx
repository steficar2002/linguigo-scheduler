"use client";

import { Suspense, useState } from "react";
import type {
  ClassScheduleEventWithRelations,
  RescheduleRequest,
  ScheduleClass,
} from "@/lib/types/database";
import { classesForDay } from "@/lib/schedule";
import { PageHeader } from "@/components/admin/page-header";
import { ClassList } from "@/components/teacher/class-list";
import { TwoWeekCalendar } from "@/components/schedule/two-week-calendar";
import { TeacherDayDialog } from "@/components/schedule/teacher-day-dialog";
import { ScheduleHistoryPanel } from "@/components/schedule/schedule-history-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TeacherScheduleProps = {
  classes: ScheduleClass[];
  calendarClasses: ScheduleClass[];
  events: ClassScheduleEventWithRelations[];
  pendingRequests: RescheduleRequest[];
};

export function TeacherSchedule({
  classes,
  calendarClasses,
  events,
  pendingRequests,
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
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="calendar" className="mt-4 animate-fade-in">
          <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" />}>
            <TwoWeekCalendar
              classes={calendarClasses}
              mode="readonly"
              basePath="/teacher/schedule"
              onDayClick={setSelectedDay}
            />
          </Suspense>
          <TeacherDayDialog
            day={selectedDay}
            classes={dayClasses}
            pendingRequests={pendingRequests}
            onClose={() => setSelectedDay(null)}
          />
        </TabsContent>
        <TabsContent value="list" className="mt-4 animate-fade-in">
          <ClassList classes={classes} />
        </TabsContent>
        <TabsContent value="history" className="mt-4 animate-fade-in">
          <ScheduleHistoryPanel events={events} title="Reschedule history" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
