// Static content for the design preview. No database or browser storage is used.
// TODO(data): Load projects, tasks, notes, and attachments when product logic is implemented.
export type DemoProject = {
  id: string;
  name: string;
  description: string;
  category: "travel" | "work" | "personal";
  completed: number;
  total: number;
  updated: string;
};

export type DemoAttachment = {
  id: string;
  name: string;
  size: string;
  kind: "image" | "file";
};

export type DemoTask = {
  id: string;
  title: string;
  description: string;
  projectId: string;
  completed: boolean;
  group: "overdue" | "today" | "upcoming" | "completed";
  dueLabel: string;
  dueDate: string;
  reminder: string;
  attachments: DemoAttachment[];
};

export type DemoNote = {
  id: string;
  title: string;
  excerpt: string;
  projectId: string;
  updated: string;
  paragraphs: string[];
  attachments: DemoAttachment[];
};

export const demoProjects: DemoProject[] = [
  {
    id: "barcelona-trip",
    name: "Barcelona trip",
    description: "A few days away. Places to explore, things to remember.",
    category: "travel",
    completed: 1,
    total: 4,
    updated: "Updated today",
  },
  {
    id: "work",
    name: "Work",
    description: "Keep the small details and the next steps together.",
    category: "work",
    completed: 0,
    total: 2,
    updated: "Updated yesterday",
  },
  {
    id: "personal",
    name: "Personal",
    description: "A little space for everyday plans and good ideas.",
    category: "personal",
    completed: 0,
    total: 0,
    updated: "Just created",
  },
];

export const demoTasks: DemoTask[] = [
  {
    id: "book-hotel",
    title: "Book a place to stay",
    description:
      "Find a small hotel near the Gothic Quarter. Look for a quiet room, easy check-in, and somewhere to get a good coffee nearby.",
    projectId: "barcelona-trip",
    completed: false,
    group: "overdue",
    dueLabel: "Yesterday",
    dueDate: "2026-10-01",
    reminder: "2026-10-01T09:00",
    attachments: [
      {
        id: "hotel-list",
        name: "hotel-shortlist.pdf",
        size: "124 KB",
        kind: "file",
      },
    ],
  },
  {
    id: "plan-first-day",
    title: "Plan the first day",
    description:
      "Leave the morning open for a walk. Pick one museum and a place for lunch, with enough time to get a little lost along the way.",
    projectId: "barcelona-trip",
    completed: false,
    group: "today",
    dueLabel: "Today",
    dueDate: "2026-10-02",
    reminder: "2026-10-02T10:00",
    attachments: [
      {
        id: "trip-map",
        name: "neighborhood-map.svg",
        size: "8 KB",
        kind: "image",
      },
    ],
  },
  {
    id: "review-proposal",
    title: "Review the project proposal",
    description:
      "Read through the scope, make a note of open questions, and prepare a short list of next steps for Monday.",
    projectId: "work",
    completed: false,
    group: "today",
    dueLabel: "Today",
    dueDate: "2026-10-02",
    reminder: "2026-10-02T14:00",
    attachments: [],
  },
  {
    id: "pack-bag",
    title: "Put together a packing list",
    description:
      "Comfortable shoes, a notebook, a charger, and a light jacket. Keep it simple and leave a little room in the bag.",
    projectId: "barcelona-trip",
    completed: false,
    group: "upcoming",
    dueLabel: "Mon, Oct 5",
    dueDate: "2026-10-05",
    reminder: "",
    attachments: [],
  },
  {
    id: "prepare-meeting",
    title: "Prepare Monday’s meeting notes",
    description:
      "Bring the questions from the proposal review and outline the first milestone.",
    projectId: "work",
    completed: false,
    group: "upcoming",
    dueLabel: "Mon, Oct 5",
    dueDate: "2026-10-05",
    reminder: "2026-10-05T08:30",
    attachments: [],
  },
  {
    id: "buy-tickets",
    title: "Buy train tickets",
    description:
      "Book the morning train and keep a copy of the booking reference with the trip notes.",
    projectId: "barcelona-trip",
    completed: true,
    group: "completed",
    dueLabel: "Completed",
    dueDate: "2026-09-30",
    reminder: "",
    attachments: [],
  },
];

export const demoNotes: DemoNote[] = [
  {
    id: "places-to-explore",
    title: "Places worth a little detour",
    excerpt:
      "Small streets, a bookshop, and a few places for a slow afternoon.",
    projectId: "barcelona-trip",
    updated: "Today, 9:15 AM",
    paragraphs: [
      "The best plan might be to leave a little room in the plan. Start in the Gothic Quarter and follow whatever looks interesting.",
      "A few places to remember:\n• The small bookshops around El Born\n• A morning walk through Parc de la Ciutadella\n• Coffee somewhere with a window seat\n• The beach, just before sunset",
      "One thing a day is enough. Everything else is a bonus.",
    ],
    attachments: [
      {
        id: "note-map",
        name: "neighborhood-map.svg",
        size: "8 KB",
        kind: "image",
      },
    ],
  },
  {
    id: "meeting-notes",
    title: "A few thoughts for Monday",
    excerpt: "Start small, agree on the scope, and make the next step clear.",
    projectId: "work",
    updated: "Yesterday, 4:30 PM",
    paragraphs: [
      "Before starting the next milestone, make sure we agree on what a useful first version looks like.",
      "Questions to bring:\n• What is the smallest useful outcome?\n• Which assumptions should we check first?\n• Who needs to be involved in the review?",
      "End the meeting with a short list of decisions and one clear next step.",
    ],
    attachments: [],
  },
];
