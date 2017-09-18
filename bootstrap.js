/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Cu = Components.utils;
const Ci = Components.interfaces;
Cu.import('resource://gre/modules/Services.jsm');
Cu.importGlobalProperties(["URL"]);


function hook_window(wnd) {
	if (!wnd.gPhishingDetector) {
		console.log('nosafelinks: hook window: no phishing detector');
		return;
	}
	if (wnd.gPhishingDetector.analyzeMsgForPhishingURLsOriginal) {
		console.log('nosafelinks: hook window: already hooked');
		return;
	}
	wnd.gPhishingDetector.analyzeMsgForPhishingURLsOriginal = wnd.gPhishingDetector.analyzeMsgForPhishingURLs;
	wnd.gPhishingDetector.analyzeMsgForPhishingURLs = function(aUrl) {
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
			var verbatim_brackets = link.innerText === '<' + link.href + '>';
			link.href = origURL;
			if (verbatim)
				link.innerText = origURL;
			else if (verbatim_brackets)
				link.innerText = '<' + origURL + '>';
			console.log(hrefURL.href, '->', origURL);
			cleaned++;
		}

		if (cleaned) {
			var bar = wnd.gMessageNotificationBar.msgNotificationBar;
			var msg = "There were " + cleaned + " link(s) mangled by protection.outlook.com.  Fixed.";
			bar.appendNotification(msg, "nosafelinks-cleaned", null,
				bar.PRIORITY_INFO_HIGH, []);
		}

		return this.analyzeMsgForPhishingURLsOriginal(aUrl);
	}
	console.log('nosafelinks: hook window');
}
function unhook_window(wnd) {
	let orig = wnd.gPhishingDetector.analyzeMsgForPhishingURLsOriginal;
	if (orig) {
		wnd.gPhishingDetector.analyzeMsgForPhishingURLs = orig;
		wnd.gPhishingDetector.analyzeMsgForPhishingURLsOriginal = undefined;
		console.log('nosafelinks: unhook window');
	}
}

var windowListener = {
	onOpenWindow: function (aWindow) {
		let domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
		domWindow.addEventListener("load", function () {
			domWindow.removeEventListener("load", arguments.callee, false);
			hook_window(domWindow);
		}, false);
	},
	onCloseWindow: function (aWindow) {},
	onWindowTitleChange: function (aWindow, aTitle) {}
};

function install() {
	console.log('nosafelinks: install');
}
function uninstall() {
	console.log('nosafelinks: uninstall');
}
function startup() {
	console.log('nosafelinks: startup');

	let enumerator = Services.wm.getEnumerator('mail:3pane');
	while (enumerator.hasMoreElements()) {
		let wnd = enumerator.getNext().QueryInterface(Ci.nsIDOMWindow);
		hook_window(wnd);
	}
	Services.wm.addListener(windowListener);
}

function shutdown() {
	console.log('nosafelinks: shutdown');

	let enumerator = Services.wm.getEnumerator('mail:3pane');
	while (enumerator.hasMoreElements()) {
		let wnd = enumerator.getNext().QueryInterface(Ci.nsIDOMWindow);
		unhook_window(wnd);
	}
	Services.wm.removeListener(windowListener);
}
