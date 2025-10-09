/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  // 移除 basePath 和 assetPrefix，让 Next.js 使用默认行为
  images: {
    unoptimized: true,
  },
  // 禁用 trailing slash
  trailingSlash: false,
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
