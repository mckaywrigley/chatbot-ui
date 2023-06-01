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
        fetch(process.env.NEXT_PUBLIC_HOST+`/blog/query?parentId=0`)
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
            fetch(process.env.NEXT_PUBLIC_HOST+`/blog/query?parentId=${item.id}`) // 在 URL 中传递 parentId 参数
                .then((response) => response.json())
                .then((data) => {
                    if (data && data.length > 0) {
                        item.children = data;
                        setSidebarData([...sidebarData]); // 更新侧边栏数据
                    }
                })
                .catch((error) => {
                    console.error('Error:', error);
                });
        } else if (item.type === 'article') {
            fetch(process.env.NEXT_PUBLIC_HOST+`/blog/query?id=${item.id}`)
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
                <div className="sidebar-header">
                    <h2>Hamburger 文章</h2>
                </div>
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
            <style jsx>{`
              .blog-container {
                display: flex;
                height: 100vh;
              }

              .sidebar {
                flex: 0 0 20%;
                max-width: 20%;
                background-color: #f1f1f1;
                padding: 20px;
                height: 100vh;
              }

              .sidebar-header {
                margin-bottom: 20px;
              }

              .sidebar-header h2 {
                font-size: 20px;
                font-weight: bold;
                margin-bottom: 10px;
              }

              .sidebar-header p {
                font-size: 14px;
                color: #888;
                margin-bottom: 0;
              }

              .sidebar-content {
                margin-top: 20px;
              }

              .separator {
                width: 1px;
                background-color: #ccc;
              }

              .content {
                flex: 1 1 auto;
                overflow-y: auto;
                background-color: #EEEEEE;
              }
            `}</style>
        </div>
    );
}


export default BlogPage;
