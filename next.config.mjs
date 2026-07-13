/** @type {import('next').NextConfig} */
const nextConfig = {
  // firebase-admin can't be bundled by webpack — keep it a runtime require
  experimental: {
    serverComponentsExternalPackages: ['firebase-admin', '@google-cloud/firestore'],
  },
  headers: async () => [
    {
      source: '/sw.js',
      headers: [
        { key: 'Cache-Control', value: 'no-cache' },
        { key: 'Service-Worker-Allowed', value: '/' },
      ],
    },
  ],
}

export default nextConfig
