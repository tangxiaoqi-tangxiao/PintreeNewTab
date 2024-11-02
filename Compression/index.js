const fs = require('fs');
const path = require('path');
const { minify } = require('terser');
const { minify: minifyHTML } = require('html-minifier-terser');
const { exec } = require('child_process');

const inputDir = '../Plugin/src'; // 替换为你的输入文件夹路径
const outputDir = './dist'; // 替换为你想要输出的文件夹路径

// 要排除的文件和目录列表
let excludePaths = [
    'json',
    'css/index.css',
    'css/styles.css',
];
excludePaths = excludePaths.map((item) => {
    return path.join(inputDir, item);
});

// 创建输出文件夹
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// 递归遍历文件夹
async function processDirectory(inputDir, outputDir) {
    const files = fs.readdirSync(inputDir);
    await Promise.all(files.map(async file => {
        const inputFilePath = path.join(inputDir, file);
        const outputFilePath = path.join(outputDir, file);

        // 检查是否在排除列表中
        if (excludePaths.includes(inputFilePath)) {
            console.log(`跳过: ${inputFilePath}`);
            return; // 跳过该文件或文件夹
        }

        if (fs.statSync(inputFilePath).isDirectory()) {
            // 如果是文件夹，则递归处理
            if (!fs.existsSync(outputFilePath)) {
                fs.mkdirSync(outputFilePath);
            }
            await processDirectory(inputFilePath, outputFilePath);
        } else {
            // 如果是文件，进行压缩或复制
            await compressFile(inputFilePath, outputFilePath);
        }
    }));
}

// 压缩或复制文件
async function compressFile(inputFilePath, outputFilePath) {
    const fileExtension = path.extname(inputFilePath);

    if (fileExtension === '.js' || fileExtension === '.html') {
        // 如果是文本文件（JS或HTML），使用 'utf8' 编码读取
        const fileContent = fs.readFileSync(inputFilePath, 'utf8');

        if (fileExtension === '.js') {
            // 压缩JavaScript文件
            minify(fileContent).then(result => {
                fs.writeFileSync(outputFilePath, result.code, 'utf8');
                console.log(`压缩JS: ${inputFilePath}`);
            }).catch(err => {
                console.error(`Error compressing JS: ${inputFilePath}`, err);
            });
        } else if (fileExtension === '.html') {
            // 压缩HTML文件
            const minifiedHtml = await minifyHTML(fileContent, {
                removeComments: true,
                collapseWhitespace: true,
                minifyCSS: true,
                minifyJS: true,
                removeAttributeQuotes: true
            });
            fs.writeFileSync(outputFilePath, minifiedHtml, 'utf8');
            console.log(`压缩HTML: ${inputFilePath}`);
        }
    } else {
        // 如果是二进制文件（如图片），不使用编码读取和写入
        const fileContent = fs.readFileSync(inputFilePath);
        fs.writeFileSync(outputFilePath, fileContent);
        console.log(`仅复制文件: ${inputFilePath}`);
    }
}

// 执行 npm run build:css
exec('npm run build:css', { cwd: inputDir },async (err, stdout, stderr) => {
    if (err) {
        console.error(`Error executing npm run build:css: ${err}`);
        return;
    }

    console.log(`npm run build:css output:\n${stdout}`);

    if (stderr) {
        console.error(`npm run build:css stderr:\n${stderr}`);
    }

    // 命令执行完后开始压缩文件
    await processDirectory(inputDir, outputDir);
    console.log('压缩完成');

});
