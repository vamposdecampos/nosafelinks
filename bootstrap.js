Components.utils.import('resource://gre/modules/Services.jsm');
Components.utils.importGlobalProperties(["URL"]);


function hook_window(wnd) {
	console.log('nosafelinks: hook window');
	wnd.gPhishingDetector.analyzeMsgForPhishingURLsOriginal = wnd.gPhishingDetector.analyzeMsgForPhishingURLs;
	wnd.gPhishingDetector.analyzeMsgForPhishingURLs = function(aUrl) {
		//console.log('nosafelinks: analyze', aUrl);

		var linkNodes = wnd.document.getElementById('messagepane').contentDocument.links;
		var cleaned = 0;
		for (var index = 0; index < linkNodes.length; index++) {
			var link = linkNodes[index];
			var hrefURL;
			try {
				hrefURL = new URL(link.href);
			} catch(ex) {
				continue;
			}
			if (!hrefURL.host.match(/safelinks\.protection\.outlook\.com$/i))
				continue;
			/* verbatim should only be true in plain-text emails */
			var origURL = hrefURL.searchParams.get('url');
			var verbatim = link.innerText === link.href;
			link.href = origURL;
			if (verbatim)
				link.innerText = origURL;
			console.log(hrefURL.href, '->', origURL);
			cleaned++;
		}

		if (cleaned) {
			var bar = wnd.gMessageNotificationBar.msgNotificationBar;
			var msg = "There were " + cleaned + " link(s) mangled by protection.outlook.com.  Fixed.";
			bar.appendNotification(msg, "nosafelinks-cleaned", null,
				bar.PRIORITY_CRITICAL_MEDIUM, []);
		}

		return this.analyzeMsgForPhishingURLsOriginal(aUrl);
	}
}
function unhook_window(wnd) {
	let orig = wnd.gPhishingDetector.analyzeMsgForPhishingURLsOriginal;
	if (orig) {
		wnd.gPhishingDetector.analyzeMsgForPhishingURLs = orig;
		wnd.gPhishingDetector.analyzeMsgForPhishingURLsOriginal = undefined;
		console.log('nosafelinks: unhook window');
	}
}

function install() {
	console.log('nosafelinks: install');
}
function uninstall() {
	console.log('nosafelinks: uninstall');
}
function startup() {
	console.log('nosafelinks: statup');

	let enumerator = Services.wm.getEnumerator('mail:3pane');
	while (enumerator.hasMoreElements()) {
		let wnd = enumerator.getNext().QueryInterface(Components.interfaces.nsIDOMWindow);
		hook_window(wnd);
	}
	/* TODO: add WindowMediator observer */
}

function shutdown() {
	console.log('nosafelinks: shutdown');

	let enumerator = Services.wm.getEnumerator('mail:3pane');
	while (enumerator.hasMoreElements()) {
		let wnd = enumerator.getNext().QueryInterface(Components.interfaces.nsIDOMWindow);
		unhook_window(wnd);
	}
	/* TODO: remove WindowMediator observer */
}
