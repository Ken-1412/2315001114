import { Log } from '../logging_middleware';
import { Vehicle, ScheduleEntry, ScheduleResponse } from './types';

interface KnapsackItem {
    TaskID: string;
    weight: number;
    value: number;
}

function solveKnapsack(items: KnapsackItem[], capacity: number): KnapsackItem[] {
    const n = items.length;
    const W = Math.floor(capacity);

    const dp: number[][] = Array.from({ length: n + 1 }, () =>
        new Array(W + 1).fill(0)
    );

    for (let i = 1; i <= n; i++) {
        const w = Math.floor(items[i - 1].weight);
        const v = items[i - 1].value;
        for (let j = 0; j <= W; j++) {
            if (w <= j) {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i - 1][j - w] + v);
            } else {
                dp[i][j] = dp[i - 1][j];
            }
        }
    }

    const selected: KnapsackItem[] = [];
    let j = W;
    for (let i = n; i > 0; i--) {
        if (dp[i][j] !== dp[i - 1][j]) {
            selected.push(items[i - 1]);
            j -= Math.floor(items[i - 1].weight);
        }
    }

    return selected;
}

export async function scheduleVehicles(
    depotId: number,
    budgetHours: number,
    vehicles: Vehicle[]
): Promise<ScheduleResponse> {
    await Log('backend', 'info', 'service', `knapsack: start depotId=${depotId}, budget=${budgetHours}, vehicles=${vehicles.length}`);

    const items: KnapsackItem[] = vehicles.map((v) => ({
        TaskID: v.TaskID,
        weight: v.Duration,
        value: v.Impact,
    }));

    const selected = solveKnapsack(items, budgetHours);

    const totalDuration = selected.reduce((sum, item) => sum + item.weight, 0);
    const totalImpact = selected.reduce((sum, item) => sum + item.value, 0);

    const scheduled: ScheduleEntry[] = selected.map((item) => ({
        TaskID: item.TaskID,
        Duration: item.weight,
        Impact: item.value,
    }));

    const result: ScheduleResponse = {
        depotId,
        budgetHours,
        totalImpact,
        totalDuration,
        scheduled,
    };

    await Log('backend', 'info', 'service', `knapsack: result depotId=${depotId}, used=${totalDuration}/${budgetHours}h, impact=${totalImpact}, selected=${selected.length}/${vehicles.length}`);

    return result;
}
