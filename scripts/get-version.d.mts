/**
 * scripts/get-version.mjs 的类型声明
 * 优先级：环境变量 APP_VERSION > 最新 git tag > package.json > "0.0.0"
 */
export declare function getVersion(): string;