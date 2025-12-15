// routes/taskRoutes.js
import express from "express";
import { createTask, deleteTask, toggleTaskTimer, updateTask } from "../controllers/taskController.js";

const taskRouter = express.Router();

taskRouter.post("/", createTask);
taskRouter.put("/:id", updateTask);
taskRouter.post("/delete", deleteTask);

// ✅ Correct timer route: /api/tasks/:taskId/timer
taskRouter.post("/:taskId/timer", toggleTaskTimer);

export default taskRouter;
