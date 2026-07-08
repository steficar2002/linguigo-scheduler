"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import type {
  ClassScheduleEventWithRelations,
  CourseType,
  Profile,
  RescheduleRequest,
  ScheduleClass,
  Student,
} from "@/lib/types/database";
import { classesForDay } from "@/lib/schedule";
import { Logo } from "@/components/brand/logo";
import { TwoWeekCalendar } from "@/components/schedule/two-week-calendar";
import { DayDetailDialog } from "@/components/schedule/day-detail-dialog";
import { ScheduleHistoryPanel } from "@/components/schedule/schedule-history-panel";
import {
  approveRescheduleRequest,
  createScheduledClass,
  deleteScheduledClass,
  denyRescheduleRequest,
  rescheduleClass,
} from "@/app/admin/teachers/[teacherId]/schedule/actions";

type TeacherScheduleEditorProps = {
  teacher: Profile;
  classes: ScheduleClass[];
  students: Student[];
  courseTypes: CourseType[];
  events: ClassScheduleEventWithRelations[];
  pendingRequests: RescheduleRequest[];
};

function CalendarSection({
  teacher,
  classes,
  students,
  courseTypes,
  pendingRequests,
}: Omit<TeacherScheduleEditorProps, "events">) {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const basePath = `/admin/teachers/${teacher.id}/schedule`;
  const dayClasses = selectedDay ? classesForDay(classes, selectedDay) : [];
  const pendingClassIds = pendingRequests.map((r) => r.class_id);

  return (
    <>
      <TwoWeekCalendar
        classes={classes}
        mode="edit"
        basePath={basePath}
        onDayClick={setSelectedDay}
        pendingClassIds={pendingClassIds}
      />
      <DayDetailDialog
        day={selectedDay}
        classes={dayClasses}
        allClasses={classes}
        students={students}
        courseTypes={courseTypes}
        teacherId={teacher.id}
        pendingRequests={pendingRequests}
        onClose={() => setSelectedDay(null)}
        onCreate={createScheduledClass}
        onDelete={deleteScheduledClass}
        onReschedule={rescheduleClass}
        onApproveRequest={approveRescheduleRequest}
        onDenyRequest={denyRescheduleRequest}
      />
    </>
  );
}

export function TeacherScheduleEditor({
  teacher,
  classes,
  students,
  courseTypes,
  events,
  pendingRequests,
}: TeacherScheduleEditorProps) {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Link
            href="/admin/teachers"
            className="text-sm text-primary hover:underline"
          >
            ← Back to teachers
          </Link>
          <div className="flex items-center gap-3">
            <Logo size="sm" showText={false} />
            <div>
              <h1 className="text-2xl font-semibold">
                {teacher.full_name || teacher.email}
              </h1>
              <p className="text-sm text-muted-foreground">Schedule editor</p>
            </div>
          </div>
        </div>
      </div>

      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" />}>
        <CalendarSection
          teacher={teacher}
          classes={classes}
          students={students}
          courseTypes={courseTypes}
          pendingRequests={pendingRequests}
        />
      </Suspense>

      <ScheduleHistoryPanel events={events} />
    </div>
  );
}
