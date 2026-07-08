"use client";

import type { TeacherClass } from "@/components/teacher/class-list";
import { ClassCalendar } from "@/components/teacher/class-calendar";
import { ClassList } from "@/components/teacher/class-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function TeacherSchedule({ classes }: { classes: TeacherClass[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">My Schedule</h1>
        <p className="text-sm text-muted-foreground">
          Upcoming classes assigned to you.
        </p>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="mt-4">
          <ClassList classes={classes} />
        </TabsContent>
        <TabsContent value="calendar" className="mt-4">
          <ClassCalendar classes={classes} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
