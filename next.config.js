/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
