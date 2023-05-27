const sidebarData = [
    { id: 1, title: 'Article 1', type: 'directory', parentId: 0 },
    { id: 2, title: 'Article 2', type: 'directory', parentId: 1 },
    { id: 3, title: 'Article 3', type: 'article', parentId: 0 },
    { id: 4, title: 'Article 3', type: 'article', parentId: 2 },
    // 其他侧边栏项...
];

export default function handler(req, res) {
    const { parentId } = req.query;

    const children = sidebarData.filter(item => item.parentId === Number(parentId));

    res.status(200).json(children);
}
