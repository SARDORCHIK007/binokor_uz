"use client";

import { MentorDiary, StudentDiary } from "@/components/cabinet/LessonDiary";

export function LessonDiary({ teaching }: { teaching: boolean }) {
  return teaching ? <MentorDiary /> : <StudentDiary />;
}
