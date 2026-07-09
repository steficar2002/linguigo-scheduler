"use client";

import { Suspense, useState } from "react";
import type {
  CourseType,
  Profile,
  RescheduleRequest,
  ScheduleClass,
  Student,
  TeacherWithPendingCount,
} from "@/lib/types/database";
import { TeachersPanel } from "@/components/admin/teachers-panel";
import { TwoWeekCalendar } from "@/components/schedule/two-week-calendar";
import { ClassDetailDialog } from "@/components/schedule/class-detail-dialog";
import { DayDetailDialog } from "@/components/schedule/day-detail-dialog";
import { classesForDay } from "@/lib/schedule";
import {
  approveRescheduleRequest,
  createScheduledClass,
  deleteScheduledClass,
  denyRescheduleRequest,
  rescheduleClass,
} from "@/app/admin/teachers/[teacherId]/schedule/actions";

type GlobalSchedulePanelProps = {
  teachers: TeacherWithPendingCount[];
  classes: ScheduleClass[];
  allClasses: ScheduleClass[];
  students: Student[];
  courseTypes: CourseType[];
  pendingRequests: RescheduleRequest[];
};

function GlobalCalendarSection({
  teachers,
  classes,
  allClasses,
  students,
  courseTypes,
  pendingRequests,
}: Omit<GlobalSchedulePanelProps, never>) {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedClass, setSelectedClass] = useState<ScheduleClass | null>(null);
  const dayClasses = selectedDay ? classesForDay(classes, selectedDay) : [];
  const pendingClassIds = pendingRequests.map((request) => request.class_id);
  const teacherOptions: Pick<Profile, "id" | "full_name">[] = teachers.map(
    (teacher) => ({
      id: teacher.id,
      full_name: teacher.full_name,
    })
  );

  return (
    <>
      <TwoWeekCalendar
        classes={classes}
        mode="edit"
        basePath="/admin/teachers"
        onDayClick={(day) => {
          setSelectedClass(null);
          setSelectedDay(day);
        }}
        onClassClick={(classItem) => {
          setSelectedDay(null);
          setSelectedClass(classItem);
        }}
        pendingClassIds={pendingClassIds}
        showTeacherName
        showTimezoneToggle
      />

      <ClassDetailDialog
        classItem={selectedClass}
        allClasses={allClasses}
        onClose={() => setSelectedClass(null)}
      />

      <DayDetailDialog
        day={selectedDay}
        classes={dayClasses}
        allClasses={allClasses}
        students={students}
        courseTypes={courseTypes}
        teacherId={dayClasses[0]?.teacher_id ?? teachers[0]?.id ?? ""}
        teachers={teacherOptions}
        showTeacherPicker
        pendingRequests={pendingRequests.filter((request) =>
          dayClasses.some((classItem) => classItem.id === request.class_id)
        )}
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

export function GlobalSchedulePanel({
  teachers,
  classes,
  allClasses,
  students,
  courseTypes,
  pendingRequests,
}: GlobalSchedulePanelProps) {
  return (
    <div className="space-y-8">
      <TeachersPanel teachers={teachers} />

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">All classes</h2>
          <p className="text-sm text-muted-foreground">
            Global calendar across all teachers. Click a class for details, or a
            day to add classes.
          </p>
        </div>
        <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" />}>
          <GlobalCalendarSection
            teachers={teachers}
            classes={classes}
            allClasses={allClasses}
            students={students}
            courseTypes={courseTypes}
            pendingRequests={pendingRequests}
          />
        </Suspense>
      </div>
    </div>
  );
}
