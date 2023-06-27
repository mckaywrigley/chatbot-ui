import MarkdownRenderer from '../book/MarkdownRenderer';

function ArticlePage({ contentData }) {
    return (
        <div className="blog-container">
            <div className="content">
                <MarkdownRenderer markdownContent={contentData} />
            </div>
        </div>
    );
}

export async function getServerSideProps(context) {
    const { id } = context.params;

    // 获取数据的逻辑
    const response = await fetch(`${process.env.NEXT_PUBLIC_HOST}/blog/query?id=${id}`);
    const data = await response.json();

    // 将数据传递给页面组件
    return {
        props: {
            contentData: data.content
        }
    };
}

export default ArticlePage;
