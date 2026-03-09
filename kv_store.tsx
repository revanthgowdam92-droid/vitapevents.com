import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Calendar, MapPin, DollarSign, Users, ArrowLeft, Sparkles, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { 
  getEventById, 
  getTasksByEventId, 
  getRegistrationsByEventId, 
  isUserRegistered, 
  registerForEvent,
  generateAIPlan,
  updateTask,
  Task,
  Event
} from '../lib/storage';

interface EventDetailsProps {
  eventId: string;
  userId: string;
  userRole: string;
  onBack: () => void;
}

export function EventDetails({ eventId, userId, userRole, onBack }: EventDetailsProps) {
  const [event, setEvent] = useState<Event | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [registrations, setRegistrations] = useState(0);
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generatingPlan, setGeneratingPlan] = useState(false);

  useEffect(() => {
    fetchEventDetails();
  }, [eventId]);

  const fetchEventDetails = async () => {
    try {
      const eventData = await getEventById(eventId);
      if (!eventData) {
        throw new Error('Event not found');
      }

      setEvent(eventData);
      setTasks(await getTasksByEventId(eventId));
      setRegistrations((await getRegistrationsByEventId(eventId)).length);
      setIsRegistered(await isUserRegistered(eventId, userId));
    } catch (error: any) {
      console.error('Failed to fetch event details:', error);
      toast.error('Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    try {
      await registerForEvent(eventId, userId);
      toast.success('Successfully registered for event!');
      setIsRegistered(true);
      setRegistrations(prev => prev + 1);
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Failed to register');
    }
  };

  const handleGeneratePlan = async () => {
    setGeneratingPlan(true);
    try {
      if (!event) {
        throw new Error('Event not found');
      }

      const generatedTasks = await generateAIPlan(eventId, event.date, event.title);
      toast.success('AI event plan generated successfully!');
      setTasks(generatedTasks);
    } catch (error: any) {
      console.error('Plan generation error:', error);
      toast.error(error.message || 'Failed to generate plan');
    } finally {
      setGeneratingPlan(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: string, progress: number) => {
    try {
      await updateTask(taskId, { 
        status: status as any, 
        progress 
      });
      toast.success('Task updated successfully!');
      await fetchEventDetails();
    } catch (error: any) {
      console.error('Task update error:', error);
      toast.error(error.message || 'Failed to update task');
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-green-500',
      medium: 'bg-yellow-500',
      high: 'bg-red-500'
    };
    return colors[priority] || 'bg-gray-500';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'in-progress':
        return <Clock className="w-5 h-5 text-blue-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const totalTasks = tasks.length;
  const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">Event not found</p>
          <Button onClick={onBack} className="mt-4">Go Back</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div 
      className="space-y-4 sm:space-y-6 w-full"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        whileHover={{ x: -5 }}
        transition={{ duration: 0.2 }}
      >
        <Button variant="ghost" onClick={onBack} className="px-2 sm:px-4">
          <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
          <span className="text-sm sm:text-base">Back to Events</span>
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, rotateX: -10 }}
        animate={{ opacity: 1, scale: 1, rotateX: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        style={{ perspective: '1000px' }}
      >
        <Card className="overflow-hidden relative">
          {/* 3D Animated Background */}
          <motion.div
            className="absolute inset-0 opacity-5 pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 5, 0],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          <CardHeader style={{ transform: 'translateZ(20px)' }}>
            <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4">
              <motion.div 
                className="flex-1 w-full sm:w-auto"
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <CardTitle className="text-2xl sm:text-3xl bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  {event.title}
                </CardTitle>
                <CardDescription className="mt-2 text-sm sm:text-base">
                  {event.description || 'No description provided'}
                </CardDescription>
              </motion.div>
              <motion.div
                initial={{ x: 30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="w-full sm:w-auto"
              >
                {isRegistered ? (
                  <Badge className="bg-green-500 text-white px-3 sm:px-4 py-1.5 sm:py-2 w-full sm:w-auto justify-center">
                    <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span className="text-sm sm:text-base">Registered</span>
                  </Badge>
                ) : (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full sm:w-auto"
                  >
                    <Button onClick={handleRegister} className="w-full sm:w-auto" size="sm">
                      <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      <span className="text-sm sm:text-base">Register Now</span>
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4" style={{ transform: 'translateZ(15px)' }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {[
                { icon: Calendar, label: 'Date & Time', value: new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
                event.venue && { icon: MapPin, label: 'Venue', value: event.venue },
                event.budget > 0 && { icon: DollarSign, label: 'Budget', value: `$${event.budget.toLocaleString()}` },
                { icon: Users, label: 'Registered', value: `${registrations} participants` }
              ].filter(Boolean).map((item: any, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  whileHover={{ 
                    y: -5,
                    boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
                    transition: { duration: 0.2 }
                  }}
                  className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg bg-gradient-to-br from-gray-50 to-white border border-gray-100"
                >
                  <item.icon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-gray-500">{item.label}</p>
                    <p className="text-sm sm:text-base truncate">{item.value}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:inline-grid">
          <TabsTrigger value="tasks" className="text-sm sm:text-base">Tasks & Timeline</TabsTrigger>
          <TabsTrigger value="progress" className="text-sm sm:text-base">Progress</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                <div>
                  <CardTitle className="text-lg sm:text-xl">Event Planning Tasks</CardTitle>
                  <CardDescription className="text-sm sm:text-base">AI-generated timeline and task management</CardDescription>
                </div>
                {(userRole === 'admin' || userRole === 'faculty') && tasks.length === 0 && (
                  <Button onClick={handleGeneratePlan} disabled={generatingPlan} size="sm" className="w-full sm:w-auto">
                    <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span className="text-sm sm:text-base">{generatingPlan ? 'Generating...' : 'Generate AI Plan'}</span>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <div className="text-center py-8">
                  <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-sm sm:text-base text-gray-500 mb-4">No tasks generated yet</p>
                  {(userRole === 'admin' || userRole === 'faculty') && (
                    <Button onClick={handleGeneratePlan} disabled={generatingPlan} size="sm">
                      <span className="text-sm sm:text-base">Generate AI Event Plan</span>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {tasks.map((task) => (
                    <Card key={task.id} className="border-l-4" style={{ borderLeftColor: task.status === 'completed' ? '#10b981' : task.status === 'in-progress' ? '#3b82f6' : '#9ca3af' }}>
                      <CardHeader>
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                          <div className="flex items-start gap-2 sm:gap-3 flex-1 w-full">
                            {getStatusIcon(task.status)}
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base sm:text-lg">{task.title}</CardTitle>
                              <CardDescription className="mt-1 text-sm sm:text-base">
                                {task.description}
                              </CardDescription>
                              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2">
                                <Badge className={getPriorityColor(task.priority)}>
                                  <span className="text-xs sm:text-sm">{task.priority}</span>
                                </Badge>
                                <span className="text-xs sm:text-sm text-gray-500">
                                  Due: {new Date(task.dueDate).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          {(userRole === 'admin' || userRole === 'faculty') && (
                            <div className="flex gap-2 w-full sm:w-auto">
                              {task.status !== 'completed' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpdateTaskStatus(task.id, task.status === 'in-progress' ? 'completed' : 'in-progress', task.status === 'in-progress' ? 100 : 50)}
                                  className="flex-1 sm:flex-initial text-xs sm:text-sm"
                                >
                                  {task.status === 'in-progress' ? 'Complete' : 'Start'}
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      {task.progress !== undefined && task.progress > 0 && (
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs sm:text-sm">
                              <span>Progress</span>
                              <span>{task.progress}%</span>
                            </div>
                            <Progress value={task.progress} />
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Overall Progress</CardTitle>
              <CardDescription className="text-sm sm:text-base">Track the completion status of all tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm sm:text-base">
                  <span>Overall Completion</span>
                  <span>{completionPercentage.toFixed(0)}%</span>
                </div>
                <Progress value={completionPercentage} className="h-3 sm:h-4" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <Card>
                  <CardContent className="pt-4 sm:pt-6">
                    <div className="text-center">
                      <p className="text-2xl sm:text-3xl font-bold text-gray-600">{tasks.filter(t => t.status === 'pending').length}</p>
                      <p className="text-xs sm:text-sm text-gray-500 mt-1">Pending</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 sm:pt-6">
                    <div className="text-center">
                      <p className="text-2xl sm:text-3xl font-bold text-blue-600">{tasks.filter(t => t.status === 'in-progress').length}</p>
                      <p className="text-xs sm:text-sm text-gray-500 mt-1">In Progress</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 sm:pt-6">
                    <div className="text-center">
                      <p className="text-2xl sm:text-3xl font-bold text-green-600">{completedTasks}</p>
                      <p className="text-xs sm:text-sm text-gray-500 mt-1">Completed</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}