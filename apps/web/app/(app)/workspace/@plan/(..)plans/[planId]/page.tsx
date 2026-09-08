import PlanDetailPage from '../../../../plans/[planId]/page';
import { PlanWorkspaceDialog } from '@/components/plan-workspace-dialog';

export default function InterceptedPlanWorkspace() {
  return (
    <PlanWorkspaceDialog>
      <PlanDetailPage />
    </PlanWorkspaceDialog>
  );
}
