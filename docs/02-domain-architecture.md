# Domain Architecture

## Foundation
Identity, Person, Organization, Authorization, Audit, File, Configuration.

## Academic
Program, Curriculum, Subject, Batch/Angkatan, Class, Class Subject, Enrollment, Educator Assignment, Class Staff Assignment, Schedule.

## Learning
Meeting, Activity, Content, Progress, Assignment.

## Assessment & Exam
Assessment, Question Bank, Question Version, Exam Blueprint, Session, Participant, Attempt, Attempt Question, Attempt Answer, Grading.

## Education Process
Attendance, Final Grading, Graduation, Certificate.

## Horizontal
Notification, Reporting/Executive, File, Audit.

## Modeling rules
Portal != Role. Person != User Account. Enrollment preserves education history. Subject master is reusable; delivery occurs through Class Subject. Curriculum and exam questions are versioned. Business assignments (Gadik/Penguji/Pembimbing/Wali Kelas) are not replaced by a single user.role field.
