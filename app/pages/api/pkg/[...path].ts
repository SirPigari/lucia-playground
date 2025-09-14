import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';

// wdh
export default function handler(req: NextApiRequest, res: NextApiResponse) {
    const { path: segments } = req.query;
    if (!segments) return res.status(404).end();
    const parts = Array.isArray(segments) ? segments : [segments as string];
    const repoRoot = path.resolve(process.cwd(), '..');
    const filePath = path.join(repoRoot, ...parts);
    if (!fs.existsSync(filePath)) return res.status(404).end();
    const stat = fs.statSync(filePath);
    const stream = fs.createReadStream(filePath);
    res.setHeader('Content-Length', String(stat.size));
    if (filePath.endsWith('.wasm')) res.setHeader('Content-Type', 'application/wasm');
    else if (filePath.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript');
    stream.pipe(res);
}
