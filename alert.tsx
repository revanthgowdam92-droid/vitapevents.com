import { useEffect, useState } from 'react';
import { LogOut, User, FolderOpen, HardDrive, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';

import {
  initializeStorage,
  getCurrentUser,
  logout,
  selectStorageFolder,
  hasDirectoryHandle,
  isFileSystemAvailable,
  User as UserType,
} from './lib/storage';

import { AuthForm } from './components/AuthForm';
import { EventList } from './components/EventList';
import { EventDetails } from './components/EventDetails';
import { CreateEventDialog } from './components/CreateEventDialog';

import { Button } from './components/ui/button';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';

type View = 'list' | 'details';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserType | null>(null);
  const [currentView, setCurrentView] = useState<View>('list');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [folderConnected, setFolderConnected] = useState(false);
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await initializeStorage();
        setFolderConnected(hasDirectoryHandle());
        const currentUser = await getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Error initializing app:', error);
      } finally {
        setStorageReady(true);
      }
    })();
  }, []);

  const handleSelectFolder = async () => {
    const success = await selectStorageFolder();
    if (success) {
      setFolderConnected(true);
      toast.success('Storage folder selected! All data will now save to your laptop hard disk.');
    } else {
      toast.error('Could not access folder. Your browser may not support this feature.');
    }
  };

  const handleAuthSuccess = (authUser: UserType) => {
    setUser(authUser);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    await logout();
    setIsAuthenticated(false);
    setUser(null);
    setCurrentView('list');
    setSelectedEventId(null);
  };

  const handleEventSelect = (eventId: string) => {
    setSelectedEventId(eventId);
    setCurrentView('details');
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedEventId(null);
  };

  const handleEventCreated = () => {
    setShowCreateDialog(false);
    setCurrentView('list');
  };

  if (!storageReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <motion.div
            className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <p className="mt-4 text-gray-600">Initializing storage...</p>
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <AuthForm onAuthSuccess={handleAuthSuccess} />
        <Toaster />
      </>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 relative overflow-x-hidden">
      {/* Animated Background */}
      <motion.div className="absolute inset-0 opacity-30 pointer-events-none" style={{ perspective: '1000px' }}>
        <motion.div
          className="absolute top-[10%] left-[5%] w-48 h-48 sm:w-72 sm:h-72 lg:w-96 lg:h-96 bg-indigo-400 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
          transition={{ duration: 20, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-[10%] right-[5%] w-40 h-40 sm:w-60 sm:h-60 lg:w-80 lg:h-80 bg-cyan-400 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], rotate: [360, 180, 0] }}
          transition={{ duration: 25, repeat: Infinity }}
        />
      </motion.div>

      {/* Header */}
      <header className="relative bg-white/80 backdrop-blur-xl shadow-xl border-b w-full">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent truncate">
              College Event Planner
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-0.5">AI-Powered Event Management</p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto flex-wrap">
            {/* Storage Status Button */}
            {isFileSystemAvailable() && (
              <motion.button
                onClick={handleSelectFolder}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm border transition-all ${
                  folderConnected
                    ? 'bg-green-50 border-green-300 text-green-700'
                    : 'bg-amber-50 border-amber-300 text-amber-700 animate-pulse'
                }`}
                title={folderConnected ? 'Data is saving to your laptop hard disk. Click to change folder.' : 'Click to save data to your laptop hard disk'}
              >
                {folderConnected ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="hidden sm:inline">Saved to Disk</span>
                    <span className="sm:hidden">Disk ✓</span>
                  </>
                ) : (
                  <>
                    <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="hidden sm:inline">Choose Storage Folder</span>
                    <span className="sm:hidden">Pick Folder</span>
                  </>
                )}
              </motion.button>
            )}

            {!isFileSystemAvailable() && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm bg-gray-100 border border-gray-200 text-gray-500">
                <HardDrive className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="hidden sm:inline">Browser Storage</span>
              </div>
            )}

            {/* User Info */}
            <div className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-indigo-50 rounded-xl flex-1 sm:flex-initial">
              <User className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 flex-shrink-0" />
              <div className="text-xs sm:text-sm min-w-0">
                <p className="font-medium truncate">{user?.name}</p>
                <p className="text-[10px] sm:text-xs text-gray-600 capitalize">{user?.role}</p>
              </div>
            </div>

            <Button
              variant="ghost"
              onClick={handleLogout}
              className="hover:bg-red-50 hover:text-red-600 px-2 sm:px-4 flex-shrink-0"
              size="sm"
            >
              <LogOut className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>

        {/* Storage folder prompt banner */}
        {isFileSystemAvailable() && !folderConnected && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border-t border-amber-200 px-4 py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2 text-amber-800 text-xs sm:text-sm">
              <HardDrive className="w-4 h-4 flex-shrink-0" />
              <span>
                <strong>Data is in browser memory.</strong> Click "Choose Storage Folder" to save data permanently to your laptop hard disk as JSON files.
              </span>
            </div>
            <Button size="sm" variant="outline" onClick={handleSelectFolder} className="border-amber-400 text-amber-700 hover:bg-amber-100 whitespace-nowrap text-xs">
              <FolderOpen className="w-3 h-3 mr-1" />
              Choose Folder Now
            </Button>
          </motion.div>
        )}

        {folderConnected && (
          <div className="bg-green-50 border-t border-green-200 px-4 py-1.5 flex items-center gap-2 text-green-700 text-xs">
            <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>All data is automatically saved as JSON files on your laptop hard disk. You can open these files in any text editor.</span>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        {currentView === 'list' && (
          <EventList
            onEventSelect={handleEventSelect}
            onCreateEvent={() => setShowCreateDialog(true)}
            userRole={user?.role ?? 'student'}
          />
        )}

        {currentView === 'details' && selectedEventId && user && (
          <EventDetails
            eventId={selectedEventId}
            userId={user.id}
            userRole={user.role}
            onBack={handleBackToList}
          />
        )}
      </main>

      <CreateEventDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onEventCreated={handleEventCreated}
      />

      <Toaster />
    </div>
  );
}
