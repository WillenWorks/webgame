import { getTravelLogs, initTravelLogTable } from '../repositories/travel_log.repo.js';

export async function listTravelLogsService(caseId) {
  if (!caseId) {
    throw new Error('CaseId não informado');
  }
  await initTravelLogTable();
  const logs = await getTravelLogs(caseId);
  return logs;
}
