/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        'mongodb-client-encryption': false,
        aws4: false,
        snappy: false,
        '@mongodb-js/zstd': false,
        'kerberos': false,
        '@aws-sdk/credential-providers': false,
        'gcp-metadata': false,
      };
    }
    if (isServer) {
      config.externals = [...(config.externals || []), 'mongodb'];
    }
    return config;
  },
};

export default nextConfig;
