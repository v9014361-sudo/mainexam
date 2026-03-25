const Workflow = require('../models/Workflow');
const WorkflowLog = require('../models/WorkflowLog');

const processTrigger = async (triggerEvent, triggerData) => {
  try {
    const activeWorkflows = await Workflow.find({ trigger: triggerEvent, isEnabled: true });
    
    for (const workflow of activeWorkflows) {
      let conditionMet = true;
      
      // Simple condition evaluation
      if (workflow.condition && workflow.condition.field) {
        const fieldValue = triggerData[workflow.condition.field];
        const val = workflow.condition.value;
        
        switch (workflow.condition.operator) {
          case 'eq': conditionMet = (fieldValue === val); break;
          case 'lt': conditionMet = (fieldValue < val); break;
          case 'gt': conditionMet = (fieldValue > val); break;
          case 'contains': conditionMet = String(fieldValue).includes(val); break;
        }
      }
      
      if (conditionMet) {
        // Execute Action (Simulated for now)
        const actionTaken = `Executed ${workflow.action.type} for ${triggerEvent}`;
        console.log(`[Workflow Engine] ${actionTaken}`);
        
        // Log execution
        await WorkflowLog.create({
          workflowId: workflow._id,
          triggerEvent,
          triggerData,
          actionTaken,
          status: 'success'
        });
      }
    }
  } catch (error) {
    console.error('[Workflow Engine] Error:', error);
  }
};

module.exports = { processTrigger };
