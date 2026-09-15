import { createApp } from './app';
async function bootstrap() {
  const port = Number(process.env.PORT ?? 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('PORT must be an integer from 1 to 65535');
  const app = await createApp();
  await app.listen(port, '0.0.0.0');
}
void bootstrap();
