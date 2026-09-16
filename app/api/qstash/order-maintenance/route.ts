import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { handleQStashOrderMaintenance } from '@/libs/qstashOrderMaintenanceHandler';

export const runtime = 'nodejs';

export const POST = verifySignatureAppRouter(handleQStashOrderMaintenance);
