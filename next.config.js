/** @type {import('next').NextConfig} */
const nextConfig = {
  // 移除 output: 'export' 以支持 Vercel 部署
  // 如果需要静态导出，在本地构建时使用 build:web 脚本
  reactStrictMode: true,
  // 移除 basePath 和 assetPrefix,让 Next.js 使用默认行为
  images: {
    unoptimized: true,
  },
  // 禁用 trailing slash
  trailingSlash: false,
  // 禁用 telemetry
  eslint: {
    // 构建时忽略 eslint 错误(仅在开发环境检查)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 构建时忽略 TypeScript 错误(仅在开发环境检查)
    ignoreBuildErrors: false,
  },
  webpack: (config, { isServer }) => {
    // 忽略服务器端的canvas模块
    if (isServer) {
      config.externals = [...(config.externals || []), 'canvas']
    }
    
    // 忽略konva在服务器端的node特定代码
    config.resolve.alias = {
      ...config.resolve.alias,
      'konva/lib/index-node': false,
    }
    
    return config
  },
}

module.exports = nextConfig
