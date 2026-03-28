## 1. Introduction

### 1.1 Purpose

This document provides a comprehensive technical and functional specification for **Swipe-Attend**, a modern web-based attendance management system. It serves as the definitive reference for development, testing, and future maintenance.

### 1.2 Scope

Swipe-Attend is a client-side application designed to transform traditional classroom attendance into a fast, gesture-driven experience. It eliminates the need for manual record-keeping by leveraging Excel imports and "Tinder-style" card interactions.

### 1.3 Intended Audience

- Teachers & Academic Administrators
- Frontend & Core Logic Developers
- UI/UX Designers
- Quality Assurance (QA) Teams

---

## 2. Overall Description

### 2.1 Product Perspective

Swipe-Attend is a **Standalone Progressive Web App (PWA)** architecture. It operates entirely on the client side, ensuring maximum privacy and zero server-side overhead.

### 2.2 Technical Stack

- **Core Framework:** React 19 (TypeScript)
- **Build Tool:** Vite
- **Styling Engine:** Tailwind CSS v4 (Glassmorphism)
- **Animation Layer:** Framer Motion (Gestures & Transitions)
- **Data Processing:** `xlsx` library (Excel parsing & generation)
- **Storage:** Browser `localStorage` (Persistent state)

### 2.3 User Classes and Characteristics

- **Primary User:** Professors/TAs who require high-speed interaction (single-handed operation) during active classroom environments.
- **Requirement:** Zero friction, rapid data entry, and immediate feedback.

---

## 3. System Features & Functional Requirements

### 3.1 Batch (Class) Management

- **FR-1:** The system shall allow users to create "Batches" with custom nomenclature (e.g., "Advanced Algorithms - Sec A").
- **FR-2:** Each batch shall act as a container for unique student lists and cumulative records.
- **FR-3:** Users must be able to delete batches, which recursively clears all associated students and records.

### 3.2 Data Import Mechanism

- **FR-4:** The system shall parse `.xlsx` and `.xls` files to extract student metadata.
- **FR-5:** Mandatory extraction fields include `Roll No` and `Name`.
- **FR-6:** Optional field `Photo` (URL/Base64) can be imported; otherwise, the system must generate a dynamic initial-based avatar.

### 3.3 The "Swipe-Attend" Interface (Core Logic)

- **FR-7:** The system shall render students as a stack of high-fidelity cards.
- **FR-8:** **Right Swipe / Check Button:** Marks the current student as **Present**.
- **FR-9:** **Left Swipe / X Button:** Marks the current student as **Absent**.
- **FR-10:** **Undo Logic:** The system shall maintain a history stack to revert the last action, restoring the student to the card stack and adjusting their attendance counters.
- **FR-11:** **Session Tracking:** The interface must display the current session progress (e.g., "Student 15 of 60").

### 3.4 Dashboard & Analytics

- **FR-12:** The system shall calculate real-time attendance percentages using the formula: `(Present Count / Total Days) * 100`.
- **FR-13:** Visual health bars must indicate the "Attendance Vitality" of each student.

### 3.5 Export & Synchronization

- **FR-14:** The system shall synchronize all in-memory records into a downloadable Excel report.
- **FR-15:** Reports must include cumulative stats compatible with institutional grading systems.

---

## 4. Technical Architecture & Data Schema

### 4.1 Data Structures (TypeScript)

```typescript
export interface Student {
  id: string; // Internal UUID
  rollNo: string; // Academic Roll/Enrollment ID
  name: string; // Full Name
  photo?: string; // Optional URL/Base64
  presentCount: number; // Persistent tally
  totalDays: number; // Total sessions marked
}

export interface AttendanceRecord {
  date: string; // ISO Timestamp
  status: "present" | "absent";
  studentId: string;
}

export interface Batch {
  id: string;
  name: string;
  students: Student[];
  records: AttendanceRecord[];
}
```

### 4.2 Data Persistence Strategy

- **Mechanism:** `JSON.stringify` to `localStorage`.
- **Key:** `attendance_batches`.
- **Integrity:** State is synced via `useEffect` on every batch/record mutation to prevent loss on browser exit.

---

## 5. UI/UX Specifications

### 5.1 Design Language

- **Themes:** Modern Dark Mode with **Glassmorphism**.
- **Visual Tokens:**
  - Mesh Gradients: `radial-gradient` backgrounds for atmospheric depth.
  - Backdrop Blur: `backdrop-blur-xl` for all panels and cards.
  - Border Accents: `border-white/10` for a sleek, premium feel.
- **Typography:**
  - **Outfit:** Geometric Sans for headings and display stats.
  - **Inter:** Highly legible Sans for body text and data tables.

### 5.2 Micro-Animations

- **Floating Shapes:** Abstract background shapes to add life to the interface.
- **Gesture Physics:** Drag-to-swipe with spring-based motion for a tactile feel.
- **State Transitions:** Fade and scale effects when switching between Dashboard, Batch, and Attendance views.

---

## 6. Non-Functional Requirements

### 6.1 Performance

- **Response Time:** UI interactions (swipes) must respond within 16ms (60fps).
- **Batch Processing:** A 60-student batch must be markable within 120 seconds.

### 6.2 Data Integrity

- **Persistence:** Every single swipe must trigger an immediate write to `localStorage`.
- **Compatibility:** Exported files must maintain 100% interoperability with Microsoft Excel and Google Sheets.

### 6.3 Security & Privacy

- **Privacy:** 100% local operation. No data leaves the professor's device.
- **Authentication:** (Future) Biometric/PIN lock for device local storage.

---

## 7. Error Handling & Edge Cases

- **Duplicate Imports:** The system appends new student lists to existing ones within a batch.
- **Empty Batches:** "Start Attendance" is disabled if a batch contains no students.
- **Completed Sessions:** The system displays a "Session Complete" state once all students in the current queue are marked.
