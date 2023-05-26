import { getSortedPostsData } from '../../utils/lib/posts';
import ReactMarkdown from 'react-markdown';
import MarkdownRenderer from './MarkdownRenderer';

export default function Blog({ allPostsData }) {
    return (
        <div>
            {allPostsData.map((postData) => (
                <div key={postData.id}>
                    <h1>{postData.title}</h1>
                    <MarkdownRenderer markdownContent={postData.content} />
                </div>
            ))}
        </div>
    )
}

export async function getStaticProps() {
    const allPostsData = getSortedPostsData();
    return {
        props: {
            allPostsData
        }
    };
}


