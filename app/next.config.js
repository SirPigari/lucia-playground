/** @type {import('next').NextConfig} */
const isGitHubPages = process.env.GITHUB_PAGES === 'true';

module.exports = {
    reactStrictMode: true,
    output: 'export',
    images: { unoptimized: true },
    basePath: isGitHubPages ? '/lucia-playground' : '',
    assetPrefix: isGitHubPages ? '/lucia-playground/' : '',
};
