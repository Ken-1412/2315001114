import 'dotenv/config';
import express from 'express';
import { Log } from '../logging_middleware';
import routes from './routes';

const app = express();
const PORT = 3001;

app.use(express.json());
app.use('/', routes);

app.listen(PORT, async () => {
    await Log('backend', 'info', 'config', `Vehicle Maintenance Scheduler running on http://localhost:${PORT}`);
    console.log(`Vehicle Maintenance Scheduler running on http://localhost:${PORT}`);
});

export default app;
