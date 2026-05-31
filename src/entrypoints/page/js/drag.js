import Sortable from 'sortablejs';
import { BookmarkFolderActiveId } from "./state.js";
import { getFolderLength } from "./bookmarkRender.js";

// 为书签列表启用拖拽排序功能
export function BookmarkDrag(grid_id) {
    const element = document.getElementById(grid_id);
    if (element) {
        new Sortable(element, {
            animation: 150,
            onEnd: function (evt) {
                let newIndex = evt.newIndex;
                let folderLength = getFolderLength();

                if (evt.oldIndex < evt.newIndex) {
                    newIndex += 1 + folderLength;
                } else {
                    newIndex += folderLength;
                }

                if (BookmarkFolderActiveId) {
                    chrome.bookmarks.move(evt.item.dataset.id, {
                        index: newIndex,
                        parentId: BookmarkFolderActiveId
                    });
                }
            }
        });
    }
}
