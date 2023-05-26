import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
// import marked from 'marked' // 不再需要这个

export function getSortedPostsData() {
    // Get file names under /posts
    const postDirectory = path.join(process.cwd(), 'posts')
    const fileNames = fs.readdirSync(postDirectory)
    const allPostsData = fileNames.map(fileName => {
        // Remove ".md" from file name to get id
        const id = fileName.replace(/\.md$/, '')

        // Read markdown file as string
        const fullPath = path.join(postDirectory, fileName)
        const fileContents = fs.readFileSync(fullPath, 'utf8')

        // Use gray-matter to parse the post metadata section
        const matterResult = matter(fileContents)

        // Use marked to convert markdown to HTML
        // const htmlContent = marked(matterResult.content) // 不再需要这个

        // Combine the data with the id and markdown content
        return {
            id,
            content: matterResult.content, // 现在我们保留 Markdown 内容，稍后在组件中使用 ReactMarkdown 来渲染
            ...matterResult.data
        }
    })
    // Sort posts by date
    return allPostsData.sort((a, b) => {
        if (a.date < b.date) {
            return 1
        } else {
            return -1
        }
    })
}
