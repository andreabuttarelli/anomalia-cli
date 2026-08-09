import { createVercelHandler } from './_vercel.ts';

export const config = {
  api: { bodyParser: false },
  maxDuration: 30,
};

export default createVercelHandler('/.well-known/oauth-protected-resource');
