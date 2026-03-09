// ============================================================
// Storage Layer — File System Access API + localStorage fallback
// Data is saved as real .json files on your laptop hard disk.
// Falls back to localStorage in browsers that don't support it.
// ============================================================

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'faculty' | 'student' | 'volunteer';
  password: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  venue: string;
  budget: number;
  category: string;
  status: string;
  createdBy: string;
  createdAt: string;
}

export interface Task {
  id: string;
  eventId: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  assignedTo: string | null;
  progress: number;
}

export interface Registration {
  id: string;
  eventId: string;
  userId: string;
  registeredAt: string;
}

// ─── IndexedDB helpers to persist the directory handle ──────────────────────

const IDB_NAME = 'event_planner_db';
const IDB_STORE = 'fs_handles';
const HANDLE_KEY = 'data_directory';

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getSavedDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const get = tx.objectStore(IDB_STORE).get(HANDLE_KEY);
      get.onsuccess = () => resolve(get.result ?? null);
      get.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function persistDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    const db = await openIDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(handle, HANDLE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // ignore
  }
}

// ─── State ───────────────────────────────────────────────────────────────────

let directoryHandle: FileSystemDirectoryHandle | null = null;
let useLocalStorage = false; // fallback flag

export function isFileSystemAvailable(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

export function hasDirectoryHandle(): boolean {
  return directoryHandle !== null;
}

// ─── File read / write helpers ───────────────────────────────────────────────

async function readFile<T>(filename: string, defaultValue: T): Promise<T> {
  if (directoryHandle) {
    try {
      const fh = await directoryHandle.getFileHandle(filename);
      const file = await fh.getFile();
      const text = await file.text();
      return JSON.parse(text) as T;
    } catch {
      return defaultValue;
    }
  }
  // localStorage fallback
  try {
    const raw = localStorage.getItem(filename.replace('.json', ''));
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

async function writeFile<T>(filename: string, data: T): Promise<void> {
  if (directoryHandle) {
    try {
      const fh = await directoryHandle.getFileHandle(filename, { create: true });
      const writable = await fh.createWritable();
      await writable.write(JSON.stringify(data, null, 2));
      await writable.close();
      return;
    } catch {
      // fall through to localStorage
    }
  }
  // localStorage fallback
  try {
    localStorage.setItem(filename.replace('.json', ''), JSON.stringify(data));
  } catch {
    // in-memory: the in-memory objects are already updated by callers
  }
}

// ─── Select folder (called from UI button) ───────────────────────────────────

export async function selectStorageFolder(): Promise<boolean> {
  if (!isFileSystemAvailable()) {
    return false;
  }
  try {
    const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
    directoryHandle = handle;
    await persistDirectoryHandle(handle);
    // Write current data into the new folder
    await writeFile('users.json', await readLocalUsers());
    await writeFile('events.json', await readLocalEvents());
    await writeFile('tasks.json', await readLocalTasks());
    await writeFile('registrations.json', await readLocalRegistrations());
    await writeFile('session.json', await readLocalSession());
    return true;
  } catch {
    return false;
  }
}

// ─── Read from localStorage only (used during folder migration) ──────────────

async function readLocalUsers(): Promise<User[]> {
  try { return JSON.parse(localStorage.getItem('users') || '[]'); } catch { return []; }
}
async function readLocalEvents(): Promise<Event[]> {
  try { return JSON.parse(localStorage.getItem('events') || '[]'); } catch { return []; }
}
async function readLocalTasks(): Promise<Task[]> {
  try { return JSON.parse(localStorage.getItem('tasks') || '[]'); } catch { return []; }
}
async function readLocalRegistrations(): Promise<Registration[]> {
  try { return JSON.parse(localStorage.getItem('registrations') || '[]'); } catch { return []; }
}
async function readLocalSession(): Promise<string> {
  try { return localStorage.getItem('currentUser') || ''; } catch { return ''; }
}

// ─── Initialize ──────────────────────────────────────────────────────────────

export async function initializeStorage(): Promise<void> {
  // Try to restore saved directory handle
  if (isFileSystemAvailable()) {
    try {
      const saved = await getSavedDirectoryHandle();
      if (saved) {
        // Verify we still have permission
        const perm = await saved.queryPermission({ mode: 'readwrite' });
        if (perm === 'granted') {
          directoryHandle = saved;
        } else {
          const req = await saved.requestPermission({ mode: 'readwrite' });
          if (req === 'granted') directoryHandle = saved;
        }
      }
    } catch {
      directoryHandle = null;
    }
  }

  // Seed default users if none exist
  const users = await getUsers();
  if (users.length === 0) {
    const defaultUsers: User[] = [
      { id: '1', email: 'admin@college.edu', name: 'Admin User', role: 'admin', password: 'admin123' },
      { id: '2', email: 'faculty@college.edu', name: 'Faculty Member', role: 'faculty', password: 'faculty123' },
      { id: '3', email: 'student@college.edu', name: 'Student User', role: 'student', password: 'student123' },
    ];
    await writeFile('users.json', defaultUsers);
    // also seed localStorage so fallback has data
    try { localStorage.setItem('users', JSON.stringify(defaultUsers)); } catch {}
  }

  const events = await getEvents();
  if (!events) await writeFile('events.json', []);
  const tasks = await getTasks();
  if (!tasks) await writeFile('tasks.json', []);
  const regs = await getRegistrations();
  if (!regs) await writeFile('registrations.json', []);
}

// ─── User Management ─────────────────────────────────────────────────────────

export async function getUsers(): Promise<User[]> {
  return readFile<User[]>('users.json', []);
}

export async function signup(email: string, password: string, name: string, role: string): Promise<User> {
  const users = await getUsers();
  if (users.find(u => u.email === email)) throw new Error('User already exists');

  const newUser: User = {
    id: Date.now().toString(),
    email,
    name,
    role: role as User['role'],
    password,
  };

  users.push(newUser);
  await writeFile('users.json', users);
  return newUser;
}

export async function login(email: string, password: string): Promise<User> {
  const users = await getUsers();
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) throw new Error('Invalid email or password');

  await writeFile('session.json', user.id);
  try { localStorage.setItem('currentUser', user.id); } catch {}
  return user;
}

export async function logout(): Promise<void> {
  await writeFile('session.json', '');
  try { localStorage.setItem('currentUser', ''); } catch {}
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const userId = await readFile<string>('session.json', '');
    if (!userId) return null;
    const users = await getUsers();
    return users.find(u => u.id === userId) ?? null;
  } catch {
    return null;
  }
}

// ─── Event Management ────────────────────────────────────────────────────────

export async function getEvents(): Promise<Event[]> {
  return readFile<Event[]>('events.json', []);
}

export async function getEventById(id: string): Promise<Event | null> {
  const events = await getEvents();
  return events.find(e => e.id === id) ?? null;
}

export async function createEvent(event: Omit<Event, 'id' | 'createdAt'>): Promise<Event> {
  const events = await getEvents();
  const newEvent: Event = { ...event, id: Date.now().toString(), createdAt: new Date().toISOString() };
  events.push(newEvent);
  await writeFile('events.json', events);
  return newEvent;
}

export async function updateEvent(id: string, updates: Partial<Event>): Promise<Event> {
  const events = await getEvents();
  const index = events.findIndex(e => e.id === id);
  if (index === -1) throw new Error('Event not found');
  events[index] = { ...events[index], ...updates };
  await writeFile('events.json', events);
  return events[index];
}

export async function deleteEvent(id: string): Promise<void> {
  const events = await getEvents();
  await writeFile('events.json', events.filter(e => e.id !== id));
  const tasks = await getTasks();
  await writeFile('tasks.json', tasks.filter(t => t.eventId !== id));
  const regs = await getRegistrations();
  await writeFile('registrations.json', regs.filter(r => r.eventId !== id));
}

// ─── Task Management ─────────────────────────────────────────────────────────

export async function getTasks(): Promise<Task[]> {
  return readFile<Task[]>('tasks.json', []);
}

export async function getTasksByEventId(eventId: string): Promise<Task[]> {
  const tasks = await getTasks();
  return tasks.filter(t => t.eventId === eventId);
}

export async function createTask(task: Omit<Task, 'id'>): Promise<Task> {
  const tasks = await getTasks();
  const newTask: Task = { ...task, id: Date.now().toString() + Math.random().toString(36).substr(2, 9) };
  tasks.push(newTask);
  await writeFile('tasks.json', tasks);
  return newTask;
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task> {
  const tasks = await getTasks();
  const index = tasks.findIndex(t => t.id === id);
  if (index === -1) throw new Error('Task not found');
  tasks[index] = { ...tasks[index], ...updates };
  await writeFile('tasks.json', tasks);
  return tasks[index];
}

export async function deleteTask(id: string): Promise<void> {
  const tasks = await getTasks();
  await writeFile('tasks.json', tasks.filter(t => t.id !== id));
}

// ─── AI Plan Generation ──────────────────────────────────────────────────────

export async function generateAIPlan(eventId: string, eventDate: string, eventTitle: string): Promise<Task[]> {
  const eventDateTime = new Date(eventDate);
  const taskTemplates = [
    { weeks: 8, title: 'Initial Planning & Budget Approval', description: 'Define event objectives, create initial budget, and get stakeholder approval', priority: 'high' as const },
    { weeks: 7, title: 'Venue Booking & Setup Planning', description: 'Book venue, plan layout, and arrange necessary equipment', priority: 'high' as const },
    { weeks: 6, title: 'Marketing & Promotion Strategy', description: 'Create promotional materials, social media campaigns, and marketing timeline', priority: 'medium' as const },
    { weeks: 5, title: 'Speaker/Guest Coordination', description: 'Confirm speakers, guests, and special participants', priority: 'high' as const },
    { weeks: 4, title: 'Registration System Setup', description: 'Set up online registration, ticketing, and participant tracking', priority: 'medium' as const },
    { weeks: 3, title: 'Logistics & Catering Arrangement', description: 'Arrange catering, transportation, and accommodation if needed', priority: 'medium' as const },
    { weeks: 2, title: 'Volunteer Recruitment & Training', description: 'Recruit volunteers and conduct training sessions', priority: 'medium' as const },
    { weeks: 1, title: 'Final Preparations & Rehearsal', description: 'Conduct final checks, rehearsals, and confirm all arrangements', priority: 'high' as const },
    { weeks: 0, title: 'Event Day Execution', description: 'Execute event as planned and manage on-site activities', priority: 'high' as const },
    { weeks: -1, title: 'Post-Event Follow-up & Report', description: 'Send thank you messages, collect feedback, and prepare event report', priority: 'low' as const },
  ];

  const createdTasks: Task[] = [];
  for (const template of taskTemplates) {
    const dueDate = new Date(eventDateTime);
    dueDate.setDate(dueDate.getDate() - template.weeks * 7);
    const task = await createTask({
      eventId,
      title: template.title,
      description: template.description,
      dueDate: dueDate.toISOString(),
      status: 'pending',
      priority: template.priority,
      assignedTo: null,
      progress: 0,
    });
    createdTasks.push(task);
  }
  return createdTasks;
}

// ─── Registration Management ─────────────────────────────────────────────────

export async function getRegistrations(): Promise<Registration[]> {
  return readFile<Registration[]>('registrations.json', []);
}

export async function getRegistrationsByEventId(eventId: string): Promise<Registration[]> {
  const regs = await getRegistrations();
  return regs.filter(r => r.eventId === eventId);
}

export async function isUserRegistered(eventId: string, userId: string): Promise<boolean> {
  const regs = await getRegistrations();
  return regs.some(r => r.eventId === eventId && r.userId === userId);
}

export async function registerForEvent(eventId: string, userId: string): Promise<Registration> {
  const regs = await getRegistrations();
  if (regs.find(r => r.eventId === eventId && r.userId === userId)) {
    throw new Error('Already registered for this event');
  }
  const reg: Registration = { id: Date.now().toString(), eventId, userId, registeredAt: new Date().toISOString() };
  regs.push(reg);
  await writeFile('registrations.json', regs);
  return reg;
}

export async function unregisterFromEvent(eventId: string, userId: string): Promise<void> {
  const regs = await getRegistrations();
  await writeFile('registrations.json', regs.filter(r => !(r.eventId === eventId && r.userId === userId)));
}
