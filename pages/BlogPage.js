import {useState, useEffect} from 'react';
import MarkdownRenderer from './book/MarkdownRenderer';

function SidebarItem({ item, onItemClick, level = 0, isRoot = false }) {
    const [isExpanded, setIsExpanded] = useState(isRoot);

    const handleItemClick = () => {
        if (item.type === 'directory') {
            setIsExpanded(!isExpanded);
            onItemClick(item);
        } else if (item.type === 'article') {
            onItemClick(item);
        }
    };

    const indentStyle = {
        paddingLeft: `${level * 20}px`,
    };

    return (
        <div>
            <div className="sidebar-item" style={indentStyle} onClick={handleItemClick}>
                {item.type === 'directory' ? (
                    <span>{isExpanded ? '📁' : '📂'}</span>
                ) : (
                    <span>📄</span>
                )}
                {item.title}
            </div>
            {isExpanded && item.children && (
                <div className="submenu">
                    {item.children.map((childItem) => (
                        <SidebarItem
                            key={childItem.id}
                            item={childItem}
                            onItemClick={onItemClick}
                            level={level + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function BlogPage() {
    const [sidebarData, setSidebarData] = useState([]);
    const [contentData, setContentData] = useState('');

    useEffect(() => {
        // 获取根目录的子级元素
        fetch(`http://localhost:5000/blog/query?parentId=0`)
            .then(response => response.json())
            .then(data => {
                setSidebarData(data);
            })
            .catch(error => {
                console.error('Error:', error);
            });
    }, []);

    const handleSidebarItemClick = (item) => {
        if (item.type === 'directory') {
            fetch(`http://localhost:5000/blog/query?parentId=${item.id}`) // 在 URL 中传递 parentId 参数
                .then((response) => response.json())
                .then((data) => {
                    item.children = data;
                    setSidebarData([...sidebarData]); // 更新侧边栏数据
                })
                .catch((error) => {
                    console.error('Error:', error);
                });
        } else if (item.type === 'article') {
            fetch(`http://localhost:5000/blog/query?id=${item.id}`)
                .then(response => response.json())
                .then(data => {
                    setContentData(data.content);
                })
                .catch(error => {
                    console.error('Error:', error);
                });
        }
    };

    return (
        <div className="blog-container">
            <div className="sidebar">
                <h2>Hamburger 文章</h2>
                <div className="sidebar-content">
                    {sidebarData.map((item) => (
                        <SidebarItem
                            key={item.id}
                            item={item}
                            onItemClick={handleSidebarItemClick}
                            isRoot={item.id === 0}
                        />
                    ))}
                </div>
            </div>
            <div className="separator" />
            <div className="content">
                <MarkdownRenderer markdownContent={contentData} />
            </div>
        </div>
    );
}


export default BlogPage;
