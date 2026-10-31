import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Biên dịch mã TypeScript của gói dùng chung trong monorepo
  transpilePackages: ['@gtat/shared'],
};

export default nextConfig;
