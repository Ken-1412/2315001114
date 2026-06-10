import { Router, Request, Response } from 'express';
import { Log } from '../logging_middleware';
import { fetchDepots, fetchVehicles } from './api';
import { scheduleVehicles } from './knapsack';
import { ScheduleRequest } from './types';

const router = Router();

router.get('/depots', async (_req: Request, res: Response) => {
    await Log('backend', 'info', 'route', 'GET /depots: entry');
    try {
        const depots = await fetchDepots();
        await Log('backend', 'info', 'route', 'GET /depots: exit success');
        res.json({ depots });
    } catch (err: any) {
        await Log('backend', 'error', 'route', `GET /depots: error: ${err.message}`);
        res.status(502).json({ error: 'Failed to fetch depots from upstream' });
    }
});

router.get('/depots/:id/vehicles', async (req: Request, res: Response) => {
    const depotId = parseInt(req.params.id, 10);
    await Log('backend', 'info', 'route', `GET /depots/${depotId}/vehicles: entry`);
    try {
        const vehicles = await fetchVehicles(depotId);
        await Log('backend', 'info', 'route', `GET /depots/${depotId}/vehicles: exit success`);
        res.json({ vehicles });
    } catch (err: any) {
        await Log('backend', 'error', 'route', `GET /depots/${depotId}/vehicles: error: ${err.message}`);
        res.status(502).json({ error: `Failed to fetch vehicles for depot ${depotId}` });
    }
});

router.post('/schedule', async (req: Request, res: Response) => {
    const { depotId, budgetHours } = req.body as ScheduleRequest;
    await Log('backend', 'info', 'route', `POST /schedule: entry depotId=${depotId}, budgetHours=${budgetHours}`);

    if (!depotId || !budgetHours || budgetHours <= 0) {
        await Log('backend', 'warn', 'route', 'POST /schedule: invalid input');
        res.status(400).json({ error: 'depotId and budgetHours (>0) are required' });
        return;
    }

    try {
        const vehicles = await fetchVehicles(depotId);
        const result = await scheduleVehicles(depotId, budgetHours, vehicles);
        await Log('backend', 'info', 'route', 'POST /schedule: exit success');
        res.json(result);
    } catch (err: any) {
        await Log('backend', 'error', 'route', `POST /schedule: error: ${err.message}`);
        res.status(502).json({ error: `Failed to schedule for depot ${depotId}` });
    }
});

export default router;
