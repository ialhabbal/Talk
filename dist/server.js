import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Define stop sequences (character names followed by a colon)
const stopSequences = ['John:', 'Mary:', 'Richard:'];

app.post('/generate', async (req, res) => {
    console.log("Received /generate request:", req.body);
    const koboldUrl = 'http://localhost:5001/v1/chat/completions';

    try {
        const response = await fetch(koboldUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });

        if (!response.ok || !response.body) {
            console.error("KoboldCPP error");
            return res.status(500).send('Error from KoboldCPP');
        }

        // Set headers for streaming response
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const rl = readline.createInterface({ input: response.body });

        let stopped = false;

        rl.on('line', (line) => {
            if (stopped) return;

            const cleaned = line
                .replace(/<Think>.*?<\/Think>/gis, '')
                .replace(/<Think>/gi, '');

            if (cleaned.trim() !== '') {
                for (let stop of stopSequences) {
                    if (cleaned.includes(stop)) {
                        // Write only up to the stop sequence
                        const trimmed = cleaned.split(stop)[0];
                        res.write(`${trimmed}\n`);
                        rl.close();  // Stop reading more lines
                        stopped = true;
                        return;
                    }
                }

                res.write(`${cleaned}\n`);
            }
        });

        rl.on('close', () => {
            res.end();
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Error connecting to KoboldCpp');
    }
});

app.post('/api/stop', async (req, res) => {
    const koboldStopUrl = 'http://localhost:5001/v1/stop';
    try {
        const response = await fetch(koboldStopUrl, { method: 'POST' });
        if (response.ok) {
            res.json({ success: true });
        } else {
            res.status(500).json({ error: 'Failed to stop generation on Koboldcpp' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error connecting to Koboldcpp stop endpoint' });
    }
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, '../dist')));

// Optional: Serve index.html for all non-API routes (for Vue router history mode)
app.get(/^\/(?!api|generate).*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(3000, () => {
    console.log('Backend listening on http://localhost:3000');
});
