import { CheckCircle, Clock, AlertCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTasks } from "../../hooks/useTasks";
import type { Task } from "../../types";

interface TaskItemProps {
  task: Task;
  onComplete: (taskId: string) => void;
}

function TaskItem({ task, onComplete }: TaskItemProps) {
  const priorityColors = {
    urgent: "bg-red-100 border-red-500 text-red-900",
    high: "bg-orange-100 border-orange-500 text-orange-900",
    normal: "bg-blue-100 border-blue-500 text-blue-900",
    low: "bg-gray-100 border-gray-500 text-gray-900",
  };

  const priorityIcons = {
    urgent: <AlertCircle size={20} className="text-red-600" />,
    high: <Clock size={20} className="text-orange-600" />,
    normal: <Clock size={20} className="text-blue-600" />,
    low: <Clock size={20} className="text-gray-600" />,
  };

  const minutesAgo = Math.floor((Date.now() - task.timestamp) / 60000);

  return (
    <div
      className={`
      p-4 rounded-xl border-2 
      ${priorityColors[task.priority]}
      flex items-start justify-between gap-4
    `}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          {priorityIcons[task.priority]}
          <span className="font-bold text-sm uppercase">{task.priority}</span>
        </div>

        <h3 className="font-bold text-lg mb-1">Seat {task.seat}</h3>
        <p className="text-sm mb-2">{task.request}</p>

        {task.item && (
          <p className="text-xs opacity-75 mb-2">Item: {task.item}</p>
        )}

        {task.specialRequirements && task.specialRequirements.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {task.specialRequirements.map((req, idx) => (
              <span key={idx} className="text-xs bg-white/50 px-2 py-1 rounded">
                {req}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 text-xs opacity-75">
          <Clock size={12} />
          <span>{minutesAgo === 0 ? "Just now" : `${minutesAgo} min ago`}</span>
        </div>
      </div>
      <button
        onClick={() => onComplete(task.id)}
        className="p-3 bg-green-500 rounded-full hover:bg-green-600 transition"
      >
        <CheckCircle size={24} className="text-white" />
      </button>
    </div>
  );
}

function TaskList() {
  const { tasks, loading, error, completeTask } = useTasks();

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="text-white animate-spin" size={48} />
      </div>
    );
  }

  if (error) {
    const isPermissionError =
      error.includes("Permission denied") ||
      error.includes("permission_denied");

    return (
      <div className="bg-red-500/20 border border-red-500 rounded-xl p-6 text-center max-w-md mx-auto">
        <AlertCircle className="text-red-400 mx-auto mb-4" size={48} />
        <h3 className="text-white font-semibold mb-2">
          Database Connection Error
        </h3>
        <p className="text-red-200 text-sm mb-4">{error}</p>

        {isPermissionError && (
          <div className="bg-white/10 rounded-lg p-4 mb-4 text-left">
            <p className="text-white font-semibold mb-2">Quick Fix:</p>
            <ol className="text-white/80 text-xs space-y-1 list-decimal list-inside">
              <li>Go to Firebase Console → Realtime Database → Rules</li>
              <li>
                Replace rules with:{" "}
                <code className="bg-black/30 px-1 rounded">
                  {'{ "rules": { ".read": true, ".write": true } }'}
                </code>
              </li>
              <li>
                Click <strong>Publish</strong>
              </li>
              <li>Refresh this page</li>
            </ol>
            <p className="text-white/70 text-xs mt-2">
              See{" "}
              <code className="bg-black/30 px-1 rounded">
                FIREBASE_RULES_FIX.md
              </code>{" "}
              for detailed instructions.
            </p>
          </div>
        )}

        <p className="text-white/70 text-xs">
          {!isPermissionError &&
            "Please check your Firebase configuration in .env file and restart the dev server."}
        </p>
      </div>
    );
  }

  const pendingTasks = tasks.filter((t) => t.status === "pending");

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white text-xl font-semibold">
          Active Tasks ({pendingTasks.length})
        </h2>
      </div>

      <AnimatePresence mode="popLayout">
        {pendingTasks.map((task) => (
          <motion.div
            key={task.id}
            layout
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <TaskItem task={task} onComplete={completeTask} />
          </motion.div>
        ))}
      </AnimatePresence>

      {pendingTasks.length === 0 && (
        <div className="text-center py-12">
          <p className="text-white/50">No active tasks</p>
        </div>
      )}
    </div>
  );
}

export default TaskList;
