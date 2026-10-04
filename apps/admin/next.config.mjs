import path from 'node:path';
import { fileURLToPath } from 'node:url';

const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../..',
  ),
  transpilePackages: ['@lms/ui', '@lms/api-client'],
  /**
   * The Data Induk routes were renamed to Bahasa Indonesia. Old links (bookmarks,
   * chat messages, operator notes) must keep working, so every previous path
   * permanently redirects instead of returning 404.
   */
  async redirects() {
    return [
      { source: '/personel', destination: '/data-individu', permanent: true },
      {
        source: '/personel/:id',
        destination: '/data-individu/:id',
        permanent: true,
      },
      { source: '/roles', destination: '/peran-hak-akses', permanent: true },
      {
        source: '/assignments',
        destination: '/penugasan',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
