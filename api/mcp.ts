import { createVercelHandler } from './_vercel.ts';

export const config = {
  api: { bodyParser: false },
  maxDuration: 60,
};

export default createVercelHandler('/mcp');
