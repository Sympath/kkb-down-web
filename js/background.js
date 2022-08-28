let googleApi = {
    postMessage(info) {
        return new Promise((res, rej) => {
            chrome.runtime.sendMessage(info, function (response) {
                res(response)
            });
        })
    },
    onmessage() {
        return new Promise((res, rej) => {
            chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
                res({ request, sender, sendResponse })
            });
        })

    }
}
var showContextMenu = undefined;
var courseInfo = {
    courseName: '', // 课程名称
    chapterInfo: [], // 章信息
}
// 获取当前课程信息
async function initCourseInfo(currentTab) {
    console.log(111);
    if (!currentTab) {
        currentTab = await getCurrentTab();
    }
    let currentTabURL = currentTab.url;
    window.currentTab = currentTab
    if (currentTabURL.includes('/catalog')) {
        // 收集课程名称
        courseInfo.courseName = currentTab.title.split('-').shift();
    } else if (currentTabURL.includes('/video')) {
        // 收集课程名称
        courseInfo.chapterName = currentTab.title.split('-').shift();
    }
}
function filterName(name) {
    const reg = /[`()（）\r\n[\]]/gim
    name = name.replace(/、/g, '.')
    // 处理空格
    name = name.replace(/ /g, '-')
    return name.replace(reg, '')
}
function getBypyChapterPath() {
    let { courseName, chapterInfo } = courseInfo
    // 章名、章序号、节序号
    let [chapterName, chapterNum, sectionNum] = chapterInfo;
    let sectionName = chapterName;// 节名和章名相同
    const handledChapterName = filterName(`${chapterNum}.${chapterName}/${sectionNum}.${sectionName}`.replace(/\s/g, ''))
    let bypyChapterPath = `${courseName}/${handledChapterName}`;
    return bypyChapterPath
}
function getCourseName() {
    let { courseName, chapterInfo } = courseInfo
    let [chapterName, chapterNum, sectionNum] = chapterInfo;
    return `${sectionNum}.${chapterName}`
}

updateCallback = function () {
    if (showContextMenu !== preferences.showContextMenu) {
        showContextMenu = preferences.showContextMenu;
        setContextMenu(showContextMenu);
    }
    setChristmasIcon();
};

setChristmasIcon();
setInterval(setChristmasIcon, 60 * 60 * 1000); //Every hour

//Every time the browser restarts the first time the user goes to the options he ends up in the default page (support)
localStorage.setItem("option_panel", "null");

var currentVersion = chrome.runtime.getManifest().version;
var oldVersion = data.lastVersionRun;

data.lastVersionRun = currentVersion;

if (oldVersion !== currentVersion) {
    if (oldVersion === undefined) { //Is firstrun
        chrome.tabs.create({ url: 'http://www.kkb-down.com/start/' });
    } else {
        chrome.notifications.onClicked.addListener(function (notificationId) {
            chrome.tabs.create({
                url: 'http://www.kkb-down.com/changelog/'
            });
            chrome.notifications.clear(notificationId, function (wasCleared) { });
        });
        var opt = {
            type: "basic",
            title: "kkb-down",
            message: _getMessage("updated"),
            iconUrl: "/img/icon.png",
            isClickable: true
        };
        chrome.notifications.create("", opt, function (notificationId) {
        });
    }
}

setContextMenu(preferences.showContextMenu);

chrome.cookies.onChanged.addListener(function (changeInfo) {
    var removed = changeInfo.removed;
    var cookie = changeInfo.cookie;
    var cause = changeInfo.cause;

    var name = cookie.name;
    var domain = cookie.domain;
    var value = cookie.value;

    if (cause === "expired" || cause === "evicted")
        return;

    for (var i = 0; i < data.readOnly.length; i++) {
        var currentRORule = data.readOnly[i];
        if (compareCookies(cookie, currentRORule)) {
            if (removed) {
                chrome.cookies.get({
                    'url': "http" + ((currentRORule.secure) ? "s" : "") + "://" + currentRORule.domain + currentRORule.path,
                    'name': currentRORule.name,
                    'storeId': currentRORule.storeId
                }, function (currentCookie) {
                    if (compareCookies(currentCookie, currentRORule))
                        return;
                    var newCookie = cookieForCreationFromFullCookie(currentRORule);
                    chrome.cookies.set(newCookie);
                    ++data.nCookiesProtected;
                });
            }
            return;
        }
    }

    //Check if a blocked cookie was added
    if (!removed) {
        for (var i = 0; i < data.filters.length; i++) {
            var currentFilter = data.filters[i];
            if (filterMatchesCookie(currentFilter, name, domain, value)) {
                chrome.tabs.query(
                    { active: true },
                    function (tabs) {
                        var url = tabs[0].url;
                        var toRemove = {};
                        toRemove.url = url;
                        toRemove.url = "http" + ((cookie.secure) ? "s" : "") + "://" + cookie.domain + cookie.path;
                        toRemove.name = name;
                        chrome.cookies.remove(toRemove);
                        ++data.nCookiesFlagged;
                    });
            }
        }
    }

    if (!removed && preferences.useMaxCookieAge && preferences.maxCookieAgeType > 0) {	//Check expiration, if too far in the future shorten on user's preference
        var maxAllowedExpiration = Math.round((new Date).getTime() / 1000) + (preferences.maxCookieAge * preferences.maxCookieAgeType);
        if (cookie.expirationDate !== undefined && cookie.expirationDate > maxAllowedExpiration + 60) {
            var newCookie = cookieForCreationFromFullCookie(cookie);
            if (!cookie.session)
                newCookie.expirationDate = maxAllowedExpiration;
            chrome.cookies.set(newCookie);
            ++data.nCookiesShortened;
        }
    }
});

function setContextMenu(show) {
    chrome.contextMenus.removeAll();
    if (show) {
        chrome.contextMenus.create({
            "title": "kkb-down",
            "contexts": ["page"],
            "onclick": function (info, tab) {
                showPopup(info, tab);
            }
        });
    }
}

function setChristmasIcon() {
    if (isChristmasPeriod() && preferences.showChristmasIcon) {
        chrome.browserAction.setIcon({ "path": "/img/cookie_xmas_19x19.png" });
    } else {
        chrome.browserAction.setIcon({ "path": "/img/icon.png" });
    }
}
async function initCourseInfo() {
    let { request, sender, sendResponse } = await googleApi.onmessage()
    let infoKey = request.key;
    courseInfo[infoKey] = request[infoKey]
    sendResponse('我是后台，我已收到你的消息：' + JSON.stringify(courseInfo));
    initCourseInfo()
}
// 监听页面url改变
// 监听来自 content-script 的消息
initCourseInfo()
// chrome.runtime.onInstalled.addListener(function () {
//     // Replace all rules ...
//     chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
//         // With a new rule ...
//         chrome.declarativeContent.onPageChanged.addRules([
//             {
//                 // That fires when a page's URL contains a 'g' ...
//                 conditions: [
//                     new chrome.declarativeContent.PageStateMatcher({
//                         pageUrl: { urlContains: 'kaikeba' }, //url的内容中包含字母g的，插件才会被激活
//                     })
//                 ],
//                 // And shows the extension's page action.
//                 actions: [new chrome.declarativeContent.ShowPageAction()]
//             }
//         ]);
//     });
// });
