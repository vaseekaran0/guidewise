import { createApp } from '../server.ts';

const app = await createApp();

export default function handler(req: any, res: any) {
  app(req, res);
}