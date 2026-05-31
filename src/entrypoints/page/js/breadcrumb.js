// 渲染面包屑导航
export function renderBreadcrumbs(path) {
    const breadcrumbsPath = document.getElementById('breadcrumbs-path');
    breadcrumbsPath.innerHTML = '';

    path.forEach((item, index) => {
        const li_element = document.createElement('li');
        if (index === path.length - 1) {
            const span_element = document.createElement('span');
            span_element.className = "inline-flex items-center gap-2";
            span_element.textContent = item.title;
            li_element.appendChild(span_element);
        } else {
            const a_element = document.createElement('a');
            a_element.innerHTML = `<svg
              xmlns = "http://www.w3.org/2000/svg"
              fill = "none"
              viewBox = "0 0 24 24"
              class= "h-4 w-4 stroke-current mr-2" >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
            </svg >${item.title}`;
            a_element.onclick = () => {
                const newPath = path.slice(0, index + 1);
                renderBookmarksRef(item.children, newPath);
            };
            li_element.appendChild(a_element);
        }
        breadcrumbsPath.appendChild(li_element);
    });
}

let renderBookmarksRef = null;

// 设置渲染书签的回调函数（面包屑点击时调用）
export function setRenderBookmarksRef(fn) {
    renderBookmarksRef = fn;
}
