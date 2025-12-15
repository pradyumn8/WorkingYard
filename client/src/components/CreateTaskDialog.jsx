import { useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { format, differenceInCalendarDays } from "date-fns";
import { useAuth } from "@clerk/clerk-react";
import api from "../configs/api";
import toast from "react-hot-toast";
import { addTask } from "../features/workspaceSlice";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

export default function CreateTaskDialog({
  showCreateTask,
  setShowCreateTask,
  projectId,
}) {
  const { getToken } = useAuth();
  const dispatch = useDispatch();

  const currentWorkspace =
    useSelector((state) => state.workspace?.currentWorkspace) || null;
  const project = currentWorkspace?.projects.find(
    (p) => p.id === projectId
  );
  const teamMembers = project?.members || [];

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "TASK",
    status: "TODO",
    priority: "MEDIUM",
    assigneeId: "",
    start_date: "",
    end_date: "",
  });

  // Build a DayPicker-friendly range from formData
  const range = {
    from: formData.start_date ? new Date(formData.start_date) : undefined,
    to: formData.end_date ? new Date(formData.end_date) : undefined,
  };

  const selectedDays =
    range.from && range.to
      ? differenceInCalendarDays(range.to, range.from) + 1
      : 0;

  const handleRangeSelect = (selectedRange) => {
    if (!selectedRange) {
      setFormData((prev) => ({
        ...prev,
        start_date: "",
        end_date: "",
      }));
      return;
    }

    const { from, to } = selectedRange;

    setFormData((prev) => ({
      ...prev,
      start_date: from ? format(from, "yyyy-MM-dd") : "",
      end_date: to ? format(to, "yyyy-MM-dd") : "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = await getToken();

      const payload = {
        ...formData,
        workspaceId: currentWorkspace.id,
        projectId,
      };

      const { data } = await api.post("/api/tasks", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setShowCreateTask(false);
      setFormData({
        title: "",
        description: "",
        type: "TASK",
        status: "TODO",
        priority: "MEDIUM",
        assigneeId: "",
        start_date: "",
        end_date: "",
      });
      toast.success(data.message);
      dispatch(addTask(data.task));
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!showCreateTask) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 dark:bg-black/60 backdrop-blur">
   <div className="bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg shadow-lg w-full max-w-md p-6 text-zinc-900 dark:text-white max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Create New Task</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-1">
            <label htmlFor="title" className="text-sm font-medium">
              Title
            </label>
            <input
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Task title"
              className="w-full rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-zinc-900 dark:text-zinc-200 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label
              htmlFor="description"
              className="text-sm font-medium"
            >
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  description: e.target.value,
                })
              }
              placeholder="Describe the task"
              className="w-full rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-zinc-900 dark:text-zinc-200 text-sm mt-1 h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Type & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Type</label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                className="w-full rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-zinc-900 dark:text-zinc-200 text-sm mt-1"
              >
                <option value="BUG">Bug</option>
                <option value="FEATURE">Feature</option>
                <option value="TASK">Task</option>
                <option value="IMPROVEMENT">Improvement</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    priority: e.target.value,
                  })
                }
                className="w-full rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-zinc-900 dark:text-zinc-200 text-sm mt-1"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
          </div>

          {/* Assignee and Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Assignee</label>
              <select
                value={formData.assigneeId}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    assigneeId: e.target.value,
                  })
                }
                className="w-full rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-zinc-900 dark:text-zinc-200 text-sm mt-1"
              >
                <option value="">Unassigned</option>
                {teamMembers.map((member) => (
                  <option key={member?.user.id} value={member?.user.id}>
                    {member?.user.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Status</label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value,
                  })
                }
                className="w-full rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-zinc-900 dark:text-zinc-200 text-sm mt-1"
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="DONE">Done</option>
              </select>
            </div>
          </div>

          {/* Date Range Picker */}
          <div className="space-y-3">
            {/* Header: label + days selected */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Set dates</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {selectedDays > 0
                  ? `${selectedDays} day${
                      selectedDays > 1 ? "s" : ""
                    } selected`
                  : "Select dates"}
              </span>
            </div>

            {/* Inputs row */}
            <div className="grid grid-cols-2 gap-2">
              {/* Start Date input */}
              <div className="flex items-center gap-2">
                <CalendarIcon className="size-4 text-zinc-500 dark:text-zinc-400" />
                <input
                  type="text"
                  readOnly
                  value={
                    range.from
                      ? format(range.from, "MM/dd/yyyy")
                      : ""
                  }
                  placeholder="Start date"
                  className="w-full rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-zinc-900 dark:text-zinc-200 text-sm"
                />
              </div>

              {/* End Date input */}
              <div className="flex items-center gap-2">
                <CalendarIcon className="size-4 text-zinc-500 dark:text-zinc-400" />
                <input
                  type="text"
                  readOnly
                  value={
                    range.to
                      ? format(range.to, "MM/dd/yyyy")
                      : ""
                  }
                  placeholder="End date"
                  className="w-full rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-zinc-900 dark:text-zinc-200 text-sm"
                />
              </div>
            </div>

            {/* Calendar */}
            <div className="mt-2 rounded-lg border border-zinc-200 dark:border-zinc-700 p-3 bg-white dark:bg-zinc-900">
              <DayPicker
                mode="range"
                selected={range}
                onSelect={handleRangeSelect}
                numberOfMonths={1}
                defaultMonth={range.from || new Date()}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateTask(false)}
              className="rounded border border-zinc-300 dark:border-zinc-700 px-5 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded px-5 py-2 text-sm bg-gradient-to-br from-blue-500 to-blue-600 hover:opacity-90 text-white dark:text-zinc-200 transition disabled:opacity-60"
            >
              {isSubmitting ? "Creating..." : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
