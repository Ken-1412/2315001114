import 'dotenv/config';
import express from 'express';
import { Log } from '../logging_middleware';
import { migrate } from './migrate';
import routes from './routes';

const app = express();
const PORT = 3002;

app.use(express.json());
app.use('/', routes);

async function start(): Promise<void> {
    await Log('backend', 'info', 'config', 'notification_app_be: starting');
    await migrate();
    app.listen(PORT, async () => {
        await Log('backend', 'info', 'config', `Notification System running on http://localhost:${PORT}`);
        console.log(`Notification System running on http://localhost:${PORT}`);
    });
}

start().catch(async (err) => {
    await Log('backend', 'fatal', 'config', `notification_app_be: failed to start: ${err.message}`);
    console.error('Failed to start:', err);
    process.exit(1);
});

export default app;
