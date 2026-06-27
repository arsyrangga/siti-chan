/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['three', '@pixiv/three-vrm', '@pixiv/types-vrm-0.0', '@pixiv/types-vrmc-vrm-1.0']
}
module.exports = nextConfig
