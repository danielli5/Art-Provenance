import { resynthesize } from "../server/research";
const path = process.argv[2];
const job = await resynthesize(path);
console.log(job.synthesis?.status, job.synthesis?.cost, (job.synthesis?.claims || []).map(c => `${c.headline} | ${c.positions.map(p => p.stance).join(",")}`).join("\n"));
