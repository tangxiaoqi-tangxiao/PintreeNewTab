/** @type {import('tailwindcss').Config} */
module.exports = {
    mode: 'jit',
    content: ['src/index.html', 'src/content/*.js'],
    darkMode: ['selector', '[data-theme="dark"]'],
    plugins: [
        // require('@tailwindcss/forms'),
        require('daisyui'),
    ],
    daisyui: {
        themes: false,// 主题
        darkTheme: "dark",// 暗黑模式主题
        base: true, // 启用基础样式
        styled: true, // 启用样式
        utils: true, // 启用实用程序类
        logs: false, // 启用日志
    },
}