(function () {
    if (preferences.showDevToolsPanel)
        chrome.devtools.panels.create('EditThisCookie', 'img/icon.png', 'devtools/panel.html');
})();
