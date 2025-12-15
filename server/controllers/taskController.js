import prisma from "../configs/prisma.js";
import { inngest } from "../inngest/index.js";


// create task
// export const createTask = async (req, res) => {
//     try {
//         const { userId } = await req.auth();
//         const { projectId, title, description, type, status, priority, assigneeId, start_date, end_date } = req.body;
//         const origin = req.get('origin')

//         // check if user has admin role for project
//         const project = await prisma.project.findUnique({
//             where: { id: projectId },
//             include: { members: { include: { user: true } } }
//         })
//         if (!project) {
//             return res.status(404).json({ message: "Project not found" });
//         } else if (project.team_lead !== userId) {
//             return res.status(403).json({ message: "You don't have admin privileges for this project" });
//         } else if (assigneeId && !project.members.find((member) => member.user.id === assigneeId)) {
//             return res.status(403).json({ message: "assignee is not a member for the project / workspace" });
//         }

//         const task = await prisma.task.create({
//             data: {
//                 projectId,
//                 title,
//                 description,
//                 priority,
//                 assigneeId,
//                 status,
//                 type,
//                 start_date: new Date(start_date),
//                 end_date: new Date(end_date)
//                 // due_date: due_date ? new Date(due_date) : null
//             }
//         })
//         const taskWithAssignee = await prisma.task.findUnique({
//             where: { id: task.id },
//             include: { assignee: true }
//         })

//         await inngest.send({
//             name: "app/task.assigned",
//             data: {
//                 taskId: task.id, origin
//             }
//         })

//         res.json({ task: taskWithAssignee, message: "Task created successfully" })
//     } catch (error) {
//         console.log(error);
//         res.status(500).json({ message: error.code || error.message });
//     }
// }
// create task
export const createTask = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const {
            projectId,
            title,
            description,
            type,
            status,
            priority,
            assigneeId,
            start_date,
            end_date,
        } = req.body;

        const origin = req.get("origin");

        // 1) Check project & permissions (your code – unchanged)
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { members: { include: { user: true } } },
        });

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        } else if (project.team_lead !== userId) {
            return res
                .status(403)
                .json({ message: "You don't have admin privileges for this project" });
        } else if (
            assigneeId &&
            !project.members.find((member) => member.user.id === assigneeId)
        ) {
            return res.status(403).json({
                message: "assignee is not a member for the project / workspace",
            });
        }

        const parseDateOrNull = (dateStr) => {
            if (!dateStr) return null;
            const d = new Date(dateStr);
            return isNaN(d.getTime()) ? null : d;
        };

        const startDate = parseDateOrNull(start_date);
        const endDate = parseDateOrNull(end_date);

        // 2) Create task – IMPORTANT PART
        const task = await prisma.task.create({
            data: {
                title,
                description: description || null,
                priority,
                status,
                type,
                start_date: startDate,
                end_date: endDate,
                due_date: endDate,                // ✅ due_date = end_date
                project: { connect: { id: projectId } },
                assignee: { connect: { id: assigneeId } },
            },
        });

        // 3) Include assignee in response (same as before)
        WithAssignee = await prisma.task.findUnique({
            where: { id: task.id },
            include: { assignee: true },
        });

        await inngest.send({
            name: "app/task.assigned",
            data: {
                taskId: task.id,
                origin,
            },
        });

        res.json({ task: taskWithAssignee, message: "Task created successfully" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.code || error.message });
    }
};

// controllers/taskController.js
export const toggleTaskTimer = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { taskId } = req.params;
    const { action } = req.body; // "start" or "pause"

    if (!["start", "pause"].includes(action)) {
      return res.status(400).json({ message: "Invalid action" });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          include: {
            members: { include: { user: true } },
          },
        },
        assignee: true,
      },
    });

    if (!task) return res.status(404).json({ message: "Task not found" });

    const isTeamLead = task.project.team_lead === userId;
    const isAssignee = task.assigneeId === userId;
    const isMember = task.project.members.some((m) => m.user.id === userId);

    if (!isTeamLead && !isAssignee && !isMember) {
      return res.status(403).json({
        message: "You do not have permission to track time for this task",
      });
    }

    const now = new Date();
    let updatedTask;

    if (action === "start") {
      if (task.timerRunning) {
        return res.json({ task, message: "Timer already running" });
      }

      updatedTask = await prisma.task.update({
        where: { id: taskId },
        data: {
          timerRunning: true,
          timerStartedAt: now,
        },
        include: { assignee: true }, // ✅ keep shape useful for UI
      });
    }

    if (action === "pause") {
      if (!task.timerRunning || !task.timerStartedAt) {
        return res.json({ task, message: "Timer is not running" });
      }

      const diffMs = now.getTime() - task.timerStartedAt.getTime();
      const diffSeconds = Math.floor(diffMs / 1000);

      const currentTracked = task.trackedSeconds ?? 0;
      const newTrackedSeconds = currentTracked + diffSeconds;
      const newActualMinutes = Math.round(newTrackedSeconds / 60);

      updatedTask = await prisma.task.update({
        where: { id: taskId },
        data: {
          timerRunning: false,
          timerStartedAt: null,
          trackedSeconds: newTrackedSeconds,
          actual_time: newActualMinutes,
        },
        include: { assignee: true },
      });
    }

    return res.json({
      task: updatedTask,
      message: action === "start" ? "Timer started successfully" : "Timer paused successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.code || error.message });
  }
};


// update task
export const updateTask = async (req, res) => {
    try {
        const task = await prisma.task.findUnique({
            where: { id: req.params.id }
        })
        if (!task) {
            return res.status(404).json({ message: "Task not found" })
        }
        const { userId } = await req.auth();
        // check if user has admin role for project
        const project = await prisma.project.findUnique({
            where: { id: task.projectId },
            include: { members: { include: { user: true } } },
        });

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        } else if (project.team_lead !== userId) {
            return res.status(403).json({ message: "You don't have admin privileges for this project" });
        }
        const updatedTask = await prisma.task.update({
            where: { id: req.params.id },
            data: req.body
        })

        res.json({ task: updatedTask, message: "Task updated successfully" })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.code || error.message });
    }
}

// delete task
export const deleteTask = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const { tasksIds } = req.body
        const tasks = await prisma.task.findMany({
            where: { id: { in: tasksIds } }
        })

        if (tasks.length === 0) {
            return res.status(404).json({ message: "Task not found" });
        }

        const project = await prisma.project.findUnique({
            where: { id: tasks[0].projectId },
            include: { members: { include: { user: true } } }
        })
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        } else if (project.team_lead !== userId) {
            return res.status(403).json({ message: "You don't have admin privileges for this project" });
        }

        await prisma.task.deleteMany({
            where: { id: { in: tasksIds } }
        })
        res.json({ message: "Task deleted successfully" })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.code || error.message });
    }
}