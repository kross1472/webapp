@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap');
@import "tailwindcss";

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-display: "Space Grotesk", "Inter", sans-serif;

  --color-brand-light: #1cbaa4;
  --color-brand-dark: #19666a;
}

body {
  @apply text-slate-800 bg-slate-50 antialiased h-full;
}

html {
  @apply h-full;
}

/* React Big Calendar Overrides */
.rbc-calendar {
  @apply font-sans;
}
.rbc-header {
  @apply py-3 font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-l-0 border-r-0 border-t-0 border-slate-200 bg-slate-50/50;
}
.rbc-month-view, .rbc-time-view, .rbc-agenda-view {
  @apply border-slate-200 rounded-xl overflow-hidden bg-white;
}
.rbc-day-bg + .rbc-day-bg {
  @apply border-l border-slate-100;
}
.rbc-month-row + .rbc-month-row {
  @apply border-t border-slate-100;
}
.rbc-month-row {
  @apply overflow-visible;
}
.rbc-today {
  @apply bg-brand-light/5;
}
.rbc-event {
  @apply rounded-md border-none transition-transform;
}
.rbc-event:hover {
  @apply scale-[1.02] shadow-sm z-10;
}
.rbc-time-content {
  @apply border-t border-slate-200;
}
.rbc-timeslot-group {
  @apply border-b border-slate-100 min-h-[40px];
}
.rbc-time-gutter .rbc-timeslot-group {
  @apply bg-slate-50/30 text-xs font-medium text-slate-400 border-r border-slate-200 justify-center pr-2;
}
.rbc-date-cell {
  @apply p-2 font-bold text-sm text-slate-600;
}
.rbc-off-range-bg {
  @apply bg-slate-50/50;
}
.rbc-off-range .rbc-date-cell {
  @apply text-slate-300;
}
.rbc-event-label {
  @apply hidden; /* Hide default time label inside event, we format title ourselves */
}
.rbc-current-time-indicator {
  @apply bg-brand-light;
}

@media print {
  body > :not(.fixed) {
    display: none !important;
  }
  .fixed {
    position: static !important;
  }
  button {
    display: none !important;
  }
}

