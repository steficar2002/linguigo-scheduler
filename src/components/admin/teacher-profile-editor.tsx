"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type {
  ClassScheduleEventWithRelations,
  CourseType,
  Profile,
  RescheduleRequest,
  ScheduleClass,
  Student,
  TeacherStats,
} from "@/lib/types/database";
import { updateTeacherProfileAction } from "@/app/admin/teachers/actions";
import {
  approveRescheduleRequest,
  createScheduledClass,
  deleteScheduledClass,
  denyRescheduleRequest,
  rescheduleClass,
} from "@/app/admin/teachers/[teacherId]/schedule/actions";
import { classesForDay } from "@/lib/schedule";
import { TeacherProfileHeader } from "@/components/admin/teacher-profile-header";
import { TeacherStatsPanel } from "@/components/admin/teacher-stats-panel";
import { TwoWeekCalendar } from "@/components/schedule/two-week-calendar";
import { DayDetailDialog } from "@/components/schedule/day-detail-dialog";
import { ScheduleHistoryPanel } from "@/components/schedule/schedule-history-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type TeacherProfileEditorProps = {
  teacher: Profile;
  avatarUrl: string | null;
  stats: TeacherStats;
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
}: Omit<TeacherProfileEditorProps, "events" | "stats" | "avatarUrl">) {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const basePath = `/admin/teachers/${teacher.id}`;
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
        showTimezoneToggle
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

export function TeacherProfileEditor({
  teacher,
  avatarUrl,
  stats,
  classes,
  students,
  courseTypes,
  events,
  pendingRequests,
}: TeacherProfileEditorProps) {
  async function handleProfileUpdate(formData: FormData) {
    const result = await updateTeacherProfileAction(formData);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Teacher profile updated.");
  }

  return (
    <div className="space-y-8">
      <Link href="/admin/teachers" className="text-sm text-primary hover:underline">
        ← Back to teachers
      </Link>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <TeacherProfileHeader teacher={teacher} avatarUrl={avatarUrl} />
        <Card className="w-full max-w-md border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Edit profile</CardTitle>
            <CardDescription>Photo, name, and hourly pay rate.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={handleProfileUpdate}
              encType="multipart/form-data"
              className="space-y-4"
            >
              <input type="hidden" name="id" value={teacher.id} />
              <div className="space-y-2">
                <Label htmlFor="full_name">Full name</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  defaultValue={teacher.full_name}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salary_per_hour">Hourly rate ($)</Label>
                <Input
                  id="salary_per_hour"
                  name="salary_per_hour"
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={teacher.salary_per_hour}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="avatar">Profile photo</Label>
                <Input id="avatar" name="avatar" type="file" accept="image/*" />
              </div>
              <Button type="submit" className="w-full">
                Save profile
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <TeacherStatsPanel
        teacherId={teacher.id}
        salaryPerHour={Number(teacher.salary_per_hour)}
        stats={stats}
      />

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Schedule</h2>
        <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" />}>
          <CalendarSection
            teacher={teacher}
            classes={classes}
            students={students}
            courseTypes={courseTypes}
            pendingRequests={pendingRequests}
          />
        </Suspense>
      </div>

      <ScheduleHistoryPanel events={events} />
    </div>
  );
}
