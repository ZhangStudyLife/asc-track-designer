/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',  // 启用静态导出
  trailingSlash: true,  // GitHub Pages需要
  images: {
    unoptimized: true  // 静态导出需要禁用图片优化
  },
  basePath: process.env.NODE_ENV === 'production' ? '/ASC_saidao' : '',  // GitHub Pages的仓库名
  assetPrefix: process.env.NODE_ENV === 'production' ? '/ASC_saidao/' : '',
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
