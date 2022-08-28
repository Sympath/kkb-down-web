(function () {
    if (preferences.showDevToolsPanel)
        chrome.devtools.panels.create('kkb-down', 'img/icon.png', 'devtools/panel.html');
})();
