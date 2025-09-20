import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';
import tough from 'tough-cookie';
import fetchCookie from 'fetch-cookie';

const CookieJar = tough.CookieJar;
const jar = new CookieJar();
const fetchWithCookies = fetchCookie(fetch, jar);

let currentAbortController = null;

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.post('/generate', async (req, res) => {
    console.log("Received /generate request:", req.body);
    const koboldUrl = 'http://127.0.0.1:5001/v1/completions';

    // Use stop_sequences from request, or fallback to empty array
    const stopSequences = req.body.stop_sequences || [];
    // Pull out known envelope fields and forward all other decoding params verbatim
    const { prompt, max_tokens, stream, stop_sequences, ...rest } = req.body;
    const requestBody = {
        prompt: prompt || "Hello",
        max_tokens: max_tokens || 512,
        stream: true,
        stop: stopSequences,
        ...rest
    };

    // Only abort if a previous request is still running (shouldn't happen in single-user)
    if (currentAbortController) {
        console.log('Aborting previous generation...');
        currentAbortController.abort();
        currentAbortController = null;
    }

    currentAbortController = new AbortController();

    let stopped = false;
    let rl;

    // Helper to stop everything
    function stopGeneration() {
        if (!stopped) {
            stopped = true;
            if (rl) rl.close();
            res.end();
        }
    }

    try {
        const response = await fetchWithCookies(koboldUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal: currentAbortController.signal
        });

        if (!response.ok || !response.body) {
            console.error("KoboldCPP error");
            return res.status(500).send('Error from KoboldCPP');
        }

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        rl = readline.createInterface({ input: response.body });

        rl.on('line', (line) => {
            if (stopped) return;

            if (line.startsWith('data:')) {
                const jsonStr = line.slice(5).trim();
                if (!jsonStr) return;
                try {
                    const data = JSON.parse(jsonStr);
                    const text = data.choices?.[0]?.text ?? '';
                    if (text) {
                        // Find the earliest stop sequence in the text
                        let minIdx = -1;
                        for (let stop of stopSequences) {
                            const idx = text.indexOf(stop);
                            if (idx !== -1 && (minIdx === -1 || idx < minIdx)) {
                                minIdx = idx;
                            }
                        }
                        if (minIdx !== -1) {
                            // Only send up to the stop sequence
                            const trimmed = text.substring(0, minIdx);
                            res.write(trimmed);
                            stopGeneration();
                            return;
                        }
                        res.write(text);
                    }
                } catch (e) {
                    // Ignore JSON parse errors
                }
            }
        });

        rl.on('close', () => {
            stopGeneration();
        });

    } catch (err) {
        if (err.name === 'AbortError') {
            console.log('Generation aborted by user.');
            if (rl) rl.close();
            res.end();
        } else {
            console.error('Error connecting to KoboldCpp:', err);
            res.status(500).send('Error connecting to KoboldCpp');
        }
    } finally {
        currentAbortController = null;
    }
});

// Lightweight health endpoint for connectivity probes
app.get('/api/health', (req, res) => {
    res.json({ ok: true });
});

app.post('/api/stop', async (req, res) => {
    console.log('Received /api/stop');
    const koboldStopUrl = 'http://127.0.0.1:5001/api/extra/abort';
    // Forward all headers except host
    const headers = { ...req.headers };
    delete headers.host;
    try {
        const response = await fetchWithCookies(koboldStopUrl, { method: 'POST', headers });
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
