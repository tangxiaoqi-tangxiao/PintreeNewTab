const fs = require('fs');
const path = require('path');
const { minify } = require('terser');
const { minify: minifyHTML } = require('html-minifier');

const inputDir = '../Plugin'; // 替换为你的输入文件夹路径
const outputDir = './dist'; // 替换为你想要输出的文件夹路径

// 创建输出文件夹
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// 递归遍历文件夹
function processDirectory(inputDir, outputDir) {
    fs.readdirSync(inputDir).forEach(file => {
        const inputFilePath = path.join(inputDir, file);
        const outputFilePath = path.join(outputDir, file);

        if (fs.statSync(inputFilePath).isDirectory()) {
            // 如果是文件夹，则递归处理
            if (!fs.existsSync(outputFilePath)) {
                fs.mkdirSync(outputFilePath);
            }
            processDirectory(inputFilePath, outputFilePath);
        } else {
            // 如果是文件，进行压缩或复制
            compressFile(inputFilePath, outputFilePath);
        }
    });
}

// 压缩或复制文件
function compressFile(inputFilePath, outputFilePath) {
    const fileExtension = path.extname(inputFilePath);

    if (fileExtension === '.js' || fileExtension === '.html') {
        // 如果是文本文件（JS或HTML），使用 'utf8' 编码读取
        const fileContent = fs.readFileSync(inputFilePath, 'utf8');

        if (fileExtension === '.js') {
            // 压缩JavaScript文件
            minify(fileContent).then(result => {
                fs.writeFileSync(outputFilePath, result.code, 'utf8');
                console.log(`Compressed JS: ${inputFilePath}`);
            }).catch(err => {
                console.error(`Error compressing JS: ${inputFilePath}`, err);
            });
        } else if (fileExtension === '.html') {
            // 压缩HTML文件
            const minifiedHtml = minifyHTML(fileContent, {
                removeComments: true,
                collapseWhitespace: true,
                minifyCSS: true,
                minifyJS: true,
                removeAttributeQuotes: true
            });
            fs.writeFileSync(outputFilePath, minifiedHtml, 'utf8');
            console.log(`Compressed HTML: ${inputFilePath}`);
        }
    } else {
        // 如果是二进制文件（如图片），不使用编码读取和写入
        const fileContent = fs.readFileSync(inputFilePath);
        fs.writeFileSync(outputFilePath, fileContent);
        console.log(`Copied file: ${inputFilePath}`);
    }
}

// 开始处理
processDirectory(inputDir, outputDir);
console.log('压缩完成');
