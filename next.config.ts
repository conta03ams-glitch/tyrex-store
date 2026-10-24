import type { NextConfig } from "next";
import {securityHeaders,reviewPhotoCSP} from './lib/security-headers.mjs';

const nextConfig: NextConfig = {
  poweredByHeader:false,
  async headers(){return [
    {source:'/:path*',headers:securityHeaders},
    {source:'/api/avaliacoes/foto/:id',headers:[{key:'Content-Security-Policy',value:reviewPhotoCSP}]},
  ];},
};

export default nextConfig;
