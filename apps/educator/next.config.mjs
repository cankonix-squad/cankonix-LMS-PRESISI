import path from 'node:path';
import { fileURLToPath } from 'node:url';

const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../..',
  ),
  transpilePackages: ['@lms/ui', '@lms/api-client'],
};

export default nextConfig;
