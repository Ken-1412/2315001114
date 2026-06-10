import 'dotenv/config';
import { Log } from '../logging_middleware';
import { DepotListResponse, VehicleListResponse, Depot, Vehicle } from './types';

const BASE_URL = process.env.TEST_SERVER_BASE_URL || 'http://4.224.186.213';
const TOKEN = process.env.BEARER_TOKEN || '';

function getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (TOKEN) {
        headers['Authorization'] = `Bearer ${TOKEN}`;
    }
    return headers;
}

export async function fetchDepots(): Promise<Depot[]> {
    await Log('backend', 'info', 'service', 'fetchDepots: start');
    try {
        const res = await fetch(`${BASE_URL}/evaluation-service/depots`, {
            headers: getHeaders(),
        });
        if (!res.ok) {
            throw new Error(`depots fetch failed: ${res.status}`);
        }
        const data = (await res.json()) as DepotListResponse;
        await Log('backend', 'info', 'service', `fetchDepots: success, count=${data.depots.length}`);
        return data.depots;
    } catch (err: any) {
        await Log('backend', 'error', 'service', `fetchDepots: error: ${err.message}`);
        throw err;
    }
}

export async function fetchVehicles(depotId: number): Promise<Vehicle[]> {
    await Log('backend', 'info', 'service', `fetchVehicles: start depotId=${depotId}`);
    try {
        const res = await fetch(`${BASE_URL}/evaluation-service/depots/${depotId}/vehicles`, {
            headers: getHeaders(),
        });
        if (!res.ok) {
            throw new Error(`vehicles fetch failed: ${res.status}`);
        }
        const data = (await res.json()) as VehicleListResponse;
        await Log('backend', 'info', 'service', `fetchVehicles: success depotId=${depotId}, count=${data.vehicles.length}`);
        return data.vehicles;
    } catch (err: any) {
        await Log('backend', 'error', 'service', `fetchVehicles: error depotId=${depotId}: ${err.message}`);
        throw err;
    }
}
