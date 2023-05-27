export default function handler(req, res) {
    const { id } = req.query;

    const contentData = {
        1: '<h1>Article 1</h1><p>Content of Article 1</p>',
        2: '<h1>Article 2</h1><p>Content of Article 2</p>',
        4: '# 标题4\n' +
            '\n' +
            '## 子标题\n' +
            '\n' +
            '\n' +
            '段落内容可以通过直接输入文本来创建。\n' +
            '\n' +
            '可以使用 *斜体* 或 **粗体** 来强调文字。\n' +
            '\n' +
            '列表示例：\n' +
            '- 项目1\n' +
            '- 项目2\n' +
            '- 项目3\n' +
            '\n' +
            '有序列表示例：\n' +
            '1. 第一项\n' +
            '2. 第二项\n' +
            '3. 第三项\n' +
            '\n' +
            '链接示例：\n' +
            '[OpenAI](https://zhangxuan.cn/typora/featured-image.jpg)\n' +
            '\n' +
            '图片示例：\n' +
            '![图片描述](https://github.com/hambuger/hanblog/assets/11688951/8f68bff4-c037-474b-a7cd-3abce2828c56)\n' +
            '\n' +
            '代码块示例：\n' +
            '```javascript\n' +
            'function helloWorld() {\n' +
            '  console.log(\'Hello, world!\');\n' +
            '}\n',
        3: '# 标题\n' +
            '\n' +
            '## 子标题\n' +
            '\n' +
            '\n' +
            '段落内容可以通过直接输入文本来创建。\n' +
            '\n' +
            '可以使用 *斜体* 或 **粗体** 来强调文字。\n' +
            '\n' +
            '列表示例：\n' +
            '- 项目1\n' +
            '- 项目2\n' +
            '- 项目3\n' +
            '\n' +
            '有序列表示例：\n' +
            '1. 第一项\n' +
            '2. 第二项\n' +
            '3. 第三项\n' +
            '\n' +
            '链接示例：\n' +
            '[OpenAI](https://zhangxuan.cn/typora/featured-image.jpg)\n' +
            '\n' +
            '图片示例：\n' +
            '![图片描述](https://github.com/hambuger/hanblog/assets/11688951/8f68bff4-c037-474b-a7cd-3abce2828c56)\n' +
            '\n' +
            '代码块示例：\n' +
            '```javascript\n' +
            'function helloWorld() {\n' +
            '  console.log(\'Hello, world!\');\n' +
            '}\n',
        // 其他文章内容...
    };

    const content = contentData[id];

    if (content) {
        res.status(200).send(content);
    } else {
        res.status(404).send('Content not found');
    }
}
