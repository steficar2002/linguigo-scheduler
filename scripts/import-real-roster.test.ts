import assert from "node:assert/strict";
import test from "node:test";
import { parseRosterRows } from "./import-real-roster";

test("parseRosterRows skips junk and maps spreadsheet records", () => {
  const rows = [
    [
      "Name",
      "Status",
      "Teacher",
      "Duration",
      "Price they pay",
      "Teacher's hourly",
      "Classes per week",
      "Agent's Commission",
      "Alert",
    ],
    [
      "Alice Example",
      "Student",
      "Jane Teacher",
      "40 min",
      "$25.50",
      "$20",
      "1.5",
      "4$ (May)",
      "2 classes left",
    ],
    ["Students"],
    ["Name", "Status"],
    ["", "Student"],
    ["Bob Former", "Ex Student", "Jane Teacher", "27 min", "", "/", "", "", ""],
  ];

  const { students, skippedRows } = parseRosterRows(rows);

  assert.equal(skippedRows, 3);
  assert.deepEqual(students, [
    {
      fullName: "Alice Example",
      status: "active",
      teacherName: "Jane Teacher",
      durationMinutes: 40,
      pricePaid: 25.5,
      teacherHourlyOverride: 20,
      classesPerWeek: 1.5,
      agentCommission: "4$ (May)",
      alert: "2 classes left",
    },
    {
      fullName: "Bob Former",
      status: "ex",
      teacherName: "Jane Teacher",
      durationMinutes: 27,
      pricePaid: null,
      teacherHourlyOverride: null,
      classesPerWeek: null,
      agentCommission: null,
      alert: null,
    },
  ]);
});

test("parseRosterRows reads Price they pay from real spreadsheet headers", () => {
  const rows = [
    [
      "Name",
      "Person",
      "Status",
      "Alert",
      "Teacher",
      "Duration",
      "Price they pay",
      "Teacher's hourly",
      "Classes per week",
      "Agent's Commission",
    ],
    ["Jenny", "", "On a pause", "", "Uros", "55 min", "25$", "15$", "2", "4$ (May)"],
  ];

  const { students } = parseRosterRows(rows);
  assert.equal(students[0]?.pricePaid, 25);
});
