// Generic type for analytics data that can be used across different features
export interface AnalyticsData {
  data: {
    taskCount: number;
    taskDifference: number;
    assignedTaskCount: number;
    assignedTaskDifference: number;
    completedTaskCount: number;
    completedTaskDifference: number;
    overdueTaskCount: number;
    overdueTaskDifference: number;
  }
};
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  ListTodo, 
  User 
} from "lucide-react";

import { SummaryCard } from "./summary-card";

export const Analytics = ({ data }: AnalyticsData) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      <SummaryCard
        title="Total Tasks"
        value={data.taskCount}
        icon={ListTodo}
        trend={{
          value: data.taskDifference,
          type: data.taskDifference >= 0 ? "increase" : "decrease"
        }}
      />
      
      <SummaryCard
        title="Assigned Tasks"
        value={data.assignedTaskCount}
        icon={User}
        trend={{
          value: data.assignedTaskDifference,
          type: data.assignedTaskDifference >= 0 ? "increase" : "decrease"
        }}
      />
      
      <SummaryCard
        title="Completed Tasks"
        value={data.completedTaskCount}
        icon={CheckCircle}
        trend={{
          value: data.completedTaskDifference,
          type: data.completedTaskDifference >= 0 ? "increase" : "decrease"
        }}
      />
      
      <SummaryCard
        title="Overdue Tasks"
        value={data.overdueTaskCount}
        icon={AlertTriangle}
        trend={{
          value: data.overdueTaskDifference,
          type: data.overdueTaskDifference >= 0 ? "increase" : "decrease"
        }}
      />
    </div>
  );
};

