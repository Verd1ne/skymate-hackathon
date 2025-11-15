import { useTasks } from '../../hooks/useTasks';
import { UtensilsCrossed, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Task } from '../../types';

function MealQueue() {
  const { tasks, loading, completeTask } = useTasks();

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="text-white animate-spin" size={48} />
      </div>
    );
  }

  const mealTasks = tasks.filter(
    t => t.status === 'pending' && (t.type === 'meal' || t.type === 'comfort')
  );

  const groupedTasks = mealTasks.reduce((acc, task) => {
    const item = task.item || 'meal';
    if (!acc[item]) {
      acc[item] = [];
    }
    acc[item].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white text-xl font-semibold">
          Meal Queue ({mealTasks.length})
        </h2>
      </div>

      {Object.keys(groupedTasks).length === 0 ? (
        <div className="text-center py-12">
          <p className="text-white/50">No meal requests</p>
        </div>
      ) : (
        Object.entries(groupedTasks).map(([item, itemTasks]) => (
          <div key={item} className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <UtensilsCrossed size={20} className="text-white" />
              <h3 className="text-white font-semibold capitalize">{item}</h3>
              <span className="text-white/50 text-sm">({itemTasks.length})</span>
            </div>

            <AnimatePresence mode="popLayout">
              {itemTasks.map((task) => (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="bg-white rounded-lg p-4 mb-2 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-gray-800">Seat {task.seat}</span>
                      {task.priority === 'urgent' && (
                        <AlertCircle size={16} className="text-red-600" />
                      )}
                    </div>
                    {task.specialRequirements && task.specialRequirements.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {task.specialRequirements.map((req, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-teal-100 text-teal-800 px-2 py-1 rounded"
                          >
                            {req}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => completeTask(task.id)}
                    className="ml-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                  >
                    Ready
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ))
      )}
    </div>
  );
}

export default MealQueue;

